/**
 * Script to generate Google OAuth2 Refresh Token
 *
 * Run this script to get a new GOOGLE_REFRESH_TOKEN using the correct account
 * (elevatetechagency@gmail.com)
 *
 * Usage:
 * 1. Make sure you have GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
 * 2. Run: node scripts/generate-google-token.js
 * 3. Follow the instructions to authorize the app
 * 4. Copy the refresh_token and update GOOGLE_REFRESH_TOKEN in Vercel
 */

const readline = require('readline');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
// Use localhost redirect URI
const GOOGLE_REDIRECT_URI = 'http://localhost:8080';

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.error('❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in .env.local');
  process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI
);

// Scopes needed for calendar access
const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

console.log('\n🔐 Google OAuth2 Token Generator\n');
console.log('This script will help you generate a new GOOGLE_REFRESH_TOKEN\n');

// Generate authorization URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // Force consent screen to get refresh token
});

console.log('📋 Step 1: Authorize this app');
console.log('─────────────────────────────────────────────────────────');
console.log('1. Open this URL in your browser:');
console.log('\n' + authUrl + '\n');
console.log('2. Sign in with: elevatetechagency@gmail.com');
console.log('3. Grant calendar access permissions');
console.log('4. Copy the authorization code shown on the page\n');
console.log('⚠️  IMPORTANT: If you see "Access blocked" error:');
console.log('   Go to https://console.cloud.google.com/apis/credentials');
console.log('   Edit your OAuth 2.0 Client ID');
console.log('   Add this Redirect URI: urn:ietf:wg:oauth:2.0:oob\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the authorization code: ', async (code) => {
  try {
    console.log('\n⏳ Exchanging code for tokens...\n');

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    console.log('✅ Success! Here are your tokens:\n');
    console.log('─────────────────────────────────────────────────────────');
    console.log('ACCESS_TOKEN (expires in 1 hour):');
    console.log(tokens.access_token);
    console.log('\n─────────────────────────────────────────────────────────');
    console.log('REFRESH_TOKEN (never expires):');
    console.log(tokens.refresh_token);
    console.log('─────────────────────────────────────────────────────────\n');

    if (!tokens.refresh_token) {
      console.log('⚠️  WARNING: No refresh_token received.');
      console.log('This usually means you already authorized this app before.');
      console.log('\nTo fix this:');
      console.log('1. Go to: https://myaccount.google.com/permissions');
      console.log('2. Sign in with: elevatetechagency@gmail.com');
      console.log('3. Find and remove access for your app');
      console.log('4. Run this script again\n');
    } else {
      console.log('📝 Next steps:');
      console.log('1. Copy the REFRESH_TOKEN above');
      console.log('2. Update GOOGLE_REFRESH_TOKEN in Vercel:');
      console.log('   vercel env add GOOGLE_REFRESH_TOKEN');
      console.log('3. Redeploy your app:\n');
      console.log('   git commit -m "Update Google Calendar credentials"');
      console.log('   git push\n');

      // Verify the token works
      console.log('⏳ Verifying token with Calendar API...\n');
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
      const calendarList = await calendar.calendarList.list();

      console.log('✅ Token verified! Accessible calendars:');
      calendarList.data.items?.forEach(cal => {
        console.log(`  - ${cal.summary} (${cal.id})`);
      });
      console.log('');
    }

    rl.close();
  } catch (error) {
    console.error('\n❌ Error getting tokens:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    rl.close();
    process.exit(1);
  }
});
