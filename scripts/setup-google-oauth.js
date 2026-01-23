#!/usr/bin/env node

/**
 * Script para configurar Google Calendar OAuth
 * 
 * Este script te guía para obtener las credenciales de Google Cloud Console
 * necesarias para el MCP de Google Calendar
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const credsPath = path.join(__dirname, '..', 'google-oauth-credentials.json');
const mcpConfigPath = path.join(process.env.APPDATA, 'Code', 'User', 'mcp.json');

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🔐 CONFIGURADOR DE GOOGLE CALENDAR OAUTH\n');
  
  console.log('📋 PASOS PARA OBTENER LAS CREDENCIALES:\n');
  console.log('1. Ve a Google Cloud Console');
  console.log('   https://console.cloud.google.com/\n');
  
  console.log('2. Crea o selecciona un proyecto');
  console.log('   - Click en el selector de proyectos (arriba)');
  console.log('   - "Nuevo proyecto" o selecciona "landing-ai-meetings"\n');
  
  console.log('3. Habilita Google Calendar API');
  console.log('   - Ve a: APIs y servicios > Biblioteca');
  console.log('   - Busca "Google Calendar API"');
  console.log('   - Click en "Habilitar"\n');
  
  console.log('4. Crea credenciales OAuth 2.0');
  console.log('   - Ve a: APIs y servicios > Credenciales');
  console.log('   - Click en "Crear credenciales" > "ID de cliente de OAuth"');
  console.log('   - Tipo de aplicación: "Aplicación de escritorio"');
  console.log('   - Nombre: "Landing AI Calendar MCP"');
  console.log('   - Click en "Crear"\n');
  
  console.log('5. Descarga las credenciales');
  console.log('   - Click en el botón de descarga (ícono ⬇️)');
  console.log('   - Se descargará un archivo JSON\n');
  
  const openBrowser = await question('¿Abrir Google Cloud Console ahora? (s/n): ');
  
  if (openBrowser.toLowerCase() === 's') {
    const { exec } = require('child_process');
    exec('start https://console.cloud.google.com/apis/credentials');
    console.log('\n✅ Google Cloud Console abierto en tu navegador\n');
  }
  
  console.log('\n📥 OPCIONES PARA CONFIGURAR:\n');
  console.log('A) Tengo el archivo JSON descargado');
  console.log('B) Quiero pegar el contenido del JSON manualmente');
  console.log('C) Volver más tarde\n');
  
  const option = await question('Selecciona una opción (A/B/C): ');
  
  if (option.toUpperCase() === 'A') {
    const filePath = await question('\nRuta del archivo JSON descargado: ');
    
    try {
      if (fs.existsSync(filePath.trim())) {
        const content = fs.readFileSync(filePath.trim(), 'utf8');
        const credentials = JSON.parse(content);
        
        // Guardar en el proyecto
        fs.writeFileSync(credsPath, JSON.stringify(credentials, null, 2));
        console.log(`\n✅ Credenciales guardadas en: ${credsPath}`);
        
        // Actualizar mcp.json
        if (fs.existsSync(mcpConfigPath)) {
          const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
          if (mcpConfig.servers && mcpConfig.servers['google-calendar']) {
            mcpConfig.servers['google-calendar'].env.GOOGLE_OAUTH_CREDENTIALS = credsPath.replace(/\\/g, '/');
            fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
            console.log('✅ mcp.json actualizado\n');
          }
        }
        
        console.log('🎉 ¡Configuración completada!\n');
        console.log('📝 Próximos pasos:');
        console.log('1. Reinicia VS Code para que el MCP se recargue');
        console.log('2. Ejecuta: node scripts/get-google-refresh-token.js');
        console.log('3. Autoriza la aplicación en tu navegador');
        console.log('4. Copia el refresh token a .env.local\n');
        
      } else {
        console.log('\n❌ Archivo no encontrado. Verifica la ruta.\n');
      }
    } catch (error) {
      console.error('\n❌ Error:', error.message);
    }
    
  } else if (option.toUpperCase() === 'B') {
    console.log('\n📋 Pega el contenido completo del archivo JSON y presiona Enter:');
    console.log('(Incluye todo desde { hasta })\n');
    
    let jsonContent = '';
    rl.on('line', (line) => {
      jsonContent += line;
      if (line.trim().endsWith('}') && jsonContent.includes('client_id')) {
        try {
          const credentials = JSON.parse(jsonContent);
          fs.writeFileSync(credsPath, JSON.stringify(credentials, null, 2));
          console.log(`\n✅ Credenciales guardadas en: ${credsPath}`);
          
          // Actualizar mcp.json
          if (fs.existsSync(mcpConfigPath)) {
            const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
            if (mcpConfig.servers && mcpConfig.servers['google-calendar']) {
              mcpConfig.servers['google-calendar'].env.GOOGLE_OAUTH_CREDENTIALS = credsPath.replace(/\\/g, '/');
              fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
              console.log('✅ mcp.json actualizado\n');
            }
          }
          
          console.log('🎉 ¡Configuración completada!\n');
          rl.close();
        } catch (error) {
          console.error('\n❌ JSON inválido. Intenta de nuevo.\n');
          rl.close();
        }
      }
    });
    
  } else {
    console.log('\n👋 No hay problema. Ejecuta este script cuando estés listo.\n');
  }
  
  rl.close();
}

main().catch(error => {
  console.error('❌ Error:', error);
  rl.close();
  process.exit(1);
});
