#!/usr/bin/env node

/**
 * Script interactivo para configurar Firebase en el proyecto
 * 
 * Uso:
 *   node scripts/setup-firebase.js
 * 
 * Este script te guiará para:
 * 1. Crear un proyecto en Firebase Console
 * 2. Descargar el archivo de credenciales
 * 3. Extraer los valores necesarios
 * 4. Actualizar automáticamente .env.local
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
  console.log('\n🔥 CONFIGURADOR DE FIREBASE\n');
  console.log('Este script te ayudará a configurar Firebase en tu proyecto.\n');

  // Paso 1: Verificar si ya existe configuración
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes('FIREBASE_PROJECT_ID=') && !envContent.includes('your-project-id')) {
      const overwrite = await question('⚠️  Ya existe una configuración de Firebase. ¿Deseas sobrescribirla? (s/n): ');
      if (overwrite.toLowerCase() !== 's') {
        console.log('\n✅ Configuración actual mantenida.');
        rl.close();
        return;
      }
    }
  }

  console.log('\n📋 PASOS A SEGUIR:\n');
  console.log('1. Ve a: https://console.firebase.google.com/');
  console.log('2. Crea un nuevo proyecto o selecciona uno existente');
  console.log('3. Ve a: Configuración del proyecto > Cuentas de servicio');
  console.log('4. Click en "Generar nueva clave privada"');
  console.log('5. Se descargará un archivo JSON\n');

  const ready = await question('¿Ya descargaste el archivo JSON? (s/n): ');
  
  if (ready.toLowerCase() !== 's') {
    console.log('\n⏸️  Descarga el archivo y vuelve a ejecutar este script.');
    rl.close();
    return;
  }

  console.log('\n📄 OPCIÓN 1: Ruta del archivo JSON');
  const filePath = await question('Ingresa la ruta completa del archivo JSON descargado: ');

  if (filePath && fs.existsSync(filePath.trim())) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(filePath.trim(), 'utf8'));

      updateEnvFile('FIREBASE_PROJECT_ID', serviceAccount.project_id);
      updateEnvFile('FIREBASE_CLIENT_EMAIL', serviceAccount.client_email);
      updateEnvFile('FIREBASE_PRIVATE_KEY', `"${serviceAccount.private_key}"`);

      console.log('\n✅ ¡Firebase configurado exitosamente!\n');
      console.log('Próximos pasos:');
      console.log('1. Reinicia el servidor: npm run dev');
      console.log('2. Verifica que aparezca: "Firebase initialized successfully"');
      console.log('3. Continúa con Google Calendar y Zoom\n');
      
      rl.close();
      return;
    } catch (error) {
      console.error('\n❌ Error al leer el archivo JSON:', error.message);
      console.log('\nIntentando configuración manual...\n');
    }
  }

  console.log('\n📋 OPCIÓN 2: Ingreso manual de credenciales\n');
  console.log('Abre el archivo JSON descargado y busca estos valores:\n');

  const projectId = await question('project_id: ');
  const clientEmail = await question('client_email: ');
  console.log('\nprivate_key (pega todo el bloque, incluyendo los -----BEGIN/END----- y presiona Enter dos veces):');
  
  let privateKey = '';
  let emptyLines = 0;
  
  rl.on('line', (line) => {
    if (line.trim() === '') {
      emptyLines++;
      if (emptyLines >= 2) {
        rl.close();
      }
    } else {
      emptyLines = 0;
      privateKey += line + '\\n';
    }
  });

  rl.on('close', () => {
    if (projectId && clientEmail && privateKey) {
      privateKey = privateKey.replace(/\\n$/, ''); // Remove trailing \n
      
      updateEnvFile('FIREBASE_PROJECT_ID', projectId);
      updateEnvFile('FIREBASE_CLIENT_EMAIL', clientEmail);
      updateEnvFile('FIREBASE_PRIVATE_KEY', `"${privateKey}"`);

      console.log('\n✅ ¡Firebase configurado exitosamente!\n');
      console.log('Próximos pasos:');
      console.log('1. Reinicia el servidor: npm run dev');
      console.log('2. Verifica que aparezca: "Firebase initialized successfully"');
      console.log('3. Lee SETUP_RAPIDO_FIREBASE.md para más detalles\n');
    } else {
      console.log('\n❌ Configuración incompleta. Por favor ejecuta el script nuevamente.\n');
    }
  });
}

main().catch(error => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});
