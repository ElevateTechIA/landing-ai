const admin = require('firebase-admin');
require('dotenv').config({ path: '.env.local' });

// Inicializar Firebase
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  }),
});

const db = admin.firestore();

async function testFirebase() {
  console.log('\n🔥 VERIFICANDO CONEXIÓN A FIREBASE\n');
  
  try {
    // Test 1: Crear documento de prueba en meetings
    console.log('📝 Creando reunión de prueba...');
    const testMeeting = {
      name: 'Usuario de Prueba',
      email: 'test@example.com',
      phone: '+1234567890',
      company: 'Test Company',
      challenge: 'Implementar sistema de agendamiento',
      objectives: 'Automatizar reuniones',
      expectations: 'Sistema funcional',
      budget: '$5,000 - $10,000',
      timeline: '2-4 semanas',
      scheduledTime: new Date().toISOString(),
      zoomLink: 'https://zoom.us/j/test-meeting',
      zoomId: 'test-123',
      status: 'scheduled',
      reminderSent: false,
      attended: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('meetings').add(testMeeting);
    console.log('✅ Reunión creada con ID:', docRef.id);
    
    // Test 2: Leer el documento
    const doc = await docRef.get();
    console.log('✅ Documento leído correctamente');
    console.log('📄 Datos:', JSON.stringify(doc.data(), null, 2));
    
    // Test 3: Actualizar el documento
    await docRef.update({ status: 'confirmed' });
    console.log('✅ Documento actualizado correctamente');
    
    // Test 4: Consultar todos los meetings
    const snapshot = await db.collection('meetings').limit(5).get();
    console.log(`\n📊 Total de reuniones en la base de datos: ${snapshot.size}`);
    
    // Test 5: Crear una fecha bloqueada
    console.log('\n📅 Creando fecha bloqueada de prueba...');
    const blockedDateRef = await db.collection('blockedDates').add({
      date: new Date('2026-01-25'),
      reason: 'Día festivo - Prueba',
      createdAt: new Date()
    });
    console.log('✅ Fecha bloqueada creada con ID:', blockedDateRef.id);
    
    console.log('\n✅ ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!\n');
    console.log('🎉 Firebase está completamente configurado y funcionando.\n');
    console.log('📊 Ve a Firebase Console para ver los datos:');
    console.log('   https://console.firebase.google.com/project/landing-ai-meetings/firestore\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testFirebase();
