import type {
  PlatformAdapter,
  PublishPayload,
  PublishResult,
  PlatformLimits,
  DecryptedSocialAccount,
  TokenRefreshResult,
} from "@/lib/social-media/platforms/types";

export class InstagramAdapter implements PlatformAdapter {
  readonly platformId = "instagram" as const;
  readonly displayName = "Instagram";

  validatePayload(payload: PublishPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const limits = this.getLimits();

    if (payload.text.length > limits.maxTextLength) {
      errors.push(`Caption exceeds ${limits.maxTextLength} characters`);
    }

    if (payload.hashtags.length > limits.maxHashtags) {
      errors.push(`Maximum ${limits.maxHashtags} hashtags allowed`);
    }

    if (payload.media.length === 0) {
      errors.push("Instagram requires at least one image or video");
    }

    for (const item of payload.media) {
      if (item.type === "video" && item.sizeBytes > limits.maxVideoSize) {
        errors.push("Video exceeds maximum size of 100MB");
      }
    }

    return { valid: errors.length === 0, errors };
  }

  async publish(
    account: DecryptedSocialAccount,
    payload: PublishPayload
  ): Promise<PublishResult> {
    try {
      const igAccountId = account.metadata.igBusinessAccountId as string;
      const accessToken = account.accessToken;

      const caption = [
        payload.text,
        payload.hashtags.map((h) => `#${h}`).join(" "),
      ]
        .filter(Boolean)
        .join("\n\n");

      // Step 1: Create media container
      const mediaItem = payload.media[0];
      const containerParams: Record<string, string> = {
        caption,
        access_token: accessToken,
      };

      if (mediaItem.type === "image") {
        containerParams.image_url = mediaItem.url;
      } else {
        containerParams.media_type = "REELS";
        containerParams.video_url = mediaItem.url;
      }

      const containerResponse = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(containerParams),
        }
      );

      const containerData = await containerResponse.json();

      if (containerData.error) {
        return {
          success: false,
          error: {
            code: containerData.error.code?.toString() ?? "CONTAINER_ERROR",
            message: containerData.error.message ?? "Failed to create container",
            retryable: containerData.error.is_transient ?? false,
            rawResponse: JSON.stringify(containerData.error),
          },
        };
      }

      const containerId = containerData.id;

      // Step 2: For videos, wait for processing
      if (mediaItem.type === "video") {
        await this.waitForProcessing(igAccountId, containerId, accessToken);
      }

      // Step 3: Publish the container
      const publishResponse = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creation_id: containerId,
            access_token: accessToken,
          }),
        }
      );

      const publishData = await publishResponse.json();

      if (publishData.error) {
        return {
          success: false,
          error: {
            code: publishData.error.code?.toString() ?? "PUBLISH_ERROR",
            message: publishData.error.message ?? "Failed to publish",
            retryable: publishData.error.is_transient ?? false,
            rawResponse: JSON.stringify(publishData.error),
          },
        };
      }

      return {
        success: true,
        platformPostId: publishData.id,
        platformPostUrl: `https://www.instagram.com/p/${publishData.id}`,
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

  private async waitForProcessing(
    igAccountId: string,
    containerId: string,
    accessToken: string,
    maxAttempts = 10
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${containerId}?fields=status_code`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const data = await response.json();

      if (data.status_code === "FINISHED") return;
      if (data.status_code === "ERROR") {
        throw new Error("Video processing failed on Instagram");
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    throw new Error("Video processing timed out");
  }

  async validateToken(account: DecryptedSocialAccount): Promise<boolean> {
    try {
      const igAccountId = account.metadata.igBusinessAccountId as string;
      const response = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}?fields=id`,
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
      maxTextLength: 2200,
      maxHashtags: 30,
      maxImages: 10,
      maxVideoSize: 100 * 1024 * 1024,
      maxVideoDuration: 90 * 60,
      supportedMediaTypes: ["image/jpeg", "image/png", "video/mp4"],
      postsPerDay: 25,
    };
  }
}
