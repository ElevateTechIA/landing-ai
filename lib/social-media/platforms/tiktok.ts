import type {
  PlatformAdapter,
  PublishPayload,
  PublishResult,
  PlatformLimits,
  DecryptedSocialAccount,
  TokenRefreshResult,
} from "@/lib/social-media/platforms/types";

export class TikTokAdapter implements PlatformAdapter {
  readonly platformId = "tiktok" as const;
  readonly displayName = "TikTok";

  validatePayload(payload: PublishPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const limits = this.getLimits();

    if (payload.text.length > limits.maxTextLength) {
      errors.push(`Caption exceeds ${limits.maxTextLength} characters`);
    }

    const hasVideo = payload.media.some((m) => m.type === "video");
    const hasImage = payload.media.some((m) => m.type === "image");

    if (!hasVideo && !hasImage) {
      errors.push("TikTok requires at least one video or image");
    }

    for (const item of payload.media) {
      if (item.type === "video" && item.sizeBytes > limits.maxVideoSize) {
        errors.push("Video exceeds maximum size of 4GB");
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async publish(
    account: DecryptedSocialAccount,
    payload: PublishPayload
  ): Promise<PublishResult> {
    try {
      const accessToken = account.accessToken;

      const caption = [
        payload.text,
        payload.hashtags.map((h) => `#${h}`).join(" "),
      ]
        .filter(Boolean)
        .join(" ");

      const initResponse = await fetch(
        "https://open.tiktokapis.com/v2/post/publish/video/init/",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            post_info: {
              title: caption.slice(0, 150),
              privacy_level: "SELF_ONLY",
              disable_duet: false,
              disable_comment: false,
              disable_stitch: false,
            },
            source_info: {
              source: "PULL_FROM_URL",
              video_url: payload.media[0].url,
            },
          }),
        }
      );

      const initData = await initResponse.json();

      if (initData.error?.code !== "ok") {
        return {
          success: false,
          error: {
            code: initData.error?.code ?? "INIT_ERROR",
            message: initData.error?.message ?? "Failed to initialize TikTok post",
            retryable: false,
            rawResponse: JSON.stringify(initData),
          },
        };
      }

      return {
        success: true,
        platformPostId: initData.data?.publish_id,
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
        "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name",
        {
          headers: { Authorization: `Bearer ${account.accessToken}` },
        }
      );
      const data = await response.json();
      return data.error?.code === "ok";
    } catch {
      return false;
    }
  }

  async refreshToken(
    account: DecryptedSocialAccount
  ): Promise<TokenRefreshResult | null> {
    if (!account.refreshToken) return null;

    try {
      const response = await fetch(
        "https://open.tiktokapis.com/v2/oauth/token/",
        {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY!,
            client_secret: process.env.TIKTOK_CLIENT_SECRET!,
            grant_type: "refresh_token",
            refresh_token: account.refreshToken,
          }),
        }
      );

      const data = await response.json();

      if (data.error) return null;

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    } catch {
      return null;
    }
  }

  getLimits(): PlatformLimits {
    return {
      maxTextLength: 2200,
      maxHashtags: 30,
      maxImages: 35,
      maxVideoSize: 4 * 1024 * 1024 * 1024,
      maxVideoDuration: 10 * 60,
      supportedMediaTypes: ["video/mp4", "image/jpeg", "image/png"],
      postsPerDay: 50,
    };
  }
}
