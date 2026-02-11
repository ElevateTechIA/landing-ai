export type WhatsAppProvider = 'meta' | 'twilio';

export interface WhatsAppPhoneConfig {
  phoneNumberId: string;
  accessToken: string;
  wabaId: string;
  appSecret: string;
  displayName: string;
  displayPhone: string;
  provider: WhatsAppProvider;
  // Twilio-specific (only when provider === 'twilio')
  twilioPhoneNumber?: string; // E.164 format: +17863056167
}

/**
 * Reads all WHATSAPP_PHONE_{n}_* env vars and builds a config list.
 * Falls back to legacy single env vars for backward compatibility.
 */
export function getAllWhatsAppConfigs(): WhatsAppPhoneConfig[] {
  const configs: WhatsAppPhoneConfig[] = [];

  for (let i = 1; i <= 10; i++) {
    const phoneNumberId = process.env[`WHATSAPP_PHONE_${i}_PHONE_NUMBER_ID`];
    const provider = (process.env[`WHATSAPP_PHONE_${i}_PROVIDER`] || 'meta') as WhatsAppProvider;
    const accessToken = process.env[`WHATSAPP_PHONE_${i}_ACCESS_TOKEN`] || '';
    const wabaId = process.env[`WHATSAPP_PHONE_${i}_WABA_ID`] || '';
    const appSecret = process.env[`WHATSAPP_PHONE_${i}_APP_SECRET`] || '';
    const displayName = process.env[`WHATSAPP_PHONE_${i}_DISPLAY_NAME`] || `Phone ${i}`;
    const displayPhone = process.env[`WHATSAPP_PHONE_${i}_DISPLAY_PHONE`] || '';
    const twilioPhoneNumber = process.env[`WHATSAPP_PHONE_${i}_TWILIO_PHONE_NUMBER`] || '';

    if (provider === 'twilio') {
      // Twilio numbers don't need Meta accessToken/wabaId — just need a phoneNumberId for routing
      if (phoneNumberId && twilioPhoneNumber) {
        configs.push({ phoneNumberId, accessToken, wabaId, appSecret, displayName, displayPhone, provider, twilioPhoneNumber });
      }
    } else {
      // Meta Cloud API — requires accessToken and wabaId
      if (phoneNumberId && accessToken && wabaId) {
        configs.push({ phoneNumberId, accessToken, wabaId, appSecret, displayName, displayPhone, provider: 'meta' });
      }
    }
  }

  // Fallback to legacy single env vars
  if (configs.length === 0) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '';
    const appSecret = process.env.WHATSAPP_APP_SECRET || '';

    if (phoneNumberId && accessToken) {
      configs.push({
        phoneNumberId,
        accessToken,
        wabaId,
        appSecret,
        displayName: 'Primary',
        displayPhone: '',
        provider: 'meta',
      });
    }
  }

  return configs;
}

export function getWhatsAppConfig(phoneNumberId: string): WhatsAppPhoneConfig | null {
  return getAllWhatsAppConfigs().find(c => c.phoneNumberId === phoneNumberId) || null;
}

/** Look up config by Twilio phone number (E.164 format like +17863056167) */
export function getWhatsAppConfigByTwilioPhone(twilioPhone: string): WhatsAppPhoneConfig | null {
  const clean = twilioPhone.replace(/[^\d+]/g, '');
  return getAllWhatsAppConfigs().find(c =>
    c.provider === 'twilio' && c.twilioPhoneNumber?.replace(/[^\d+]/g, '') === clean
  ) || null;
}

export function getDefaultWhatsAppConfig(): WhatsAppPhoneConfig | null {
  return getAllWhatsAppConfigs()[0] || null;
}
