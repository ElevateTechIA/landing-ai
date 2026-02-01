import twilio from 'twilio';

// Initialize Twilio client
export const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Validate Twilio webhook signatures for security
 * @param twilioSignature - Signature from x-twilio-signature header
 * @param url - The full URL of the webhook endpoint
 * @param params - The request parameters (form-encoded or JSON)
 * @returns true if signature is valid
 */
export function validateTwilioSignature(
  twilioSignature: string,
  url: string,
  params: Record<string, any>
): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!authToken) {
    console.error('TWILIO_AUTH_TOKEN not configured');
    return false;
  }

  try {
    return twilio.validateRequest(
      authToken,
      twilioSignature,
      url,
      params
    );
  } catch (error) {
    console.error('Error validating Twilio signature:', error);
    return false;
  }
}

/**
 * Format phone number to E.164 format (+1234567890)
 * @param phone - Phone number in any format
 * @returns E.164 formatted phone number
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // Add + and country code if missing (assume US/Canada if 10 digits)
  if (!cleaned.startsWith('1') && cleaned.length === 10) {
    return `+1${cleaned}`;
  }

  if (cleaned.startsWith('1') && cleaned.length === 11) {
    return `+${cleaned}`;
  }

  // Already has country code
  return `+${cleaned}`;
}

/**
 * Validate phone number format
 * @param phone - Phone number to validate
 * @returns true if valid E.164 format
 */
export function isValidPhoneNumber(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  const formatted = formatPhoneNumber(phone);
  return e164Regex.test(formatted);
}

/**
 * Make outbound call via Twilio
 * @param to - Destination phone number (E.164 format)
 * @param from - Your Twilio phone number
 * @param twimlUrl - URL that returns TwiML instructions
 * @returns Call SID if successful
 */
