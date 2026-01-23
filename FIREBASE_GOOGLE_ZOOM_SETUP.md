# 🚀 Configuración para Producción con Firebase, Google Calendar y Zoom

## 📦 Paso 1: Instalar Dependencias

Las dependencias ya están instaladas. Si necesitas reinstalar:

```bash
npm install
```

Incluye:
- ✅ `firebase-admin` - Para Firebase Firestore
- ✅ `googleapis` - Para Google Calendar API
- ✅ `resend` - Para envío de emails

---

## 🔥 Paso 2: Configurar Firebase

### 2.1 Crear Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Click en "Agregar proyecto"
3. Nombra tu proyecto: `landing-ai-prod`
4. Deshabilita Google Analytics (opcional)
5. Click en "Crear proyecto"

### 2.2 Habilitar Firestore Database

1. En el menú lateral, ve a "Firestore Database"
2. Click en "Crear base de datos"
3. Selecciona "Empezar en modo de producción"
4. Elige la región más cercana
5. Click en "Habilitar"

### 2.3 Obtener Credenciales de Service Account

1. Ve a "Configuración del proyecto" (⚙️ en el menú lateral)
2. Pestaña "Cuentas de servicio"
3. Click en "Generar nueva clave privada"
4. Se descargará un archivo JSON

### 2.4 Configurar Variables de Entorno

Del archivo JSON descargado, necesitas:

```json
{
  "project_id": "tu-proyecto-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",
  "client_email": "firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com"
}
```

---

## 📅 Paso 3: Configurar Google Calendar API

### 3.1 Crear Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Nombra tu proyecto: `landing-ai-calendar`

### 3.2 Habilitar Google Calendar API

1. En el menú, ve a "APIs y servicios" > "Biblioteca"
2. Busca "Google Calendar API"
3. Click en "Habilitar"

### 3.3 Crear Credenciales OAuth 2.0

1. Ve a "APIs y servicios" > "Credenciales"
2. Click en "+ CREAR CREDENCIALES" > "ID de cliente de OAuth"
3. Tipo de aplicación: "Aplicación web"
4. Nombre: "Landing AI Calendar Access"
5. URIs de redireccionamiento autorizados:
   - `http://localhost:3000/api/auth/google/callback` (desarrollo)
   - `https://tu-dominio.com/api/auth/google/callback` (producción)
6. Click en "Crear"
7. Guarda el **Client ID** y **Client Secret**

### 3.4 Obtener Refresh Token

Necesitas obtener un refresh token para acceder al calendario. Usa este script:

```javascript
// scripts/get-google-refresh-token.js
const { google } = require('googleapis');
const readline = require('readline');

const oauth2Client = new google.auth.OAuth2(
  'TU_CLIENT_ID',
  'TU_CLIENT_SECRET',
  'http://localhost:3000/api/auth/google/callback'
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
});

console.log('Autoriza esta app visitando esta URL:');
console.log(authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Ingresa el código de la página aquí: ', async (code) => {
  rl.close();
  const { tokens } = await oauth2Client.getToken(code);
  console.log('\n=== Guarda estos tokens en tu .env.local ===');
  console.log('GOOGLE_REFRESH_TOKEN=', tokens.refresh_token);
  console.log('GOOGLE_ACCESS_TOKEN=', tokens.access_token);
});
```

Ejecuta:
```bash
node scripts/get-google-refresh-token.js
```

---

## 🎥 Paso 4: Configurar Zoom API

### 4.1 Crear Server-to-Server OAuth App

