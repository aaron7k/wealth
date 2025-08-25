"""
💳 Payments Router - CRUD operations for payments
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field
from enum import Enum

from schemas.base import BaseResponse, CurrencyAmount, PaginationParams, FilterParams
from core.security import get_current_user
from core.database import get_db

router = APIRouter()


class PaymentMethod(str, Enum):
    CASH = "cash"
    CARD = "card"
    BANK_TRANSFER = "bank_transfer"
    DIGITAL_WALLET = "digital_wallet"
    CHECK = "check"
    CRYPTO = "crypto"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class PaymentCreate(BaseModel):
    """Create payment request"""
    description: str = Field(..., min_length=1, max_length=200, description="Descripción del pago")
    amount: float = Field(..., gt=0, description="Monto del pago")
    currency: str = Field("USD", description="Moneda del pago")
    payment_method: PaymentMethod = Field(..., description="Método de pago")
    account_id: str = Field(..., description="ID de la cuenta de origen")
    recipient_id: Optional[str] = Field(None, description="ID del destinatario")
    recipient_name: Optional[str] = Field(None, description="Nombre del destinatario")
    recipient_account: Optional[str] = Field(None, description="Cuenta del destinatario")
    category_id: Optional[str] = Field(None, description="ID de categoría")
    scheduled_date: Optional[datetime] = Field(None, description="Fecha programada (para pagos futuros)")
    reference: Optional[str] = Field(None, description="Referencia externa")
    notes: Optional[str] = Field(None, max_length=500, description="Notas adicionales")
    tags: Optional[List[str]] = Field(default_factory=list, description="Etiquetas")


class PaymentUpdate(BaseModel):
    """Update payment request"""
    description: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[float] = Field(None, gt=0)
    payment_method: Optional[PaymentMethod] = None
    recipient_name: Optional[str] = None
    recipient_account: Optional[str] = None
    category_id: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    status: Optional[PaymentStatus] = None


class PaymentResponse(BaseModel):
    """Payment response model"""
    id: str
    description: str
    amount: float
    currency: str
    payment_method: PaymentMethod
    status: PaymentStatus
    account_id: str
    account_name: Optional[str]
    recipient_name: Optional[str]
    recipient_account: Optional[str]
    category_id: Optional[str]
    category_name: Optional[str]
    scheduled_date: Optional[datetime]
    processed_date: Optional[datetime]
    reference: Optional[str]
    transaction_id: Optional[str]
    fees: Optional[float]
    exchange_rate: Optional[float]
    notes: Optional[str]
    tags: List[str] = []
    created_at: datetime
    updated_at: datetime


@router.post("/", response_model=PaymentResponse, status_code=201)
async def create_payment(
    payment: PaymentCreate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    💳 Crear un nuevo pago
    
    Registra un pago nuevo que puede ser:
    - Inmediato: se procesa al momento
    - Programado: se ejecuta en fecha futura
    - Recurrente: se repite según configuración
    """
    # Validate account ownership
    account = await verify_account_ownership(db, payment.account_id, current_user["id"])
    
    # Calculate fees if applicable
    fees = await calculate_payment_fees(payment.payment_method, payment.amount, payment.currency)
    
    # Create payment record
    payment_data = {
        **payment.dict(),
        "id": f"pay_{generate_id()}",
        "user_id": current_user["id"],
        "status": PaymentStatus.PENDING,
        "fees": fees,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Save to database
    saved_payment = await save_payment(db, payment_data)
    
    # Process immediate payments
    if not payment.scheduled_date:
        await process_payment(db, saved_payment["id"])
    
    return PaymentResponse(**saved_payment)


@router.get("/", response_model=List[PaymentResponse])
async def get_payments(
    pagination: PaginationParams = Depends(),
    filters: FilterParams = Depends(),
    status: Optional[PaymentStatus] = Query(None, description="Filtrar por estado"),
    payment_method: Optional[PaymentMethod] = Query(None, description="Filtrar por método de pago"),
    account_id: Optional[str] = Query(None, description="Filtrar por cuenta"),
    category_id: Optional[str] = Query(None, description="Filtrar por categoría"),
    min_amount: Optional[float] = Query(None, ge=0, description="Monto mínimo"),
    max_amount: Optional[float] = Query(None, gt=0, description="Monto máximo"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    📋 Listar pagos del usuario
    
    Soporta filtros avanzados:
    - Por estado, método, cuenta, categoría
    - Por rango de fechas y montos
    - Búsqueda por descripción
    - Ordenamiento y paginación
    """
    query_filters = {
        "user_id": current_user["id"],
        "status": status,
        "payment_method": payment_method,
        "account_id": account_id,
        "category_id": category_id,
        "min_amount": min_amount,
        "max_amount": max_amount,
        **filters.dict(exclude_none=True)
    }
    
    payments = await get_payments_from_db(db, query_filters, pagination)
    
    return [PaymentResponse(**payment) for payment in payments]


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    🔍 Obtener detalles de un pago específico
    """
    payment = await get_payment_by_id(db, payment_id, current_user["id"])
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    return PaymentResponse(**payment)


@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: str,
    payment_update: PaymentUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    ✏️ Actualizar un pago
    
    Solo se pueden actualizar pagos en estado PENDING o FAILED.
    Pagos COMPLETED no se pueden modificar.
    """
    # Get existing payment
    existing_payment = await get_payment_by_id(db, payment_id, current_user["id"])
    
    if not existing_payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Check if payment can be updated
    if existing_payment["status"] in [PaymentStatus.COMPLETED, PaymentStatus.PROCESSING]:
        raise HTTPException(
            status_code=400, 
            detail="Cannot update payment in completed or processing status"
        )
    
    # Update payment
    update_data = payment_update.dict(exclude_none=True)
    update_data["updated_at"] = datetime.utcnow()
    
    updated_payment = await update_payment_in_db(db, payment_id, update_data)
    
    return PaymentResponse(**updated_payment)


@router.delete("/{payment_id}")
async def cancel_payment(
    payment_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    ❌ Cancelar un pago
    
    Solo se pueden cancelar pagos PENDING o SCHEDULED.
    Pagos procesados requieren un proceso de reembolso.
    """
    payment = await get_payment_by_id(db, payment_id, current_user["id"])
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["status"] not in [PaymentStatus.PENDING]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel payment with status {payment['status']}"
        )
    
    # Cancel payment
    await update_payment_status(db, payment_id, PaymentStatus.CANCELLED)
    
    return {"status": "success", "message": "Payment cancelled successfully"}


@router.post("/{payment_id}/process")
async def process_payment_manually(
    payment_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    ⚡ Procesar pago manualmente
    
    Fuerza el procesamiento de un pago PENDING.
    Útil para pagos programados que se quieren ejecutar antes.
    """
    payment = await get_payment_by_id(db, payment_id, current_user["id"])
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["status"] != PaymentStatus.PENDING:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot process payment with status {payment['status']}"
        )
    
    # Process payment
    result = await process_payment(db, payment_id)
    
    return {
        "status": "success",
        "message": "Payment processed successfully",
        "transaction_id": result.get("transaction_id"),
        "processed_at": datetime.utcnow()
    }


@router.post("/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    refund_amount: Optional[float] = Query(None, description="Monto a reembolsar (opcional, por defecto el total)"),
    reason: Optional[str] = Query(None, description="Razón del reembolso"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    💸 Reembolsar un pago
    
    Crear un reembolso parcial o total para un pago completado.
    """
    payment = await get_payment_by_id(db, payment_id, current_user["id"])
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    if payment["status"] != PaymentStatus.COMPLETED:
        raise HTTPException(
            status_code=400,
            detail="Only completed payments can be refunded"
        )
    
    # Default to full refund
    if not refund_amount:
        refund_amount = payment["amount"]
    
    # Validate refund amount
    if refund_amount > payment["amount"]:
        raise HTTPException(
            status_code=400,
            detail="Refund amount cannot exceed original payment amount"
        )
    
    # Process refund
    refund_result = await process_refund(db, payment_id, refund_amount, reason)
    
    return {
        "status": "success",
        "message": "Refund processed successfully",
        "refund_id": refund_result["id"],
        "refund_amount": refund_amount,
        "processed_at": datetime.utcnow()
    }


@router.get("/scheduled/upcoming")
async def get_upcoming_payments(
    days_ahead: int = Query(30, ge=1, le=365, description="Días hacia adelante"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    📅 Pagos programados próximos
    
    Lista pagos programados para los próximos N días.
    """
    end_date = datetime.utcnow().date() + timedelta(days=days_ahead)
    
    upcoming_payments = await get_scheduled_payments(
        db, current_user["id"], end_date
    )
    
    return {
        "status": "success",
        "upcoming_payments": [PaymentResponse(**p) for p in upcoming_payments],
        "total": len(upcoming_payments),
        "period_days": days_ahead
    }


@router.post("/bulk")
async def create_bulk_payments(
    payments: List[PaymentCreate],
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    📦 Crear múltiples pagos en lote
    
    Útil para importar pagos desde archivos o crear pagos recurrentes.
    """
    if len(payments) > 100:
        raise HTTPException(
            status_code=400,
            detail="Maximum 100 payments per batch"
        )
    
    created_payments = []
    errors = []
    
    for i, payment in enumerate(payments):
        try:
            # Validate account ownership
            await verify_account_ownership(db, payment.account_id, current_user["id"])
            
            # Create payment
            payment_data = {
                **payment.dict(),
                "id": f"pay_{generate_id()}",
                "user_id": current_user["id"],
                "status": PaymentStatus.PENDING,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            saved_payment = await save_payment(db, payment_data)
            created_payments.append(PaymentResponse(**saved_payment))
            
        except Exception as e:
            errors.append({
                "index": i,
                "error": str(e),
                "payment_description": payment.description
            })
    
    return {
        "status": "success" if not errors else "partial",
        "created": len(created_payments),
        "errors": len(errors),
        "payments": created_payments,
        "error_details": errors
    }


# Helper functions (these would be implemented in services)
async def verify_account_ownership(db, account_id: str, user_id: str):
    """Verify user owns the account"""
    # Mock implementation
    return {"id": account_id, "user_id": user_id}

async def calculate_payment_fees(method: PaymentMethod, amount: float, currency: str) -> float:
    """Calculate payment fees"""
    fee_rates = {
        PaymentMethod.CARD: 0.029,  # 2.9%
        PaymentMethod.BANK_TRANSFER: 0.0,
        PaymentMethod.DIGITAL_WALLET: 0.025,  # 2.5%
        PaymentMethod.CRYPTO: 0.01,  # 1%
        PaymentMethod.CHECK: 2.50,  # Flat fee
        PaymentMethod.CASH: 0.0
    }
    
    if method == PaymentMethod.CHECK:
        return fee_rates[method]
    
    return amount * fee_rates.get(method, 0.0)

async def save_payment(db, payment_data: dict) -> dict:
    """Save payment to database"""
    # Mock implementation
    return payment_data

async def process_payment(db, payment_id: str) -> dict:
    """Process payment"""
    # Mock implementation
    await update_payment_status(db, payment_id, PaymentStatus.COMPLETED)
    return {"transaction_id": f"txn_{generate_id()}"}

async def update_payment_status(db, payment_id: str, status: PaymentStatus):
    """Update payment status"""
    # Mock implementation
    pass

async def get_payments_from_db(db, filters: dict, pagination) -> List[dict]:
    """Get payments from database"""
    # Mock implementation
    return []

async def get_payment_by_id(db, payment_id: str, user_id: str) -> dict:
    """Get payment by ID"""
    # Mock implementation
    return {
        "id": payment_id,
        "user_id": user_id,
        "description": "Test Payment",
        "amount": 100.0,
        "currency": "USD",
        "status": PaymentStatus.PENDING,
        "payment_method": PaymentMethod.CARD,
        "account_id": "acc_123",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "tags": []
    }

async def update_payment_in_db(db, payment_id: str, update_data: dict) -> dict:
    """Update payment in database"""
    # Mock implementation
    payment = await get_payment_by_id(db, payment_id, "user_123")
    payment.update(update_data)
    return payment

async def get_scheduled_payments(db, user_id: str, end_date: date) -> List[dict]:
    """Get scheduled payments"""
    # Mock implementation
    return []

async def process_refund(db, payment_id: str, amount: float, reason: str) -> dict:
    """Process refund"""
    # Mock implementation
    return {"id": f"ref_{generate_id()}", "amount": amount}

def generate_id() -> str:
    """Generate unique ID"""
    import uuid
    return str(uuid.uuid4())[:8]

from datetime import timedelta