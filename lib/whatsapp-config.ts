export interface WhatsAppPhoneConfig {
  phoneNumberId: string;
  accessToken: string;
  wabaId: string;
  appSecret: string;
  displayName: string;
  displayPhone: string;
}

/**
 * Reads all WHATSAPP_PHONE_{n}_* env vars and builds a config list.
 * Falls back to legacy single env vars for backward compatibility.
 */
export function getAllWhatsAppConfigs(): WhatsAppPhoneConfig[] {
  const configs: WhatsAppPhoneConfig[] = [];

  for (let i = 1; i <= 10; i++) {
    const phoneNumberId = process.env[`WHATSAPP_PHONE_${i}_PHONE_NUMBER_ID`];
    const accessToken = process.env[`WHATSAPP_PHONE_${i}_ACCESS_TOKEN`];
    const wabaId = process.env[`WHATSAPP_PHONE_${i}_WABA_ID`];
    const appSecret = process.env[`WHATSAPP_PHONE_${i}_APP_SECRET`] || '';
    const displayName = process.env[`WHATSAPP_PHONE_${i}_DISPLAY_NAME`] || `Phone ${i}`;
    const displayPhone = process.env[`WHATSAPP_PHONE_${i}_DISPLAY_PHONE`] || '';

    if (phoneNumberId && accessToken && wabaId) {
      configs.push({ phoneNumberId, accessToken, wabaId, appSecret, displayName, displayPhone });
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
      });
    }
  }

  return configs;
}

export function getWhatsAppConfig(phoneNumberId: string): WhatsAppPhoneConfig | null {
  return getAllWhatsAppConfigs().find(c => c.phoneNumberId === phoneNumberId) || null;
}

export function getDefaultWhatsAppConfig(): WhatsAppPhoneConfig | null {
  return getAllWhatsAppConfigs()[0] || null;
}
