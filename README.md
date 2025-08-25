# 💰 Wealth - Tu Gestor Financiero Personal

**Wealth** es una aplicación web moderna y completa para la gestión de finanzas personales, desarrollada con las últimas tecnologías web.

## 🚀 Características Principales

- 📊 **Dashboard Financiero** - Vista general de tu salud financiera
- 💳 **Gestión de Cuentas** - Control de múltiples cuentas bancarias
- 💸 **Transacciones** - Registro detallado de ingresos y gastos
- 🎯 **Presupuestos** - Creación y seguimiento de presupuestos por categoría
- 📅 **Suscripciones** - Gestión de suscripciones y pagos recurrentes
- 🏷️ **Categorías** - Organización personalizada de transacciones
- ❤️ **Diezmos** - Gestión especial para diezmos religiosos
- 💰 **Ahorros** - Seguimiento de metas de ahorro
- 🎯 **Metas** - Planificación financiera a largo plazo
- 📈 **Métricas** - Análisis profundo de patrones financieros
- 🔄 **Transferencias** - Transferencia de capital entre cuentas
- 🔐 **Modo Privacidad** - Ocultar números para mayor privacidad
- 💱 **Múltiples Monedas** - Soporte completo para diferentes divisas

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React 18 con TypeScript
- **Build Tool**: Vite para desarrollo y construcción optimizada
- **UI Framework**: shadcn/ui + Tailwind CSS
- **Base de Datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Charts**: Recharts para visualizaciones
- **Forms**: React Hook Form + Zod para validación
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Deployment**: Preparado para Netlify

## 📱 Diseño Responsivo

Wealth está completamente optimizado para:
- 📱 **Móviles** (320px+)
- 📱 **Tablets** (640px+) 
- 💻 **Desktop** (1024px+)

## 🚀 Instalación y Desarrollo

### Prerrequisitos
- Node.js 18+ 
- npm o yarn

### Pasos de instalación

```bash
# 1. Clonar el repositorio
git clone <YOUR_GIT_URL>
cd wealth-app

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase

# 4. Iniciar el servidor de desarrollo
npm run dev
```

### Scripts disponibles

```bash
# Desarrollo
npm run dev

# Construcción para producción
npm run build

# Preview de la construcción
npm run preview

# Linting
npm run lint
```

## 🌍 Despliegue

### Netlify (Recomendado)

El proyecto incluye configuración completa para Netlify:

1. Conecta tu repositorio a Netlify
2. Configura las variables de entorno:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy automático con cada push

Ver [DEPLOYMENT.md](./DEPLOYMENT.md) para instrucciones detalladas.

### Variables de Entorno

```bash
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
```

## 🏗️ Arquitectura del Proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── ui/             # Componentes base de shadcn/ui
│   ├── Layout.tsx      # Layout principal con navegación
│   ├── CreditCardView.tsx
│   ├── TransferModal.tsx
│   └── PrivacyToggle.tsx
├── contexts/           # Context providers
│   ├── AuthContext.tsx
│   ├── UserProfileContext.tsx
│   └── PrivacyContext.tsx
├── hooks/              # Custom hooks
├── integrations/       # Integraciones externas (Supabase)
├── pages/              # Páginas de la aplicación
└── lib/                # Utilidades y configuración
```

## 🔧 Configuración de Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ejecuta las migraciones SQL desde `/supabase/migrations/`
3. Configura las variables de entorno
4. Habilita Row Level Security (RLS)

## 🎨 Personalización

- **Colores**: Edita `tailwind.config.ts` para cambiar el tema
- **Componentes**: Todos los componentes UI están en `src/components/ui/`
- **Rutas**: Configuradas en `src/App.tsx`

## 📄 Licencia

Este proyecto es privado y propietario.

## 🤝 Contribuciones

Este es un proyecto personal. Si encuentras bugs o tienes sugerencias, por favor abre un issue.

---

**Wealth** - Toma control de tus finanzas 💰✨