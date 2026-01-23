# 🔐 Obtener Credenciales de Google Calendar OAuth

## Guía Paso a Paso (~5 minutos)

### **PASO 1: Accede a Google Cloud Console**

```
https://console.cloud.google.com/
```

- Inicia sesión con tu cuenta de Google (la misma que usarás para el calendario)

---

### **PASO 2: Crear o Seleccionar Proyecto**

#### Opción A: Usar el proyecto existente de Firebase
1. Click en el selector de proyectos (arriba a la izquierda)
2. Selecciona **"landing-ai-meetings"** (el que creamos antes)
3. ✅ Usa el mismo proyecto para todo

#### Opción B: Crear nuevo proyecto
1. Click en "Nuevo proyecto"
2. Nombre: `landing-ai-calendar`
3. Click en "Crear"

**Recomendación**: Usa la Opción A (mismo proyecto que Firebase)

---

### **PASO 3: Habilitar Google Calendar API**

1. En el menú lateral: **APIs y servicios** → **Biblioteca**
2. En el buscador: escribe `Google Calendar API`
3. Click en **"Google Calendar API"**
4. Click en el botón **"Habilitar"** (azul)
5. Espera unos segundos hasta que se habilite

---

### **PASO 4: Configurar Pantalla de Consentimiento OAuth**

**IMPORTANTE**: Debes hacer esto antes de crear credenciales

1. Ve a: **APIs y servicios** → **Pantalla de consentimiento de OAuth**

2. Selecciona **"Externo"** (permite usar cualquier cuenta de Google)
   - Click en "Crear"

3. **Información de la aplicación**:
   - Nombre de la app: `Landing AI Calendar`
   - Correo de asistencia: tu email
   - Logo: (opcional, puedes omitir)

4. **Información de contacto del desarrollador**: tu email

5. Click en **"Guardar y continuar"**

6. **Permisos** (Scopes):
   - Click en "Agregar o quitar permisos"
   - Busca y selecciona:
     - ✅ `Google Calendar API` → `.../auth/calendar` (Ver y editar eventos)
     - ✅ `Google Calendar API` → `.../auth/calendar.readonly` (Ver eventos)
   - Click en "Actualizar"
   - Click en "Guardar y continuar"

7. **Usuarios de prueba** (solo para desarrollo):
   - Click en "Agregar usuarios"
   - Agrega tu email y otros usuarios que probarán
   - Click en "Guardar y continuar"

8. Click en **"Volver al panel"**

---

### **PASO 5: Crear Credenciales OAuth 2.0**

1. Ve a: **APIs y servicios** → **Credenciales**

2. Click en **"Crear credenciales"** (arriba)

3. Selecciona **"ID de cliente de OAuth"**

4. **Tipo de aplicación**: Selecciona **"Aplicación de escritorio"**

5. **Nombre**: `Landing AI Calendar MCP`

6. Click en **"Crear"**

7. Aparecerá un diálogo con:
   - Client ID
   - Client Secret
   
8. Click en **"Descargar JSON"** (botón de descarga)
   - Se descargará: `client_secret_XXXXX.apps.googleusercontent.com.json`

9. Click en "OK"

---

### **PASO 6: Configurar las Credenciales en el Proyecto**

#### **Método Automático (Recomendado)**:

```bash
node scripts/setup-google-oauth.js
```

El script te pedirá la ruta del archivo JSON descargado y configurará todo automáticamente.

#### **Método Manual**:

1. **Copia el archivo descargado** a la raíz del proyecto con el nombre:
   ```
   google-oauth-credentials.json
   ```

2. **Actualiza mcp.json** en tu carpeta de configuración de VS Code:
   ```json
   "google-calendar": {
     "command": "npx",
     "args": ["@cocal/google-calendar-mcp"],
     "env": {
       "GOOGLE_OAUTH_CREDENTIALS": "F:/code/landing-ai/google-oauth-credentials.json"
     }
   }
   ```

3. **Reinicia VS Code** para que el MCP se recargue

---

### **PASO 7: Obtener Refresh Token**

Ahora necesitas autorizar la aplicación para acceder a tu calendario:

```bash
node scripts/get-google-refresh-token.js
```

Este script:
1. Lee las credenciales de `google-oauth-credentials.json`
2. Abre tu navegador para autorizar
3. Te da un refresh token para copiar a `.env.local`

**Actualiza `.env.local`**:
```env
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
GOOGLE_REFRESH_TOKEN=1//xxxxx
GOOGLE_CALENDAR_ID=tu-email@gmail.com
```

---

## 📄 Estructura del Archivo de Credenciales

El archivo JSON descargado tiene esta estructura:

```json
{
  "installed": {
    "client_id": "xxxxx.apps.googleusercontent.com",
    "project_id": "landing-ai-meetings",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "GOCSPX-xxxxx",
    "redirect_uris": ["http://localhost"]
  }
}
```

O si seleccionaste otro tipo:

```json
{
  "web": {
    "client_id": "xxxxx.apps.googleusercontent.com",
    ...
  }
}
```

---

## 🧪 Verificar la Configuración

### Test 1: Verificar que el MCP esté configurado
```bash
# En VS Code, abre la paleta de comandos (Ctrl+Shift+P)
# Busca: "Developer: Reload Window"
# El MCP de Google Calendar debería cargarse
```

### Test 2: Probar acceso al calendario
```bash
node scripts/test-google-calendar.js
```

---

## 🛠️ Troubleshooting

### Error: "redirect_uri_mismatch"
**Causa**: El redirect URI no está configurado correctamente

**Solución**:
1. Ve a Google Cloud Console → Credenciales
2. Click en tu OAuth Client ID
3. En "URIs de redireccionamiento autorizados" agrega:
   - `http://localhost:3000`
   - `http://localhost:9005`
   - `http://localhost`

### Error: "Access blocked: Authorization Error"
**Causa**: La app no está verificada por Google

**Solución para desarrollo**:
1. Ve a Pantalla de consentimiento OAuth
2. En "Usuarios de prueba", agrega tu email
3. La app funcionará solo para emails en la lista

**Solución para producción**:
1. Envía la app para verificación de Google (proceso largo)
2. O mantén en modo "Testing" con usuarios específicos

### Error: "Invalid client"
**Causa**: Las credenciales están mal configuradas

**Solución**:
1. Verifica que el archivo JSON esté completo
2. Asegúrate de que sea tipo "Aplicación de escritorio"
3. Regenera las credenciales si es necesario

### No puedo encontrar el archivo descargado
**Ubicación típica**:
```
C:\Users\TU_USUARIO\Downloads\client_secret_xxxxx.json
```

**Renombrar a**:
```
google-oauth-credentials.json
```

---

## 📚 Recursos

- [Google Calendar API Docs](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## 🎯 Resumen Rápido

```bash
# 1. Ejecuta el configurador automático
node scripts/setup-google-oauth.js

# 2. Sigue las instrucciones en pantalla

# 3. Obtén el refresh token
node scripts/get-google-refresh-token.js

# 4. Actualiza .env.local con las credenciales

# 5. Reinicia VS Code

# ✅ ¡Listo! Google Calendar configurado
```

---

**Tiempo estimado**: 5-10 minutos
**Nivel de dificultad**: Medio
**Costo**: ✅ Gratis (hasta 1M de requests/día)
