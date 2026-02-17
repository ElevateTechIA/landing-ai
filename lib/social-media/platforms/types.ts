export type PlatformId =
  | "facebook"
  | "instagram"
  | "tiktok"
  | "youtube"
  | "whatsapp";

export interface MediaItem {
  url: string;
  type: "image" | "video";
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
  width?: number;
  height?: number;
}

export interface PublishPayload {
  text: string;
  hashtags: string[];
  media: MediaItem[];
  platformOverrides?: Record<string, unknown>;
}

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    rawResponse?: string;
  };
}

export interface PlatformLimits {
  maxTextLength: number;
  maxHashtags: number;
  maxImages: number;
  maxVideoSize: number;
  maxVideoDuration: number;
  supportedMediaTypes: string[];
  postsPerDay: number;
}

export interface DecryptedSocialAccount {
  id: string;
  userId: string;
  platform: PlatformId;
  platformAccountId: string;
  platformAccountName: string;
  accessToken: string;
  refreshToken: string | null;
  metadata: Record<string, unknown>;
}

export interface TokenRefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface PlatformAdapter {
  readonly platformId: PlatformId;
  readonly displayName: string;

  validatePayload(
    payload: PublishPayload
  ): { valid: boolean; errors: string[] };

  publish(
    account: DecryptedSocialAccount,
    payload: PublishPayload
  ): Promise<PublishResult>;

  validateToken(account: DecryptedSocialAccount): Promise<boolean>;

  refreshToken(
    account: DecryptedSocialAccount
  ): Promise<TokenRefreshResult | null>;

  getLimits(): PlatformLimits;
}
