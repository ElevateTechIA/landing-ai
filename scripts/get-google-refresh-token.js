const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Leer credenciales del archivo
const credentialsPath = path.join(__dirname, '..', 'google-oauth-credentials.json');

if (!fs.existsSync(credentialsPath)) {
  console.error('❌ Error: No se encontró google-oauth-credentials.json');
  console.log('Por favor, primero ejecuta: node scripts/setup-google-oauth.js');
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
const { client_id, client_secret, redirect_uris } = credentials.installed || credentials.web;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent' // Fuerza a mostrar el consentimiento para obtener refresh token
});

console.log('\n========================================');
console.log('🔐 Obtener Google Refresh Token');
console.log('========================================\n');
console.log('✅ Credenciales cargadas correctamente');
console.log('📧 Client ID:', client_id);
console.log('🔗 Redirect URI:', redirect_uris[0], '\n');
console.log('1. Autoriza esta app visitando esta URL:\n');
console.log(authUrl);
console.log('\n2. Después de autorizar, serás redirigido a una URL.');
console.log('3. Copia el código de la URL (parámetro "code")\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Ingresa el código aquí: ', async (code) => {
  rl.close();
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('\n========================================');
    console.log('✅ ¡Tokens obtenidos exitosamente!');
    console.log('========================================\n');
    console.log('Agrega estas líneas a tu archivo .env.local:\n');
    console.log(`GOOGLE_REFRESH_TOKEN="${tokens.refresh_token}"`);
    
    if (tokens.access_token) {
      console.log(`\n# Access token (expira en 1 hora)`);
      console.log(`# GOOGLE_ACCESS_TOKEN="${tokens.access_token}"`);
    }
    
    console.log('\n========================================\n');
    console.log('⚠️  IMPORTANTE: Guarda el REFRESH_TOKEN de forma segura.');
    console.log('    No lo compartas ni lo subas a Git.\n');
  } catch (error) {
    console.error('\n❌ Error obteniendo tokens:', error.message);
    console.log('\nAsegúrate de:');
    console.log('- Haber copiado el código completo');
    console.log('- Que las credenciales (CLIENT_ID y CLIENT_SECRET) sean correctas');
    console.log('- Que el REDIRECT_URI en Google Cloud coincida exactamente\n');
  }
});
