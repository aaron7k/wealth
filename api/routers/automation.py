"""
🤖 Smart Financial Automation Router

Automatización inteligente para optimizar y simplificar la gestión financiera:
- Auto-categorización de transacciones con ML
- Reglas de negocio personalizables
- Transferencias automáticas inteligentes  
- Alertas y notificaciones contextuales
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum

from schemas.base import BaseResponse, CurrencyAmount
from core.security import get_current_user
from core.database import get_db
from services.automation_service import AutomationService
from services.ai_service import AIService

router = APIRouter()


class RuleType(str, Enum):
    CATEGORIZATION = "categorization"
    TRANSFER = "transfer" 
    ALERT = "alert"
    BUDGET_ADJUSTMENT = "budget_adjustment"
    SAVINGS_GOAL = "savings_goal"


class TriggerType(str, Enum):
    TRANSACTION_ADDED = "transaction_added"
    AMOUNT_THRESHOLD = "amount_threshold"
    DATE_SCHEDULED = "date_scheduled"
    CATEGORY_SPENDING = "category_spending"
    BALANCE_CHANGE = "balance_change"


class ActionType(str, Enum):
    CATEGORIZE = "categorize"
    TRANSFER_MONEY = "transfer_money"
    SEND_NOTIFICATION = "send_notification"
    ADJUST_BUDGET = "adjust_budget"
    CREATE_SAVINGS = "create_savings"


class AutomationRule(BaseModel):
    """Automation rule definition"""
    name: str = Field(..., description="Nombre descriptivo de la regla")
    description: Optional[str] = Field(None, description="Descripción detallada")
    rule_type: RuleType
    trigger_type: TriggerType
    trigger_conditions: Dict[str, Any] = Field(..., description="Condiciones que disparan la regla")
    actions: List[Dict[str, Any]] = Field(..., description="Acciones a ejecutar")
    is_active: bool = True
    priority: int = Field(1, ge=1, le=10, description="Prioridad de ejecución (1=alta, 10=baja)")


class AutomationRuleResponse(BaseResponse):
    """Response for automation rule operations"""
    rule: Dict[str, Any]


@router.get(
    "/rules",
    summary="📋 List Automation Rules",
    description="""
    Lista todas las reglas de automatización del usuario:
    
    - Reglas activas e inactivas
    - Filtrar por tipo de regla
    - Estadísticas de ejecución
    - Última actividad
    """
)
async def get_automation_rules(
    rule_type: Optional[RuleType] = Query(None, description="Filtrar por tipo de regla"),
    is_active: Optional[bool] = Query(None, description="Filtrar por estado activo"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    automation_service = AutomationService(db, current_user["id"])
    
    rules = await automation_service.get_user_rules(
        rule_type=rule_type,
        is_active=is_active
    )
    
    return {
        "status": "success",
        "data": rules,
        "total": len(rules)
    }


@router.post(
    "/rules",
    response_model=AutomationRuleResponse,
    summary="➕ Create Automation Rule",
    description="""
    Crea una nueva regla de automatización personalizada:
    
    **Ejemplos de reglas útiles:**
    
    🏷️ **Auto-categorización:**
    - "Si la descripción contiene 'Uber' → categorizar como 'Transporte'"
    - "Si el monto es > $500 en 'Compras' → alertar"
    
    💰 **Transferencias automáticas:**
    - "Cada 1ro del mes → transferir 10% del saldo a ahorros"
    - "Si balance > $5000 → transferir exceso a inversiones"
    
    🚨 **Alertas inteligentes:**
    - "Si gasto en 'Restaurantes' > presupuesto → notificar"
    - "Si no hay ingresos en 30 días → alertar"
    """
)
async def create_automation_rule(
    rule: AutomationRule,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    automation_service = AutomationService(db, current_user["id"])
    
    # Validate rule configuration
    await automation_service.validate_rule(rule.dict())
    
    # Create the rule
    created_rule = await automation_service.create_rule(rule.dict())
    
    return AutomationRuleResponse(
        message="Automation rule created successfully",
        rule=created_rule
    )


@router.put(
    "/rules/{rule_id}",
    response_model=AutomationRuleResponse,
    summary="✏️ Update Automation Rule"
)
async def update_automation_rule(
    rule_id: str,
    rule: AutomationRule,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    automation_service = AutomationService(db, current_user["id"])
    
    updated_rule = await automation_service.update_rule(rule_id, rule.dict())
    
    return AutomationRuleResponse(
        message="Automation rule updated successfully",
        rule=updated_rule
    )


@router.delete(
    "/rules/{rule_id}",
    summary="🗑️ Delete Automation Rule"
)
async def delete_automation_rule(
    rule_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    automation_service = AutomationService(db, current_user["id"])
    
    await automation_service.delete_rule(rule_id)
    
    return {
        "status": "success",
        "message": "Automation rule deleted successfully"
    }


@router.post(
    "/rules/{rule_id}/toggle",
    summary="🔄 Toggle Rule Status"
)
async def toggle_rule_status(
    rule_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    automation_service = AutomationService(db, current_user["id"])
    
    updated_rule = await automation_service.toggle_rule_status(rule_id)
    
    return {
        "status": "success",
        "message": f"Rule {'activated' if updated_rule['is_active'] else 'deactivated'}",
        "rule": updated_rule
    }


@router.post(
    "/auto-categorize",
    summary="🏷️ Auto-Categorize Transactions",
    description="""
    Auto-categoriza transacciones usando Machine Learning:
    
    - Analiza descripción, monto y merchant
    - Usa patrones aprendidos de categorizaciones anteriores
    - Aplica reglas personalizadas del usuario
    - Confidence score para cada categorización
    """
)
async def auto_categorize_transactions(
    background_tasks: BackgroundTasks,
    transaction_ids: Optional[List[str]] = None,
    date_range_days: int = Query(30, ge=1, le=365, description="Días hacia atrás para procesar"),
    min_confidence: float = Query(0.7, ge=0.0, le=1.0, description="Confidence mínimo para auto-aplicar"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    automation_service = AutomationService(db, current_user["id"])
    ai_service = AIService()
    
    # Add background task for processing
    background_tasks.add_task(
        process_auto_categorization,
        user_id=current_user["id"],
        transaction_ids=transaction_ids,
        date_range_days=date_range_days,
        min_confidence=min_confidence
    )
    
    return {
        "status": "success",
        "message": "Auto-categorization started",
        "estimated_time": "2-5 minutes"
    }


@router.get(
    "/suggestions",
    summary="💡 Get Automation Suggestions",
    description="""
    Sugerencias inteligentes de automatización basadas en patrones de usuario:
    
    - Reglas recomendadas basadas en comportamiento
    - Oportunidades de ahorro automático
    - Alertas sugeridas para mejor control
    - Transferencias automáticas optimizadas
    """
)
async def get_automation_suggestions(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    automation_service = AutomationService(db, current_user["id"])
    ai_service = AIService()
    
    # Analyze user patterns
    user_patterns = await automation_service.analyze_user_patterns()
    
    # Generate AI suggestions
    suggestions = await ai_service.generate_automation_suggestions(
        user_patterns, current_user["profile"]
    )
    
    return {
        "status": "success",
        "suggestions": suggestions,
        "total": len(suggestions)
    }


@router.post(
    "/smart-transfers",
    summary="💸 Smart Automatic Transfers",
    description="""
    Configurar transferencias automáticas inteligentes:
    
    - Transferencia de excedentes a ahorros
    - Distribución automática de ingresos
    - Pagos automáticos de deudas
    - Rebalanceo de cuentas
    """
)
async def setup_smart_transfers(
    transfer_config: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    automation_service = AutomationService(db, current_user["id"])
    
    # Validate transfer configuration
    validated_config = await automation_service.validate_transfer_config(transfer_config)
    
    # Create smart transfer rules
    transfer_rules = await automation_service.create_smart_transfer_rules(validated_config)
    
    return {
        "status": "success",
        "message": "Smart transfers configured",
        "rules_created": len(transfer_rules),
        "rules": transfer_rules
    }


@router.get(
    "/execution-log",
    summary="📊 Automation Execution Log",
    description="""
    Historial de ejecución de reglas de automatización:
    
    - Reglas ejecutadas recientemente
    - Éxito/fallo de cada ejecución
    - Impacto financiero de las automatizaciones
    - Estadísticas de performance
    """
)
async def get_execution_log(
    rule_id: Optional[str] = Query(None, description="Filtrar por regla específica"),
    days_back: int = Query(30, ge=1, le=365, description="Días hacia atrás"),
    status: Optional[str] = Query(None, description="Filtrar por status: success, error, pending"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    automation_service = AutomationService(db, current_user["id"])
    
    execution_log = await automation_service.get_execution_log(
        rule_id=rule_id,
        days_back=days_back,
        status=status
    )
    
    return {
        "status": "success",
        "data": execution_log,
        "summary": {
            "total_executions": len(execution_log),
            "successful": len([e for e in execution_log if e["status"] == "success"]),
            "failed": len([e for e in execution_log if e["status"] == "error"])
        }
    }


@router.post(
    "/test-rule/{rule_id}",
    summary="🧪 Test Automation Rule",
    description="""
    Prueba una regla de automatización sin ejecutar acciones reales:
    
    - Simula ejecución con datos históricos
    - Muestra qué acciones se ejecutarían
    - Valida configuración de la regla
    - Confidence scores y predicciones
    """
)
async def test_automation_rule(
    rule_id: str,
    test_data: Optional[Dict[str, Any]] = None,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    automation_service = AutomationService(db, current_user["id"])
    
    test_results = await automation_service.test_rule(rule_id, test_data)
    
    return {
        "status": "success",
        "message": "Rule test completed",
        "test_results": test_results
    }


# Background task functions
async def process_auto_categorization(
    user_id: str,
    transaction_ids: Optional[List[str]] = None,
    date_range_days: int = 30,
    min_confidence: float = 0.7
):
    """Background task for auto-categorization"""
    try:
        automation_service = AutomationService(None, user_id)
        ai_service = AIService()
        
        result = await automation_service.process_auto_categorization(
            transaction_ids, date_range_days, min_confidence
        )
        
        print(f"Auto-categorization completed for user {user_id}: {result}")
        
    except Exception as e:
        print(f"Error in auto-categorization for user {user_id}: {e}")


# Webhook endpoint for external triggers
@router.post(
    "/webhook/trigger",
    summary="🪝 External Automation Trigger",
    description="""
    Endpoint para disparar automatizaciones desde sistemas externos:
    
    - Webhooks de bancos
    - Integraciones con otros apps
    - Triggers manuales desde frontend
    - API calls de terceros
    """
)
async def webhook_trigger(
    trigger_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    automation_service = AutomationService(db, current_user["id"])
    
    # Process external trigger
    results = await automation_service.process_external_trigger(trigger_data)
    
    return {
        "status": "success",
        "message": "External trigger processed",
        "results": results
    }