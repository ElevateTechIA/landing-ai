# 🚀 Guía de Instalación para Producción

Esta guía te llevará paso a paso para configurar el sistema en producción.

## 📦 Paso 1: Instalar Dependencias

```bash
npm install
npm install prisma @prisma/client resend
npm install -D @types/node
```

## 🗄️ Paso 2: Configurar Base de Datos

### Opción A: PostgreSQL Local

1. **Instalar PostgreSQL**
   - Windows: Descarga desde https://www.postgresql.org/download/windows/
   - Instala y configura usuario y contraseña

2. **Crear base de datos**
   ```bash
   psql -U postgres
   CREATE DATABASE landing_ai;
   \q
   ```

### Opción B: Base de Datos en la Nube (Recomendado)

#### Supabase (Gratis para empezar)
1. Ve a https://supabase.com/
2. Crea una cuenta y nuevo proyecto
3. Copia la "Connection String" desde Settings > Database
4. Usa ese URL en tu `.env.local`

#### Neon (Gratis, muy fácil)
1. Ve a https://neon.tech/
2. Crea cuenta y proyecto
3. Copia el connection string
4. Pégalo en `.env.local`

## 🔐 Paso 3: Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Copia el archivo de ejemplo
cp .env.local.example .env.local
```

Edita `.env.local` y completa:

```env
# 1. BASE DE DATOS (usa uno de estos)
DATABASE_URL="postgresql://user:password@localhost:5432/landing_ai"
# O Supabase:
# DATABASE_URL="postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres"
# O Neon:
# DATABASE_URL="postgresql://[user]:[password]@[host].neon.tech/[dbname]?sslmode=require"

# 2. RESEND (para emails)
RESEND_API_KEY="re_123456789"  # Obtén de https://resend.com/api-keys

# 3. ZOOM (opcional al inicio)
ZOOM_API_KEY="tu_key"
ZOOM_API_SECRET="tu_secret"
ZOOM_USER_ID="tu_user_id"

# 4. CONFIGURACIÓN GENERAL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_CONTACT_EMAIL="meetings@tudominio.com"
```

## 📧 Paso 4: Configurar Resend (Email)

1. **Crear cuenta en Resend**
   - Ve a https://resend.com/
   - Regístrate (gratis hasta 100 emails/día)
   - Verifica tu email

2. **Obtener API Key**
   - Ve a "API Keys" en el dashboard
   - Click en "Create API Key"
   - Copia la key y pégala en `.env.local`

3. **Verificar dominio (opcional pero recomendado)**
   - Ve a "Domains" > "Add Domain"
   - Sigue las instrucciones para agregar registros DNS
   - Una vez verificado, cambia el `from` email en `.env.local`

## 🎥 Paso 5: Configurar Zoom API (Opcional)

Puedes empezar sin Zoom - el sistema creará links temporales. Para producción:

1. **Crear cuenta Zoom Developer**
   - Ve a https://marketplace.zoom.us/
   - Login con tu cuenta Zoom
   - Click en "Develop" > "Build App"

2. **Crear Server-to-Server OAuth App**
   - Selecciona "Server-to-Server OAuth"
   - Completa información básica
   - En "Scopes", agrega:
     - `meeting:write:admin`
     - `meeting:read:admin`
     - `user:read:admin`

3. **Obtener credenciales**
   - Copia Account ID, Client ID y Client Secret
   - Agrégalos a `.env.local`

## 🗃️ Paso 6: Inicializar Base de Datos

```bash
# Generar cliente Prisma
npx prisma generate

# Crear tablas en la base de datos
npx prisma db push

# Ver la base de datos en navegador (opcional)
npx prisma studio
```

## ✅ Paso 7: Verificar Instalación

```bash
# Compilar el proyecto
npm run build

