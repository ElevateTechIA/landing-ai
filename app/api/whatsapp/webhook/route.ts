import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  parseIncomingMessage,
} from '@/lib/whatsapp';
import { getWhatsAppConfig, getDefaultWhatsAppConfig } from '@/lib/whatsapp-config';
import { updateMessageStatus } from '@/lib/firebase';
import { handleIncomingWhatsAppMessage } from '@/lib/whatsapp-message-handler';

/**
 * GET - Webhook verification for WhatsApp (Meta Cloud API)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  console.log('[WHATSAPP WEBHOOK] Verification request:', { mode, token, challenge });

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WHATSAPP WEBHOOK] Verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('[WHATSAPP WEBHOOK] Verification failed');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST - Receive incoming WhatsApp messages (Meta Cloud API)
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Extract businessPhoneNumberId from Meta payload metadata
    const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown>;
    const metadata = value?.metadata as Record<string, unknown>;
    const businessPhoneNumberId = (metadata?.phone_number_id as string) || '';

    // Get config for this business phone number
    const phoneConfig = getWhatsAppConfig(businessPhoneNumberId) || getDefaultWhatsAppConfig();
    if (!phoneConfig) {
      console.error('[WHATSAPP WEBHOOK] No WhatsApp config found for phone:', businessPhoneNumberId);
      return NextResponse.json({ error: 'No config' }, { status: 500 });
    }

    // Verify webhook signature
    const signature = request.headers.get('x-hub-signature-256');
    if (signature && phoneConfig.appSecret) {
      const isValid = verifyWebhookSignature(rawBody, signature, phoneConfig.appSecret);
      if (!isValid) {
        console.error('[WHATSAPP WEBHOOK] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    console.log('[WHATSAPP WEBHOOK] Received for phone:', businessPhoneNumberId);

    // Handle message status updates (sent, delivered, read, failed)
    try {
      const statuses = value?.statuses as Array<Record<string, unknown>>;

      if (statuses && statuses.length > 0) {
        for (const statusUpdate of statuses) {
          const msgStatus = statusUpdate.status as string;
          const msgId = statusUpdate.id as string;
          const recipientId = statusUpdate.recipient_id as string;
          const timestamp = statusUpdate.timestamp as string;

          if (msgStatus && msgId && recipientId) {
            console.log(`[WHATSAPP WEBHOOK] Status update: ${msgStatus} for message ${msgId} to ${recipientId}`);

            if (msgStatus === 'failed') {
              const errors = statusUpdate.errors as Array<Record<string, unknown>> | undefined;
              if (errors && errors.length > 0) {
                for (const err of errors) {
                  console.error(`[WHATSAPP WEBHOOK] DELIVERY FAILED - Code: ${err.code}, Title: ${err.title}, Message: ${err.message}, Details: ${JSON.stringify(err.error_data || {})}`);
                }
              } else {
                console.error(`[WHATSAPP WEBHOOK] DELIVERY FAILED - No error details provided for message ${msgId}`);
              }
            }

            await updateMessageStatus(
              recipientId,
              msgId,
              msgStatus as 'sent' | 'delivered' | 'read' | 'failed',
              timestamp ? new Date(parseInt(timestamp) * 1000) : undefined,
              businessPhoneNumberId
            );
          }
        }
        return NextResponse.json({ status: 'ok' });
      }
    } catch (statusError) {
      console.error('[WHATSAPP WEBHOOK] Error processing status update:', statusError);
    }

    // Parse and handle incoming message
    const incoming = parseIncomingMessage(body);

    if (!incoming) {
      return NextResponse.json({ status: 'ok' });
    }

    await handleIncomingWhatsAppMessage(incoming, phoneConfig, businessPhoneNumberId);

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[WHATSAPP WEBHOOK] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
