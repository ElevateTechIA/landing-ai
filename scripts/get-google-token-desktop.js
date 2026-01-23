const { google } = require('googleapis');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Cargar credenciales
const credentialsPath = path.join(__dirname, '..', 'google-oauth-credentials.json');
const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

const { client_id, client_secret, redirect_uris } = credentials.installed;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Generar URL de autorización
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent'
});

console.log('\n========================================');
console.log('🔐 Obtener Google Refresh Token');
console.log('========================================\n');

console.log('1. Abre esta URL en tu navegador:\n');
console.log(authUrl);
console.log('\n2. Autoriza la aplicación');
console.log('3. COPIA TODO EL CÓDIGO que aparece en la página (no la URL, el código que se muestra)');
console.log('4. Pégalo aquí:\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Código de autorización: ', async (code) => {
  try {
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('\n✅ ¡Token obtenido exitosamente!\n');
    console.log('Refresh Token:', tokens.refresh_token);
    console.log('\n📝 Agrega esto a tu .env.local:\n');
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    
    // Actualizar .env.local
    const envPath = path.join(__dirname, '..', '.env.local');
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    if (envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
      envContent = envContent.replace(
        /GOOGLE_REFRESH_TOKEN=.*/,
        `GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`
      );
    } else {
      envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
    }
    
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env.local actualizado correctamente!\n');
    
  } catch (error) {
    console.error('\n❌ Error al obtener el token:', error.message);
  }
  
  rl.close();
});
