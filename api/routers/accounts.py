"""
💳 Accounts Management Router
"""

from fastapi import APIRouter, Depends
from typing import List
from core.security import get_current_user
from core.database import get_db

router = APIRouter()


@router.get("/")
async def get_accounts(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Get user accounts"""
    return {"message": "Accounts endpoint", "user_id": current_user["id"]}


@router.post("/")
async def create_account(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Create new account"""
    pass