/**
 * Script para inicializar la estructura de Firestore
 * 
 * Ejecutar: node scripts/init-firestore.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno manualmente
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  });
}

async function initFirestore() {
  try {
    console.log('🔥 Inicializando Firestore...\n');

    // Inicializar Firebase Admin
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      console.log('✓ Firebase Admin inicializado');
    }

    const db = admin.firestore();

    // Crear colecciones con documentos de ejemplo (se eliminarán después)
    console.log('\n📁 Creando estructura de colecciones...\n');

    // 1. Colección de reuniones
    console.log('1. Creando colección "meetings"...');
    await db.collection('meetings').doc('_init').set({
      _placeholder: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      description: 'Este es un documento temporal de inicialización'
    });
    console.log('   ✓ Colección "meetings" creada');

    // 2. Colección de fechas bloqueadas
    console.log('2. Creando colección "blockedDates"...');
    await db.collection('blockedDates').doc('_init').set({
      _placeholder: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      description: 'Este es un documento temporal de inicialización'
    });
    console.log('   ✓ Colección "blockedDates" creada');

    // 3. Colección de slots de disponibilidad
    console.log('3. Creando colección "availabilitySlots"...');
    await db.collection('availabilitySlots').doc('_init').set({
      _placeholder: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      description: 'Este es un documento temporal de inicialización'
    });
    console.log('   ✓ Colección "availabilitySlots" creada');

    console.log('\n✨ Estructura de Firestore inicializada correctamente');
    console.log('\n📋 Colecciones creadas:');
    console.log('   - meetings');
    console.log('   - blockedDates');
    console.log('   - availabilitySlots');

    console.log('\n💡 Los documentos temporales "_init" se pueden eliminar manualmente desde la consola de Firebase.');
    console.log('   O se eliminarán automáticamente al crear el primer documento real.');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error al inicializar Firestore:', error);
    process.exit(1);
  }
}

initFirestore();
