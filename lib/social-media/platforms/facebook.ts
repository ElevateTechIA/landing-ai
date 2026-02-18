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

      const images = payload.media.filter((m) => m.type === "image");
      const videos = payload.media.filter((m) => m.type === "video");

      // Case 1: Multiple images → multi-photo post
      if (images.length > 1) {
        // Upload each image as unpublished
        const photoIds: string[] = [];
        for (const img of images) {
          const photoRes = await fetch(
            `https://graph.facebook.com/v21.0/${pageId}/photos`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                url: img.url,
                published: false,
                access_token: pageAccessToken,
              }),
            }
          );
          const photoData = await photoRes.json();
          if (photoData.error) {
            return {
              success: false,
              error: {
                code: photoData.error.code?.toString() ?? "PHOTO_UPLOAD",
                message: photoData.error.message ?? "Failed to upload photo",
                retryable: false,
                rawResponse: JSON.stringify(photoData.error),
              },
            };
          }
          photoIds.push(photoData.id);
        }

        // Create feed post with all photos attached
        const attachedMedia: Record<string, string> = {};
        photoIds.forEach((id, i) => {
          attachedMedia[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
        });

        const feedRes = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/feed`,
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
              message: fullText,
              access_token: pageAccessToken,
              ...attachedMedia,
            }),
          }
        );
        const feedData = await feedRes.json();

        if (feedData.error) {
          return {
            success: false,
            error: {
              code: feedData.error.code?.toString() ?? "UNKNOWN",
              message: feedData.error.message ?? "Unknown error",
              retryable: feedData.error.is_transient ?? false,
              rawResponse: JSON.stringify(feedData.error),
            },
          };
        }

        return {
          success: true,
          platformPostId: feedData.id,
          platformPostUrl: `https://facebook.com/${feedData.id}`,
        };
      }

      // Case 2: Single image
      if (images.length === 1) {
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/photos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              url: images[0].url,
              message: fullText,
              access_token: pageAccessToken,
            }),
          }
        );
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
      }

      // Case 3: Video
      if (videos.length > 0) {
        const response = await fetch(
          `https://graph.facebook.com/v21.0/${pageId}/videos`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              file_url: videos[0].url,
              description: fullText,
              access_token: pageAccessToken,
            }),
          }
        );
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
          platformPostId: data.id,
          platformPostUrl: `https://facebook.com/${data.id}`,
        };
      }

      // Case 4: Text only
      const response = await fetch(
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
        platformPostId: data.id,
        platformPostUrl: `https://facebook.com/${data.id}`,
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
