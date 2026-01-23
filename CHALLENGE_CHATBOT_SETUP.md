# Configuración del Sistema de Agendamiento Inteligente

## 📋 Resumen

El sistema "Tell Me About Your Challenge" es un chatbot interactivo que:

1. **Recopila información estructurada** del usuario mediante conversación guiada
2. **Valida datos** en tiempo real (email, teléfono)
3. **Genera resumen** de la consulta
4. **Agenda automáticamente** reuniones por Zoom
5. **Gestiona calendario** para evitar cruces de horarios

---

## 🚀 Componentes Creados

### 1. ChallengeChatbot.tsx
**Ubicación:** `app/components/ChallengeChatbot.tsx`

Chatbot conversacional que guía al usuario paso a paso:

**Flujo de conversación:**
1. Nombre completo
2. Email (validado)
3. Teléfono (validado)
4. Empresa/Independiente
5. Descripción del desafío/proyecto
6. Objetivos principales
7. Expectativas de resultado
8. Presupuesto estimado
9. Timeline deseado
10. Resumen y confirmación
11. Selección de horario disponible

**Características:**
- ✅ Validación de email y teléfono
- ✅ Soporte multiidioma (ES/EN)
- ✅ Interfaz moderna y responsive
- ✅ Estado de carga visual
- ✅ Scroll automático a mensajes nuevos

---

### 2. API de Calendario - Available Slots
**Ubicación:** `app/api/calendar/available-slots/route.ts`

Endpoint para obtener horarios disponibles.

**Endpoint:** `POST /api/calendar/available-slots`

**Request:**
```json
{
  "timezone": "America/Mexico_City"
}
```

**Response:**
```json
{
  "success": true,
  "slots": [
    "lunes, 27 de enero de 2026, 09:00",
    "lunes, 27 de enero de 2026, 11:00",
    ...
  ],
  "timezone": "America/Mexico_City"
}
```

**Lógica actual:**
- Genera slots para próximos 7 días
- Solo días laborables (lunes a viernes)
- Horarios: 9:00, 11:00, 14:00, 16:00
- Limita a 10 slots

**⚠️ Para producción:**
- Integrar con Google Calendar API o Microsoft Calendar
- Consultar base de datos de reuniones existentes
- Filtrar slots ya ocupados
- Considerar zona horaria del usuario y del host

---

### 3. API de Agendamiento - Schedule
**Ubicación:** `app/api/calendar/schedule/route.ts`

Endpoint para crear reunión y agendar en Zoom.

**Endpoint:** `POST /api/calendar/schedule`

**Request:**
```json
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "phone": "+52 123 456 7890",
  "company": "Tech Solutions",
  "challenge": "Necesitamos desarrollar una plataforma de e-commerce",
  "objectives": "Aumentar ventas online en 40%",
  "expectations": "Plataforma escalable y segura",
  "budget": "$50,000 - $100,000 USD",
  "timeline": "3-4 meses",
  "selectedSlot": "lunes, 27 de enero de 2026, 09:00",
  "timezone": "America/Mexico_City"
}
```

**Response:**
```json
{
  "success": true,
  "zoomLink": "https://zoom.us/j/123456789",
  "zoomId": "123456789",
  "startTime": "2026-01-27T09:00:00Z",
  "message": "Reunión agendada exitosamente"
}
```

**Funciones incluidas:**
- `createZoomMeeting()` - Crea reunión en Zoom vía API
- `saveToDatabase()` - Guarda datos en base de datos
- `sendConfirmationEmail()` - Envía email de confirmación

---

## 🔧 Configuración Requerida

### Variables de Entorno

Crea un archivo `.env.local` con:

```env
# Zoom API Configuration
ZOOM_API_KEY=tu_api_key
ZOOM_API_SECRET=tu_api_secret
ZOOM_USER_ID=tu_user_id

# Email Configuration (ejemplo con Resend)
RESEND_API_KEY=tu_resend_key

# Database (ejemplo con Prisma/PostgreSQL)
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

---

## 📦 Dependencias a Instalar

```bash
# Para Zoom API
npm install @zoom/meetingsdk

# Para envío de emails (escoge uno)
npm install resend
# O
npm install nodemailer

# Para base de datos (escoge uno)
npm install @prisma/client
# O
npm install mongoose
```

---

## 🔐 Configuración de Zoom

### Opción 1: JWT (Más simple, pero deprecado)
1. Ve a [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Crea una JWT App
3. Obtén API Key y API Secret

### Opción 2: OAuth 2.0 (Recomendado)
1. Ve a [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Crea una OAuth App
3. Configura redirect URLs
4. Implementa flujo OAuth en tu app

### Opción 3: Server-to-Server OAuth (Recomendado para producción)
1. Crea una Server-to-Server OAuth App
2. Obtén Account ID, Client ID y Client Secret
3. Usa para autenticación sin intervención del usuario

**Documentación oficial:** https://developers.zoom.us/docs/api/

---

## 📧 Configuración de Email

### Opción 1: Resend (Recomendado - Fácil setup)
```javascript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'meetings@tudominio.com',
  to: userEmail,
  subject: 'Reunión Confirmada',
  html: emailTemplate
});
```

### Opción 2: SendGrid
```javascript
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

