import { NextResponse } from 'next/server';
import { getAllWhatsAppConfigs } from '@/lib/whatsapp-config';

export async function GET() {
  const configs = getAllWhatsAppConfigs();

  // Return only safe fields (no tokens!)
  const phoneNumbers = configs.map(c => ({
    phoneNumberId: c.phoneNumberId,
    displayName: c.displayName,
    displayPhone: c.displayPhone,
  }));

  return NextResponse.json({ success: true, phoneNumbers });
}