1. Ve a [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Click en "Develop" > "Build App"
3. Selecciona "Server-to-Server OAuth"
4. Nombra tu app: "Landing AI Meetings"
5. Click en "Create"

### 4.2 Información de la App

1. **App Name**: Landing AI Meetings
2. **Short Description**: Sistema de agendamiento de reuniones
3. **Company Name**: Tu empresa
4. Click en "Continue"

### 4.3 Configurar Scopes

Agrega estos permisos:
- ✅ `meeting:write:admin` - Crear reuniones
- ✅ `meeting:read:admin` - Leer reuniones
- ✅ `user:read:admin` - Leer info de usuario

Click en "Continue"

### 4.4 Obtener Credenciales

En la pestaña "App Credentials" encontrarás:
- **Account ID**
- **Client ID**
- **Client Secret**

Cópialos para el paso siguiente.

---

## 🔐 Paso 5: Configurar Variables de Entorno

Crea o edita `.env.local` en la raíz del proyecto:

```env
# ========================================
# FIREBASE CONFIGURATION
# ========================================
FIREBASE_PROJECT_ID="tu-proyecto-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@tu-proyecto.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nTU_PRIVATE_KEY_AQUI\n-----END PRIVATE KEY-----\n"

# ========================================
# GOOGLE CALENDAR API
# ========================================
GOOGLE_CLIENT_ID="123456789-xxxxxxxx.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxx"
GOOGLE_REDIRECT_URI="http://localhost:3000/api/auth/google/callback"
GOOGLE_REFRESH_TOKEN="1//xxxxxxxxxxxxxxxxxxxxx"

# ========================================
# ZOOM API (Server-to-Server OAuth)
# ========================================
ZOOM_ACCOUNT_ID="tu_account_id"
ZOOM_CLIENT_ID="tu_client_id"
ZOOM_CLIENT_SECRET="tu_client_secret"

# ========================================
# RESEND (Email)
# ========================================
RESEND_API_KEY="re_xxxxxxxxxxxxx"

# ========================================
# GENERAL CONFIG
# ========================================
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_CONTACT_EMAIL="meetings@tudominio.com"
```

### ⚠️ Nota Importante sobre FIREBASE_PRIVATE_KEY

El private key tiene saltos de línea. Asegúrate de:
1. Mantener las comillas dobles
2. Usar `\n` para los saltos de línea
3. NO agregar espacios extra

Ejemplo correcto:
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

---

## 📧 Paso 6: Configurar Resend (Email)

1. Ve a [resend.com](https://resend.com/)
2. Crea una cuenta (gratis hasta 100 emails/día)
3. Verifica tu email
4. Ve a "API Keys"
5. Click en "Create API Key"
6. Copia la key y agrégala a `.env.local`

### Verificar Dominio (Opcional pero recomendado)

1. Ve a "Domains" > "Add Domain"
2. Ingresa tu dominio
3. Agrega los registros DNS que te indiquen
4. Una vez verificado, actualiza:
   ```env
   NEXT_PUBLIC_CONTACT_EMAIL="meetings@tudominio.com"
   ```

---

## ✅ Paso 7: Probar la Configuración

### 7.1 Verificar Firebase

```bash
# Crear script de prueba
node -e "
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env.local' });

const { cert } = require('firebase-admin/app');

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\\\n/g, '\n'),
  }),
});

const db = getFirestore();
db.collection('test').add({ test: true })
  .then(() => console.log('✅ Firebase conectado exitosamente'))
  .catch(err => console.error('❌ Error:', err));
"
```

### 7.2 Compilar el Proyecto

```bash
npm run build
```

Si no hay errores, estás listo!

### 7.3 Iniciar en Desarrollo

```bash
npm run dev
```

Ve a `http://localhost:3000` y prueba el chatbot.

---

## 🎯 Paso 8: Flujo de Prueba Completo

1. **Abrir la aplicación**
   - Ve a `http://localhost:3000`
   - Scroll hasta "Tell Me About Your Challenge"

2. **Completar el chatbot**
   - Ingresa todos los datos paso a paso
   - Verifica que las validaciones funcionen

3. **Seleccionar horario**
   - El sistema mostrará slots disponibles
   - Verifica que no muestre horarios ocupados

4. **Verificar creación**
   - **Firebase**: Ve a Firebase Console > Firestore > meetings
   - **Google Calendar**: Revisa tu calendario
   - **Zoom**: Verifica el link de la reunión
   - **Email**: Revisa tu bandeja de entrada

---

## 🚀 Paso 9: Desplegar a Producción

### Opción A: Vercel (Recomendado)

```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

**Configurar Variables de Entorno:**
1. Ve al proyecto en vercel.com
2. Settings > Environment Variables
3. Agrega TODAS las variables de `.env.local`
4. ⚠️ Importante: Cuando agregues `FIREBASE_PRIVATE_KEY`, cópialo CON las comillas y `\n`

### Opción B: Servidor VPS

```bash
# Clonar el repositorio
git clone tu-repo.git
cd tu-repo

# Instalar dependencias
npm install

# Compilar
npm run build

# Usar PM2 para mantener la app corriendo
npm install -g pm2
pm2 start npm --name "landing-ai" -- start
pm2 save
pm2 startup
```

---

## 📊 Estructura de Datos en Firebase

### Colección: `meetings`

```javascript
{
  "name": "Juan Pérez",
  "email": "juan@example.com",
  "phone": "+52 123 456 7890",
  "company": "Tech Solutions",
  "challenge": "Desarrollar plataforma e-commerce",
  "objectives": "Aumentar ventas 40%",
  "expectations": "Plataforma escalable",
  "budget": "$50k - $100k",
  "timeline": "3-4 meses",
  "scheduledTime": "2026-01-27T09:00:00.000Z",
  "zoomLink": "https://zoom.us/j/123456789",
  "zoomId": "123456789",
  "zoomMeetingId": "123456789",
  "status": "scheduled",
  "reminderSent": false,
  "attended": false,
  "createdAt": "2026-01-22T10:30:00.000Z",
  "updatedAt": "2026-01-22T10:30:00.000Z"
}
```

### Colección: `blockedDates`

```javascript
{
  "date": "2026-12-25T00:00:00.000Z",
  "reason": "Navidad",
  "createdAt": "2026-01-22T10:30:00.000Z"
}
```

---

## 🔧 Scripts Útiles

### Bloquear una fecha

```javascript
// scripts/block-date.js
const { db, collections } = require('./lib/firebase');

async function blockDate(date, reason) {
  await db.collection(collections.blockedDates).add({
    date: new Date(date),
    reason,
    createdAt: new Date()
  });
  console.log(`✅ Fecha bloqueada: ${date}`);
}

// Uso: node scripts/block-date.js "2026-12-25" "Navidad"
blockDate(process.argv[2], process.argv[3]);
```

### Listar próximas reuniones

```javascript
// scripts/list-meetings.js
const { db, collections } = require('./lib/firebase');

async function listMeetings() {
  const snapshot = await db
    .collection(collections.meetings)
    .where('scheduledTime', '>=', new Date().toISOString())
    .orderBy('scheduledTime')
    .limit(10)
    .get();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log(`${data.scheduledTime} - ${data.name} (${data.email})`);
  });
}

