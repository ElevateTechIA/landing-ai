#!/usr/bin/env node

/**
 * Script para obtener el Google Calendar Refresh Token
 *
 * Este script te guiará paso a paso para obtener un nuevo refresh token
 * de Google Calendar usando tus credenciales OAuth2.
 *
 * Uso:
 *   node scripts/get-google-refresh-token.js
 */

const readline = require('readline');
const { google } = require('googleapis');

// Cargar variables de entorno desde .env.local
require('dotenv').config({ path: '.env.local' });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
];

async function main() {
  console.log('\n🔐 Google Calendar Refresh Token Generator\n');
  console.log('═'.repeat(50));

  // Verificar que tenemos las credenciales necesarias
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('\n❌ Error: No se encontraron GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET');
    console.error('   Asegúrate de que existan en tu archivo .env.local\n');
    process.exit(1);
  }

  console.log('\n✅ Credenciales encontradas:');
  console.log(`   Client ID: ${clientId.substring(0, 20)}...`);
  console.log(`   Client Secret: ${clientSecret.substring(0, 10)}...`);

  // Crear el cliente OAuth2
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost' // Redirect URI (debe coincidir con el configurado en Google Cloud Console)
  );

  // Generar URL de autorización
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Necesario para obtener refresh token
    scope: SCOPES,
    prompt: 'consent' // Forzar pantalla de consentimiento para obtener refresh token
  });

  console.log('\n📋 Pasos a seguir:');
  console.log('   1. Abre la siguiente URL en tu navegador');
  console.log('   2. Inicia sesión con tu cuenta de Google');
  console.log('   3. Acepta los permisos solicitados');
  console.log('   4. Serás redirigido a una página que no carga (localhost)');
  console.log('   5. Copia la URL completa de esa página\n');

  console.log('═'.repeat(50));
  console.log('\n🌐 URL de autorización:\n');
  console.log(authUrl);
  console.log('\n' + '═'.repeat(50) + '\n');

  // Pedir el código de autorización
  rl.question('Pega aquí la URL completa a la que fuiste redirigido: ', async (redirectUrl) => {
    try {
      // Extraer el código de la URL
      const url = new URL(redirectUrl);
      const code = url.searchParams.get('code');

      if (!code) {
        console.error('\n❌ Error: No se encontró el código de autorización en la URL');
        console.error('   Asegúrate de copiar la URL completa incluyendo el parámetro "code"\n');
        rl.close();
        process.exit(1);
      }

      console.log('\n🔄 Intercambiando código por tokens...\n');

      // Intercambiar el código por tokens
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        console.error('\n⚠️  Error: No se recibió un refresh token');
        console.error('   Esto puede suceder si ya autorizaste esta aplicación anteriormente.');
        console.error('   Solución:');
        console.error('   1. Ve a https://myaccount.google.com/permissions');
        console.error('   2. Revoca el acceso a tu aplicación');
        console.error('   3. Vuelve a ejecutar este script\n');
        rl.close();
        process.exit(1);
      }

      console.log('✅ ¡Tokens obtenidos exitosamente!\n');
      console.log('═'.repeat(50));
      console.log('\n📝 Agrega esta línea a tu archivo .env.local:\n');
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('\n' + '═'.repeat(50));
      console.log('\n💡 Información adicional:');
      console.log(`   Access Token: ${tokens.access_token?.substring(0, 30)}...`);
      console.log(`   Expira en: ${tokens.expiry_date ? new Date(tokens.expiry_date).toLocaleString() : 'N/A'}`);
      console.log(`   Token Type: ${tokens.token_type}`);
      console.log(`   Scope: ${tokens.scope}\n`);

      console.log('✅ Copia el GOOGLE_REFRESH_TOKEN y actualiza tu .env.local');
      console.log('✅ Luego reinicia tu servidor de desarrollo\n');

      rl.close();
    } catch (error) {
      console.error('\n❌ Error al obtener los tokens:', error.message);
      console.error('\nDetalles del error:', error);
      rl.close();
      process.exit(1);
    }
  });
}

main().catch(error => {
  console.error('\n❌ Error inesperado:', error);
  process.exit(1);
});
