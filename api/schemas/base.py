"""
Base schemas and common Pydantic models
"""

from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, List, Dict, Any
from enum import Enum


class ResponseStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"


class BaseResponse(BaseModel):
    """Base response model for all API endpoints"""
    status: ResponseStatus = ResponseStatus.SUCCESS
    message: str = "Operation completed successfully"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = None


class PaginationParams(BaseModel):
    """Common pagination parameters"""
    page: int = Field(1, ge=1, description="Page number (1-based)")
    limit: int = Field(20, ge=1, le=100, description="Number of items per page")
    
    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class PaginatedResponse(BaseResponse):
    """Paginated response model"""
    data: List[Any] = []
    pagination: Dict[str, Any] = {
        "page": 1,
        "limit": 20,
        "total": 0,
        "pages": 0,
        "has_next": False,
        "has_prev": False
    }


class FilterParams(BaseModel):
    """Common filter parameters"""
    start_date: Optional[datetime] = Field(None, description="Filter from this date")
    end_date: Optional[datetime] = Field(None, description="Filter until this date")
    search: Optional[str] = Field(None, description="Search term")
    
    @validator('end_date')
    def end_date_must_be_after_start_date(cls, v, values):
        if v and values.get('start_date') and v < values.get('start_date'):
            raise ValueError('end_date must be after start_date')
        return v


class CurrencyAmount(BaseModel):
    """Currency amount representation"""
    amount: float = Field(..., description="Amount value")
    currency: str = Field(..., description="Currency code (ISO 4217)")
    
    @validator('currency')
    def currency_must_be_valid(cls, v):
        valid_currencies = ['USD', 'MXN', 'COP', 'EUR', 'GBP', 'CAD', 'JPY']
        if v not in valid_currencies:
            raise ValueError(f'Currency must be one of: {valid_currencies}')
        return v.upper()


class ErrorDetail(BaseModel):
    """Error detail model"""
    code: str
    message: str
    field: Optional[str] = None


class ErrorResponse(BaseResponse):
    """Error response model"""
    status: ResponseStatus = ResponseStatus.ERROR
    errors: List[ErrorDetail] = []