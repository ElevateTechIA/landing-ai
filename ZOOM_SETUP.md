# 🎥 Configurar Zoom API - Server-to-Server OAuth

## Guía Paso a Paso (~10 minutos)

### **PASO 1: Accede a Zoom Marketplace**

```
https://marketplace.zoom.us/
```

- Inicia sesión con tu cuenta de Zoom
- Si no tienes cuenta, créala en: https://zoom.us/signup

---

### **PASO 2: Ir a Develop**

1. Click en **"Develop"** (esquina superior derecha)
2. En el menú desplegable, selecciona **"Build App"**

O ve directamente a:
```
https://marketplace.zoom.us/develop/create
```

---

### **PASO 3: Crear Server-to-Server OAuth App**

#### ¿Por qué Server-to-Server OAuth?
- ✅ No requiere autorización manual del usuario
- ✅ Perfecto para automatización
- ✅ Las reuniones se crean automáticamente
- ✅ Más simple de configurar

#### Pasos:

1. **Selecciona tipo de app**: **"Server-to-Server OAuth"**
   
2. Click en **"Create"**

3. **Información básica**:
   - **App Name**: `Landing AI Meeting Scheduler`
   - **Short Description**: `Sistema automático de agendamiento de reuniones para Landing AI`
   - **Company Name**: Tu empresa o nombre
   - **Developer Contact Information**:
     - Name: Tu nombre
     - Email: Tu email

4. Click en **"Continue"**

---

### **PASO 4: Obtener Credenciales**

Verás la pestaña **"App Credentials"** con 3 valores importantes:

```
Account ID:     abc123xyz456
Client ID:      AbCdEfGhIjKl123456
Client Secret:  aBcDeFgHiJkLmNoPqRsTuVwXyZ123456
```

**⚠️ IMPORTANTE**: 
- Guarda el **Client Secret** inmediatamente
- Solo se muestra una vez
- Si lo pierdes, debes regenerarlo

---

### **PASO 5: Configurar Scopes (Permisos)**

Los scopes determinan qué puede hacer tu app.

1. Click en la pestaña **"Scopes"**

2. Click en **"+ Add Scopes"**

3. **Scopes requeridos** (busca y selecciona):

   #### Para Crear Reuniones:
   - ✅ `meeting:write:admin` - Create meetings
   - ✅ `meeting:read:admin` - View meeting information
   
   #### Para Gestionar Usuarios:
   - ✅ `user:read:admin` - View user information
   
   #### Opcionales pero recomendados:
   - ⭕ `meeting:update:admin` - Update meetings
   - ⭕ `meeting:delete:admin` - Delete meetings

4. Click en **"Continue"**

---

### **PASO 6: Activar la App**

1. Revisa la información en **"Review & Activate"**

2. Acepta los términos si estás de acuerdo

3. Click en **"Activate your app"**

4. Verás el mensaje: **"Your app is activated!"** ✅

---

### **PASO 7: Configurar en el Proyecto**

#### **Método Automático (Recomendado)**:

```bash
node scripts/setup-zoom.js
```

El script te pedirá las 3 credenciales y configurará todo automáticamente.

#### **Método Manual**:

Actualiza `.env.local`:

```env
# Zoom API (Server-to-Server OAuth)
ZOOM_ACCOUNT_ID=tu-account-id
ZOOM_CLIENT_ID=tu-client-id
ZOOM_CLIENT_SECRET=tu-client-secret
```

---

### **PASO 8: Verificar la Configuración**

#### Test Rápido:

```bash
node scripts/test-zoom-connection.js
```

Este script:
- Obtiene un access token
- Crea una reunión de prueba
- Verifica que todo funcione

---

## 📊 Estructura de Credenciales

### Account ID
```
Ejemplo: abc123xyz456
Longitud: ~12 caracteres alfanuméricos
```

### Client ID
```
Ejemplo: AbCdEfGhIjKl123456
Longitud: ~18-20 caracteres alfanuméricos
```

### Client Secret
```
Ejemplo: aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789
Longitud: ~40+ caracteres alfanuméricos
⚠️ Sensible - No lo compartas públicamente
```

---

## 🔐 Cómo Funciona Server-to-Server OAuth

```
1. Tu servidor solicita un Access Token
   ↓
2. Zoom valida Client ID + Client Secret + Account ID
   ↓
3. Zoom devuelve Access Token (válido por 1 hora)
   ↓
4. Usas el Access Token para crear reuniones
   ↓
5. Cuando expira, solicitas uno nuevo automáticamente
```

**Ventaja**: Todo es automático, sin intervención del usuario.

---

## 🧪 Probar la Integración

### Crear Reunión de Prueba

Ejecuta este código para probar:

