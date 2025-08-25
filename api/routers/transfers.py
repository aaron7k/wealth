"""
🔄 Transfers Router - CRUD operations for account transfers
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, date
from typing import List, Optional
from pydantic import BaseModel, Field, validator
from enum import Enum

from schemas.base import BaseResponse, CurrencyAmount, PaginationParams, FilterParams
from core.security import get_current_user
from core.database import get_db

router = APIRouter()


class TransferType(str, Enum):
    INTERNAL = "internal"  # Between user's own accounts
    EXTERNAL = "external"  # To other users/external accounts
    BANK = "bank"         # To/from bank accounts
    WALLET = "wallet"     # To digital wallets
    INTERNATIONAL = "international"  # Cross-border transfers


class TransferStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing" 
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    SCHEDULED = "scheduled"


class TransferFrequency(str, Enum):
    ONCE = "once"
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class TransferCreate(BaseModel):
    """Create transfer request"""
    description: str = Field(..., min_length=1, max_length=200, description="Descripción de la transferencia")
    amount: float = Field(..., gt=0, description="Monto a transferir")
    currency: str = Field("USD", description="Moneda del monto")
    
    # Source account
    from_account_id: str = Field(..., description="ID de cuenta origen")
    
    # Destination details
    to_account_id: Optional[str] = Field(None, description="ID de cuenta destino (si es interna)")
    to_user_id: Optional[str] = Field(None, description="ID del usuario destinatario")
    to_account_number: Optional[str] = Field(None, description="Número de cuenta externa")
    to_bank_code: Optional[str] = Field(None, description="Código bancario")
    to_routing_number: Optional[str] = Field(None, description="Número de routing")
    
    # Recipient info
    recipient_name: str = Field(..., min_length=1, description="Nombre del destinatario")
    recipient_email: Optional[str] = Field(None, description="Email del destinatario")
    recipient_phone: Optional[str] = Field(None, description="Teléfono del destinatario")
    
    transfer_type: TransferType = Field(..., description="Tipo de transferencia")
    
    # Scheduling
    scheduled_date: Optional[datetime] = Field(None, description="Fecha programada")
    is_recurring: bool = Field(False, description="¿Es transferencia recurrente?")
    frequency: Optional[TransferFrequency] = Field(None, description="Frecuencia (si es recurrente)")
    end_date: Optional[datetime] = Field(None, description="Fecha fin (para recurrentes)")
    
    # Additional details
    reference: Optional[str] = Field(None, max_length=50, description="Referencia")
    notes: Optional[str] = Field(None, max_length=500, description="Notas adicionales")
    tags: Optional[List[str]] = Field(default_factory=list, description="Etiquetas")
    
    @validator('to_account_id', 'to_user_id', 'to_account_number')
    def validate_destination(cls, v, values):
        """At least one destination must be provided"""
        if 'transfer_type' in values:
            if values['transfer_type'] == TransferType.INTERNAL and not values.get('to_account_id'):
                raise ValueError('to_account_id required for internal transfers')
            elif values['transfer_type'] == TransferType.EXTERNAL and not values.get('to_account_number'):
                raise ValueError('to_account_number required for external transfers')
        return v


class TransferUpdate(BaseModel):
    """Update transfer request"""
    description: Optional[str] = Field(None, min_length=1, max_length=200)
    amount: Optional[float] = Field(None, gt=0)
    recipient_name: Optional[str] = None
    recipient_email: Optional[str] = None
    recipient_phone: Optional[str] = None
    scheduled_date: Optional[datetime] = None
    frequency: Optional[TransferFrequency] = None
    end_date: Optional[datetime] = None
    reference: Optional[str] = Field(None, max_length=50)
    notes: Optional[str] = Field(None, max_length=500)
    tags: Optional[List[str]] = None
    status: Optional[TransferStatus] = None


class TransferResponse(BaseModel):
    """Transfer response model"""
    id: str
    description: str
    amount: float
    currency: str
    status: TransferStatus
    transfer_type: TransferType
    
    # Account information
    from_account_id: str
    from_account_name: Optional[str]
    to_account_id: Optional[str]
    to_account_name: Optional[str]
    to_account_number: Optional[str]
    to_bank_code: Optional[str]
    
    # Recipient details
    recipient_name: str
    recipient_email: Optional[str]
    recipient_phone: Optional[str]
    
    # Processing details
    scheduled_date: Optional[datetime]
    processed_date: Optional[datetime]
    is_recurring: bool
    frequency: Optional[TransferFrequency]
    end_date: Optional[datetime]
    next_execution: Optional[datetime]
    
    # Financial details
    exchange_rate: Optional[float]
    fees: Optional[float]
    total_amount: Optional[float]  # amount + fees
    
    # Tracking
    transaction_id: Optional[str]
    reference: Optional[str]
    notes: Optional[str]
    tags: List[str] = []
    
    created_at: datetime
    updated_at: datetime


@router.post("/", response_model=TransferResponse, status_code=201)
async def create_transfer(
    transfer: TransferCreate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    🔄 Crear una nueva transferencia
    
    Soporta diferentes tipos de transferencia:
    - Interna: entre cuentas del mismo usuario
    - Externa: a otros usuarios o cuentas externas
    - Bancaria: a/desde bancos tradicionales
    - Internacional: transferencias cross-border
    """
    # Validate source account ownership
    from_account = await verify_account_ownership(db, transfer.from_account_id, current_user["id"])
    
    # Validate destination for internal transfers
    if transfer.transfer_type == TransferType.INTERNAL:
        to_account = await verify_account_ownership(db, transfer.to_account_id, current_user["id"])
    
    # Calculate fees and exchange rates
    fees, exchange_rate = await calculate_transfer_costs(
        transfer.transfer_type, 
        transfer.amount, 
        transfer.currency,
        transfer.to_account_number
    )
    
    # Create transfer record
    transfer_data = {
        **transfer.dict(),
        "id": f"txf_{generate_id()}",
        "user_id": current_user["id"],
        "status": TransferStatus.SCHEDULED if transfer.scheduled_date else TransferStatus.PENDING,
        "fees": fees,
        "exchange_rate": exchange_rate,
        "total_amount": transfer.amount + fees,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Save to database
    saved_transfer = await save_transfer(db, transfer_data)
    
    # Process immediate transfers
    if not transfer.scheduled_date:
        await process_transfer(db, saved_transfer["id"])
    
    # Setup recurring transfers
    if transfer.is_recurring:
        await setup_recurring_transfer(db, saved_transfer["id"], transfer.frequency)
    
    return TransferResponse(**saved_transfer)


@router.get("/", response_model=List[TransferResponse])
async def get_transfers(
    pagination: PaginationParams = Depends(),
    filters: FilterParams = Depends(),
    status: Optional[TransferStatus] = Query(None, description="Filtrar por estado"),
    transfer_type: Optional[TransferType] = Query(None, description="Filtrar por tipo"),
    from_account_id: Optional[str] = Query(None, description="Filtrar por cuenta origen"),
    to_account_id: Optional[str] = Query(None, description="Filtrar por cuenta destino"),
    is_recurring: Optional[bool] = Query(None, description="Solo transferencias recurrentes"),
    min_amount: Optional[float] = Query(None, ge=0, description="Monto mínimo"),
    max_amount: Optional[float] = Query(None, gt=0, description="Monto máximo"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    📋 Listar transferencias del usuario
    
    Soporta filtros avanzados por estado, tipo, cuentas y montos.
    Incluye paginación y búsqueda por descripción.
    """
    query_filters = {
        "user_id": current_user["id"],
        "status": status,
        "transfer_type": transfer_type,
        "from_account_id": from_account_id,
        "to_account_id": to_account_id,
        "is_recurring": is_recurring,
        "min_amount": min_amount,
        "max_amount": max_amount,
        **filters.dict(exclude_none=True)
    }
    
    transfers = await get_transfers_from_db(db, query_filters, pagination)
    
    return [TransferResponse(**transfer) for transfer in transfers]


@router.get("/{transfer_id}", response_model=TransferResponse)
async def get_transfer(
    transfer_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    🔍 Obtener detalles de una transferencia específica
    """
    transfer = await get_transfer_by_id(db, transfer_id, current_user["id"])
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    return TransferResponse(**transfer)


@router.put("/{transfer_id}", response_model=TransferResponse)
async def update_transfer(
    transfer_id: str,
    transfer_update: TransferUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    ✏️ Actualizar una transferencia
    
    Solo se pueden actualizar transferencias en estado PENDING o SCHEDULED.
    Transferencias COMPLETED no se pueden modificar.
    """
    # Get existing transfer
    existing_transfer = await get_transfer_by_id(db, transfer_id, current_user["id"])
    
    if not existing_transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    # Check if transfer can be updated
    if existing_transfer["status"] in [TransferStatus.COMPLETED, TransferStatus.PROCESSING]:
        raise HTTPException(
            status_code=400, 
            detail="Cannot update transfer in completed or processing status"
        )
    
    # Update transfer
    update_data = transfer_update.dict(exclude_none=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # Recalculate fees if amount changed
    if "amount" in update_data:
        fees, exchange_rate = await calculate_transfer_costs(
            existing_transfer["transfer_type"],
            update_data["amount"],
            existing_transfer["currency"],
            existing_transfer.get("to_account_number")
        )
        update_data["fees"] = fees
        update_data["total_amount"] = update_data["amount"] + fees
    
    updated_transfer = await update_transfer_in_db(db, transfer_id, update_data)
    
    return TransferResponse(**updated_transfer)


@router.delete("/{transfer_id}")
async def cancel_transfer(
    transfer_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    ❌ Cancelar una transferencia
    
    Solo se pueden cancelar transferencias PENDING o SCHEDULED.
    Transferencias procesadas no se pueden cancelar.
    """
    transfer = await get_transfer_by_id(db, transfer_id, current_user["id"])
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    if transfer["status"] not in [TransferStatus.PENDING, TransferStatus.SCHEDULED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot cancel transfer with status {transfer['status']}"
        )
    
    # Cancel transfer
    await update_transfer_status(db, transfer_id, TransferStatus.CANCELLED)
    
    # Cancel recurring setup if applicable
    if transfer["is_recurring"]:
        await cancel_recurring_transfer(db, transfer_id)
    
    return {"status": "success", "message": "Transfer cancelled successfully"}


@router.post("/{transfer_id}/execute")
async def execute_transfer_manually(
    transfer_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    ⚡ Ejecutar transferencia manualmente
    
    Fuerza la ejecución de una transferencia PENDING o SCHEDULED.
    """
    transfer = await get_transfer_by_id(db, transfer_id, current_user["id"])
    
    if not transfer:
        raise HTTPException(status_code=404, detail="Transfer not found")
    
    if transfer["status"] not in [TransferStatus.PENDING, TransferStatus.SCHEDULED]:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot execute transfer with status {transfer['status']}"
        )
    
    # Process transfer
    result = await process_transfer(db, transfer_id)
    
    return {
        "status": "success",
        "message": "Transfer executed successfully",
        "transaction_id": result.get("transaction_id"),
        "processed_at": datetime.utcnow()
    }


@router.get("/recurring/active")
async def get_recurring_transfers(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    🔄 Obtener transferencias recurrentes activas
    
    Lista todas las transferencias recurrentes con sus próximas ejecuciones.
    """
    recurring_transfers = await get_recurring_transfers_from_db(db, current_user["id"])
    
    return {
        "status": "success",
        "recurring_transfers": [TransferResponse(**t) for t in recurring_transfers],
        "total": len(recurring_transfers)
    }


@router.post("/bulk")
async def create_bulk_transfers(
    transfers: List[TransferCreate],
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    📦 Crear múltiples transferencias en lote
    
    Útil para transferencias masivas o importación desde archivos.
    """
    if len(transfers) > 50:
        raise HTTPException(
            status_code=400,
            detail="Maximum 50 transfers per batch"
        )
    
    created_transfers = []
    errors = []
    
    for i, transfer in enumerate(transfers):
        try:
            # Validate source account ownership
            await verify_account_ownership(db, transfer.from_account_id, current_user["id"])
            
            # Calculate costs
            fees, exchange_rate = await calculate_transfer_costs(
                transfer.transfer_type,
                transfer.amount,
                transfer.currency,
                transfer.to_account_number
            )
            
            # Create transfer
            transfer_data = {
                **transfer.dict(),
                "id": f"txf_{generate_id()}",
                "user_id": current_user["id"],
                "status": TransferStatus.PENDING,
                "fees": fees,
                "exchange_rate": exchange_rate,
                "total_amount": transfer.amount + fees,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            saved_transfer = await save_transfer(db, transfer_data)
            created_transfers.append(TransferResponse(**saved_transfer))
            
        except Exception as e:
            errors.append({
                "index": i,
                "error": str(e),
                "transfer_description": transfer.description
            })
    
    return {
        "status": "success" if not errors else "partial",
        "created": len(created_transfers),
        "errors": len(errors),
        "transfers": created_transfers,
        "error_details": errors
    }


@router.get("/scheduled/upcoming")
async def get_upcoming_transfers(
    days_ahead: int = Query(30, ge=1, le=365, description="Días hacia adelante"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """
    📅 Transferencias programadas próximas
    
    Lista transferencias programadas para los próximos N días.
    """
    from datetime import timedelta
    end_date = datetime.utcnow().date() + timedelta(days=days_ahead)
    
    upcoming_transfers = await get_scheduled_transfers(
        db, current_user["id"], end_date
    )
    
    return {
        "status": "success",
        "upcoming_transfers": [TransferResponse(**t) for t in upcoming_transfers],
        "total": len(upcoming_transfers),
        "period_days": days_ahead
    }


# Helper functions (these would be implemented in services)
async def verify_account_ownership(db, account_id: str, user_id: str):
    """Verify user owns the account"""
    # Mock implementation
    return {"id": account_id, "user_id": user_id}


async def calculate_transfer_costs(transfer_type: TransferType, amount: float, currency: str, to_account: str = None):
    """Calculate transfer fees and exchange rates"""
    fee_rates = {
        TransferType.INTERNAL: 0.0,  # Free internal transfers
        TransferType.EXTERNAL: 0.015,  # 1.5%
        TransferType.BANK: 0.005,  # 0.5%
        TransferType.WALLET: 0.025,  # 2.5%
        TransferType.INTERNATIONAL: 0.035  # 3.5%
    }
    
    base_fee = amount * fee_rates.get(transfer_type, 0.0)
    
    # Add flat fees for certain types
    if transfer_type == TransferType.INTERNATIONAL:
        base_fee += 5.0  # $5 flat fee
    elif transfer_type == TransferType.BANK:
        base_fee += 2.0  # $2 flat fee
    
    # Mock exchange rate (1.0 for same currency)
    exchange_rate = 1.0
    if transfer_type == TransferType.INTERNATIONAL:
        exchange_rate = 0.85  # Mock rate
    
    return base_fee, exchange_rate


async def save_transfer(db, transfer_data: dict) -> dict:
    """Save transfer to database"""
    # Mock implementation
    return transfer_data


async def process_transfer(db, transfer_id: str) -> dict:
    """Process transfer"""
    # Mock implementation
    await update_transfer_status(db, transfer_id, TransferStatus.COMPLETED)
    return {"transaction_id": f"txn_{generate_id()}"}


async def update_transfer_status(db, transfer_id: str, status: TransferStatus):
    """Update transfer status"""
    # Mock implementation
    pass


async def setup_recurring_transfer(db, transfer_id: str, frequency: TransferFrequency):
    """Setup recurring transfer schedule"""
    # Mock implementation
    pass


async def cancel_recurring_transfer(db, transfer_id: str):
    """Cancel recurring transfer"""
    # Mock implementation
    pass


async def get_transfers_from_db(db, filters: dict, pagination) -> List[dict]:
    """Get transfers from database"""
    # Mock implementation
    return []


async def get_transfer_by_id(db, transfer_id: str, user_id: str) -> dict:
    """Get transfer by ID"""
    # Mock implementation
    return {
        "id": transfer_id,
        "user_id": user_id,
        "description": "Test Transfer",
        "amount": 500.0,
        "currency": "USD",
        "status": TransferStatus.PENDING,
        "transfer_type": TransferType.INTERNAL,
        "from_account_id": "acc_123",
        "to_account_id": "acc_456",
        "recipient_name": "John Doe",
        "is_recurring": False,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "tags": []
    }


async def update_transfer_in_db(db, transfer_id: str, update_data: dict) -> dict:
    """Update transfer in database"""
    # Mock implementation
    transfer = await get_transfer_by_id(db, transfer_id, "user_123")
    transfer.update(update_data)
    return transfer


async def get_recurring_transfers_from_db(db, user_id: str) -> List[dict]:
    """Get recurring transfers"""
    # Mock implementation
    return []


async def get_scheduled_transfers(db, user_id: str, end_date: date) -> List[dict]:
    """Get scheduled transfers"""
    # Mock implementation
    return []


def generate_id() -> str:
    """Generate unique ID"""
    import uuid
    return str(uuid.uuid4())[:8]