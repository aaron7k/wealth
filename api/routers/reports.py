"""
📄 Reports & Exports Router
"""

from fastapi import APIRouter, Depends
from core.security import get_current_user

router = APIRouter()


@router.get("/generate/{report_type}")
async def generate_report(
    report_type: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate financial reports"""
    return {"message": f"Generating {report_type} report", "user_id": current_user["id"]}