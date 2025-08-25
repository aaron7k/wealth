"""
Rate limiting middleware using Redis
"""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
import time
import redis
import json
from core.config import settings
from typing import Callable


# Redis client for rate limiting
redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


class RateLimitMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        request = Request(scope, receive)
        
        # Skip rate limiting for health checks and docs
        if request.url.path in ["/health", "/docs", "/redoc", "/openapi.json"]:
            return await self.app(scope, receive, send)

        # Get client identifier (IP or user ID if authenticated)
        client_id = self.get_client_id(request)
        
        # Check rate limit
        if not await self.check_rate_limit(client_id):
            response = JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Maximum {settings.RATE_LIMIT_REQUESTS} requests per {settings.RATE_LIMIT_PERIOD} seconds",
                    "retry_after": settings.RATE_LIMIT_PERIOD
                }
            )
            return await response(scope, receive, send)

        return await self.app(scope, receive, send)

    def get_client_id(self, request: Request) -> str:
        """Get client identifier for rate limiting"""
        # Try to get user from JWT token
        authorization = request.headers.get("Authorization")
        if authorization and authorization.startswith("Bearer "):
            # Use token hash as identifier for authenticated users
            import hashlib
            token_hash = hashlib.sha256(authorization.encode()).hexdigest()[:16]
            return f"user:{token_hash}"
        
        # Use IP for unauthenticated users
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        
        return f"ip:{client_ip}"

    async def check_rate_limit(self, client_id: str) -> bool:
        """Check if client exceeds rate limit"""
        try:
            key = f"rate_limit:{client_id}"
            current_time = int(time.time())
            window_start = current_time - settings.RATE_LIMIT_PERIOD
            
            # Remove old entries
            redis_client.zremrangebyscore(key, 0, window_start)
            
            # Count current requests
            request_count = redis_client.zcard(key)
            
            if request_count >= settings.RATE_LIMIT_REQUESTS:
                return False
            
            # Add current request
            redis_client.zadd(key, {str(current_time): current_time})
            redis_client.expire(key, settings.RATE_LIMIT_PERIOD)
            
            return True
            
        except Exception as e:
            # If Redis is down, allow the request
            print(f"Rate limit check failed: {e}")
            return True