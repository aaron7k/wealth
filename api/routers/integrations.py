"""
🔗 External Integrations Router

Integraciones poderosas con servicios externos para automatizar
la importación y sincronización de datos financieros.
"""

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Query
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, HttpUrl
import pandas as pd
import io
from enum import Enum

from schemas.base import BaseResponse
from core.security import get_current_user
from core.database import get_db
from services.integration_service import IntegrationService
from services.file_processor import FileProcessor
from services.exchange_rate_service import ExchangeRateService

router = APIRouter()


class IntegrationType(str, Enum):
    BANK_API = "bank_api"
    CSV_IMPORT = "csv_import"
    EXCEL_IMPORT = "excel_import"
    WEBHOOK = "webhook"
    THIRD_PARTY_APP = "third_party_app"


class ImportStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class BankConnection(BaseModel):
    """Bank API connection configuration"""
    bank_name: str = Field(..., description="Nombre del banco")
    api_endpoint: HttpUrl = Field(..., description="Endpoint de la API del banco")
    credentials: Dict[str, str] = Field(..., description="Credenciales encriptadas")
    sync_frequency: str = Field("daily", description="Frecuencia de sincronización")
    account_types: List[str] = Field(default_factory=list, description="Tipos de cuenta a sincronizar")


class ImportMapping(BaseModel):
    """Mapeo de campos para importación"""
    date_column: str = Field(..., description="Columna de fecha")
    description_column: str = Field(..., description="Columna de descripción")
    amount_column: str = Field(..., description="Columna de monto")
    currency_column: Optional[str] = Field(None, description="Columna de moneda")
    category_column: Optional[str] = Field(None, description="Columna de categoría")
    account_column: Optional[str] = Field(None, description="Columna de cuenta")


