#!/usr/bin/env python3
"""
🧪 Test Server - Versión simplificada para probar la API
"""

import sys
sys.path.append('.')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn


# Create simplified FastAPI app for testing
app = FastAPI(
    title="🏦 Finance Garden API - Test Version",
    description="API de prueba para gestión financiera inteligente",
    version="1.0.0-test"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "🏦 Finance Garden API is running!",
        "version": "1.0.0-test",
        "status": "healthy",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "services": {
            "api": "running",
            "database": "not_configured",
            "redis": "not_configured"
        }
    }


# Import the CRUD routers
try:
    from routers.payments import router as payments_router
    from routers.transfers import router as transfers_router
    from routers.danger_zone import router as danger_zone_router
    
    # Include CRUD routers
    app.include_router(
        payments_router,
        prefix="/api/v1/payments",
        tags=["💳 Payments CRUD"]
    )
    
    app.include_router(
        transfers_router, 
        prefix="/api/v1/transfers",
        tags=["🔄 Transfers CRUD"]
    )
    
    app.include_router(
        danger_zone_router,
        prefix="/api/v1/danger-zone", 
        tags=["🚨 Danger Zone"]
    )
    print("✅ CRUD routers loaded successfully!")
    print("🚨 Danger Zone router loaded!")
    
except ImportError as e:
    print(f"⚠️ CRUD routers not available: {e}")

# Analytics endpoints (simplified)
@app.get("/api/v1/analytics/dashboard")
async def get_dashboard():
    """Mock financial dashboard"""
    return {
        "status": "success",
        "financial_health": {
            "overall_score": 78,
            "savings_ratio": 0.15,
            "debt_to_income_ratio": 0.25
        },
        "expense_analytics": {
            "total_expenses": {"amount": 2500.0, "currency": "USD"},
            "categories": []
        },
        "income_analytics": {
            "total_income": {"amount": 3500.0, "currency": "USD"},
            "growth_rate": 0.05
        }
    }


@app.get("/api/v1/analytics/spending-patterns")
async def get_spending_patterns():
    """Mock spending patterns"""
    return {
        "status": "success",
        "message": "Spending patterns analyzed successfully",
        "data": {
            "patterns": [],
            "anomalies": [],
            "predictions": []
        }
    }


@app.get("/api/v1/analytics/cash-flow/predictions")
async def predict_cash_flow():
    """Mock cash flow predictions"""
    from datetime import datetime, timedelta
    
    predictions = []
    for i in range(3):
        future_date = datetime.now().date() + timedelta(days=30 * (i + 1))
        predictions.append({
            "date": future_date.isoformat(),
            "predicted_income": {"amount": 3500.0, "currency": "USD"},
            "predicted_expenses": {"amount": 2800.0, "currency": "USD"},
            "predicted_balance": {"amount": 700.0, "currency": "USD"},
            "confidence_score": 0.85
        })
    
    return predictions


@app.get("/api/v1/analytics/insights")
async def get_insights():
    """Mock AI insights"""
    from datetime import datetime
    
    insights = [
        {
            "title": "Oportunidad de Ahorro en Restaurantes",
            "description": "Has gastado 23% más en restaurantes este mes comparado con el promedio. Considera cocinar más en casa.",
            "impact": "medium",
            "category": "spending",
            "action_required": False,
            "suggested_actions": ["Planificar menús semanales", "Buscar recetas fáciles"],
            "confidence_score": 0.85,
            "created_at": datetime.utcnow()
        },
        {
            "title": "Excedente de Ingresos Detectado",
            "description": "Tienes $800 extra este mes. Es un buen momento para aumentar tu fondo de emergencia.",
            "impact": "high",
            "category": "savings",
            "action_required": True,
            "suggested_actions": ["Transferir a cuenta de ahorros", "Considerar inversión a corto plazo"],
            "confidence_score": 0.92,
            "created_at": datetime.utcnow()
        }
    ]
    
    return insights


@app.post("/api/v1/automation/rules")
async def create_automation_rule():
    """Mock automation rule creation"""
    return {
        "status": "success",
        "message": "Automation rule created successfully",
        "rule": {
            "id": "rule_mock_123",
            "name": "Auto-categorizar Uber",
            "rule_type": "categorization",
            "is_active": True
        }
    }


@app.get("/api/v1/automation/suggestions")
async def get_automation_suggestions():
    """Mock automation suggestions"""
    return {
        "status": "success",
        "suggestions": [
            {
                "type": "categorization",
                "title": "Auto-categorizar transacciones de Uber",
                "description": "Detectamos que categorizas manualmente las transacciones de Uber. Podemos automatizar esto.",
                "confidence": 0.95,
                "estimated_savings": "5 minutos por mes"
            },
            {
                "type": "transfer",
                "title": "Transferencia automática a ahorros",
                "description": "Basado en tus patrones, podrías ahorrar $300 más cada mes automáticamente.",
                "confidence": 0.88,
                "estimated_savings": "Ahorro adicional de $3,600/año"
            }
        ],
        "total": 2
    }


@app.get("/api/v1/integrations/exchange-rates")
async def get_exchange_rates():
    """Mock exchange rates"""
    return {
        "status": "success",
        "base_currency": "USD",
        "rates": {
            "MXN": 17.5234,
            "EUR": 0.8542,
            "COP": 4182.75
        },
        "timestamp": datetime.utcnow().isoformat(),
        "source": {
            "provider": "Mock Exchange API",
            "last_updated": datetime.utcnow().isoformat()
        }
    }


if __name__ == "__main__":
    print("🧪 Starting Finance Garden API Test Server...")
    print("📚 Documentation: http://localhost:8000/docs")
    print("🔄 Health check: http://localhost:8000/health")
    print("=" * 50)
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )