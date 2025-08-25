"""
Logging middleware for API requests and responses
"""

import time
import json
import logging
from fastapi import Request
from typing import Callable
import uuid


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("finance_garden_api")


class LoggingMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        request = Request(scope, receive)
        request_id = str(uuid.uuid4())[:8]
        start_time = time.time()

        # Log request
        logger.info(
            f"[{request_id}] {request.method} {request.url.path} - "
            f"Client: {request.client.host if request.client else 'unknown'} - "
            f"User-Agent: {request.headers.get('user-agent', 'unknown')}"
        )

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                # Calculate processing time
                process_time = time.time() - start_time
                
                # Log response
                status_code = message["status"]
                logger.info(
                    f"[{request_id}] Response: {status_code} - "
                    f"Time: {process_time:.3f}s"
                )
                
                # Add custom headers
                headers = dict(message.get("headers", []))
                headers[b"x-request-id"] = request_id.encode()
                headers[b"x-process-time"] = f"{process_time:.3f}".encode()
                message["headers"] = list(headers.items())

            await send(message)

        return await self.app(scope, receive, send_wrapper)