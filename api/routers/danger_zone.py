"""
🚨 Danger Zone Router - Operaciones críticas y eliminación de datos
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from datetime import datetime, timedelta
from typing import List, Optional, Dict
from pydantic import BaseModel, Field, validator
from enum import Enum
import uuid
import asyncio

from schemas.base import BaseResponse
from core.security import get_current_user
from core.database import get_db

router = APIRouter()


class ConfirmationLevel(str, Enum):
    LEVEL_1 = "level_1"  # Initial request
    LEVEL_2 = "level_2"  # Confirm understanding
    LEVEL_3 = "level_3"  # Confirm data types
    LEVEL_4 = "level_4"  # Final confirmation


class DeletionConfirmation(BaseModel):
    """Confirmación para eliminación de datos"""
    confirmation_text: str = Field(..., description="Texto exacto de confirmación requerido")
    confirmation_level: ConfirmationLevel = Field(..., description="Nivel de confirmación")
    user_understands_consequences: bool = Field(..., description="Usuario entiende las consecuencias")
    
    @validator('confirmation_text')
    def validate_confirmation_text(cls, v, values):
        if 'confirmation_level' in values:
            level = values['confirmation_level']
            required_texts = {
                ConfirmationLevel.LEVEL_1: "ELIMINAR TODOS MIS DATOS",
                ConfirmationLevel.LEVEL_2: "ENTIENDO QUE ESTA ACCIÓN ES IRREVERSIBLE",
                ConfirmationLevel.LEVEL_3: "CONFIRMO ELIMINAR TRANSACCIONES PAGOS TRANSFERENCIAS CUENTAS",
                ConfirmationLevel.LEVEL_4: "CONFIRMO ELIMINACIÓN DEFINITIVA DE TODOS MIS DATOS FINANCIEROS"
            }
            
            if v != required_texts.get(level):
                raise ValueError(f'Texto de confirmación incorrecto para nivel {level}')
        return v


class DataDeletionRequest(BaseModel):
    """Solicitud de eliminación de datos del usuario"""
    confirmations: List[DeletionConfirmation] = Field(..., min_items=4, max_items=4)
    deletion_reason: Optional[str] = Field(None, max_length=500, description="Razón opcional para la eliminación")
    backup_email: Optional[str] = Field(None, description="Email para confirmación de eliminación")
    
    @validator('confirmations')
    def validate_all_levels(cls, v):
        expected_levels = [ConfirmationLevel.LEVEL_1, ConfirmationLevel.LEVEL_2, 
                          ConfirmationLevel.LEVEL_3, ConfirmationLevel.LEVEL_4]
        actual_levels = [conf.confirmation_level for conf in v]
        
        if set(actual_levels) != set(expected_levels):
            raise ValueError('Todos los niveles de confirmación son requeridos')
        
        # Check order
        if actual_levels != expected_levels:
            raise ValueError('Los niveles de confirmación deben estar en orden correcto')
        
        return v


class DeletionStatus(str, Enum):
    REQUESTED = "requested"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DeletionTaskResponse(BaseModel):
    """Respuesta de tarea de eliminación"""
    task_id: str
    status: DeletionStatus
    user_id: str
    requested_at: datetime
    estimated_completion: datetime
    data_categories: List[str]
    total_records_estimated: int
    progress_percentage: float = 0.0
    current_step: str = "Iniciando eliminación..."
    warning_message: str = "⚠️  Esta operación no se puede deshacer"


@router.get("/info", response_model=Dict)
async def get_danger_zone_info(
    current_user: dict = Depends(get_current_user)
):
    """
    🚨 Información sobre las operaciones del Danger Zone
    
    Explica qué datos se eliminarán y el proceso de confirmación.
    """
    return {
        "warning": "🚨 DANGER ZONE - OPERACIONES IRREVERSIBLES",
        "available_operations": {
            "data_deletion": {
                "description": "Eliminar todos los datos financieros del usuario",
                "affects": [
                    "Todas las transacciones",
                    "Todos los pagos y transferencias", 
                    "Todas las cuentas y balances",
                    "Configuraciones personales",
                    "Reglas de automatización",
                    "Reportes y análisis generados",
                    "Historial de insights de IA"
                ],
                "preserves": [
                    "Cuenta de usuario en Supabase",
                    "Email y credenciales de acceso",
                    "Posibilidad de crear nuevos datos"
                ],
                "requirements": "4 niveles de confirmación requeridos",
                "estimated_time": "5-15 minutos dependiendo del volumen de datos"
            }
        },
        "confirmation_process": {
            "level_1": "Confirmar intención inicial",
            "level_2": "Confirmar entendimiento de irreversibilidad", 
            "level_3": "Confirmar categorías específicas de datos",
            "level_4": "Confirmación final definitiva"
        },
        "safety_measures": [
            "Múltiples confirmaciones requeridas",
            "Texto exacto requerido para cada confirmación",
            "Proceso de eliminación por pasos monitoreado",
            "Logging de auditoría completo",
            "Cuenta de Supabase preservada para futuro uso"
        ]
    }


@router.get("/data-summary", response_model=Dict)
async def get_user_data_summary(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    📊 Resumen de datos del usuario que serían eliminados
    
    Muestra estadísticas de todos los datos que se eliminarían.
    """
    user_id = current_user["id"]
    
    # Mock implementation - en producción consultaría la base de datos real
    data_summary = await get_user_data_statistics(db, user_id)
    
    return {
        "user_id": user_id,
        "data_categories": {
            "transactions": {
                "count": data_summary.get("transactions", 0),
                "description": "Todas las transacciones registradas",
                "oldest_record": "2023-01-15",
                "newest_record": "2024-08-25"
            },
            "payments": {
                "count": data_summary.get("payments", 0),
                "description": "Pagos realizados y programados",
                "total_amount": f"${data_summary.get('payments_total', 0):,.2f}"
            },
            "transfers": {
                "count": data_summary.get("transfers", 0),
                "description": "Transferencias internas y externas",
                "total_amount": f"${data_summary.get('transfers_total', 0):,.2f}"
            },
            "accounts": {
                "count": data_summary.get("accounts", 0),
                "description": "Cuentas bancarias y financieras",
                "total_balance": f"${data_summary.get('total_balance', 0):,.2f}"
            },
            "automation_rules": {
                "count": data_summary.get("automation_rules", 0),
                "description": "Reglas de automatización creadas"
            },
            "reports": {
                "count": data_summary.get("reports", 0),
                "description": "Reportes generados y guardados"
            },
            "ai_insights": {
                "count": data_summary.get("ai_insights", 0),
                "description": "Insights y recomendaciones de IA"
            }
        },
        "estimated_total_records": sum([
            data_summary.get("transactions", 0),
            data_summary.get("payments", 0), 
            data_summary.get("transfers", 0),
            data_summary.get("accounts", 0),
            data_summary.get("automation_rules", 0),
            data_summary.get("reports", 0),
            data_summary.get("ai_insights", 0)
        ]),
        "warning": "⚠️  Todos estos datos serán eliminados permanentemente",
        "account_preservation": "✅ Tu cuenta de usuario de Supabase se mantendrá intacta"
    }


