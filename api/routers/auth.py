"""
🔐 Authentication Router
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from core.database import get_service_db
from core.security import create_access_token

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


@router.post("/login", response_model=TokenResponse)
async def login(credentials: LoginRequest):
    """Login with email and password"""
    try:
        supabase = get_service_db()
        
        # Sign in with Supabase
        response = supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        
        if response.user:
            # Create access token
            token = create_access_token({"sub": response.user.id})
            
            return TokenResponse(
                access_token=token,
                user={
                    "id": response.user.id,
                    "email": response.user.email
                }
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed"
        )


@router.post("/refresh")
async def refresh_token():
    """Refresh access token"""
    # Implementation for token refresh
    pass