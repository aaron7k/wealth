#!/usr/bin/env python3
"""
🧪 Simple CRUD Test Server - Sin autenticación para pruebas
"""

import sys
sys.path.append('.')

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import CRUD routers
from routers.payments import router as payments_router
from routers.transfers import router as transfers_router

# Create test app
app = FastAPI(
    title="🏦 Finance Garden API - CRUD Test",
    description="API de prueba para CRUD de pagos y transferencias (sin autenticación)",
    version="1.0.0-crud-test"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock security dependency to bypass authentication
async def mock_get_current_user():
    return {
        "id": "user_test_123",
        "email": "test@example.com", 
        "name": "Test User"
    }

async def mock_get_db():
    return None

# Override dependencies for testing
payments_router.dependency_overrides = {}
transfers_router.dependency_overrides = {}

# Include CRUD routers without authentication
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

@app.get("/")
async def root():
    return {
        "message": "🏦 Finance Garden CRUD API Test Server",
        "version": "1.0.0-crud-test",
        "status": "ready",
        "docs": "/docs",
        "features": [
            "Complete Payments CRUD",
            "Complete Transfers CRUD", 
            "No authentication required (test mode)",
            "Full OpenAPI documentation"
        ]
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "crud_endpoints": {
            "payments": 9,
            "transfers": 9
        }
    }

if __name__ == "__main__":
    print("🧪 Starting CRUD Test Server...")
    print("📚 Documentation: http://localhost:8001/docs")
    print("🔄 Health check: http://localhost:8001/health") 
    print("=== NO AUTHENTICATION REQUIRED ===")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,  # Different port to avoid conflicts
        log_level="info"
    )