@router.get(
    "/connections",
    summary="🔗 List Integrations",
    description="""
    Lista todas las integraciones configuradas:
    
    - Conexiones bancarias activas
    - APIs de terceros conectadas
    - Estado de sincronización
    - Última actualización
    """
)
async def get_integrations(
    integration_type: Optional[IntegrationType] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    integration_service = IntegrationService(db, current_user["id"])
    
    integrations = await integration_service.get_user_integrations(
        integration_type=integration_type,
        is_active=is_active
    )
    
    return {
        "status": "success",
        "data": integrations,
        "total": len(integrations)
    }


@router.post(
    "/bank/connect",
    summary="🏦 Connect Bank Account",
    description="""
    Conecta una cuenta bancaria para sincronización automática:
    
    **Bancos soportados:**
    - Banco de México
    - BBVA México
    - Santander México
    - Citibanamex
    - HSBC México
    - Banorte
    
    ⚠️ **Seguridad:** Todas las credenciales se encriptan con AES-256.
    """
)
async def connect_bank_account(
    bank_connection: BankConnection,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    integration_service = IntegrationService(db, current_user["id"])
    
    # Test connection first
    connection_test = await integration_service.test_bank_connection(bank_connection.dict())
    
    if not connection_test["success"]:
        raise HTTPException(
            status_code=400,
            detail=f"Bank connection failed: {connection_test['error']}"
        )
    
    # Save encrypted connection
    saved_connection = await integration_service.save_bank_connection(bank_connection.dict())
    
    return {
        "status": "success",
        "message": "Bank account connected successfully",
        "connection": saved_connection,
        "accounts_found": connection_test["accounts_count"]
    }


@router.post(
    "/import/csv",
    summary="📊 Import from CSV",
    description="""
    Importa transacciones desde archivo CSV:
    
    **Formatos soportados:**
    - Exportaciones bancarias estándar
    - Formatos de Excel/Google Sheets
    - CSVs personalizados con mapeo manual
    
    **Características:**
    - Auto-detección de formato
    - Validación de datos
    - Preview antes de importar
    - Manejo de duplicados
    """
)
async def import_from_csv(
    file: UploadFile = File(..., description="Archivo CSV a importar"),
    account_id: str = Query(..., description="ID de la cuenta destino"),
    mapping: Optional[str] = Query(None, description="JSON con mapeo de columnas"),
    preview_only: bool = Query(False, description="Solo preview sin importar"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be a CSV")
    
    file_processor = FileProcessor()
    integration_service = IntegrationService(db, current_user["id"])
    
    # Read and process CSV
    content = await file.read()
    df = pd.read_csv(io.StringIO(content.decode('utf-8')))
    
    # Auto-detect or use provided mapping
    if mapping:
        import json
        column_mapping = ImportMapping(**json.loads(mapping))
    else:
        column_mapping = await file_processor.auto_detect_columns(df)
    
    # Process transactions
    processed_data = await file_processor.process_csv_data(df, column_mapping)
    
    if preview_only:
        return {
            "status": "success",
            "message": "CSV preview generated",
            "preview": processed_data[:10],  # First 10 rows
            "total_rows": len(processed_data),
            "detected_mapping": column_mapping.dict()
        }
    
    # Import to database
    import_result = await integration_service.import_transactions(
        processed_data, account_id
    )
    
    return {
        "status": "success",
        "message": "CSV imported successfully",
        "imported": import_result["imported"],
        "duplicates": import_result["duplicates"],
        "errors": import_result["errors"]
    }


@router.post(
    "/import/excel", 
    summary="📈 Import from Excel",
    description="""
    Importa transacciones desde archivo Excel (.xlsx):
    
    - Soporte para múltiples hojas
    - Detección automática de encabezados
    - Formatos de fecha flexibles
    - Limpieza automática de datos
    """
)
async def import_from_excel(
    file: UploadFile = File(...),
    account_id: str = Query(...),
    sheet_name: Optional[str] = Query(None, description="Nombre de la hoja (opcional)"),
    preview_only: bool = Query(False),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be an Excel file")
    
    file_processor = FileProcessor()
    integration_service = IntegrationService(db, current_user["id"])
    
    # Read Excel file
    content = await file.read()
    df = pd.read_excel(io.BytesIO(content), sheet_name=sheet_name)
    
    # Process similar to CSV
    column_mapping = await file_processor.auto_detect_columns(df)
    processed_data = await file_processor.process_excel_data(df, column_mapping)
    
    if preview_only:
        return {
            "status": "success",
            "message": "Excel preview generated",
            "preview": processed_data[:10],
            "total_rows": len(processed_data),
            "sheet_names": file_processor.get_sheet_names(io.BytesIO(content)),
            "detected_mapping": column_mapping.dict()
        }
    
    # Import to database
    import_result = await integration_service.import_transactions(
        processed_data, account_id
    )
    
    return {
        "status": "success", 
        "message": "Excel imported successfully",
        **import_result
    }


@router.get(
    "/exchange-rates",
    summary="💱 Get Exchange Rates",
    description="""
    Obtiene tipos de cambio actuales y históricos:
    
    - Rates en tiempo real
    - Histórico hasta 1 año
    - Múltiples proveedores
    - Cache inteligente para performance
    """
)
async def get_exchange_rates(
    base_currency: str = Query("USD", description="Moneda base"),
    target_currencies: List[str] = Query(["MXN", "EUR", "COP"], description="Monedas objetivo"),
    date: Optional[str] = Query(None, description="Fecha específica (YYYY-MM-DD)"),
    current_user: dict = Depends(get_current_user)
):
    exchange_service = ExchangeRateService()
    
    if date:
        # Historical rates
        rates = await exchange_service.get_historical_rates(
            base_currency, target_currencies, date
        )
    else:
        # Current rates
        rates = await exchange_service.get_current_rates(
            base_currency, target_currencies
        )
    
    return {
        "status": "success",
        "base_currency": base_currency,
        "rates": rates,
        "timestamp": datetime.utcnow().isoformat(),
        "source": exchange_service.get_provider_info()
    }


@router.post(
    "/sync/bank/{connection_id}",
    summary="🔄 Manual Bank Sync",
    description="""
    Sincronización manual de cuenta bancaria:
    
    - Obtiene transacciones recientes
    - Actualiza balances
    - Detecta nuevas cuentas
    - Manejo inteligente de duplicados
    """
)
async def manual_bank_sync(
    connection_id: str,
    background_tasks: BackgroundTasks,
    days_back: int = Query(30, ge=1, le=90, description="Días hacia atrás para sincronizar"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    integration_service = IntegrationService(db, current_user["id"])
    
    # Verify connection exists and belongs to user
    connection = await integration_service.get_connection(connection_id)
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    # Start background sync
    background_tasks.add_task(
        perform_bank_sync,
        connection_id=connection_id,
        user_id=current_user["id"],
        days_back=days_back
    )
    
    return {
        "status": "success",
        "message": "Bank sync started",
        "estimated_time": "2-5 minutes",
        "sync_id": f"sync_{connection_id}_{int(datetime.utcnow().timestamp())}"
    }


@router.get(
    "/sync/status/{sync_id}",
    summary="📊 Sync Status",
    description="Obtiene el estado de una sincronización en progreso"
)
async def get_sync_status(
    sync_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    integration_service = IntegrationService(db, current_user["id"])
    
    status = await integration_service.get_sync_status(sync_id)
    
    return {
        "status": "success",
        "sync_status": status
    }


@router.post(
    "/webhook/register",
    summary="🪝 Register Webhook",
    description="""
    Registra un webhook para recibir notificaciones automáticas:
    
    **Eventos soportados:**
    - `transaction.created`: Nueva transacción
    - `account.balance_changed`: Cambio de balance
    - `budget.exceeded`: Presupuesto excedido
    - `sync.completed`: Sincronización completada
    - `alert.triggered`: Alerta activada
    """
)
async def register_webhook(
    webhook_url: HttpUrl = Field(..., description="URL del webhook"),
    events: List[str] = Field(..., description="Eventos a suscribir"),
    secret: Optional[str] = Field(None, description="Secreto para validar firmas"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    integration_service = IntegrationService(db, current_user["id"])
    
    # Validate webhook URL
    test_result = await integration_service.test_webhook_url(str(webhook_url))
    if not test_result["success"]:
        raise HTTPException(
            status_code=400,
            detail=f"Webhook URL test failed: {test_result['error']}"
        )
    
    # Register webhook
    webhook = await integration_service.register_webhook(
        url=str(webhook_url),
        events=events,
        secret=secret
    )
    
    return {
        "status": "success",
        "message": "Webhook registered successfully",
        "webhook": webhook
    }


@router.get(
    "/templates",
    summary="📋 Import Templates",
    description="""
    Obtiene plantillas predefinidas para importación:
    
    - Plantillas de bancos populares
    - Formatos de apps financieras comunes
    - Templates personalizables
    """
)
async def get_import_templates():
    file_processor = FileProcessor()
    
    templates = await file_processor.get_import_templates()
    
    return {
        "status": "success",
        "templates": templates
    }


@router.post(
    "/third-party/connect/{service}",
    summary="🔌 Connect Third-Party Service",
    description="""
    Conecta servicios de terceros:
    
    **Servicios soportados:**
    - PayPal
    - Stripe (para comerciantes)
    - Mercado Pago
    - SPEI/Transferencias
    - Crypto exchanges
    """
)
async def connect_third_party(
    service: str,
    connection_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    integration_service = IntegrationService(db, current_user["id"])
    
    supported_services = ["paypal", "stripe", "mercadopago", "spei", "crypto"]
    if service not in supported_services:
        raise HTTPException(
            status_code=400,
            detail=f"Service '{service}' not supported. Available: {supported_services}"
        )
    
    # Connect to third-party service
    connection = await integration_service.connect_third_party_service(
        service, connection_data
    )
    
    return {
        "status": "success",
        "message": f"{service} connected successfully",
        "connection": connection
    }


# Background task functions
async def perform_bank_sync(connection_id: str, user_id: str, days_back: int = 30):
    """Background task for bank synchronization"""
    try:
        integration_service = IntegrationService(None, user_id)
        
        result = await integration_service.sync_bank_connection(
            connection_id, days_back
        )
        
        print(f"Bank sync completed for user {user_id}: {result}")
        
    except Exception as e:
        print(f"Error in bank sync for user {user_id}: {e}")


# WebSocket for real-time import progress
@router.websocket("/import/progress/{import_id}")
async def import_progress_websocket(websocket, import_id: str):
    """
    WebSocket para mostrar progreso de importación en tiempo real
    """
    await websocket.accept()
    # Implementation would stream import progress
    # This would be useful for large file imports
    pass