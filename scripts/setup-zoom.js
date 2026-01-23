#!/usr/bin/env node

/**
 * Script para configurar Zoom API (Server-to-Server OAuth)
 * 
 * Este script te guía para obtener las credenciales de Zoom Marketplace
 * necesarias para crear reuniones automáticamente
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '..', '.env.local');

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function updateEnvFile(key, value) {
  let envContent = '';
  
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  const regex = new RegExp(`^${key}=.*$`, 'gm');
  const newLine = `${key}=${value}`;

  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, newLine);
  } else {
    envContent += `\n${newLine}`;
  }

  fs.writeFileSync(envPath, envContent);
  console.log(`✅ ${key} actualizado`);
}

async function main() {
  console.log('\n🎥 CONFIGURADOR DE ZOOM API\n');
  
  console.log('📋 PASOS PARA OBTENER LAS CREDENCIALES:\n');
  console.log('1. Ve a Zoom Marketplace');
  console.log('   https://marketplace.zoom.us/\n');
  
  console.log('2. Inicia sesión con tu cuenta de Zoom\n');
  
  console.log('3. Crea una Server-to-Server OAuth App');
  console.log('   - Click en "Develop" (arriba derecha)');
  console.log('   - Click en "Build App"');
  console.log('   - Selecciona "Server-to-Server OAuth"');
  console.log('   - Click en "Create"\n');
  
  console.log('4. Configura la app');
  console.log('   - App Name: "Landing AI Meeting Scheduler"');
  console.log('   - Short Description: "Sistema de agendamiento automático"');
  console.log('   - Company Name: Tu empresa');
  console.log('   - Developer Contact: Tu email\n');
  
  console.log('5. Obtén las credenciales (pestaña "App Credentials")');
  console.log('   - Account ID');
  console.log('   - Client ID');
  console.log('   - Client Secret\n');
  
  console.log('6. Agrega Scopes (pestaña "Scopes")');
  console.log('   - meeting:write:admin (Crear reuniones)');
  console.log('   - meeting:read:admin (Leer información de reuniones)');
  console.log('   - user:read:admin (Leer información de usuarios)\n');
  
  console.log('7. Activa la app');
  console.log('   - Click en "Continue" hasta llegar a "Activation"');
  console.log('   - Click en "Activate your app"\n');
  
  const openBrowser = await question('¿Abrir Zoom Marketplace ahora? (s/n): ');
  
  if (openBrowser.toLowerCase() === 's') {
    const { exec } = require('child_process');
    exec('start https://marketplace.zoom.us/develop/create');
    console.log('\n✅ Zoom Marketplace abierto en tu navegador\n');
  }
  
  console.log('\n📝 INGRESAR CREDENCIALES:\n');
  
  const hasCredentials = await question('¿Ya tienes las credenciales de Zoom? (s/n): ');
  
  if (hasCredentials.toLowerCase() === 's') {
    console.log('\n📋 Ingresa las siguientes credenciales:\n');
    
    const accountId = await question('Account ID: ');
    const clientId = await question('Client ID: ');
    const clientSecret = await question('Client Secret: ');
    
    if (accountId && clientId && clientSecret) {
      updateEnvFile('ZOOM_ACCOUNT_ID', accountId.trim());
      updateEnvFile('ZOOM_CLIENT_ID', clientId.trim());
      updateEnvFile('ZOOM_CLIENT_SECRET', clientSecret.trim());
      
      console.log('\n✅ ¡Zoom API configurado exitosamente!\n');
      console.log('📝 Próximos pasos:');
      console.log('1. Reinicia el servidor: npm run dev');
      console.log('2. El sistema ahora creará reuniones reales en Zoom');
      console.log('3. Prueba creando una reunión desde el chatbot\n');
      
      // Probar las credenciales
      console.log('🧪 ¿Quieres probar la conexión a Zoom? (s/n)');
      const testConnection = await question('');
      
      if (testConnection.toLowerCase() === 's') {
        console.log('\n🔄 Probando conexión...\n');
        
        try {
          const { testZoomConnection } = require('../lib/zoom');
          await testZoomConnection();
          console.log('✅ ¡Conexión exitosa! Zoom está configurado correctamente.\n');
        } catch (error) {
          console.error('❌ Error al conectar con Zoom:', error.message);
          console.log('\nVerifica que:');
          console.log('- Las credenciales sean correctas');
          console.log('- La app esté activada en Zoom Marketplace');
          console.log('- Los scopes estén configurados correctamente\n');
        }
      }
      
    } else {
      console.log('\n❌ Credenciales incompletas. Por favor ejecuta el script nuevamente.\n');
    }
    
  } else {
    console.log('\n👋 No hay problema. Sigue las instrucciones y ejecuta este script cuando estés listo.\n');
    console.log('📚 Documentación completa: ZOOM_SETUP.md\n');
  }
  
  rl.close();
}

main().catch(error => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});
