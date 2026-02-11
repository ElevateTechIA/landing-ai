/**
 * WhatsApp Business Cloud API Client
 * Handles sending messages via the WhatsApp Cloud API
 */

import { WhatsAppPhoneConfig } from './whatsapp-config';
import * as twilioWA from './twilio-whatsapp';

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
  config: WhatsAppPhoneConfig,
  to: string,
  body: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.sendTwilioText(config, to, body);
  const { accessToken, phoneNumberId } = config;

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
  config: WhatsAppPhoneConfig,
  to: string,
  templateName: string,
  languageCode: string = 'en',
  components?: Array<{
    type: 'header' | 'body' | 'button';
    sub_type?: string;
    index?: string;
    parameters: Array<{
      type: string;
      text?: string;
      image?: { link: string };
      video?: { link: string };
      document?: { link: string };
    }>;
  }>
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.sendTwilioTemplate(config, to, templateName, languageCode, components);
  const { accessToken, phoneNumberId } = config;

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

    if (components && components.length > 0) {
      (payload.template as Record<string, unknown>).components = components;
    }

    console.log('[WHATSAPP] Sending template payload:', JSON.stringify(payload, null, 2));

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
  config: WhatsAppPhoneConfig,
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
  if (config.provider === 'twilio') return twilioWA.sendTwilioListFallback(config, to, bodyText, buttonText, sections);
  const { accessToken, phoneNumberId } = config;

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
 * Send interactive reply buttons message via WhatsApp Cloud API
 * Up to 3 buttons that users can tap directly
 */
