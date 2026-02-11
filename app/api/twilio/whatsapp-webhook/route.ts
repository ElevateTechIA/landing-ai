import { NextRequest, NextResponse } from 'next/server';
import { validateTwilioSignature } from '@/lib/twilio';
import { getWhatsAppConfigByTwilioPhone } from '@/lib/whatsapp-config';
import { IncomingWhatsAppMessage } from '@/lib/whatsapp';
import { handleIncomingWhatsAppMessage } from '@/lib/whatsapp-message-handler';

/**
 * POST - Receive incoming WhatsApp messages from Twilio
 * Twilio sends form-encoded POST requests (not JSON like Meta).
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    console.log('[TWILIO WA WEBHOOK] Received:', {
      MessageSid: params.MessageSid,
      From: params.From,
      To: params.To,
      Body: params.Body?.substring(0, 50),
      NumMedia: params.NumMedia,
    });

    // Validate Twilio signature
    const twilioSignature = request.headers.get('x-twilio-signature') || '';
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/whatsapp-webhook`;

    if (twilioSignature) {
      const isValid = validateTwilioSignature(twilioSignature, webhookUrl, params);
      if (!isValid) {
        console.error('[TWILIO WA WEBHOOK] Invalid signature');
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    // Extract the phone number from Twilio's whatsapp:+xxx format
    const toPhone = params.To?.replace('whatsapp:', '') || '';
    const fromPhone = params.From?.replace('whatsapp:', '') || '';

    // Look up config by the receiving Twilio phone number
    const phoneConfig = getWhatsAppConfigByTwilioPhone(toPhone);
    if (!phoneConfig) {
      console.error('[TWILIO WA WEBHOOK] No config found for Twilio phone:', toPhone);
      return new NextResponse('', { status: 200 });
    }

    // Determine message type
    const numMedia = parseInt(params.NumMedia || '0', 10);
    let messageType: IncomingWhatsAppMessage['type'] = 'text';
    if (numMedia > 0) {
      const mediaContentType = params.MediaContentType0 || '';
      if (mediaContentType.startsWith('image/')) messageType = 'image';
      else if (mediaContentType.startsWith('audio/')) messageType = 'audio';
      else if (mediaContentType.startsWith('video/')) messageType = 'video';
      else messageType = 'document';
    }

    // Build the shared IncomingWhatsAppMessage
    const incoming: IncomingWhatsAppMessage = {
      from: fromPhone,
      messageId: params.MessageSid || crypto.randomUUID(),
      timestamp: String(Math.floor(Date.now() / 1000)),
      type: messageType,
      text: params.Body || undefined,
      displayName: params.ProfileName || undefined,
      businessPhoneNumberId: phoneConfig.phoneNumberId,
    };

    // Handle with shared pipeline
    await handleIncomingWhatsAppMessage(incoming, phoneConfig, phoneConfig.phoneNumberId);

    // Twilio expects empty 200 response (not JSON)
    return new NextResponse('', { status: 200 });
  } catch (error) {
    console.error('[TWILIO WA WEBHOOK] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
