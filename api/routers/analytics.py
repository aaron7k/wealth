"""
📊 Advanced Analytics and Insights Router

Este router proporciona análisis financiero avanzado, predicciones con IA,
y insights inteligentes para optimizar las finanzas personales.
"""

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.cluster import KMeans

from schemas.analytics import (
    AnalyticsRequest, AnalyticsResponse, TrendAnalysis, 
    ComparisonAnalytics, SmartInsight, CashFlowPrediction,
    FinancialHealthScore, ExpenseAnalytics, IncomeAnalytics
)
from schemas.base import BaseResponse, CurrencyAmount
from core.security import get_current_user
from core.database import get_db
from services.analytics_service import AnalyticsService
from services.ai_service import AIInsightsService

router = APIRouter()


@router.get(
    "/dashboard", 
    response_model=AnalyticsResponse,
    summary="📊 Complete Financial Dashboard",
    description="""
    Obtiene un dashboard completo con todos los analytics financieros:
    
    - 📈 Health score financiero
    - 💸 Análisis de gastos por categoría  
    - 💰 Análisis de ingresos
    - 🎯 Performance de presupuestos
    - 🏦 Analytics de ahorros
    - 🔮 Predicciones de flujo de efectivo (opcional)
    - 🧠 Insights inteligentes con IA
    """
)
async def get_financial_dashboard(
    request: AnalyticsRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    analytics_service = AnalyticsService(db, current_user["id"])
    
    # Get comprehensive analytics
    dashboard_data = await analytics_service.get_complete_dashboard(request)
    
    return AnalyticsResponse(
        message="Financial dashboard generated successfully",
        **dashboard_data
    )


@router.get(
    "/spending-patterns",
    summary="🔍 Spending Pattern Analysis", 
    description="""
    Análisis avanzado de patrones de gasto usando Machine Learning:
    
    - Clustering de transacciones similares
    - Detección de gastos anómalos
    - Identificación de patrones estacionales
    - Predicción de gastos futuros
    """
)
async def analyze_spending_patterns(
    period: str = Query("monthly", description="Período de análisis"),
    categories: Optional[List[str]] = Query(None, description="Filtrar por categorías"),
    include_predictions: bool = Query(True, description="Incluir predicciones"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    analytics_service = AnalyticsService(db, current_user["id"])
    
    # Analyze spending patterns with ML
    patterns = await analytics_service.analyze_spending_patterns(
        period=period,
        categories=categories,
        include_predictions=include_predictions
    )
    
    return {
        "status": "success",
        "message": "Spending patterns analyzed successfully",
        "data": patterns
    }


@router.get(
    "/cash-flow/predictions",
    response_model=List[CashFlowPrediction],
    summary="🔮 Cash Flow Predictions",
    description="""
    Predicciones inteligentes de flujo de efectivo usando algoritmos de ML:
    
    - Predicción de ingresos futuros basada en patrones históricos
    - Predicción de gastos por categoría
    - Análisis de estacionalidad
    - Confidence scores para cada predicción
    """
)
async def predict_cash_flow(
    months_ahead: int = Query(3, ge=1, le=12, description="Meses a predecir"),
    include_scenarios: bool = Query(False, description="Incluir escenarios optimista/pesimista"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    analytics_service = AnalyticsService(db, current_user["id"])
    
    predictions = await analytics_service.predict_cash_flow(
        months_ahead=months_ahead,
        include_scenarios=include_scenarios
    )
    
    return predictions


@router.get(
    "/financial-health",
    response_model=FinancialHealthScore,
    summary="❤️ Financial Health Assessment",
    description="""
    Evaluación completa de salud financiera con recomendaciones personalizadas:
    
    - Score general (0-100)
    - Ratio de ahorros
    - Ratio deuda/ingresos  
    - Consistencia de gastos
    - Fondo de emergencia
    - Recomendaciones específicas basadas en IA
    """
)
async def get_financial_health(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    analytics_service = AnalyticsService(db, current_user["id"])
    ai_service = AIInsightsService()
    
    # Calculate comprehensive health score
    health_data = await analytics_service.calculate_financial_health()
    
    # Get AI-powered recommendations
    recommendations = await ai_service.generate_health_recommendations(
        health_data, current_user["profile"]
    )
    
    health_data["recommendations"] = recommendations
    
    return FinancialHealthScore(**health_data)


@router.get(
    "/trends/{metric}",
    response_model=TrendAnalysis,
    summary="📈 Trend Analysis",
    description="""
    Análisis de tendencias para cualquier métrica financiera:
    
    Métricas disponibles:
    - `income`: Tendencia de ingresos
    - `expenses`: Tendencia de gastos
    - `savings`: Tendencia de ahorros
    - `net_worth`: Patrimonio neto
    - `category_spending`: Gastos por categoría
    """
)
async def analyze_trend(
    metric: str,
    period: str = Query("monthly", description="Período de análisis"),
    lookback_months: int = Query(12, ge=3, le=36, description="Meses históricos a analizar"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    analytics_service = AnalyticsService(db, current_user["id"])
    
    trend_data = await analytics_service.analyze_trend(
        metric=metric,
        period=period,
        lookback_months=lookback_months
    )
    
    return TrendAnalysis(**trend_data)


@router.get(
    "/compare",
    response_model=ComparisonAnalytics,
    summary="⚖️ Period Comparison",
    description="""
    Compara diferentes períodos para identificar cambios significativos:
    
    - Comparación mes vs mes anterior
    - Comparación año vs año anterior  
    - Comparación de categorías de gasto
    - Identificación de cambios significativos
    """
)
async def compare_periods(
    comparison_type: str = Query("month_over_month", description="Tipo de comparación"),
    current_period_start: Optional[date] = Query(None),
    current_period_end: Optional[date] = Query(None),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    analytics_service = AnalyticsService(db, current_user["id"])
    
    comparison_data = await analytics_service.compare_periods(
        comparison_type=comparison_type,
        current_period_start=current_period_start,
        current_period_end=current_period_end
    )
    
    return ComparisonAnalytics(**comparison_data)


@router.get(
    "/insights",
    response_model=List[SmartInsight],
    summary="🧠 AI-Powered Insights",
    description="""
    Insights inteligentes generados por IA basados en tus datos financieros:
    
    - Detección automática de oportunidades de ahorro
    - Alertas sobre gastos inusuales
    - Recomendaciones de optimización de presupuesto
    - Sugerencias de inversión basadas en perfil de riesgo
    """
)
async def get_smart_insights(
    categories: Optional[List[str]] = Query(None, description="Filtrar por categorías"),
    impact_level: Optional[str] = Query(None, description="Nivel de impacto: high, medium, low"),
    limit: int = Query(10, ge=1, le=50, description="Máximo número de insights"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    ai_service = AIInsightsService()
    analytics_service = AnalyticsService(db, current_user["id"])
    
    # Get user's financial data
    financial_data = await analytics_service.get_user_financial_summary()
    
    # Generate AI insights
    insights = await ai_service.generate_smart_insights(
        financial_data=financial_data,
        user_profile=current_user["profile"],
        categories=categories,
        impact_level=impact_level,
        limit=limit
    )
    
    return insights


@router.post(
    "/insights/refresh",
    summary="🔄 Refresh AI Insights",
    description="""
    Regenera insights inteligentes basados en los datos más recientes.
    Útil después de agregar nuevas transacciones o cambiar configuraciones.
    """
)
async def refresh_insights(
    background_tasks: BackgroundTasks,
    force_refresh: bool = Query(False, description="Forzar regeneración completa"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    # Add background task to regenerate insights
    background_tasks.add_task(
        refresh_user_insights,
        user_id=current_user["id"],
        force_refresh=force_refresh
    )
    
    return {
        "status": "success", 
        "message": "Insight refresh scheduled",
        "estimated_time": "2-5 minutes"
    }


@router.get(
    "/export/{format}",
    summary="📤 Export Analytics",
    description="""
    Exporta análisis financiero en diferentes formatos:
    
    - `pdf`: Report completo en PDF
    - `excel`: Datos detallados en Excel
    - `csv`: Datos tabulares en CSV
    - `json`: Datos estructurados en JSON
    """
)
async def export_analytics(
    format: str,
    include_insights: bool = Query(True),
    include_predictions: bool = Query(True),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    analytics_service = AnalyticsService(db, current_user["id"])
    
    if format not in ["pdf", "excel", "csv", "json"]:
        raise HTTPException(status_code=400, detail="Invalid export format")
    
    export_data = await analytics_service.export_analytics(
        format=format,
        include_insights=include_insights,
        include_predictions=include_predictions
    )
    
    return {
        "status": "success",
        "download_url": export_data["download_url"],
        "expires_at": export_data["expires_at"],
        "file_size": export_data["file_size"]
    }


# Background task functions
async def refresh_user_insights(user_id: str, force_refresh: bool = False):
    """Background task to refresh user insights"""
    try:
        ai_service = AIInsightsService()
        await ai_service.refresh_user_insights(user_id, force_refresh)
    except Exception as e:
        print(f"Error refreshing insights for user {user_id}: {e}")


# WebSocket endpoint for real-time analytics
@router.websocket("/realtime")
async def analytics_websocket(websocket):
    """
    WebSocket para analytics en tiempo real.
    Útil para dashboards que se actualizan automáticamente.
    """
    await websocket.accept()
    # Implementation would go here
    # This would stream real-time analytics updates
    pass