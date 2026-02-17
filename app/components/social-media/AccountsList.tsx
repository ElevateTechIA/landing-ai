"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import type { PlatformId } from "@/lib/social-media/platforms/types";
import {
  Facebook,
  Instagram,
  Video,
  Youtube,
  MessageCircle,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
} from "lucide-react";

const platformConfigs: {
  id: PlatformId;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  { id: "facebook", icon: Facebook, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-200" },
  { id: "instagram", icon: Instagram, color: "text-pink-600", bgColor: "bg-pink-50", borderColor: "border-pink-200" },
  { id: "tiktok", icon: Video, color: "text-gray-900", bgColor: "bg-gray-100", borderColor: "border-gray-300" },
  { id: "youtube", icon: Youtube, color: "text-red-600", bgColor: "bg-red-50", borderColor: "border-red-200" },
  { id: "whatsapp", icon: MessageCircle, color: "text-green-600", bgColor: "bg-green-50", borderColor: "border-green-200" },
];

const statusIcons = {
  active: CheckCircle,
  expired: Clock,
  revoked: AlertCircle,
  error: AlertCircle,
};

const statusColors = {
  active: "text-green-600",
  expired: "text-amber-600",
  revoked: "text-red-600",
  error: "text-red-600",
};

export default function AccountsList() {
  const { t } = useLanguage();

  // TODO: Fetch connected accounts from server action
  const connectedAccounts: Record<string, { name: string; status: "active" | "expired" | "revoked" | "error" }> = {};

  function handleConnect(platformId: PlatformId) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    if (platformId === "facebook" || platformId === "instagram" || platformId === "whatsapp") {
      window.location.href = `${baseUrl}/api/social-media/auth/callback/meta?initiate=true&platform=${platformId}`;
    } else if (platformId === "tiktok") {
      window.location.href = `${baseUrl}/api/social-media/auth/callback/tiktok?initiate=true`;
    } else if (platformId === "youtube") {
      window.location.href = `${baseUrl}/api/social-media/auth/callback/youtube?initiate=true`;
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {platformConfigs.map(({ id, icon: Icon, color, bgColor, borderColor }) => {
        const account = connectedAccounts[id];
        const StatusIcon = account ? statusIcons[account.status] : null;
        const statusColor = account ? statusColors[account.status] : "";

        return (
          <div
            key={id}
            className={`bg-white rounded-xl p-6 shadow-sm border ${
              account ? borderColor : "border-gray-100"
            }`}
          >
            <div className="flex items-center gap-4 mb-4">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${bgColor}`}
              >
                <Icon className={`w-6 h-6 ${color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {t(`socialMedia.accounts.platforms.${id}`)}
                </h3>
                {account && (
                  <div className="flex items-center gap-1 mt-0.5">
                    {StatusIcon && (
                      <StatusIcon className={`w-3.5 h-3.5 ${statusColor}`} />
                    )}
                    <span className={`text-xs ${statusColor}`}>
                      {t(`socialMedia.accounts.${account.status}`)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {account ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{account.name}</p>
                <button className="w-full text-sm text-red-600 hover:text-red-700 py-2 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                  {t("socialMedia.accounts.disconnect")}
                </button>
              </div>
            ) : (
              <button
                onClick={() => handleConnect(id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                {t("socialMedia.accounts.connect")}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