export async function makeOutboundCall(
  to: string,
  from: string,
  twimlUrl: string
) {
  try {
    const call = await twilioClient.calls.create({
      to: formatPhoneNumber(to),
      from: formatPhoneNumber(from),
      url: twimlUrl,
      statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhook/call-status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      record: process.env.ENABLE_CALL_RECORDING === 'true',
      recordingStatusCallback: process.env.ENABLE_CALL_RECORDING === 'true'
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/webhook/recording`
        : undefined,
      timeout: 60, // Ring for 60 seconds before giving up
    });

    console.log('[TWILIO] Outbound call created:', {
      callSid: call.sid,
      to,
      from,
      status: call.status,
    });

    return { success: true, callSid: call.sid, status: call.status };
  } catch (error) {
    console.error('[TWILIO] Error making outbound call:', error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Get call details from Twilio
 * @param callSid - Twilio Call SID
 * @returns Call details
 */
export async function getCallDetails(callSid: string) {
  try {
    const call = await twilioClient.calls(callSid).fetch();

    return {
      success: true,
      call: {
        sid: call.sid,
        from: call.from,
        to: call.to,
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        price: call.price,
        priceUnit: call.priceUnit,
      },
    };
  } catch (error) {
    console.error('[TWILIO] Error fetching call details:', error);
    return { success: false, error };
  }
}

/**
 * End an active call
 * @param callSid - Twilio Call SID
 * @returns Success status
 */
export async function endCall(callSid: string) {
  try {
    await twilioClient.calls(callSid).update({ status: 'completed' });
    return { success: true };
  } catch (error) {
    console.error('[TWILIO] Error ending call:', error);
    return { success: false, error };
  }
}

// ============================================
// SMS AND WHATSAPP MESSAGING
// ============================================

export interface SendSMSParams {
  to: string;
  body: string;
  from?: string;
}

export interface SendSMSResult {
  success: boolean;
  messageSid?: string;
  error?: string;
  errorCode?: string;
  channel?: 'sms' | 'whatsapp';
}

export interface SendWhatsAppParams {
  to: string;
  body: string;
  from?: string;
  contentSid?: string; // For using pre-approved templates
  contentVariables?: Record<string, string>;
}

export interface SMSMeetingConfirmationParams {
  to: string;
  name: string;
  scheduledTime: string;
  zoomLink: string;
  language: 'en' | 'es';
}

export interface SMSReminderParams {
  to: string;
  name: string;
  scheduledTime: string;
  zoomLink: string;
  language: 'en' | 'es';
}

// SMS Templates (bilingual)
const SMS_TEMPLATES = {
  meetingConfirmation: {
    en: (params: { name: string; dateTime: string; zoomLink: string }) =>
      `Hi ${params.name}! Your meeting with Elevate AI is confirmed for ${params.dateTime}. Zoom: ${params.zoomLink} - Check your email for details.`,
    es: (params: { name: string; dateTime: string; zoomLink: string }) =>
      `Hola ${params.name}! Tu reunion con Elevate AI esta confirmada para ${params.dateTime}. Zoom: ${params.zoomLink} - Revisa tu email para detalles.`
  },
  meetingReminder: {
    en: (params: { name: string; dateTime: string; zoomLink: string }) =>
      `Hi ${params.name}! Reminder: Your meeting is in 1 hour (${params.dateTime}). Zoom: ${params.zoomLink}`,
    es: (params: { name: string; dateTime: string; zoomLink: string }) =>
      `Hola ${params.name}! Recordatorio: Tu reunion es en 1 hora (${params.dateTime}). Zoom: ${params.zoomLink}`
  }
};

/**
 * Format datetime for SMS (shorter format)
 */
function formatDateTimeForSMS(dateTimeStr: string, language: 'en' | 'es'): string {
  try {
    const date = new Date(dateTimeStr);
    const langLocale = language === 'en' ? 'en-US' : 'es-MX';

    return date.toLocaleString(langLocale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'America/New_York'
    });
  } catch {
    return dateTimeStr;
  }
}

/**
 * Send an SMS message via Twilio
 */
export async function sendSMS(params: SendSMSParams): Promise<SendSMSResult> {
  const { to, body, from } = params;

  const fromNumber = from || process.env.TWILIO_PHONE_NUMBER;

  if (!fromNumber) {
    console.error('[TWILIO_SMS] TWILIO_PHONE_NUMBER not configured');
    return { success: false, error: 'SMS not configured', channel: 'sms' };
  }

  const formattedTo = formatPhoneNumber(to);

  if (!isValidPhoneNumber(formattedTo)) {
    console.error('[TWILIO_SMS] Invalid phone number:', to);
    return { success: false, error: 'Invalid phone number format', channel: 'sms' };
  }

  try {
    const message = await twilioClient.messages.create({
      to: formattedTo,
      from: formatPhoneNumber(fromNumber),
      body: body
    });

    console.log('[TWILIO_SMS] Message sent:', {
      messageSid: message.sid,
      to: message.to,
      status: message.status
    });

    return { success: true, messageSid: message.sid, channel: 'sms' };
  } catch (error) {
    console.error('[TWILIO_SMS] Error sending message:', error);

    if (error instanceof Error) {
      const twilioError = error as Error & { code?: number | string };
      return {
        success: false,
        error: error.message,
        errorCode: twilioError.code?.toString(),
        channel: 'sms'
      };
    }

    return { success: false, error: 'Unknown error occurred', channel: 'sms' };
  }
}

/**
 * Send a WhatsApp message via Twilio
 */
export async function sendWhatsAppMessage(params: SendWhatsAppParams): Promise<SendSMSResult> {
  const { to, body, from, contentSid, contentVariables } = params;

  const fromNumber = from || process.env.TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_PHONE_NUMBER;

  if (!fromNumber) {
    console.error('[TWILIO_WHATSAPP] WhatsApp number not configured');
    return { success: false, error: 'WhatsApp not configured', channel: 'whatsapp' };
  }

  const formattedTo = formatPhoneNumber(to);

  if (!isValidPhoneNumber(formattedTo)) {
    console.error('[TWILIO_WHATSAPP] Invalid phone number:', to);
    return { success: false, error: 'Invalid phone number format', channel: 'whatsapp' };
  }

  try {
    const messageParams: any = {
      to: `whatsapp:${formattedTo}`,
      from: `whatsapp:${formatPhoneNumber(fromNumber)}`
    };

    // Use content template if provided, otherwise use body
    if (contentSid) {
      messageParams.contentSid = contentSid;
      if (contentVariables) {
        messageParams.contentVariables = JSON.stringify(contentVariables);
      }
    } else {
      messageParams.body = body;
    }

    const message = await twilioClient.messages.create(messageParams);

    console.log('[TWILIO_WHATSAPP] Message sent:', {
      messageSid: message.sid,
      to: message.to,
      status: message.status
    });

    return { success: true, messageSid: message.sid, channel: 'whatsapp' };
  } catch (error) {
    console.error('[TWILIO_WHATSAPP] Error sending message:', error);

    if (error instanceof Error) {
      const twilioError = error as Error & { code?: number | string };
      return {
        success: false,
        error: error.message,
        errorCode: twilioError.code?.toString(),
        channel: 'whatsapp'
      };
    }

    return { success: false, error: 'Unknown error occurred', channel: 'whatsapp' };
  }
}

/**
 * Send meeting confirmation via SMS
 */
export async function sendMeetingConfirmationSMS(
  params: SMSMeetingConfirmationParams
): Promise<SendSMSResult> {
  const { to, name, scheduledTime, zoomLink, language } = params;

  const formattedDateTime = formatDateTimeForSMS(scheduledTime, language);
  const firstName = name.split(' ')[0];

  const template = SMS_TEMPLATES.meetingConfirmation[language];
  const body = template({
    name: firstName,
    dateTime: formattedDateTime,
    zoomLink: zoomLink
  });

  console.log('[TWILIO_SMS] Sending meeting confirmation:', { to, language, bodyLength: body.length });

  return sendSMS({ to, body });
}

/**
 * Send meeting confirmation via WhatsApp
 */
export async function sendMeetingConfirmationWhatsApp(
  params: SMSMeetingConfirmationParams
): Promise<SendSMSResult> {
  const { to, name, scheduledTime, zoomLink, language } = params;

  const formattedDateTime = formatDateTimeForSMS(scheduledTime, language);
  const firstName = name.split(' ')[0];

  // Use template for WhatsApp (same content as SMS for now)
  // When you have approved templates, use contentSid instead
  const template = SMS_TEMPLATES.meetingConfirmation[language];
  const body = template({
    name: firstName,
    dateTime: formattedDateTime,
    zoomLink: zoomLink
  });

  console.log('[TWILIO_WHATSAPP] Sending meeting confirmation:', { to, language });

  return sendWhatsAppMessage({ to, body });
}

/**
 * Send meeting reminder via SMS
 */
export async function sendMeetingReminderSMS(
  params: SMSReminderParams
): Promise<SendSMSResult> {
  const { to, name, scheduledTime, zoomLink, language } = params;

  const formattedDateTime = formatDateTimeForSMS(scheduledTime, language);
  const firstName = name.split(' ')[0];

  const template = SMS_TEMPLATES.meetingReminder[language];
  const body = template({
    name: firstName,
    dateTime: formattedDateTime,
    zoomLink: zoomLink
  });

  console.log('[TWILIO_SMS] Sending meeting reminder:', { to, language });

  return sendSMS({ to, body });
}

/**
 * Send meeting reminder via WhatsApp
 */
export async function sendMeetingReminderWhatsApp(
  params: SMSReminderParams
): Promise<SendSMSResult> {
  const { to, name, scheduledTime, zoomLink, language } = params;

  const formattedDateTime = formatDateTimeForSMS(scheduledTime, language);
  const firstName = name.split(' ')[0];

  const template = SMS_TEMPLATES.meetingReminder[language];
  const body = template({
    name: firstName,
    dateTime: formattedDateTime,
    zoomLink: zoomLink
  });

  console.log('[TWILIO_WHATSAPP] Sending meeting reminder:', { to, language });

  return sendWhatsAppMessage({ to, body });
}

/**
 * Send meeting notification with WhatsApp fallback to SMS
 * Tries WhatsApp first, falls back to SMS if WhatsApp fails
 */
export async function sendMeetingNotification(
  params: SMSMeetingConfirmationParams,
  type: 'confirmation' | 'reminder' = 'confirmation'
): Promise<SendSMSResult> {
  const whatsAppEnabled = !!process.env.TWILIO_WHATSAPP_NUMBER;

  // Try WhatsApp first if configured
  if (whatsAppEnabled) {
    console.log('[TWILIO] Attempting WhatsApp notification...');

    const whatsAppResult = type === 'confirmation'
      ? await sendMeetingConfirmationWhatsApp(params)
      : await sendMeetingReminderWhatsApp(params);

    if (whatsAppResult.success) {
      return whatsAppResult;
    }

    console.log('[TWILIO] WhatsApp failed, falling back to SMS:', whatsAppResult.error);
  }

  // Fallback to SMS
  console.log('[TWILIO] Sending via SMS...');

  return type === 'confirmation'
    ? await sendMeetingConfirmationSMS(params)
    : await sendMeetingReminderSMS(params);
}
