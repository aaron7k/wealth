# 🏦 Finance Garden API

Una API completa y moderna para gestión financiera inteligente construida con **FastAPI**.

## ✨ Características Principales

### 🤖 **Automatización Inteligente**
- Auto-categorización de transacciones con Machine Learning
- Reglas de negocio personalizables
- Transferencias automáticas inteligentes
- Alertas y notificaciones contextuales

### 📊 **Analytics Avanzado**
- Análisis de patrones de gasto con IA
- Predicciones de flujo de efectivo
- Health score financiero completo
- Insights y recomendaciones personalizadas

### 🔗 **Integraciones Poderosas**
- Conexión directa con APIs bancarias
- Importación masiva desde CSV/Excel
- Webhooks para automatización externa
- Integración con servicios de terceros

### 🧠 **Inteligencia Artificial**
- Recomendaciones financieras con OpenAI
- Detección de anomalías en gastos
- Optimización automática de presupuestos
- Predicciones de comportamiento financiero

## 🚀 Instalación y Configuración

### Requisitos Previos
- Python 3.8+
- Redis (para rate limiting y cache)
- Supabase account
- OpenAI API key (opcional)

### Instalación

```bash
# Clonar el repositorio
cd api

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar configuración
cp .env.example .env
# Editar .env con tus configuraciones

# Ejecutar la API
python main.py
```

### Variables de Entorno

```bash
# App Settings
DEBUG=true
SECRET_KEY=your-super-secret-key

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Redis
REDIS_URL=redis://localhost:6379

# External APIs
OPENAI_API_KEY=your-openai-key
EXCHANGE_RATE_API_KEY=your-exchange-api-key
```

## 📚 Documentación de la API

Una vez que la API esté ejecutándose, puedes acceder a:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

## 🛣️ Endpoints Principales

### 🔐 Autenticación
- `POST /api/v1/auth/login` - Iniciar sesión
- `POST /api/v1/auth/refresh` - Renovar token

### 📊 Analytics & Insights
- `GET /api/v1/analytics/dashboard` - Dashboard financiero completo
- `GET /api/v1/analytics/spending-patterns` - Análisis de patrones de gasto
- `GET /api/v1/analytics/cash-flow/predictions` - Predicciones de flujo de efectivo
- `GET /api/v1/analytics/financial-health` - Health score financiero
- `GET /api/v1/analytics/insights` - Insights generados por IA

### 🤖 Automatización
- `GET /api/v1/automation/rules` - Listar reglas de automatización
- `POST /api/v1/automation/rules` - Crear regla de automatización
- `POST /api/v1/automation/auto-categorize` - Auto-categorizar transacciones
- `GET /api/v1/automation/suggestions` - Sugerencias de automatización

### 🔗 Integraciones
- `POST /api/v1/integrations/bank/connect` - Conectar cuenta bancaria
- `POST /api/v1/integrations/import/csv` - Importar desde CSV
- `POST /api/v1/integrations/import/excel` - Importar desde Excel
- `GET /api/v1/integrations/exchange-rates` - Obtener tipos de cambio

### 🧠 IA e Insights
- `GET /api/v1/ai/recommendations` - Recomendaciones con IA
- `POST /api/v1/ai/analyze-spending` - Análizar gastos con IA

## 🔒 Seguridad

### Rate Limiting
- 100 requests/minuto para usuarios autenticados
- 20 requests/minuto para usuarios no autenticados

### Autenticación
- JWT tokens via Supabase
- Tokens de servicio para operaciones administrativas
- Validación de firmas para webhooks

### Encriptación
- Credenciales bancarias encriptadas con AES-256
- Comunicación HTTPS obligatoria en producción
- Headers de seguridad configurados

## 📈 Ejemplos de Uso

### Obtener Dashboard Completo

```python
import httpx

headers = {"Authorization": "Bearer YOUR_JWT_TOKEN"}

response = httpx.get(
    "http://localhost:8000/api/v1/analytics/dashboard",
    headers=headers,
    params={
        "period": "monthly",
        "include_predictions": True,
        "include_recommendations": True
    }
)

dashboard = response.json()
print(f"Financial Health Score: {dashboard['financial_health']['overall_score']}")
```

### Crear Regla de Automatización

```python
rule_data = {
    "name": "Auto-categorizar Uber",
    "description": "Categorizar transacciones de Uber como Transporte",
    "rule_type": "categorization",
    "trigger_type": "transaction_added",
    "trigger_conditions": {
        "description_contains": ["uber", "uber eats"]
    },
    "actions": [{
        "type": "categorize",
        "category": "Transporte"
    }]
}

response = httpx.post(
    "http://localhost:8000/api/v1/automation/rules",
    json=rule_data,
    headers=headers
)
```

### Importar Transacciones desde CSV

```python
files = {"file": ("transactions.csv", open("transactions.csv", "rb"), "text/csv")}

response = httpx.post(
    "http://localhost:8000/api/v1/integrations/import/csv",
    files=files,
    params={"account_id": "account_123"},
    headers=headers
)

result = response.json()
print(f"Imported: {result['imported']}, Duplicates: {result['duplicates']}")
```

## 🧪 Testing

```bash
# Ejecutar tests
pytest tests/

# Tests con cobertura
pytest --cov=. tests/

# Tests específicos
pytest tests/test_analytics.py -v
```

## 📦 Deploy

### Docker

```dockerfile
FROM python:3.9-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Railway/Render

1. Conectar repo de GitHub
2. Configurar variables de entorno
3. Deploy automático

## 🤝 Contribuciones

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Crear Pull Request

## 📄 Licencia

Distribuido bajo la Licencia MIT. Ver `LICENSE` para más información.

## 🆘 Soporte

- 📧 Email: api@finance-garden.com
- 💬 Discord: [Finance Garden Community](https://discord.gg/finance-garden)
- 📖 Docs: [docs.finance-garden.com](https://docs.finance-garden.com)

---

Hecho con ❤️ y ☕ para la comunidad financiera