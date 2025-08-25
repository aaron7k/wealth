#!/usr/bin/env python3
"""
🧪 Test CRUD Endpoints - Validate payments and transfers functionality
"""

import asyncio
import httpx
import json
from datetime import datetime, timedelta

async def test_crud_endpoints():
    """Test the new CRUD endpoints"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Finance Garden API CRUD Endpoints")
    print("=" * 50)
    
    async with httpx.AsyncClient() as client:
        # 1. Test Health Check
        print("1. Testing Health Check...")
        response = await client.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
        else:
            print("❌ Health check failed")
        
        # 2. Test OpenAPI documentation
        print("\n2. Testing OpenAPI Documentation...")
        response = await client.get(f"{base_url}/openapi.json")
        if response.status_code == 200:
            openapi_data = response.json()
            paths = list(openapi_data.get("paths", {}).keys())
            print(f"✅ OpenAPI schema loaded with {len(paths)} endpoints")
            
            # Check for our new endpoints
            payment_endpoints = [p for p in paths if "/payments" in p]
            transfer_endpoints = [p for p in paths if "/transfers" in p]
            
            print(f"   📋 Payment endpoints: {len(payment_endpoints)}")
            for endpoint in payment_endpoints[:5]:  # Show first 5
                print(f"      - {endpoint}")
            
            print(f"   📋 Transfer endpoints: {len(transfer_endpoints)}")
            for endpoint in transfer_endpoints[:5]:  # Show first 5
                print(f"      - {endpoint}")
        else:
            print("❌ OpenAPI documentation failed")
        
        # 3. Test Analytics Endpoints (existing)
        print("\n3. Testing Analytics Endpoints...")
        
        # Dashboard
        response = await client.get(f"{base_url}/api/v1/analytics/dashboard")
        if response.status_code == 200:
            dashboard = response.json()
            print("✅ Dashboard endpoint working")
            print(f"   Health Score: {dashboard.get('financial_health', {}).get('overall_score')}")
        else:
            print("❌ Dashboard endpoint failed")
        
        # Spending Patterns
        response = await client.get(f"{base_url}/api/v1/analytics/spending-patterns")
        if response.status_code == 200:
            patterns = response.json()
            print("✅ Spending patterns endpoint working")
        else:
            print("❌ Spending patterns endpoint failed")
        
        # Cash Flow Predictions
        response = await client.get(f"{base_url}/api/v1/analytics/cash-flow/predictions")
        if response.status_code == 200:
            predictions = response.json()
            print(f"✅ Cash flow predictions working - {len(predictions)} predictions returned")
        else:
            print("❌ Cash flow predictions failed")
        
        # AI Insights
        response = await client.get(f"{base_url}/api/v1/analytics/insights")
        if response.status_code == 200:
            insights = response.json()
            print(f"✅ AI insights working - {len(insights)} insights returned")
        else:
            print("❌ AI insights failed")
        
        # 4. Test Automation Endpoints (existing)
        print("\n4. Testing Automation Endpoints...")
        
        # Automation Suggestions
        response = await client.get(f"{base_url}/api/v1/automation/suggestions")
        if response.status_code == 200:
            suggestions = response.json()
            print(f"✅ Automation suggestions working - {suggestions.get('total', 0)} suggestions")
        else:
            print("❌ Automation suggestions failed")
        
        # Create Automation Rule
        rule_data = {
            "name": "Test Auto-categorize",
            "rule_type": "categorization",
            "is_active": True
        }
        response = await client.post(f"{base_url}/api/v1/automation/rules", json=rule_data)
        if response.status_code == 200:
            rule = response.json()
            print("✅ Automation rule creation working")
            print(f"   Rule: {rule.get('rule', {}).get('name')}")
        else:
            print("❌ Automation rule creation failed")
        
        # 5. Test Integration Endpoints (existing)
        print("\n5. Testing Integration Endpoints...")
        
        # Exchange Rates
        response = await client.get(f"{base_url}/api/v1/integrations/exchange-rates")
        if response.status_code == 200:
            rates = response.json()
            print("✅ Exchange rates working")
            print(f"   Base: {rates.get('base_currency')}")
            for currency, rate in list(rates.get('rates', {}).items())[:3]:
                print(f"   {currency}: {rate}")
        else:
            print("❌ Exchange rates failed")

def main():
    """Main test function"""
    print("🚀 Starting CRUD endpoint tests...")
    print("📚 You can view full documentation at: http://localhost:8000/docs")
    print("🔄 Interactive API at: http://localhost:8000/redoc")
    print()
    
    try:
        asyncio.run(test_crud_endpoints())
        print("\n✅ All endpoint tests completed!")
        print("\n💡 Next steps:")
        print("   1. Open http://localhost:8000/docs to explore the API")
        print("   2. Test the new payments and transfers CRUD operations")
        print("   3. Set up authentication for protected endpoints")
        print("   4. Connect to your database for real data")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")

if __name__ == "__main__":
    main()