"""
Analytics and insights schemas
"""

from pydantic import BaseModel, Field
from datetime import datetime, date
from typing import List, Dict, Optional, Any
from schemas.base import BaseResponse, CurrencyAmount
from enum import Enum


class AnalyticsPeriod(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly" 
    QUARTERLY = "quarterly"
    YEARLY = "yearly"
    CUSTOM = "custom"


class SpendingPattern(BaseModel):
    """Spending pattern analysis"""
    category: str
    amount: CurrencyAmount
    percentage: float = Field(..., ge=0, le=100)
    trend: str  # "increasing", "decreasing", "stable"
    average_transaction: CurrencyAmount
    transaction_count: int


class CashFlowPrediction(BaseModel):
    """Cash flow prediction model"""
    date: date
    predicted_income: CurrencyAmount
    predicted_expenses: CurrencyAmount
    predicted_balance: CurrencyAmount
    confidence_score: float = Field(..., ge=0, le=1)


class FinancialHealthScore(BaseModel):
    """Financial health assessment"""
    overall_score: int = Field(..., ge=0, le=100)
    savings_ratio: float
    debt_to_income_ratio: float
    spending_consistency: float
    emergency_fund_months: float
    recommendations: List[str]


class ExpenseAnalytics(BaseModel):
    """Expense analysis by category"""
    period: AnalyticsPeriod
    start_date: date
    end_date: date
    total_expenses: CurrencyAmount
    categories: List[SpendingPattern]
    top_merchants: List[Dict[str, Any]]
    unusual_spending: List[Dict[str, Any]]


class IncomeAnalytics(BaseModel):
    """Income analysis"""
    period: AnalyticsPeriod
    start_date: date
    end_date: date
    total_income: CurrencyAmount
    sources: List[Dict[str, Any]]
    growth_rate: float
    stability_score: float


class BudgetPerformance(BaseModel):
    """Budget performance analysis"""
    budget_name: str
    allocated_amount: CurrencyAmount
    spent_amount: CurrencyAmount
    remaining_amount: CurrencyAmount
    percentage_used: float
    days_remaining: int
    projected_overspend: Optional[CurrencyAmount]
    category_breakdown: List[Dict[str, Any]]


class SavingsAnalytics(BaseModel):
    """Savings analysis"""
    total_saved: CurrencyAmount
    savings_rate: float
    monthly_average: CurrencyAmount
    savings_goals_progress: List[Dict[str, Any]]
    optimal_savings_amount: CurrencyAmount


class AnalyticsRequest(BaseModel):
    """Request model for analytics"""
    period: AnalyticsPeriod = AnalyticsPeriod.MONTHLY
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    categories: Optional[List[str]] = None
    accounts: Optional[List[str]] = None
    include_predictions: bool = False
    include_recommendations: bool = True


class AnalyticsResponse(BaseResponse):
    """Complete analytics response"""
    period_info: Dict[str, Any]
    financial_health: FinancialHealthScore
    expense_analytics: ExpenseAnalytics
    income_analytics: IncomeAnalytics
    budget_performance: List[BudgetPerformance]
    savings_analytics: SavingsAnalytics
    cash_flow_predictions: Optional[List[CashFlowPrediction]] = None
    insights: List[str]
    alerts: List[Dict[str, Any]]


class TrendAnalysis(BaseModel):
    """Trend analysis over time"""
    metric_name: str
    period: AnalyticsPeriod
    data_points: List[Dict[str, Any]]
    trend_direction: str  # "up", "down", "stable"
    trend_strength: float = Field(..., ge=0, le=1)
    seasonal_patterns: List[Dict[str, Any]]


class ComparisonAnalytics(BaseModel):
    """Compare periods or categories"""
    comparison_type: str  # "period", "category", "account"
    current_period: Dict[str, Any]
    previous_period: Dict[str, Any]
    change_percentage: float
    change_amount: CurrencyAmount
    significant_changes: List[Dict[str, Any]]


class SmartInsight(BaseModel):
    """AI-generated financial insight"""
    title: str
    description: str
    impact: str  # "high", "medium", "low"
    category: str  # "spending", "saving", "budget", "investment"
    action_required: bool
    suggested_actions: List[str]
    confidence_score: float = Field(..., ge=0, le=1)
    created_at: datetime