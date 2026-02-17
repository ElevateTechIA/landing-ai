import type {
  PlatformAdapter,
  PublishPayload,
  PublishResult,
  PlatformLimits,
  DecryptedSocialAccount,
  TokenRefreshResult,
} from "@/lib/social-media/platforms/types";

export class WhatsAppAdapter implements PlatformAdapter {
  readonly platformId = "whatsapp" as const;
  readonly displayName = "WhatsApp Business";

  validatePayload(payload: PublishPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!payload.text && payload.media.length === 0) {
      errors.push("WhatsApp message requires text or media");
    }

    if (payload.text.length > 4096) {
      errors.push("Message exceeds 4096 characters");
    }

    return { valid: errors.length === 0, errors };
  }

  async publish(
    account: DecryptedSocialAccount,
    payload: PublishPayload
  ): Promise<PublishResult> {
    try {
      const phoneNumberId = account.metadata.phoneNumberId as string;
      const accessToken = account.accessToken;
      const recipientPhone = payload.platformOverrides?.recipientPhone as string;

      if (!recipientPhone) {
        return {
          success: false,
          error: {
            code: "NO_RECIPIENT",
            message: "WhatsApp requires a recipient phone number",
            retryable: false,
          },
        };
      }

      let messageBody: Record<string, unknown>;

      if (payload.platformOverrides?.templateName) {
        messageBody = {
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "template",
          template: {
            name: payload.platformOverrides.templateName as string,
            language: {
              code: (payload.platformOverrides.templateLanguage as string) ?? "es",
            },
          },
        };
      } else if (payload.media.length > 0) {
        const mediaItem = payload.media[0];
        const mediaType = mediaItem.type === "image" ? "image" : "video";

        messageBody = {
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: mediaType,
          [mediaType]: {
            link: mediaItem.url,
            caption: payload.text,
          },
        };
      } else {
        messageBody = {
          messaging_product: "whatsapp",
          to: recipientPhone,
          type: "text",
          text: {
            body: payload.text,
          },
        };
      }

      const response = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(messageBody),
        }
      );

      const data = await response.json();

      if (data.error) {
        return {
          success: false,
          error: {
            code: data.error.code?.toString() ?? "WA_ERROR",
            message: data.error.message ?? "WhatsApp API error",
            retryable: data.error.is_transient ?? false,
            rawResponse: JSON.stringify(data.error),
          },
        };
      }

      const messageId = data.messages?.[0]?.id;

      return {
        success: true,
        platformPostId: messageId,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Network error",
          retryable: true,
        },
      };
    }
  }

  async validateToken(account: DecryptedSocialAccount): Promise<boolean> {
    try {
      const phoneNumberId = account.metadata.phoneNumberId as string;
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}`,
        {
          headers: { Authorization: `Bearer ${account.accessToken}` },
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async refreshToken(
    account: DecryptedSocialAccount
  ): Promise<TokenRefreshResult | null> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.META_APP_ID}&client_secret=${process.env.META_APP_SECRET}&fb_exchange_token=${account.accessToken}`
      );
      const data = await response.json();

      if (data.error) return null;

      return {
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + (data.expires_in ?? 5184000) * 1000),
      };
    } catch {
      return null;
    }
  }

  getLimits(): PlatformLimits {
    return {
      maxTextLength: 4096,
      maxHashtags: 0,
      maxImages: 1,
      maxVideoSize: 16 * 1024 * 1024,
      maxVideoDuration: 0,
      supportedMediaTypes: [
        "image/jpeg",
        "image/png",
        "video/mp4",
        "audio/mpeg",
        "application/pdf",
      ],
      postsPerDay: 100000,
    };
  }
}
