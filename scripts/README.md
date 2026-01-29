# Script para Obtener Google Refresh Token

Este script te ayuda a obtener un nuevo refresh token de Google Calendar para tu aplicación.

## Requisitos Previos

1. Tener configurado un proyecto en Google Cloud Console
2. Tener las credenciales OAuth2 en tu archivo `.env.local`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
3. Haber configurado `http://localhost` como URI de redirección autorizada en Google Cloud Console

## Configurar URI de Redirección en Google Cloud Console

Antes de ejecutar el script, asegúrate de que tu aplicación OAuth2 tenga configurado el URI de redirección correcto:

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Ve a **APIs & Services** > **Credentials**
4. Haz clic en tu OAuth 2.0 Client ID
5. En la sección **Authorized redirect URIs**, asegúrate de tener:
   - `http://localhost`
   - `http://localhost:3000` (opcional)
6. Guarda los cambios

## Uso

```bash
# Ejecutar el script
node scripts/get-google-refresh-token.js
```

## Pasos

1. El script mostrará una URL de autorización
2. Copia y pega la URL en tu navegador
3. Inicia sesión con la cuenta de Google que quieres usar para el calendario
4. Acepta los permisos solicitados
5. Serás redirigido a `http://localhost` (la página no cargará, esto es normal)
6. Copia la URL completa de la barra de direcciones (incluye `?code=...`)
7. Pega la URL en el script
8. El script te dará el nuevo `GOOGLE_REFRESH_TOKEN`
9. Copia el token y actualiza tu archivo `.env.local`

## Solución de Problemas

### No recibo un refresh token

Si el script te dice que no recibió un refresh token, es probable que ya hayas autorizado la aplicación anteriormente. Para solucionarlo:

1. Ve a https://myaccount.google.com/permissions
2. Busca tu aplicación en la lista
3. Haz clic en ella y selecciona "Eliminar acceso"
4. Vuelve a ejecutar el script

### Error de redirect_uri_mismatch

Si recibes este error, significa que el URI de redirección no está configurado correctamente en Google Cloud Console. Asegúrate de agregar `http://localhost` exactamente como está (sin barra diagonal al final).

### Error de credenciales inválidas

Verifica que tu `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` en `.env.local` sean correctos y correspondan al mismo proyecto OAuth2 en Google Cloud Console.

## Después de Obtener el Token

1. Actualiza tu archivo `.env.local` con el nuevo `GOOGLE_REFRESH_TOKEN`
2. Reinicia tu servidor de desarrollo
3. Prueba crear un evento de calendario
