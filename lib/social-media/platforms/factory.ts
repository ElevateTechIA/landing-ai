import type { PlatformAdapter, PlatformId } from "@/lib/social-media/platforms/types";
import { FacebookAdapter } from "./facebook";
import { InstagramAdapter } from "./instagram";
import { TikTokAdapter } from "./tiktok";
import { YouTubeAdapter } from "./youtube";
import { WhatsAppAdapter } from "./whatsapp";

const adapters: Record<PlatformId, PlatformAdapter> = {
  facebook: new FacebookAdapter(),
  instagram: new InstagramAdapter(),
  tiktok: new TikTokAdapter(),
  youtube: new YouTubeAdapter(),
  whatsapp: new WhatsAppAdapter(),
};

export function getPlatformAdapter(platformId: string): PlatformAdapter {
  const adapter = adapters[platformId as PlatformId];
  if (!adapter) {
    throw new Error(`Unknown platform: ${platformId}`);
  }
  return adapter;
}