export async function sendWhatsAppReplyButtons(
  config: WhatsAppPhoneConfig,
  to: string,
  bodyText: string,
  buttons: Array<{
    id: string;
    title: string; // Max 20 characters
  }>,
  headerText?: string,
  footerText?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.sendTwilioReplyButtonsFallback(config, to, bodyText, buttons, headerText, footerText);
  const { accessToken, phoneNumberId } = config;

  if (buttons.length > 3) {
    return { success: false, error: 'Maximum 3 buttons allowed' };
  }

  const cleanPhone = to.replace(/[^\d+]/g, '');

  try {
    const interactive: Record<string, unknown> = {
      type: 'button',
      body: {
        text: bodyText,
      },
      action: {
        buttons: buttons.map((btn) => ({
          type: 'reply',
          reply: {
            id: btn.id,
            title: btn.title.substring(0, 20), // Max 20 chars
          },
        })),
      },
    };

    if (headerText) {
      interactive.header = { type: 'text', text: headerText };
    }
    if (footerText) {
      interactive.footer = { text: footerText };
    }

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
          interactive,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppErrorResponse;
      console.error('[WHATSAPP] Reply Buttons API Error:', errorData.error);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to send reply buttons'
      };
    }

    const successData = data as WhatsAppMessageResponse;
    console.log('[WHATSAPP] Reply buttons sent:', successData.messages?.[0]?.id);
    return {
      success: true,
      messageId: successData.messages?.[0]?.id
    };
  } catch (error) {
    console.error('[WHATSAPP] Error sending reply buttons:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Send CTA URL button message via WhatsApp Cloud API
 * Button that opens an external URL
 */
export async function sendWhatsAppCTAButton(
  config: WhatsAppPhoneConfig,
  to: string,
  bodyText: string,
  buttonText: string,
  url: string,
  headerText?: string,
  footerText?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.sendTwilioCTAFallback(config, to, bodyText, buttonText, url, headerText, footerText);
  const { accessToken, phoneNumberId } = config;

  const cleanPhone = to.replace(/[^\d+]/g, '');

  try {
    const interactive: Record<string, unknown> = {
      type: 'cta_url',
      body: {
        text: bodyText,
      },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: buttonText.substring(0, 20), // Max 20 chars
          url: url,
        },
      },
    };

    if (headerText) {
      interactive.header = { type: 'text', text: headerText };
    }
    if (footerText) {
      interactive.footer = { text: footerText };
    }

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
          interactive,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppErrorResponse;
      console.error('[WHATSAPP] CTA Button API Error:', errorData.error);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to send CTA button'
      };
    }

    const successData = data as WhatsAppMessageResponse;
    console.log('[WHATSAPP] CTA button sent:', successData.messages?.[0]?.id);
    return {
      success: true,
      messageId: successData.messages?.[0]?.id
    };
  } catch (error) {
    console.error('[WHATSAPP] Error sending CTA button:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Send location request message via WhatsApp Cloud API
 * Asks user to share their location
 */
export async function sendWhatsAppLocationRequest(
  config: WhatsAppPhoneConfig,
  to: string,
  bodyText: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.sendTwilioText(config, to, bodyText);
  const { accessToken, phoneNumberId } = config;

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
            type: 'location_request_message',
            body: {
              text: bodyText,
            },
            action: {
              name: 'send_location',
            },
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppErrorResponse;
      console.error('[WHATSAPP] Location Request API Error:', errorData.error);
      return {
        success: false,
        error: errorData.error?.message || 'Failed to send location request'
      };
    }

    const successData = data as WhatsAppMessageResponse;
    console.log('[WHATSAPP] Location request sent:', successData.messages?.[0]?.id);
    return {
      success: true,
      messageId: successData.messages?.[0]?.id
    };
  } catch (error) {
    console.error('[WHATSAPP] Error sending location request:', error);
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
  config: WhatsAppPhoneConfig,
  messageId: string
): Promise<{ success: boolean; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.markMessageAsReadTwilio();
  const { accessToken, phoneNumberId } = config;

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
  signature: string,
  appSecret: string
): boolean {
  const crypto = require('crypto');

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
  businessPhoneNumberId: string;
}

// =============================================
// Media Message Functions (Phase 1)
// =============================================

/**
 * Send an image message via WhatsApp Cloud API
 * Supports URL-based or media ID-based images
 */
export async function sendWhatsAppImage(
  config: WhatsAppPhoneConfig,
  to: string,
  imageUrl: string,
  caption?: string,
  replyToMessageId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.sendTwilioMedia(config, to, imageUrl, caption);
  const { accessToken, phoneNumberId } = config;

  const cleanPhone = to.replace(/[^\d+]/g, '');

  try {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'image',
      image: {
        link: imageUrl,
        ...(caption && { caption }),
      },
    };

    if (replyToMessageId) {
      payload.context = { message_id: replyToMessageId };
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
      console.error('[WHATSAPP] Image API Error:', errorData.error);
      return { success: false, error: errorData.error?.message || 'Failed to send image' };
    }

    const successData = data as WhatsAppMessageResponse;
    console.log('[WHATSAPP] Image sent:', successData.messages?.[0]?.id);
    return { success: true, messageId: successData.messages?.[0]?.id };
  } catch (error) {
    console.error('[WHATSAPP] Error sending image:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a document message via WhatsApp Cloud API
 */
export async function sendWhatsAppDocument(
  config: WhatsAppPhoneConfig,
  to: string,
  documentUrl: string,
  filename: string,
  caption?: string,
  replyToMessageId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.sendTwilioMedia(config, to, documentUrl, caption);
  const { accessToken, phoneNumberId } = config;

  const cleanPhone = to.replace(/[^\d+]/g, '');

  try {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'document',
      document: {
        link: documentUrl,
        filename,
        ...(caption && { caption }),
      },
    };

    if (replyToMessageId) {
      payload.context = { message_id: replyToMessageId };
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
      console.error('[WHATSAPP] Document API Error:', errorData.error);
      return { success: false, error: errorData.error?.message || 'Failed to send document' };
    }

    const successData = data as WhatsAppMessageResponse;
    console.log('[WHATSAPP] Document sent:', successData.messages?.[0]?.id);
    return { success: true, messageId: successData.messages?.[0]?.id };
  } catch (error) {
    console.error('[WHATSAPP] Error sending document:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send an audio message via WhatsApp Cloud API
 */
export async function sendWhatsAppAudio(
  config: WhatsAppPhoneConfig,
  to: string,
  audioUrl: string,
  replyToMessageId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.sendTwilioMedia(config, to, audioUrl);
  const { accessToken, phoneNumberId } = config;

  const cleanPhone = to.replace(/[^\d+]/g, '');

  try {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'audio',
      audio: { link: audioUrl },
    };

    if (replyToMessageId) {
      payload.context = { message_id: replyToMessageId };
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
      console.error('[WHATSAPP] Audio API Error:', errorData.error);
      return { success: false, error: errorData.error?.message || 'Failed to send audio' };
    }

    const successData = data as WhatsAppMessageResponse;
    console.log('[WHATSAPP] Audio sent:', successData.messages?.[0]?.id);
    return { success: true, messageId: successData.messages?.[0]?.id };
  } catch (error) {
    console.error('[WHATSAPP] Error sending audio:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a video message via WhatsApp Cloud API
 */
export async function sendWhatsAppVideo(
  config: WhatsAppPhoneConfig,
  to: string,
  videoUrl: string,
  caption?: string,
  replyToMessageId?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.sendTwilioMedia(config, to, videoUrl, caption);
  const { accessToken, phoneNumberId } = config;

  const cleanPhone = to.replace(/[^\d+]/g, '');

  try {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'video',
      video: {
        link: videoUrl,
        ...(caption && { caption }),
      },
    };

    if (replyToMessageId) {
      payload.context = { message_id: replyToMessageId };
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
      console.error('[WHATSAPP] Video API Error:', errorData.error);
      return { success: false, error: errorData.error?.message || 'Failed to send video' };
    }

    const successData = data as WhatsAppMessageResponse;
    console.log('[WHATSAPP] Video sent:', successData.messages?.[0]?.id);
    return { success: true, messageId: successData.messages?.[0]?.id };
  } catch (error) {
    console.error('[WHATSAPP] Error sending video:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a reaction to a message via WhatsApp Cloud API
 */
export async function sendWhatsAppReaction(
  config: WhatsAppPhoneConfig,
  to: string,
  messageId: string,
  emoji: string
): Promise<{ success: boolean; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.sendTwilioReaction();
  const { accessToken, phoneNumberId } = config;

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
          type: 'reaction',
          reaction: {
            message_id: messageId,
            emoji: emoji,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppErrorResponse;
      console.error('[WHATSAPP] Reaction API Error:', errorData.error);
      return { success: false, error: errorData.error?.message || 'Failed to send reaction' };
    }

    console.log('[WHATSAPP] Reaction sent to message:', messageId);
    return { success: true };
  } catch (error) {
    console.error('[WHATSAPP] Error sending reaction:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a text message replying to a specific message (quote)
 */
export async function sendWhatsAppReply(
  config: WhatsAppPhoneConfig,
  to: string,
  body: string,
  replyToMessageId: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.sendTwilioText(config, to, body);
  const { accessToken, phoneNumberId } = config;

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
          text: { preview_url: false, body },
          context: { message_id: replyToMessageId },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppErrorResponse;
      console.error('[WHATSAPP] Reply API Error:', errorData.error);
      return { success: false, error: errorData.error?.message || 'Failed to send reply' };
    }

    const successData = data as WhatsAppMessageResponse;
    console.log('[WHATSAPP] Reply sent:', successData.messages?.[0]?.id);
    return { success: true, messageId: successData.messages?.[0]?.id };
  } catch (error) {
    console.error('[WHATSAPP] Error sending reply:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send a location message via WhatsApp Cloud API
 */
export async function sendWhatsAppLocation(
  config: WhatsAppPhoneConfig,
  to: string,
  latitude: number,
  longitude: number,
  name?: string,
  address?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (config.provider === 'twilio') {
    const text = name ? `${name}\n${address || ''}\nhttps://maps.google.com/?q=${latitude},${longitude}` : `https://maps.google.com/?q=${latitude},${longitude}`;
    return twilioWA.sendTwilioText(config, to, text);
  }
  const { accessToken, phoneNumberId } = config;

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
          type: 'location',
          location: {
            latitude,
            longitude,
            ...(name && { name }),
            ...(address && { address }),
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorData = data as WhatsAppErrorResponse;
      return { success: false, error: errorData.error?.message || 'Failed to send location' };
    }

    const successData = data as WhatsAppMessageResponse;
    return { success: true, messageId: successData.messages?.[0]?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Upload media to WhatsApp Cloud API and get media ID
 * Used for uploading files from the dashboard before sending
 */
export async function uploadWhatsAppMedia(
  config: WhatsAppPhoneConfig,
  fileBuffer: Buffer,
  mimeType: string,
  filename: string
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  if (config.provider === 'twilio') {
    // Twilio uses URLs directly, not media IDs. For now return an error —
    // file uploads for Twilio numbers should go through Firebase Storage first.
    return { success: false, error: 'Media upload not supported for Twilio — use a public URL instead' };
  }
  const { accessToken, phoneNumberId } = config;

  try {
    const formData = new FormData();
    const uint8Array = new Uint8Array(fileBuffer);
    const blob = new Blob([uint8Array], { type: mimeType });
    formData.append('file', blob, filename);
    formData.append('messaging_product', 'whatsapp');
    formData.append('type', mimeType);

    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      }
    );

    const data = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      return { success: false, error: (data.error as Record<string, unknown>)?.message as string || 'Failed to upload media' };
    }

    console.log('[WHATSAPP] Media uploaded:', data.id);
    return { success: true, mediaId: data.id as string };
  } catch (error) {
    console.error('[WHATSAPP] Error uploading media:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send media message using a media ID (for uploaded files)
 */
export async function sendWhatsAppMediaById(
  config: WhatsAppPhoneConfig,
  to: string,
  mediaType: 'image' | 'document' | 'audio' | 'video',
  mediaId: string,
  options?: { caption?: string; filename?: string; replyToMessageId?: string }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.sendTwilioMediaById(config, to, mediaType, mediaId, options);
  const { accessToken, phoneNumberId } = config;

  const cleanPhone = to.replace(/[^\d+]/g, '');

  try {
    const mediaPayload: Record<string, unknown> = { id: mediaId };
    if (options?.caption) mediaPayload.caption = options.caption;
    if (options?.filename && mediaType === 'document') mediaPayload.filename = options.filename;

    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: mediaType,
      [mediaType]: mediaPayload,
    };

    if (options?.replyToMessageId) {
      payload.context = { message_id: options.replyToMessageId };
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
      return { success: false, error: errorData.error?.message || 'Failed to send media' };
    }

    const successData = data as WhatsAppMessageResponse;
    return { success: true, messageId: successData.messages?.[0]?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================
// Anti-Blocking Protection (WAHA-inspired)
// =============================================

/**
 * Send typing indicator to show "typing..." in the user's WhatsApp
 * Uses Cloud API typing status (beta). Falls back silently if unsupported.
 * Auto-dismisses after 25 seconds or when a message is sent.
 */
export async function sendTypingIndicator(
  config: WhatsAppPhoneConfig,
  to: string
): Promise<{ success: boolean; error?: string }> {
  if (config.provider === 'twilio') return twilioWA.sendTypingIndicatorTwilio();
  const { accessToken, phoneNumberId } = config;

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
          type: 'typing',
        }),
      }
    );

    if (!response.ok) {
      // Typing indicator is a beta feature - fail silently
      console.log('[WHATSAPP] Typing indicator not supported or failed (beta feature)');
      return { success: false };
    }

    console.log('[WHATSAPP] Typing indicator sent to:', cleanPhone);
    return { success: true };
  } catch {
    // Fail silently - typing indicator is non-critical
    return { success: false };
  }
}

/**
 * Simulate human-like delay before sending a response.
 * Varies based on response message length to feel natural.
 */
export async function simulateHumanDelay(
  messageLength: number,
  minDelaySec: number = 1,
  maxDelaySec: number = 5,
): Promise<void> {
  let baseSec: number;

  if (messageLength < 50) {
    // Short response: quick typing
    baseSec = minDelaySec + Math.random() * (Math.min(3, maxDelaySec) - minDelaySec);
  } else if (messageLength < 200) {
    // Medium response
    baseSec = Math.min(2, minDelaySec) + Math.random() * (Math.min(5, maxDelaySec) - Math.min(2, minDelaySec));
  } else {
    // Long response: more typing time
    baseSec = Math.min(3, minDelaySec) + Math.random() * (maxDelaySec - Math.min(3, minDelaySec));
  }

  // Clamp to min/max
  baseSec = Math.max(minDelaySec, Math.min(maxDelaySec, baseSec));

  const delayMs = Math.round(baseSec * 1000);
  console.log(`[WHATSAPP] Simulating human delay: ${delayMs}ms for ${messageLength} char message`);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}

/**
 * Get a random delay in milliseconds between min and max seconds.
 * Used for bulk send pacing.
 */
export function getRandomDelayMs(minSec: number, maxSec: number): number {
  return Math.round((minSec + Math.random() * (maxSec - minSec)) * 1000);
}

// =============================================
// Incoming Message Parser
// =============================================

export function parseIncomingMessage(
  webhookBody: Record<string, unknown>
): IncomingWhatsAppMessage | null {
  try {
    const entry = (webhookBody.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown>;
    const messages = value?.messages as Array<Record<string, unknown>>;
    const contacts = value?.contacts as Array<Record<string, unknown>>;
    const metadata = value?.metadata as Record<string, unknown>;

    if (!messages || messages.length === 0) {
      return null;
    }

    const message = messages[0];
    const contact = contacts?.[0];
    const businessPhoneNumberId = (metadata?.phone_number_id as string) || '';

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
      businessPhoneNumberId,
    };
  } catch (error) {
    console.error('[WHATSAPP] Error parsing incoming message:', error);
    return null;
  }
}
