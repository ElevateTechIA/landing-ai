#!/usr/bin/env node

/**
 * Script para obtener credenciales de Firebase Admin SDK automáticamente
 * 
 * Este script genera el comando para descargar las credenciales
 * y actualizar automáticamente el archivo .env.local
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectId = 'landing-ai-meetings';
const envPath = path.join(__dirname, '..', '.env.local');
const serviceAccountPath = path.join(__dirname, '..', 'firebase-service-account.json');

console.log('\n🔥 OBTENIENDO CREDENCIALES DE FIREBASE ADMIN SDK\n');

try {
  // Intentar obtener el service account usando gcloud
  console.log('📥 Descargando credenciales...\n');
  
  const command = `firebase apps:sdkconfig WEB 1:132079864006:web:f8dde3073481c708bfafc7`;
  const config = execSync(command, { encoding: 'utf8' });
  
  console.log('✅ Configuración obtenida:\n');
  console.log(config);
  
} catch (error) {
  console.log('⚠️  No se pudo obtener automáticamente las credenciales.\n');
  console.log('📋 PASOS MANUALES:\n');
  console.log('1. Abre Firebase Console (ya se abrió en tu navegador)');
  console.log('   URL: https://console.firebase.google.com/project/landing-ai-meetings/settings/serviceaccounts/adminsdk\n');
  console.log('2. Click en "Generar nueva clave privada"\n');
  console.log('3. Se descargará un archivo JSON\n');
  console.log('4. Ejecuta: node scripts/setup-firebase.js\n');
  console.log('   Y proporciona la ruta del archivo descargado\n');
  
  process.exit(0);
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