```javascript
const { createZoomMeeting } = require('./lib/zoom');

async function test() {
  try {
    const meeting = await createZoomMeeting(
      'Reunión de Prueba',
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
      60, // Duración: 60 minutos
      'America/Mexico_City'
    );
    
    console.log('✅ Reunión creada!');
    console.log('Link:', meeting.join_url);
    console.log('ID:', meeting.id);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

test();
```

---

## 🛠️ Troubleshooting

### Error: "Invalid client_secret"
**Causa**: Client Secret incorrecto o expirado

**Solución**:
1. Ve a Zoom Marketplace → Tu app
2. Pestaña "App Credentials"
3. Click en "Regenerate" para el Client Secret
4. Actualiza `.env.local` con el nuevo secret

### Error: "Invalid access token"
**Causa**: El token expiró o es inválido

**Solución**: El sistema regenera automáticamente. Si persiste:
- Verifica que Account ID y Client ID sean correctos
- Asegúrate de que la app esté activada

### Error: "Insufficient privileges"
**Causa**: Faltan scopes requeridos

**Solución**:
1. Ve a tu app en Zoom Marketplace
2. Pestaña "Scopes"
3. Agrega: `meeting:write:admin` y `user:read:admin`
4. Reactiva la app si es necesario

### Error: "App is not activated"
**Causa**: La app no está activada

**Solución**:
1. Ve a tu app en Zoom Marketplace
2. Click en "Activation" (menú lateral)
3. Click en "Activate your app"

### No puedo crear reuniones
**Verifica**:
- ✅ La app está activada
- ✅ Tienes los scopes correctos
- ✅ Las credenciales están en `.env.local`
- ✅ Tu cuenta de Zoom permite crear reuniones

---

## 📋 Checklist de Configuración

- [ ] Cuenta de Zoom creada
- [ ] Server-to-Server OAuth app creada
- [ ] Información básica completada
- [ ] Account ID copiado
- [ ] Client ID copiado
- [ ] Client Secret guardado (¡importante!)
- [ ] Scopes agregados:
  - [ ] `meeting:write:admin`
  - [ ] `meeting:read:admin`
  - [ ] `user:read:admin`
- [ ] App activada
- [ ] Credenciales en `.env.local`
- [ ] Script de prueba ejecutado exitosamente

---

## 🎯 Límites y Cuotas

### Plan Básico (Gratis)
- ✅ Reuniones 1-on-1 ilimitadas
- ✅ Reuniones grupales: 40 minutos
- ✅ 100 participantes máximo
- ✅ API: 1 request/segundo

### Plan Pro ($14.99/mes por host)
- ✅ Reuniones grupales ilimitadas (hasta 30 horas)
- ✅ 100 participantes
- ✅ Cloud recording
- ✅ API rate limits más altos

### Recomendación
El **Plan Básico es suficiente** para:
- Reuniones de consulta 1-on-1
- Demostraciones de producto
- Entrevistas

---

## 💡 Tips

### Personalizar Configuración de Reuniones

En `lib/zoom.ts`, puedes configurar:

```typescript
const meetingConfig = {
  duration: 60, // Minutos
  timezone: 'America/Mexico_City',
  settings: {
    host_video: true,
    participant_video: true,
    join_before_host: false,
    mute_upon_entry: true,
    waiting_room: true,
    audio: 'both', // telephony, voip, both
    auto_recording: 'none', // local, cloud, none
  }
};
```

### Agregar Co-Hosts Automáticamente

```typescript
settings: {
  alternative_hosts: 'email1@domain.com,email2@domain.com'
}
```

### Reuniones Recurrentes

```typescript
type: 8, // Reunión recurrente
recurrence: {
  type: 2, // 1=Diaria, 2=Semanal, 3=Mensual
  repeat_interval: 1,
  weekly_days: "2,4", // Lunes=1, Martes=2, etc
  end_times: 10 // Número de ocurrencias
}
```

---

## 📚 Recursos

- [Zoom API Documentation](https://developers.zoom.us/docs/api/)
- [Server-to-Server OAuth Guide](https://developers.zoom.us/docs/internal-apps/s2s-oauth/)
- [Meeting API Reference](https://developers.zoom.us/docs/api/rest/reference/zoom-api/methods/#operation/meetingCreate)
- [Zoom Marketplace](https://marketplace.zoom.us/)

---

## 🎉 Resumen Rápido

```bash
# 1. Ejecuta el configurador automático
node scripts/setup-zoom.js

# 2. Sigue las instrucciones en pantalla

# 3. Crea la app en Zoom Marketplace

# 4. Ingresa las credenciales cuando el script las pida

# 5. Prueba la conexión
node scripts/test-zoom-connection.js

# ✅ ¡Listo! Zoom configurado
```

---

**Tiempo estimado**: 10-15 minutos  
**Nivel de dificultad**: Fácil  
**Costo**: ✅ Gratis (Plan Básico suficiente)  
**Beneficio**: Reuniones reales automáticas con links de Zoom
