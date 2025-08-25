#!/usr/bin/env python3
"""
🏦 Finance Garden API Startup Script

Script para iniciar la API con todas las configuraciones y validaciones necesarias.
"""

import sys
import os
import asyncio
from pathlib import Path

# Add current directory to path
sys.path.append(str(Path(__file__).parent))

def check_requirements():
    """Verificar que todas las dependencias estén instaladas"""
    required_packages = [
        'fastapi',
        'uvicorn',
        'pydantic',
        'supabase',
        'redis',
        'pandas',
        'numpy',
        'scikit-learn'
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package.replace('-', '_'))
            print(f"✅ {package}")
        except ImportError:
            missing_packages.append(package)
            print(f"❌ {package} - NOT FOUND")
    
    if missing_packages:
        print(f"\n❌ Missing packages: {', '.join(missing_packages)}")
        print("Install with: pip install -r requirements.txt")
        return False
    
    print("\n✅ All dependencies are installed!")
    return True


def check_environment():
    """Verificar variables de entorno"""
    from core.config import settings
    
    print("\n🔧 Checking environment configuration...")
    
    # Check critical settings
    if not settings.SECRET_KEY or settings.SECRET_KEY == "your-secret-key-change-in-production":
        print("⚠️  WARNING: Using default SECRET_KEY. Change in production!")
    else:
        print("✅ SECRET_KEY configured")
    
    if settings.SUPABASE_URL and settings.SUPABASE_KEY:
        print("✅ Supabase configured")
    else:
        print("⚠️  WARNING: Supabase not configured. Some features won't work.")
    
    if settings.REDIS_URL:
        print("✅ Redis configured")
    else:
        print("⚠️  WARNING: Redis not configured. Rate limiting disabled.")
    
    return True


def create_directories():
    """Crear directorios necesarios"""
    directories = [
        "uploads",
        "logs",
        "exports"
    ]
    
    for dir_name in directories:
        Path(dir_name).mkdir(exist_ok=True)
        print(f"✅ Directory created: {dir_name}")


async def test_connections():
    """Probar conexiones a servicios externos"""
    print("\n🔗 Testing external connections...")
    
    try:
        # Test Redis connection
        import redis
        from core.config import settings
        
        redis_client = redis.Redis.from_url(settings.REDIS_URL)
        redis_client.ping()
        print("✅ Redis connection successful")
    except Exception as e:
        print(f"⚠️  Redis connection failed: {e}")
    
    try:
        # Test Supabase connection
        from core.database import init_db
        await init_db()
        print("✅ Supabase connection successful")
    except Exception as e:
        print(f"⚠️  Supabase connection failed: {e}")


def main():
    """Función principal para iniciar la API"""
    print("🏦 Finance Garden API - Starting up...")
    print("=" * 50)
    
    # Check dependencies
    if not check_requirements():
        sys.exit(1)
    
    # Check environment
    if not check_environment():
        sys.exit(1)
    
    # Create necessary directories
    create_directories()
    
    # Test connections
    try:
        asyncio.run(test_connections())
    except Exception as e:
        print(f"❌ Connection test failed: {e}")
    
    print("\n" + "=" * 50)
    print("🚀 Starting Finance Garden API server...")
    print("📚 Documentation: http://localhost:8000/docs")
    print("🔄 Health check: http://localhost:8000/health")
    print("=" * 50)
    
    # Start the server
    import uvicorn
    from core.config import settings
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
        access_log=True
    )


if __name__ == "__main__":
    main()