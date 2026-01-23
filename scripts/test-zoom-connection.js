const { createZoomMeeting, getZoomAccessToken } = require('../lib/zoom');

async function testZoomConnection() {
  console.log('\n🧪 PROBANDO CONEXIÓN A ZOOM API\n');
  
  try {
    // Test 1: Obtener Access Token
    console.log('1️⃣ Obteniendo Access Token...');
    const token = await getZoomAccessToken();
    console.log('✅ Access Token obtenido correctamente');
    console.log('   Token (primeros 20 chars):', token.substring(0, 20) + '...\n');
    
    // Test 2: Crear reunión de prueba
    console.log('2️⃣ Creando reunión de prueba...');
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    const meeting = await createZoomMeeting(
      'Reunión de Prueba - Landing AI',
      tomorrow.toISOString(),
      30, // 30 minutos
      'America/Mexico_City'
    );
    
    console.log('✅ Reunión creada exitosamente!\n');
    console.log('📅 Detalles de la reunión:');
    console.log('   ID:', meeting.id);
    console.log('   Tema:', meeting.topic);
    console.log('   Inicio:', new Date(meeting.start_time).toLocaleString('es-MX'));
    console.log('   Duración:', meeting.duration, 'minutos');
    console.log('   Link:', meeting.join_url);
    console.log('   Password:', meeting.password || 'Sin contraseña\n');
    
    console.log('🎉 ¡TODAS LAS PRUEBAS PASARON!\n');
    console.log('✅ Zoom está completamente configurado y funcionando.');
    console.log('✅ El sistema puede crear reuniones automáticamente.');
    console.log('\n📝 Nota: La reunión de prueba fue creada en tu cuenta de Zoom.');
    console.log('   Puedes eliminarla desde: https://zoom.us/meeting\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR AL PROBAR ZOOM:\n');
    console.error('Mensaje:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Datos:', JSON.stringify(error.response.data, null, 2));
    }
    
    console.log('\n🔍 TROUBLESHOOTING:\n');
    console.log('1. Verifica que las credenciales en .env.local sean correctas:');
    console.log('   - ZOOM_ACCOUNT_ID');
    console.log('   - ZOOM_CLIENT_ID');
    console.log('   - ZOOM_CLIENT_SECRET\n');
    console.log('2. Asegúrate de que la app esté activada en Zoom Marketplace\n');
    console.log('3. Verifica que los scopes estén configurados:');
    console.log('   - meeting:write:admin');
    console.log('   - meeting:read:admin');
    console.log('   - user:read:admin\n');
    console.log('4. Documentación completa: ZOOM_SETUP.md\n');
    
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  testZoomConnection();
}

module.exports = { testZoomConnection };
