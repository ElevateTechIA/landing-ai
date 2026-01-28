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
