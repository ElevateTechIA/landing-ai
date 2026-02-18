"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { getConnectedAccounts, disconnectAccount } from "@/actions/social-media/account.actions";
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
  Loader2,
  Unlink,
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

type ConnectedAccount = {
  id: string;
  platform: string;
  platformAccountName: string;
  platformAccountAvatar: string | null;
  status: "active" | "expired" | "revoked" | "error";
  lastError: string | null;
  connectedAt: string | null;
};

export default function AccountsList() {
  const { t } = useLanguage();
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    getConnectedAccounts()
      .then((data) => setAccounts(data as ConnectedAccount[]))
      .catch(() => setAccounts([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleDisconnect(accountId: string) {
    if (!confirm(t("socialMedia.accounts.confirmDisconnect"))) return;
    setDisconnecting(accountId);
    const result = await disconnectAccount(accountId);
    if (result.success) {
      setAccounts((prev) => prev.filter((a) => a.id !== accountId));
    }
    setDisconnecting(null);
  }

  function handleConnect(platformId: PlatformId) {
    const baseUrl = window.location.origin;
    if (platformId === "facebook" || platformId === "instagram" || platformId === "whatsapp") {
      window.location.href = `${baseUrl}/api/social-media/auth/callback/meta?initiate=true&platform=${platformId}`;
    } else if (platformId === "tiktok") {
      window.location.href = `${baseUrl}/api/social-media/auth/callback/tiktok?initiate=true`;
    } else if (platformId === "youtube") {
      window.location.href = `${baseUrl}/api/social-media/auth/callback/youtube?initiate=true`;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {platformConfigs.map(({ id, icon: Icon, color, bgColor, borderColor }) => {
        const account = accounts.find((a) => a.platform === id);
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
                      {account.platformAccountName}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {account ? (
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-700">
                    {t(`socialMedia.accounts.${account.status}`)}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConnect(id)}
                    className="flex-1 text-sm text-blue-600 hover:text-blue-700 py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    {t("socialMedia.accounts.reconnect")}
                  </button>
                  <button
                    onClick={() => handleDisconnect(account.id)}
                    disabled={disconnecting === account.id}
                    className="text-sm text-red-500 hover:text-red-600 py-2 px-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {disconnecting === account.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Unlink className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleConnect(id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-500 hover:text-blue-600 transition-colors text-sm font-medium"
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
