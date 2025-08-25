"""
🏦 Finance Garden API
Una API completa para gestión financiera inteligente con automatización y análisis avanzado.
"""

from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
import uvicorn
from contextlib import asynccontextmanager

# Import routers
from routers import (
    auth,
    accounts, 
    transactions,
    payments,
    transfers,
    analytics,
    automation,
    integrations,
    reports,
    webhooks,
    ai_insights,
    danger_zone
)

# Import middleware and dependencies
from core.config import settings
from core.database import init_db
from middleware.rate_limit import RateLimitMiddleware
from middleware.logging import LoggingMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle events for startup and shutdown"""
    # Startup
    await init_db()
    print("🚀 Finance Garden API starting up...")
    yield
    # Shutdown
    print("📊 Finance Garden API shutting down...")


# Create FastAPI app with custom metadata
app = FastAPI(
    title="🏦 Finance Garden API",
    description="""
    ## Una API completa para gestión financiera inteligente 💰

    ### Características principales:
    
    🤖 **Automatización Inteligente**
    - Auto-categorización de transacciones con ML
    - Reglas de negocio personalizables
    - Alertas y notificaciones contextuales
    
    📊 **Analytics Avanzado**
    - Análisis de patrones de gasto
    - Predicciones de flujo de efectivo
    - Recomendaciones financieras con IA
    
    🔗 **Integraciones Poderosas**
    - Webhooks para servicios externos
    - Importación masiva desde CSV/Excel
    - APIs de bancos y servicios financieros
    
    📱 **Funcionalidades Avanzadas**
    - Presupuestos inteligentes
    - Reports personalizados en PDF
    - Sincronización en tiempo real
    
    ### Autenticación
    Utiliza Supabase JWT tokens para autenticación segura.
    
    ### Rate Limiting
    - 100 requests por minuto para usuarios autenticados
    - 20 requests por minuto para usuarios no autenticados
    """,
    version="1.0.0",
    contact={
        "name": "Finance Garden Team",
        "email": "api@finance-garden.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    terms_of_service="https://finance-garden.com/terms",
    lifespan=lifespan
)

# Security scheme
security = HTTPBearer()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
app.add_middleware(RateLimitMiddleware)
app.add_middleware(LoggingMiddleware)

# Include routers with prefixes and tags
app.include_router(
    auth.router,
    prefix="/api/v1/auth",
    tags=["🔐 Authentication"],
)

app.include_router(
    accounts.router,
    prefix="/api/v1/accounts",
    tags=["💳 Accounts Management"],
    dependencies=[Security(security)]
)

app.include_router(
    transactions.router,
    prefix="/api/v1/transactions", 
    tags=["💸 Transactions"],
    dependencies=[Security(security)]
)

app.include_router(
    payments.router,
    prefix="/api/v1/payments",
    tags=["💳 Payments"],
    dependencies=[Security(security)]
)

app.include_router(
    transfers.router,
    prefix="/api/v1/transfers",
    tags=["🔄 Transfers"],
    dependencies=[Security(security)]
)

app.include_router(
    analytics.router,
    prefix="/api/v1/analytics",
    tags=["📊 Analytics & Insights"],
    dependencies=[Security(security)]
)

app.include_router(
    automation.router,
    prefix="/api/v1/automation",
    tags=["🤖 Automation Rules"],
    dependencies=[Security(security)]
)

app.include_router(
    integrations.router,
    prefix="/api/v1/integrations",
    tags=["🔗 External Integrations"],
    dependencies=[Security(security)]
)

app.include_router(
    reports.router,
    prefix="/api/v1/reports",
    tags=["📄 Reports & Exports"],
    dependencies=[Security(security)]
)

app.include_router(
    webhooks.router,
    prefix="/api/v1/webhooks",
    tags=["🪝 Webhooks"],
)

app.include_router(
    ai_insights.router,
    prefix="/api/v1/ai",
    tags=["🧠 AI Insights"],
    dependencies=[Security(security)]
)

app.include_router(
    danger_zone.router,
    prefix="/api/v1/danger-zone",
    tags=["🚨 Danger Zone"],
    dependencies=[Security(security)]
)


@app.get("/", include_in_schema=False)
async def root():
    """API Root - Health Check"""
    return {
        "message": "🏦 Finance Garden API is running!",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/health", tags=["🏥 Health"])
async def health_check():
    """
    Health check endpoint para monitoring
    """
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "services": {
            "database": "connected",
            "redis": "connected", 
            "supabase": "connected"
        }
    }


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    
    # Add custom examples and schemas
    openapi_schema["info"]["x-logo"] = {
        "url": "https://finance-garden.com/logo.png"
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning"
    )