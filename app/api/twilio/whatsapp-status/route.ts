import { NextRequest, NextResponse } from 'next/server';
import { validateTwilioSignature } from '@/lib/twilio';
import { updateMessageStatus } from '@/lib/firebase';

/**
 * POST - Receive WhatsApp message delivery status updates from Twilio
 * Twilio sends: MessageSid, MessageStatus, To, From, ErrorCode, ErrorMessage
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value.toString();
    });

    console.log('[TWILIO WA STATUS] Status update:', {
      MessageSid: params.MessageSid,
      MessageStatus: params.MessageStatus,
      To: params.To,
      ErrorCode: params.ErrorCode,
    });

    // Validate Twilio signature
    const twilioSignature = request.headers.get('x-twilio-signature') || '';
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/whatsapp-status`;

    if (twilioSignature) {
      const isValid = validateTwilioSignature(twilioSignature, webhookUrl, params);
      if (!isValid) {
        console.error('[TWILIO WA STATUS] Invalid signature');
        return new NextResponse('Forbidden', { status: 403 });
      }
    }

    const messageSid = params.MessageSid;
    const status = params.MessageStatus; // queued, sent, delivered, read, failed, undelivered
    const recipientPhone = params.To?.replace('whatsapp:', '') || '';

    if (messageSid && status && recipientPhone) {
      // Map Twilio statuses to our internal statuses
      let mappedStatus: 'sent' | 'delivered' | 'read' | 'failed';
      switch (status) {
        case 'queued':
        case 'sent':
          mappedStatus = 'sent';
          break;
        case 'delivered':
          mappedStatus = 'delivered';
          break;
        case 'read':
          mappedStatus = 'read';
          break;
        case 'failed':
        case 'undelivered':
          mappedStatus = 'failed';
          if (params.ErrorCode) {
            console.error(`[TWILIO WA STATUS] DELIVERY FAILED - Code: ${params.ErrorCode}, Message: ${params.ErrorMessage}`);
          }
          break;
        default:
          mappedStatus = 'sent';
      }

      // Note: Twilio uses MessageSid as the message ID, not Meta's wamid format.
      // The updateMessageStatus function searches by messageId in the conversation.
      await updateMessageStatus(
        recipientPhone,
        messageSid,
        mappedStatus,
        new Date()
      );
    }

    return new NextResponse('', { status: 200 });
  } catch (error) {
    console.error('[TWILIO WA STATUS] Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
