/**
 * WhatsApp Business Cloud API Client
 * Handles sending messages via the WhatsApp Cloud API
 */

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

interface WhatsAppMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

interface WhatsAppErrorResponse {
  error: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

/**
 * Send a text message via WhatsApp Cloud API
 */
export async function sendWhatsAppCloudMessage(
  to: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error('[WHATSAPP] Missing credentials');
    return { success: false, error: 'WhatsApp credentials not configured' };
  }

  // Clean phone number - ensure it's in proper format
  const cleanPhone = to.replace(/[^\d+]/g, '');

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: false,
            body: body,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppErrorResponse;
      console.error('[WHATSAPP] API Error:', errorData.error);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to send message'
      };
    }

    const successData = data as WhatsAppMessageResponse;
    console.log('[WHATSAPP] Message sent:', successData.messages?.[0]?.id);
    return {
      success: true,
      messageId: successData.messages?.[0]?.id
    };
  } catch (error) {
    console.error('[WHATSAPP] Error sending message:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Send a template message via WhatsApp Cloud API
 * Templates must be pre-approved by Meta
 */
export async function sendWhatsAppTemplateMessage(
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters: Array<{ type: string; text?: string }>;
  }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error('[WHATSAPP] Missing credentials');
    return { success: false, error: 'WhatsApp credentials not configured' };
  }

  const cleanPhone = to.replace(/[^\d+]/g, '');

  try {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
      },
    };

    if (components) {
      (payload.template as Record<string, unknown>).components = components;
    }

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppErrorResponse;
      console.error('[WHATSAPP] API Error:', errorData.error);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to send template message'
      };
    }

    const successData = data as WhatsAppMessageResponse;
    console.log('[WHATSAPP] Template message sent:', successData.messages?.[0]?.id);
    return {
      success: true,
      messageId: successData.messages?.[0]?.id
    };
  } catch (error) {
    console.error('[WHATSAPP] Error sending template message:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Send an interactive list message via WhatsApp Cloud API
 * Used for presenting selectable options like appointment slots
 */
export async function sendWhatsAppInteractiveList(
  to: string,
  bodyText: string,
  buttonText: string,
  sections: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error('[WHATSAPP] Missing credentials');
    return { success: false, error: 'WhatsApp credentials not configured' };
  }

  const cleanPhone = to.replace(/[^\d+]/g, '');

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'interactive',
          interactive: {
            type: 'list',
            body: {
              text: bodyText,
            },
            action: {
              button: buttonText,
              sections,
            },
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppErrorResponse;
      console.error('[WHATSAPP] Interactive List API Error:', errorData.error);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to send interactive list'
      };
    }

    const successData = data as WhatsAppMessageResponse;
    console.log('[WHATSAPP] Interactive list sent:', successData.messages?.[0]?.id);
    return {
      success: true,
      messageId: successData.messages?.[0]?.id
    };
  } catch (error) {
    console.error('[WHATSAPP] Error sending interactive list:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Mark a message as read
 */
export async function markMessageAsRead(
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return { success: false, error: 'WhatsApp credentials not configured' };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          status: 'read',
          message_id: messageId,
        }),
      }
    );

    if (!response.ok) {
      const data = await response.json() as WhatsAppErrorResponse;
      return { success: false, error: data.error?.message };
    }

    return { success: true };
  } catch (error) {
    console.error('[WHATSAPP] Error marking message as read:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Verify webhook signature from WhatsApp
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const crypto = require('crypto');
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (!appSecret) {
    console.error('[WHATSAPP] App secret not configured');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');

  const providedSignature = signature.replace('sha256=', '');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(providedSignature)
  );
}

/**
 * Format phone number to E.164 format
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // If it doesn't start with +, assume it needs one
  if (!cleaned.startsWith('+')) {
    // If it starts with 1 and is 11 digits, it's likely US/Canada
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      cleaned = '+' + cleaned;
    }
    // If it's 10 digits, assume US/Canada
    else if (cleaned.length === 10) {
      cleaned = '+1' + cleaned;
    }
    // Otherwise just add +
    else {
      cleaned = '+' + cleaned;
    }
  }

  return cleaned;
}

/**
 * Parse incoming WhatsApp webhook payload
 */
export interface IncomingWhatsAppMessage {
  from: string;
  messageId: string;
  timestamp: string;
  type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts' | 'interactive' | 'button';
  text?: string;
  displayName?: string;
}

export function parseIncomingMessage(
  webhookBody: Record<string, unknown>
): IncomingWhatsAppMessage | null {
  try {
    const entry = (webhookBody.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown>;
    const messages = value?.messages as Array<Record<string, unknown>>;
    const contacts = value?.contacts as Array<Record<string, unknown>>;

    if (!messages || messages.length === 0) {
      return null;
    }

    const message = messages[0];
    const contact = contacts?.[0];

    // Extract text from different message types
    let text: string | undefined;
    const msgType = message.type as string;

    if (msgType === 'text') {
      text = (message.text as Record<string, unknown>)?.body as string | undefined;
    } else if (msgType === 'interactive') {
      // User tapped an interactive list item or button
      const interactive = message.interactive as Record<string, unknown>;
      const interactiveType = interactive?.type as string;
      if (interactiveType === 'list_reply') {
        const listReply = interactive.list_reply as Record<string, unknown>;
        // The id contains the slot datetime, title has the display text
        text = `SLOT_SELECTED:${listReply?.id}`;
      } else if (interactiveType === 'button_reply') {
        const buttonReply = interactive.button_reply as Record<string, unknown>;
        text = buttonReply?.title as string;
      }
    } else if (msgType === 'button') {
      const button = message.button as Record<string, unknown>;
      text = button?.text as string;
    }

    return {
      from: message.from as string,
      messageId: message.id as string,
      timestamp: message.timestamp as string,
      type: msgType === 'interactive' ? 'text' as const : msgType as IncomingWhatsAppMessage['type'],
      text,
      displayName: (contact?.profile as Record<string, unknown>)?.name as string | undefined,
    };
  } catch (error) {
    console.error('[WHATSAPP] Error parsing incoming message:', error);
    return null;
  }
}
