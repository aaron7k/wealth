"""
💸 Transactions Router
"""

from fastapi import APIRouter, Depends
from core.security import get_current_user
from core.database import get_db

router = APIRouter()


@router.get("/")
async def get_transactions(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get user transactions"""
    return {"message": "Transactions endpoint", "user_id": current_user["id"]}


@router.post("/")
async def create_transaction(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create new transaction"""
    pass