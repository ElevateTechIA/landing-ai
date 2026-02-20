/**
 * Script to add WhatsApp number to Facebook account metadata
 * Usage: node scripts/add-whatsapp-number.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require(path.join(__dirname, '../landing-ai-meetings-firebase-adminsdk-fbsvc-8e4b4c8ad6.json'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const WHATSAPP_NUMBER = '+13055425070';

async function addWhatsAppNumber() {
  try {
    console.log('🔍 Searching for Facebook accounts...\n');

    // Get all Facebook accounts
    const accountsRef = db.collection('socialAccounts');
    const snapshot = await accountsRef.where('platform', '==', 'facebook').get();

    if (snapshot.empty) {
      console.log('❌ No Facebook accounts found.');
      process.exit(0);
    }

    console.log(`✅ Found ${snapshot.size} Facebook account(s)\n`);

    let updated = 0;
    let skipped = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const currentMetadata = data.metadata || {};

      // Check if WhatsApp number is already set
      if (currentMetadata.whatsappNumber === WHATSAPP_NUMBER) {
        console.log(`⏭️  Skipped: ${data.platformAccountName} (already has ${WHATSAPP_NUMBER})`);
        skipped++;
        continue;
      }

      // Update metadata with WhatsApp number
      await doc.ref.update({
        metadata: {
          ...currentMetadata,
          whatsappNumber: WHATSAPP_NUMBER
        },
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      console.log(`✅ Updated: ${data.platformAccountName} → ${WHATSAPP_NUMBER}`);
      updated++;
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Total: ${snapshot.size}`);
    console.log('\n✨ Done!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addWhatsAppNumber();