await sgMail.send({
  to: userEmail,
  from: 'meetings@tudominio.com',
  subject: 'Reunión Confirmada',
  html: emailTemplate
});
```

### Opción 3: Nodemailer (SMTP)
```javascript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

await transporter.sendMail({
  from: 'meetings@tudominio.com',
  to: userEmail,
  subject: 'Reunión Confirmada',
  html: emailTemplate
});
```

---

## 💾 Configuración de Base de Datos

### Ejemplo con Prisma + PostgreSQL

**1. Instalar:**
```bash
npm install prisma @prisma/client
npx prisma init
```

**2. Schema (prisma/schema.prisma):**
```prisma
model Meeting {
  id            String   @id @default(cuid())
  name          String
  email         String
  phone         String
  company       String
  challenge     String   @db.Text
  objectives    String   @db.Text
  expectations  String   @db.Text
  budget        String
  timeline      String
  scheduledTime String
  zoomLink      String
  zoomId        String
  status        String   @default("scheduled")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@index([email])
  @@index([scheduledTime])
}
```

**3. Migrar:**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

**4. Usar en el código:**
```typescript
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

await prisma.meeting.create({
  data: {
    name: data.name,
    email: data.email,
    // ... resto de campos
  }
});
```

---

## 🌐 Integración con Google Calendar (Opcional)

Si prefieres Google Calendar en lugar de tu propia BD:

**1. Habilitar API:**
- Ve a [Google Cloud Console](https://console.cloud.google.com/)
- Crea un proyecto
- Habilita Google Calendar API

**2. Instalar SDK:**
```bash
npm install googleapis
```

**3. Implementar:**
```javascript
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

// Crear evento
await calendar.events.insert({
  calendarId: 'primary',
  resource: {
    summary: 'Consulta: ' + clientName,
    description: challengeDetails,
    start: { dateTime: startTime, timeZone: 'America/Mexico_City' },
    end: { dateTime: endTime, timeZone: 'America/Mexico_City' },
    conferenceData: {
      createRequest: { requestId: uniqueId }
    }
  }
});
```

---

## 🎨 Actualización de FinalCallToActionSection

El componente `FinalCallToActionSection.tsx` ha sido actualizado para:
- ✅ Usar el nuevo `ChallengeChatbot`
- ✅ Mostrar descripción del sistema
- ✅ Incluir tarjetas de beneficios
- ✅ Diseño responsive y moderno

---

## ✅ Testing

### 1. Probar flujo conversacional:
```bash
npm run dev
# Ve a http://localhost:3000/#contact-form
# Completa el chat paso a paso
```

### 2. Probar APIs individualmente:

**Slots disponibles:**
```bash
curl -X POST http://localhost:3000/api/calendar/available-slots \
  -H "Content-Type: application/json" \
  -d '{"timezone":"America/Mexico_City"}'
```

**Agendar reunión:**
```bash
curl -X POST http://localhost:3000/api/calendar/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "phone": "1234567890",
    "company": "Test Co",
    "challenge": "Test challenge",
    "objectives": "Test objectives",
    "expectations": "Test expectations",
    "budget": "$10k",
    "timeline": "2 months",
    "selectedSlot": "2026-01-27T09:00:00Z",
    "timezone": "America/Mexico_City"
  }'
```

---

## 🚀 Roadmap de Implementación

### Fase 1 - Básico (Actual) ✅
- [x] Chatbot conversacional estructurado
- [x] APIs de calendario y scheduling
- [x] Integración con componentes existentes

### Fase 2 - Producción 🔄
- [ ] Configurar Zoom API real
- [ ] Implementar base de datos (Prisma/PostgreSQL)
- [ ] Configurar servicio de email
- [ ] Manejo de errores robusto
- [ ] Logs y monitoreo

### Fase 3 - Avanzado 🔮
- [ ] Integración con Google/Microsoft Calendar
- [ ] Sistema de notificaciones (recordatorios)
- [ ] Dashboard admin para gestionar reuniones
- [ ] Analytics de conversaciones
- [ ] A/B testing del flujo conversacional

---

## 🐛 Troubleshooting

### Error: "Failed to fetch available slots"
- Verifica que el endpoint API esté corriendo
- Revisa la consola del servidor para errores
- Valida el timezone enviado

### Error: "Error creating Zoom meeting"
- Verifica credenciales de Zoom en `.env.local`
- Confirma que la Zoom App tenga permisos correctos
- Revisa límites de API de Zoom (rate limiting)

### Emails no se envían
- Verifica credenciales del servicio de email
- Confirma que el email "from" esté verificado
- Revisa spam/junk del destinatario

---

## 📞 Soporte

Para dudas o problemas:
1. Revisa la documentación de Zoom: https://developers.zoom.us/docs/
2. Revisa la documentación de tu proveedor de email
3. Consulta logs del servidor: `npm run dev` (modo desarrollo)

---

## 📄 Licencia y Consideraciones

- ⚠️ Las APIs de Zoom pueden tener costos según el plan
- ⚠️ Servicios de email tienen límites (Resend: 100 emails/día gratis)
- ⚠️ Considera GDPR/privacidad al almacenar datos personales
- ⚠️ Implementa rate limiting para prevenir abuso

---

¡Sistema listo para personalizar según tus necesidades! 🎉
