"""
🧠 AI Insights Router
"""

from fastapi import APIRouter, Depends
from core.security import get_current_user

router = APIRouter()


@router.get("/recommendations")
async def get_ai_recommendations(
    current_user: dict = Depends(get_current_user)
):
    """Get AI-powered financial recommendations"""
    return {
        "recommendations": [
            "Reduce spending on restaurants by 15% to reach savings goal",
            "Consider switching to a high-yield savings account",
            "Your entertainment budget is consistently under-utilized"
        ]
    }


@router.post("/analyze-spending")
async def analyze_spending_with_ai(
    current_user: dict = Depends(get_current_user)
):
    """AI analysis of spending patterns"""
    return {"analysis": "AI spending analysis results"}