@router.post("/request-deletion", response_model=DeletionTaskResponse)
async def request_data_deletion(
    deletion_request: DataDeletionRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    🚨 SOLICITAR ELIMINACIÓN COMPLETA DE DATOS DEL USUARIO
    
    ⚠️  ADVERTENCIA: Esta operación elimina TODOS los datos financieros del usuario.
    
    Requiere 4 confirmaciones específicas:
    1. "ELIMINAR TODOS MIS DATOS"
    2. "ENTIENDO QUE ESTA ACCIÓN ES IRREVERSIBLE" 
    3. "CONFIRMO ELIMINAR TRANSACCIONES PAGOS TRANSFERENCIAS CUENTAS"
    4. "CONFIRMO ELIMINACIÓN DEFINITIVA DE TODOS MIS DATOS FINANCIEROS"
    
    La cuenta de Supabase se mantiene intacta para uso futuro.
    """
    user_id = current_user["id"]
    
    # Verificar que no hay otra eliminación en progreso
    existing_task = await get_active_deletion_task(db, user_id)
    if existing_task:
        raise HTTPException(
            status_code=409,
            detail="Ya existe una tarea de eliminación activa para este usuario"
        )
    
    # Crear tarea de eliminación
    task_id = f"del_{uuid.uuid4().hex[:12]}"
    
    deletion_task = {
        "task_id": task_id,
        "status": DeletionStatus.REQUESTED,
        "user_id": user_id,
        "requested_at": datetime.utcnow(),
        "estimated_completion": datetime.utcnow() + timedelta(minutes=15),
        "deletion_reason": deletion_request.deletion_reason,
        "backup_email": deletion_request.backup_email,
        "confirmations": [conf.dict() for conf in deletion_request.confirmations]
    }
    
    # Guardar tarea en base de datos
    await save_deletion_task(db, deletion_task)
    
    # Obtener estadísticas de datos a eliminar
    data_stats = await get_user_data_statistics(db, user_id)
    total_records = sum([
        data_stats.get("transactions", 0),
        data_stats.get("payments", 0),
        data_stats.get("transfers", 0), 
        data_stats.get("accounts", 0),
        data_stats.get("automation_rules", 0),
        data_stats.get("reports", 0),
        data_stats.get("ai_insights", 0)
    ])
    
    # Ejecutar eliminación en background
    background_tasks.add_task(
        execute_user_data_deletion,
        db, user_id, task_id, deletion_request.backup_email
    )
    
    return DeletionTaskResponse(
        task_id=task_id,
        status=DeletionStatus.IN_PROGRESS,
        user_id=user_id,
        requested_at=deletion_task["requested_at"],
        estimated_completion=deletion_task["estimated_completion"],
        data_categories=[
            "transactions", "payments", "transfers", "accounts",
            "automation_rules", "reports", "ai_insights"
        ],
        total_records_estimated=total_records,
        current_step="Iniciando proceso de eliminación...",
        warning_message="⚠️  Eliminación en progreso. Este proceso no se puede deshacer."
    )


@router.get("/deletion-status/{task_id}", response_model=DeletionTaskResponse)
async def get_deletion_status(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    📊 Obtener estado de la tarea de eliminación
    
    Monitorea el progreso de eliminación de datos del usuario.
    """
    user_id = current_user["id"]
    
    deletion_task = await get_deletion_task_by_id(db, task_id, user_id)
    
    if not deletion_task:
        raise HTTPException(
            status_code=404,
            detail="Tarea de eliminación no encontrada"
        )
    
    return DeletionTaskResponse(**deletion_task)


@router.delete("/cancel-deletion/{task_id}")
async def cancel_deletion(
    task_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    🛑 Cancelar eliminación de datos (solo si está en estado REQUESTED)
    
    Permite cancelar la eliminación solo antes de que inicie el proceso.
    """
    user_id = current_user["id"]
    
    deletion_task = await get_deletion_task_by_id(db, task_id, user_id)
    
    if not deletion_task:
        raise HTTPException(
            status_code=404,
            detail="Tarea de eliminación no encontrada"
        )
    
    if deletion_task["status"] != DeletionStatus.REQUESTED:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede cancelar eliminación en estado {deletion_task['status']}"
        )
    
    # Cancelar tarea
    await update_deletion_task_status(db, task_id, DeletionStatus.CANCELLED)
    
    return {
        "status": "success",
        "message": "Eliminación de datos cancelada exitosamente",
        "task_id": task_id,
        "cancelled_at": datetime.utcnow()
    }


@router.get("/deletion-history", response_model=List[Dict])
async def get_deletion_history(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    📜 Historial de tareas de eliminación del usuario
    """
    user_id = current_user["id"]
    
    history = await get_user_deletion_history(db, user_id)
    
    return [{
        "task_id": task["task_id"],
        "status": task["status"], 
        "requested_at": task["requested_at"],
        "completed_at": task.get("completed_at"),
        "records_deleted": task.get("records_deleted", 0),
        "deletion_reason": task.get("deletion_reason")
    } for task in history]


# Helper Functions (implementaciones mock para testing)

async def get_user_data_statistics(db, user_id: str) -> Dict[str, int]:
    """Obtener estadísticas de datos del usuario"""
    # Mock implementation
    return {
        "transactions": 1250,
        "payments": 89,
        "transfers": 45,
        "accounts": 5,
        "automation_rules": 12,
        "reports": 23,
        "ai_insights": 67,
        "payments_total": 15750.50,
        "transfers_total": 8900.25,
        "total_balance": 25680.75
    }


async def get_active_deletion_task(db, user_id: str) -> Optional[Dict]:
    """Verificar si hay tarea de eliminación activa"""
    # Mock implementation
    return None


async def save_deletion_task(db, task_data: Dict):
    """Guardar tarea de eliminación"""
    # Mock implementation
    pass


async def get_deletion_task_by_id(db, task_id: str, user_id: str) -> Optional[Dict]:
    """Obtener tarea de eliminación por ID"""
    # Mock implementation
    return {
        "task_id": task_id,
        "status": DeletionStatus.IN_PROGRESS,
        "user_id": user_id,
        "requested_at": datetime.utcnow() - timedelta(minutes=5),
        "estimated_completion": datetime.utcnow() + timedelta(minutes=10),
        "data_categories": ["transactions", "payments", "transfers", "accounts"],
        "total_records_estimated": 1491,
        "progress_percentage": 35.5,
        "current_step": "Eliminando transacciones... (450/1250)"
    }


async def update_deletion_task_status(db, task_id: str, status: DeletionStatus):
    """Actualizar estado de tarea de eliminación"""
    # Mock implementation
    pass


async def get_user_deletion_history(db, user_id: str) -> List[Dict]:
    """Obtener historial de eliminaciones del usuario"""
    # Mock implementation
    return []


async def execute_user_data_deletion(db, user_id: str, task_id: str, backup_email: Optional[str]):
    """
    🚨 EJECUTAR ELIMINACIÓN COMPLETA DE DATOS DEL USUARIO
    
    Esta función elimina TODOS los datos financieros pero preserva la cuenta de Supabase.
    """
    try:
        # Actualizar estado a IN_PROGRESS
        await update_deletion_task_status(db, task_id, DeletionStatus.IN_PROGRESS)
        
        deletion_steps = [
            ("Eliminando transacciones", delete_user_transactions),
            ("Eliminando pagos", delete_user_payments),
            ("Eliminando transferencias", delete_user_transfers),
            ("Eliminando cuentas", delete_user_accounts),
            ("Eliminando reglas de automatización", delete_user_automation_rules),
            ("Eliminando reportes", delete_user_reports),
            ("Eliminando insights de IA", delete_user_ai_insights),
            ("Limpieza final", cleanup_user_preferences)
        ]
        
        total_steps = len(deletion_steps)
        
        for i, (step_description, deletion_function) in enumerate(deletion_steps):
            # Actualizar progreso
            progress = (i / total_steps) * 100
            await update_deletion_progress(db, task_id, progress, step_description)
            
            # Ejecutar paso de eliminación
            await deletion_function(db, user_id)
            
            # Pausa pequeña para permitir monitoreo
            await asyncio.sleep(1)
        
        # Marcar como completado
        await update_deletion_task_status(db, task_id, DeletionStatus.COMPLETED)
        await update_deletion_progress(db, task_id, 100.0, "✅ Eliminación completada exitosamente")
        
        # Enviar confirmación por email si se proporcionó
        if backup_email:
            await send_deletion_confirmation_email(backup_email, user_id, task_id)
        
        # Log de auditoría
        await log_user_data_deletion(user_id, task_id, "COMPLETED")
        
    except Exception as e:
        # Marcar como fallido
        await update_deletion_task_status(db, task_id, DeletionStatus.FAILED)
        await update_deletion_progress(db, task_id, 0, f"❌ Error durante eliminación: {str(e)}")
        
        # Log de auditoría del error
        await log_user_data_deletion(user_id, task_id, f"FAILED: {str(e)}")


async def delete_user_transactions(db, user_id: str):
    """Eliminar todas las transacciones del usuario"""
    # Mock implementation
    await asyncio.sleep(2)  # Simular procesamiento


async def delete_user_payments(db, user_id: str):
    """Eliminar todos los pagos del usuario"""
    # Mock implementation
    await asyncio.sleep(1)


async def delete_user_transfers(db, user_id: str):
    """Eliminar todas las transferencias del usuario"""
    # Mock implementation
    await asyncio.sleep(1)


async def delete_user_accounts(db, user_id: str):
    """Eliminar todas las cuentas del usuario"""
    # Mock implementation
    await asyncio.sleep(1)


async def delete_user_automation_rules(db, user_id: str):
    """Eliminar reglas de automatización del usuario"""
    # Mock implementation
    await asyncio.sleep(0.5)


async def delete_user_reports(db, user_id: str):
    """Eliminar reportes del usuario"""
    # Mock implementation
    await asyncio.sleep(0.5)


async def delete_user_ai_insights(db, user_id: str):
    """Eliminar insights de IA del usuario"""
    # Mock implementation
    await asyncio.sleep(0.5)


async def cleanup_user_preferences(db, user_id: str):
    """Limpiar preferencias y configuraciones del usuario"""
    # Mock implementation
    await asyncio.sleep(0.5)


async def update_deletion_progress(db, task_id: str, progress: float, current_step: str):
    """Actualizar progreso de eliminación"""
    # Mock implementation
    pass


async def send_deletion_confirmation_email(email: str, user_id: str, task_id: str):
    """Enviar confirmación por email"""
    # Mock implementation
    pass


async def log_user_data_deletion(user_id: str, task_id: str, result: str):
    """Log de auditoría para eliminación de datos"""
    # Mock implementation - en producción guardaría en logs de auditoría
    print(f"AUDIT LOG: User {user_id} data deletion task {task_id} - Result: {result}")