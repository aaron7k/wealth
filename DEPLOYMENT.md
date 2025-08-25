# 🚀 Netlify Deployment Guide - Wealth

Esta guía explica cómo desplegar la aplicación Wealth en Netlify.

## 📋 Prerrequisitos

- Cuenta en [Netlify](https://netlify.com)
- Repositorio Git con el código fuente
- Variables de entorno configuradas

## 🛠️ Configuración del Proyecto

### Archivos de Configuración

El proyecto ya incluye los archivos necesarios para el despliegue:

1. **`netlify.toml`** - Configuración principal de Netlify
2. **`public/_redirects`** - Reglas de redirección para SPA
3. **`.env.example`** - Template de variables de entorno

### Configuraciones Incluidas

- ✅ Build command: `npm run build`
- ✅ Publish directory: `dist`
- ✅ Node.js version: 18
- ✅ SPA routing redirects
- ✅ Security headers
- ✅ Cache optimization
- ✅ HTTPS enforcement

## 🔧 Pasos de Despliegue

### 1. Conectar Repositorio

1. Ve a [Netlify Dashboard](https://app.netlify.com)
2. Click en "New site from Git"
3. Conecta tu cuenta de GitHub/GitLab/Bitbucket
4. Selecciona el repositorio `my-fin-garden-main`

### 2. Configurar Build Settings

Netlify detectará automáticamente la configuración desde `netlify.toml`:

- **Build command**: `npm run build`
- **Publish directory**: `dist`
- **Production branch**: `main` (o tu rama principal)

### 3. Variables de Entorno

En el dashboard de Netlify, ve a **Site settings > Environment variables** y configura:

```bash
VITE_SUPABASE_URL=https://phbxhuvlttojvboktwjh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. Deploy

Click en **"Deploy site"** y Netlify:

1. Clonará tu repositorio
2. Ejecutará `npm install`
3. Ejecutará `npm run build`
4. Publicará los archivos desde `dist/`

## 🌐 Características del Despliegue

### Routing (SPA)

- ✅ Todas las rutas (`/`, `/accounts`, `/dashboard`, etc.) funcionan correctamente
- ✅ Refresh de página mantiene la ruta actual
- ✅ URLs directos funcionan (SEO friendly)

### Seguridad

- ✅ Headers de seguridad configurados
- ✅ CSP (Content Security Policy) para Supabase
- ✅ HTTPS forzado
- ✅ Protección XSS y clickjacking

### Performance

- ✅ Caché optimizado para assets estáticos
- ✅ Gzip compression automática
- ✅ CDN global de Netlify

## 🔄 Actualizaciones Automáticas

Cada push a la rama principal triggerea automáticamente:

1. **Build** nuevo
2. **Deploy** automático
3. **Preview** en branch secundarias

## 🧪 Preview Deployments

Netlify crea previews automáticos para:

- Pull Requests
- Branches secundarias
- Permite testing antes de merge

## 📊 Monitoreo

### Deploy Status

```bash
# URL del sitio
https://[site-name].netlify.app

# Dashboard
https://app.netlify.com/sites/[site-name]
```

### Logs y Debug

- **Build logs**: Dashboard > Deploys > Click en deploy
- **Function logs**: Dashboard > Functions (si aplica)
- **Analytics**: Dashboard > Analytics

## 🛠️ Comandos Útiles

### Local Testing

```bash
# Desarrollo
npm run dev

# Build local
npm run build

# Preview del build
npm run preview

# Test con Netlify CLI
npm install -g netlify-cli
netlify dev
```

### Netlify CLI

```bash
# Login
netlify login

# Deploy manual
netlify deploy

# Deploy a producción
netlify deploy --prod

# Abrir dashboard
netlify open
```

## 🚨 Troubleshooting

### Problemas Comunes

1. **Build fails**: Verificar logs en Dashboard > Deploys
2. **Routes 404**: Verificar `_redirects` y `netlify.toml`
3. **Env vars**: Verificar variables en Site settings
4. **Supabase**: Verificar URLs y keys

### Debug Checklist

- [ ] `netlify.toml` en root
- [ ] `_redirects` en `public/`
- [ ] Variables de entorno configuradas
- [ ] Build command correcto
- [ ] Publish directory correcto (`dist`)

## 🔗 URLs Importantes

- **Sitio**: `https://[tu-sitio].netlify.app`
- **Dashboard**: `https://app.netlify.com`
- **Docs**: `https://docs.netlify.com`
- **Support**: `https://answers.netlify.com`

## 📝 Notas Adicionales

- El build incluye optimizaciones automáticas de Vite
- Los assets se cachean por 1 año (immutable)
- El HTML se sirve con caché mínimo para actualizaciones rápidas
- Los headers de seguridad protegen contra ataques comunes

¡Tu aplicación Wealth está lista para producción! 🎉