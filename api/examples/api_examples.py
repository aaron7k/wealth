#!/usr/bin/env python3
"""
🚀 Finance Garden API - Ejemplos de Uso

Este script demuestra cómo usar las funcionalidades principales de la API.
"""

import asyncio
import httpx
import json
from datetime import datetime, timedelta


class FinanceGardenAPIClient:
    def __init__(self, base_url: str = "http://localhost:8000", token: str = None):
        self.base_url = base_url
        self.token = token
        self.headers = {"Authorization": f"Bearer {token}"} if token else {}
    
    async def login(self, email: str, password: str):
        """Login y obtener token de acceso"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v1/auth/login",
                json={"email": email, "password": password}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data["access_token"]
                self.headers = {"Authorization": f"Bearer {self.token}"}
                print("✅ Login successful!")
                return data
            else:
                print(f"❌ Login failed: {response.text}")
                return None
    
    async def get_financial_dashboard(self):
        """Obtener dashboard financiero completo"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/analytics/dashboard",
                headers=self.headers,
                params={
                    "period": "monthly",
                    "include_predictions": True,
                    "include_recommendations": True
                }
            )
            
            if response.status_code == 200:
                dashboard = response.json()
                print("📊 Financial Dashboard:")
                print(f"   Health Score: {dashboard.get('financial_health', {}).get('overall_score', 'N/A')}")
                print(f"   Total Expenses: {dashboard.get('expense_analytics', {}).get('total_expenses', {}).get('amount', 'N/A')}")
                print(f"   Total Income: {dashboard.get('income_analytics', {}).get('total_income', {}).get('amount', 'N/A')}")
                return dashboard
            else:
                print(f"❌ Dashboard request failed: {response.text}")
                return None
    
    async def get_spending_patterns(self):
        """Analizar patrones de gasto"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/analytics/spending-patterns",
                headers=self.headers,
                params={
                    "period": "monthly",
                    "include_predictions": True
                }
            )
            
            if response.status_code == 200:
                patterns = response.json()
                print("🔍 Spending Patterns:")
                print(f"   Status: {patterns.get('status', 'N/A')}")
                print(f"   Message: {patterns.get('message', 'N/A')}")
                return patterns
            else:
                print(f"❌ Spending patterns request failed: {response.text}")
                return None
    
    async def predict_cash_flow(self, months_ahead: int = 3):
        """Predicciones de flujo de efectivo"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/analytics/cash-flow/predictions",
                headers=self.headers,
                params={
                    "months_ahead": months_ahead,
                    "include_scenarios": True
                }
            )
            
            if response.status_code == 200:
                predictions = response.json()
                print(f"🔮 Cash Flow Predictions ({months_ahead} months):")
                for i, prediction in enumerate(predictions[:3]):  # Show first 3
                    print(f"   Month {i+1}:")
                    print(f"     Income: ${prediction.get('predicted_income', {}).get('amount', 0)}")
                    print(f"     Expenses: ${prediction.get('predicted_expenses', {}).get('amount', 0)}")
                    print(f"     Balance: ${prediction.get('predicted_balance', {}).get('amount', 0)}")
                    print(f"     Confidence: {prediction.get('confidence_score', 0)*100:.1f}%")
                return predictions
            else:
                print(f"❌ Cash flow predictions failed: {response.text}")
                return None
    
    async def get_ai_insights(self):
        """Obtener insights generados por IA"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/analytics/insights",
                headers=self.headers,
                params={
                    "limit": 5,
                    "impact_level": "high"
                }
            )
            
            if response.status_code == 200:
                insights = response.json()
                print("🧠 AI Insights:")
                for i, insight in enumerate(insights[:3], 1):
                    print(f"   {i}. {insight.get('title', 'No title')}")
                    print(f"      {insight.get('description', 'No description')}")
                    print(f"      Impact: {insight.get('impact', 'unknown').title()}")
                    print(f"      Confidence: {insight.get('confidence_score', 0)*100:.1f}%")
                return insights
            else:
                print(f"❌ AI insights failed: {response.text}")
                return None
    
    async def create_automation_rule(self):
        """Crear una regla de automatización"""
        rule_data = {
            "name": "Auto-categorizar Uber",
            "description": "Automaticamente categorizar transacciones de Uber como Transporte",
            "rule_type": "categorization",
            "trigger_type": "transaction_added",
            "trigger_conditions": {
                "description_contains": ["uber", "uber eats"],
                "amount_min": 1.0
            },
            "actions": [{
                "type": "categorize",
                "category": "Transporte",
                "confidence_threshold": 0.8
            }],
            "is_active": True,
            "priority": 1
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/v1/automation/rules",
                headers=self.headers,
                json=rule_data
            )
            
            if response.status_code == 200:
                rule = response.json()
                print("🤖 Automation Rule Created:")
                print(f"   Name: {rule.get('rule', {}).get('name', 'N/A')}")
                print(f"   Type: {rule.get('rule', {}).get('rule_type', 'N/A')}")
                print(f"   Status: {'Active' if rule.get('rule', {}).get('is_active') else 'Inactive'}")
                return rule
            else:
                print(f"❌ Automation rule creation failed: {response.text}")
                return None
    
    async def get_automation_suggestions(self):
        """Obtener sugerencias de automatización"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/automation/suggestions",
                headers=self.headers
            )
            
            if response.status_code == 200:
                suggestions = response.json()
                print("💡 Automation Suggestions:")
                for i, suggestion in enumerate(suggestions.get('suggestions', [])[:3], 1):
                    print(f"   {i}. {suggestion.get('title', 'No title')}")
                    print(f"      {suggestion.get('description', 'No description')}")
                    print(f"      Confidence: {suggestion.get('confidence', 0)*100:.1f}%")
                    print(f"      Estimated Time Savings: {suggestion.get('estimated_savings', 'Unknown')}")
                return suggestions
            else:
                print(f"❌ Automation suggestions failed: {response.text}")
                return None
    
    async def get_exchange_rates(self):
        """Obtener tipos de cambio"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/api/v1/integrations/exchange-rates",
                headers=self.headers,
                params={
                    "base_currency": "USD",
                    "target_currencies": ["MXN", "EUR", "COP"]
                }
            )
            
            if response.status_code == 200:
                rates = response.json()
                print("💱 Exchange Rates:")
                print(f"   Base: {rates.get('base_currency', 'USD')}")
                for currency, rate in rates.get('rates', {}).items():
                    print(f"   {currency}: {rate:.4f}")
                return rates
            else:
                print(f"❌ Exchange rates failed: {response.text}")
                return None
    
    async def get_health_check(self):
        """Verificar estado de la API"""
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/health")
            
            if response.status_code == 200:
                health = response.json()
                print("🏥 API Health Check:")
                print(f"   Status: {health.get('status', 'unknown')}")
                services = health.get('services', {})
                for service, status in services.items():
                    print(f"   {service.title()}: {status}")
                return health
            else:
                print(f"❌ Health check failed: {response.text}")
                return None


async def main():
    """Función principal con ejemplos"""
    print("🏦 Finance Garden API - Examples")
    print("=" * 50)
    
    # Initialize API client
    client = FinanceGardenAPIClient()
    
    # 1. Health Check
    await client.get_health_check()
    print()
    
    # 2. Mock login (en una implementación real, necesitarías credenciales válidas)
    # await client.login("user@example.com", "password")
    # Por ahora, simulamos que tenemos un token
    client.token = "mock_token_for_examples"
    client.headers = {"Authorization": f"Bearer {client.token}"}
    
    print("📊 ANALYTICS EXAMPLES")
    print("-" * 30)
    
    # 3. Financial Dashboard
    await client.get_financial_dashboard()
    print()
    
    # 4. Spending Patterns
    await client.get_spending_patterns()
    print()
    
    # 5. Cash Flow Predictions
    await client.predict_cash_flow(3)
    print()
    
    # 6. AI Insights
    await client.get_ai_insights()
    print()
    
    print("🤖 AUTOMATION EXAMPLES")
    print("-" * 30)
    
    # 7. Create Automation Rule
    await client.create_automation_rule()
    print()
    
    # 8. Get Automation Suggestions
    await client.get_automation_suggestions()
    print()
    
    print("🔗 INTEGRATION EXAMPLES")
    print("-" * 30)
    
    # 9. Exchange Rates
    await client.get_exchange_rates()
    print()
    
    print("✅ All examples completed!")
    print("\n💡 Next Steps:")
    print("   1. Set up your Supabase database")
    print("   2. Configure authentication")
    print("   3. Add real transaction data")
    print("   4. Start using the automation features!")


if __name__ == "__main__":
    asyncio.run(main())