listMeetings();
```

---

## 🐛 Solución de Problemas

### Error: "Firebase Admin initialization failed"
- Verifica que `FIREBASE_PRIVATE_KEY` tenga el formato correcto con `\n`
- Asegúrate de que las comillas rodeen toda la key
- Verifica que `FIREBASE_PROJECT_ID` y `FIREBASE_CLIENT_EMAIL` sean correctos

### Error: "Google Calendar API error"
- Verifica que el refresh token sea válido
- Asegúrate de que el calendario tenga permisos de escritura
- Revisa que la API de Google Calendar esté habilitada

### Error: "Zoom meeting creation failed"
- Verifica las credenciales de Zoom (Account ID, Client ID, Secret)
- Asegúrate de que la app tenga los scopes correctos
- Revisa límites de API (60 requests/minuto)

### Emails no llegan
- Verifica que `RESEND_API_KEY` sea correcta
- Revisa spam/correo no deseado
- Si usas dominio personalizado, verifica que esté verificado

---

## 📈 Mejoras Futuras

1. **Dashboard Admin**
   - Ver todas las reuniones
   - Modificar/cancelar reuniones
   - Ver estadísticas

2. **Recordatorios Automáticos**
   - Email 24 horas antes
   - Email 1 hora antes
   - SMS (con Twilio)

3. **Sincronización**
   - Sync bidireccional con Google Calendar
   - Actualizar estado en Firebase cuando cambia en Calendar

4. **Analytics**
   - Tasa de conversión del chatbot
   - Horarios más populares
   - Tasa de asistencia

---

## ✨ Sistema Listo para Producción

¡Tu sistema ahora usa:
- ✅ Firebase Firestore para almacenamiento
- ✅ Google Calendar API para gestión de calendario
- ✅ Zoom API para reuniones
- ✅ Resend para emails profesionales

Todo sincronizado y funcionando en producción! 🎉
