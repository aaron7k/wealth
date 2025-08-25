"""
🪝 Webhooks Router
"""

from fastapi import APIRouter, Request, HTTPException
from core.security import verify_webhook_signature

router = APIRouter()


@router.post("/bank-transaction")
async def bank_transaction_webhook(request: Request):
    """Webhook for bank transactions"""
    # Verify webhook signature
    body = await request.body()
    signature = request.headers.get("x-webhook-signature", "")
    
    if not verify_webhook_signature(body, signature):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    return {"status": "received"}


@router.post("/payment-confirmation")
async def payment_webhook(request: Request):
    """Webhook for payment confirmations"""
    return {"status": "received"}