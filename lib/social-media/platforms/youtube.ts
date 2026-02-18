import type {
  PlatformAdapter,
  PublishPayload,
  PublishResult,
  PlatformLimits,
  DecryptedSocialAccount,
  TokenRefreshResult,
} from "@/lib/social-media/platforms/types";

export class YouTubeAdapter implements PlatformAdapter {
  readonly platformId = "youtube" as const;
  readonly displayName = "YouTube";

  validatePayload(payload: PublishPayload): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const limits = this.getLimits();

    const hasVideo = payload.media.some((m) => m.type === "video");
    if (!hasVideo) {
      errors.push("YouTube requires a video");
    }

    for (const item of payload.media) {
      if (item.type === "video" && item.sizeBytes > limits.maxVideoSize) {
        errors.push("Video exceeds maximum size of 128GB");
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
      const overrides = payload.platformOverrides ?? {};
      const title =
        (overrides.title as string) ?? payload.text.slice(0, 100) ?? "Untitled";
      const description = [
        (overrides.description as string) ?? payload.text,
        payload.hashtags.map((h) => `#${h}`).join(" "),
      ]
        .filter(Boolean)
        .join("\n\n");
      const privacy = (overrides.privacy as string) ?? "public";

      const videoMedia = payload.media.find((m) => m.type === "video");
      if (!videoMedia) {
        return {
          success: false,
          error: {
            code: "NO_VIDEO",
            message: "No video found in payload",
            retryable: false,
          },
        };
      }

      // Step 1: Download video from Firebase Storage URL
      const videoResponse = await fetch(videoMedia.url);
      const videoBlob = await videoResponse.blob();

      // Step 2: Initialize resumable upload
      const initResponse = await fetch(
        "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": videoMedia.mimeType,
            "X-Upload-Content-Length": videoBlob.size.toString(),
          },
          body: JSON.stringify({
            snippet: {
              title,
              description,
              tags: payload.hashtags,
              categoryId: "22",
            },
            status: {
              privacyStatus: privacy,
              selfDeclaredMadeForKids: false,
            },
          }),
        }
      );

      if (!initResponse.ok) {
        const errorData = await initResponse.json();
        return {
          success: false,
          error: {
            code: "INIT_UPLOAD_ERROR",
            message: errorData.error?.message ?? "Failed to initialize upload",
            retryable: initResponse.status >= 500,
            rawResponse: JSON.stringify(errorData),
          },
        };
      }

      const uploadUrl = initResponse.headers.get("Location");
      if (!uploadUrl) {
        return {
          success: false,
          error: {
            code: "NO_UPLOAD_URL",
            message: "No upload URL returned",
            retryable: true,
          },
        };
      }

      // Step 3: Upload the video
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": videoMedia.mimeType,
          "Content-Length": videoBlob.size.toString(),
        },
        body: videoBlob,
      });

      const uploadData = await uploadResponse.json();

      if (!uploadResponse.ok) {
        return {
          success: false,
          error: {
            code: "UPLOAD_ERROR",
            message: uploadData.error?.message ?? "Failed to upload video",
            retryable: uploadResponse.status >= 500,
            rawResponse: JSON.stringify(uploadData),
          },
        };
      }

      return {
        success: true,
        platformPostId: uploadData.id,
        platformPostUrl: `https://youtu.be/${uploadData.id}`,
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
        "https://www.googleapis.com/youtube/v3/channels?part=id&mine=true",
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
    if (!account.refreshToken) {
      console.error("[YouTube] refreshToken: no refresh token available");
      return null;
    }

    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        console.error("[YouTube] refreshToken: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set");
        return null;
      }

      const response = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: account.refreshToken,
          grant_type: "refresh_token",
        }),
      });

      const data = await response.json();

      if (data.error) {
        console.error("[YouTube] refreshToken failed:", data.error, data.error_description);
        return null;
      }

      console.log("[YouTube] Token refreshed successfully, expires in", data.expires_in, "seconds");
      return {
        accessToken: data.access_token,
        expiresAt: new Date(Date.now() + data.expires_in * 1000),
      };
    } catch (err) {
      console.error("[YouTube] refreshToken exception:", err);
      return null;
    }
  }

  getLimits(): PlatformLimits {
    return {
      maxTextLength: 5000,
      maxHashtags: 60,
      maxImages: 0,
      maxVideoSize: 128 * 1024 * 1024 * 1024,
      maxVideoDuration: 12 * 60 * 60,
      supportedMediaTypes: ["video/mp4", "video/quicktime", "video/x-msvideo"],
      postsPerDay: 6,
    };
  }
}