# Si no hay errores, iniciar en desarrollo
npm run dev
```

Abre http://localhost:3000 y ve a la sección "Tell Me About Your Challenge"

## 🧪 Paso 8: Probar el Sistema

1. **Probar chatbot**
   - Completa el formulario paso a paso
   - Verifica que todas las validaciones funcionen

2. **Probar agendamiento**
   - Selecciona un horario
   - Verifica que se cree la reunión en la base de datos
   - Revisa que llegue el email de confirmación

3. **Ver en Prisma Studio**
   ```bash
   npx prisma studio
   ```
   - Abre http://localhost:5555
   - Verifica que se guardó el registro en "Meeting"

## 🚀 Paso 9: Desplegar a Producción

### Opción A: Vercel (Recomendado)

1. **Instalar Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login y deploy**
   ```bash
   vercel login
   vercel
   ```

3. **Agregar variables de entorno**
   - Ve al proyecto en vercel.com
   - Settings > Environment Variables
   - Agrega todas las variables de `.env.local`

### Opción B: Netlify

1. **Instalar Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy**
   ```bash
   netlify login
   netlify init
   netlify deploy --prod
   ```

3. **Configurar variables**
   - Site settings > Environment variables
   - Agrega todas las de `.env.local`

### Opción C: Servidor VPS

1. **Preparar servidor**
   ```bash
   # En tu servidor
   sudo apt update
   sudo apt install nodejs npm postgresql
   ```

2. **Clonar y configurar**
   ```bash
   git clone tu-repo.git
   cd tu-repo
   npm install
   ```

3. **Configurar PM2**
   ```bash
   npm install -g pm2
   npm run build
   pm2 start npm --name "landing-ai" -- start
   pm2 save
   ```

## 🔧 Configuración Avanzada

### Programar recordatorios automáticos

Crea un cron job o usa Vercel Cron:

```typescript
// app/api/cron/reminders/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendMeetingReminder } from '@/lib/email';

export async function GET() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const meetings = await prisma.meeting.findMany({
    where: {
      scheduledTime: {
        gte: tomorrow.toISOString(),
        lte: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString()
      },
      reminderSent: false,
      status: 'SCHEDULED'
    }
  });

  for (const meeting of meetings) {
    await sendMeetingReminder({
      to: meeting.email,
      name: meeting.name,
      scheduledTime: meeting.scheduledTime,
      zoomLink: meeting.zoomLink
    });
    
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: { reminderSent: true }
    });
  }

  return NextResponse.json({ sent: meetings.length });
}
```

En `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/reminders",
    "schedule": "0 9 * * *"
  }]
}
```

## 📊 Monitoreo y Logs

### Ver logs en Vercel
```bash
vercel logs
```

### Ver logs en servidor
```bash
pm2 logs landing-ai
```

### Monitorear base de datos
- Usa Prisma Studio: `npx prisma studio`
- O conecta con tu herramienta favorita (DBeaver, pgAdmin)

## 🐛 Solución de Problemas

### Error: "Cannot connect to database"
- Verifica que DATABASE_URL sea correcto
- Asegúrate que la base de datos esté corriendo
- Verifica firewall/seguridad si es remota

### Error: "Resend API key invalid"
- Verifica que copiaste la key completa
- Regenera la key en el dashboard de Resend

### Emails no llegan
- Revisa spam/junk
- Verifica que el dominio esté verificado en Resend
- Revisa logs: `npm run dev` en consola del servidor

### Zoom meetings no se crean
- Verifica credenciales en `.env.local`
- Asegúrate que la app tenga los permisos correctos
- El sistema funciona sin Zoom creando links temporales

## ✨ Próximos Pasos

Una vez funcionando:

1. ✅ Personaliza el diseño del email en `lib/email.ts`
2. ✅ Ajusta horarios disponibles según tu zona horaria
3. ✅ Configura recordatorios automáticos
4. ✅ Agrega analytics (Google Analytics, Vercel Analytics)
5. ✅ Implementa dashboard admin para gestionar reuniones
6. ✅ Configura backups automáticos de la base de datos

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del servidor
2. Verifica la consola del navegador (F12)
3. Revisa el archivo CHALLENGE_CHATBOT_SETUP.md
4. Consulta la documentación de cada servicio (Resend, Zoom, Prisma)

¡Listo para producción! 🎉
