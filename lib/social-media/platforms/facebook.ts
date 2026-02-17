import type {
  PlatformAdapter,
  PublishPayload,
  PublishResult,
  PlatformLimits,
  DecryptedSocialAccount,
  TokenRefreshResult,
} from "@/lib/social-media/platforms/types";

export class FacebookAdapter implements PlatformAdapter {
  readonly platformId = "facebook" as const;
  readonly displayName = "Facebook";

  validatePayload(payload: PublishPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const limits = this.getLimits();

    if (payload.text.length > limits.maxTextLength) {
      errors.push(`Text exceeds ${limits.maxTextLength} characters`);
    }

    if (payload.media.length > limits.maxImages) {
      errors.push(`Maximum ${limits.maxImages} media items allowed`);
    }

    for (const item of payload.media) {
      if (item.type === "video" && item.sizeBytes > limits.maxVideoSize) {
        errors.push("Video exceeds maximum size of 1GB");
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async publish(
    account: DecryptedSocialAccount,
    payload: PublishPayload
  ): Promise<PublishResult> {
    try {
      const pageId = account.metadata.pageId as string;
      const pageAccessToken = account.accessToken;

      const fullText = [
        payload.text,
        payload.hashtags.map((h) => `#${h}`).join(" "),
      ]
        .filter(Boolean)
        .join("\n\n");

      let response: Response;

      if (payload.media.length > 0 && payload.media[0].type === "image") {
        response = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/photos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: payload.media[0].url,
              message: fullText,
              access_token: pageAccessToken,
            }),
          }
        );
      } else if (payload.media.length > 0 && payload.media[0].type === "video") {
        response = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/videos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file_url: payload.media[0].url,
              description: fullText,
              access_token: pageAccessToken,
            }),
          }
        );
      } else {
        response = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/feed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              message: fullText,
              access_token: pageAccessToken,
            }),
          }
        );
      }

      const data = await response.json();

      if (data.error) {
        return {
          success: false,
          error: {
            code: data.error.code?.toString() ?? "UNKNOWN",
            message: data.error.message ?? "Unknown error",
            retryable: data.error.is_transient ?? false,
            rawResponse: JSON.stringify(data.error),
          },
        };
      }

      return {
        success: true,
        platformPostId: data.id ?? data.post_id,
        platformPostUrl: `https://facebook.com/${data.id ?? data.post_id}`,
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
      const response = await fetch(
        `https://graph.facebook.com/v21.0/me`,
        { headers: { Authorization: `Bearer ${account.accessToken}` } }
      );
      const data = await response.json();
      return !data.error;
    } catch {
      return false;
    }
  }

  async refreshToken(
    account: DecryptedSocialAccount
  ): Promise<TokenRefreshResult | null> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token`,
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "fb_exchange_token",
            client_id: process.env.META_APP_ID!,
            client_secret: process.env.META_APP_SECRET!,
            fb_exchange_token: account.accessToken,
          }),
        }
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
      maxTextLength: 63206,
      maxHashtags: 30,
      maxImages: 10,
      maxVideoSize: 1024 * 1024 * 1024,
      maxVideoDuration: 240 * 60,
      supportedMediaTypes: ["image/jpeg", "image/png", "image/gif", "video/mp4"],
      postsPerDay: 25,
    };
  }
}
