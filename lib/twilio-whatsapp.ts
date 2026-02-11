/**
 * Twilio WhatsApp send functions
 * Mirror the Meta Cloud API functions in whatsapp.ts but route through Twilio's API.
 * Used for Twilio BSP-controlled numbers that can't use Meta's Graph API directly.
 */

import { twilioClient } from './twilio';
import { WhatsAppPhoneConfig } from './whatsapp-config';

function twilioFrom(config: WhatsAppPhoneConfig): string {
  return `whatsapp:${config.twilioPhoneNumber}`;
}

function twilioTo(phone: string): string {
  const clean = phone.replace(/[^\d+]/g, '');
  return `whatsapp:${clean.startsWith('+') ? clean : '+' + clean}`;
}

function statusCallbackUrl(): string | undefined {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  return base ? `${base}/api/twilio/whatsapp-status` : undefined;
}

type SendResult = { success: boolean; messageId?: string; error?: string };

export async function sendTwilioText(
  config: WhatsAppPhoneConfig,
  to: string,
  body: string
): Promise<SendResult> {
  try {
    const message = await twilioClient.messages.create({
      from: twilioFrom(config),
      to: twilioTo(to),
      body,
      statusCallback: statusCallbackUrl(),
    });
    console.log('[TWILIO_WA] Text sent:', { sid: message.sid, to, status: message.status });
    return { success: true, messageId: message.sid };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TWILIO_WA] Error sending text:', msg);
    return { success: false, error: msg };
  }
}

export async function sendTwilioTemplate(
  config: WhatsAppPhoneConfig,
  to: string,
  templateName: string,
  languageCode: string,
  components?: any[]
): Promise<SendResult> {
  // Twilio uses ContentSid for templates. For now, send as a text fallback
  // if no ContentSid mapping exists. In the future, a template map can be
  // added to the config to resolve Meta template names → Twilio ContentSids.
  try {
    // Build a text representation from template components as fallback
    let bodyText = `[Template: ${templateName}]`;
    if (components) {
      const bodyComponent = components.find((c: any) => c.type === 'body');
      if (bodyComponent?.parameters) {
        const params = bodyComponent.parameters.map((p: any) => p.text || '').join(', ');
        bodyText = params || bodyText;
      }
    }

    const message = await twilioClient.messages.create({
      from: twilioFrom(config),
      to: twilioTo(to),
      body: bodyText,
      statusCallback: statusCallbackUrl(),
    });
    console.log('[TWILIO_WA] Template sent as text:', { sid: message.sid, to, templateName });
    return { success: true, messageId: message.sid };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TWILIO_WA] Error sending template:', msg);
    return { success: false, error: msg };
  }
}

export async function sendTwilioMedia(
  config: WhatsAppPhoneConfig,
  to: string,
  mediaUrl: string,
  caption?: string
): Promise<SendResult> {
  try {
    const params: any = {
      from: twilioFrom(config),
      to: twilioTo(to),
      mediaUrl: [mediaUrl],
      statusCallback: statusCallbackUrl(),
    };
    if (caption) params.body = caption;

    const message = await twilioClient.messages.create(params);
    console.log('[TWILIO_WA] Media sent:', { sid: message.sid, to, mediaUrl });
    return { success: true, messageId: message.sid };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TWILIO_WA] Error sending media:', msg);
    return { success: false, error: msg };
  }
}

export async function sendTwilioReplyButtonsFallback(
  config: WhatsAppPhoneConfig,
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
  headerText?: string,
  footerText?: string
): Promise<SendResult> {
  // Twilio doesn't support interactive buttons — format as numbered text
  let text = '';
  if (headerText) text += `*${headerText}*\n\n`;
  text += bodyText + '\n';
  buttons.forEach((b, i) => {
    text += `\n${i + 1}. ${b.title}`;
  });
  if (footerText) text += `\n\n_${footerText}_`;

  return sendTwilioText(config, to, text);
}

export async function sendTwilioCTAFallback(
  config: WhatsAppPhoneConfig,
  to: string,
  bodyText: string,
  buttonText: string,
  url: string,
  headerText?: string,
  footerText?: string
): Promise<SendResult> {
  let text = '';
  if (headerText) text += `*${headerText}*\n\n`;
  text += bodyText;
  text += `\n\n${buttonText}: ${url}`;
  if (footerText) text += `\n\n_${footerText}_`;

  return sendTwilioText(config, to, text);
}

export async function sendTwilioListFallback(
  config: WhatsAppPhoneConfig,
  to: string,
  bodyText: string,
  buttonText: string,
  sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }>
): Promise<SendResult> {
  let text = bodyText + '\n';
  for (const section of sections) {
    if (section.title) text += `\n*${section.title}*`;
    for (let i = 0; i < section.rows.length; i++) {
      const row = section.rows[i];
      text += `\n${i + 1}. ${row.title}`;
      if (row.description) text += ` - ${row.description}`;
    }
  }
  return sendTwilioText(config, to, text);
}

export async function sendTwilioMediaById(
  config: WhatsAppPhoneConfig,
  to: string,
  mediaType: string,
  mediaId: string,
  options?: { caption?: string; filename?: string }
): Promise<SendResult> {
  // For Twilio, mediaId should be a URL (from our upload step that stores in Firebase Storage)
  return sendTwilioMedia(config, to, mediaId, options?.caption);
}

// No-ops for features Twilio doesn't support

export async function markMessageAsReadTwilio(): Promise<{ success: boolean }> {
  return { success: true };
}

export async function sendTypingIndicatorTwilio(): Promise<{ success: boolean }> {
  return { success: true };
}

export async function sendTwilioReaction(): Promise<SendResult> {
  console.log('[TWILIO_WA] Reactions not supported via Twilio');
  return { success: true, messageId: 'noop' };
}
