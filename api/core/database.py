"""
Database connection and utilities using Supabase
"""

from supabase import create_client, Client
from typing import Optional
import asyncio
from core.config import settings


class SupabaseClient:
    def __init__(self):
        self.client: Optional[Client] = None
        self.service_client: Optional[Client] = None
    
    async def connect(self):
        """Initialize Supabase clients"""
        self.client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
        self.service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        
        # Test connection
        try:
            result = self.service_client.table('profiles').select('id').limit(1).execute()
            print("✅ Connected to Supabase successfully")
        except Exception as e:
            print(f"❌ Failed to connect to Supabase: {e}")
            raise
    
    def get_client(self, service: bool = False) -> Client:
        """Get Supabase client"""
        if service and self.service_client:
            return self.service_client
        elif self.client:
            return self.client
        else:
            raise Exception("Supabase client not initialized")


# Global instance
db = SupabaseClient()


async def init_db():
    """Initialize database connection"""
    await db.connect()


def get_db() -> Client:
    """Dependency to get database client"""
    return db.get_client()


def get_service_db() -> Client:
    """Dependency to get service database client (for admin operations)"""
    return db.get_client(service=True)