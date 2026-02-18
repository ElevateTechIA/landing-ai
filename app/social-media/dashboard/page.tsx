"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { getDashboardStats } from "@/actions/social-media/post.actions";
import { getConnectedAccounts } from "@/actions/social-media/account.actions";
import Link from "next/link";
import {
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Link2,
  PenSquare,
  Facebook,
  Instagram,
  Video,
  Youtube,
  MessageCircle,
} from "lucide-react";

const platformIcons: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Video,
  youtube: Youtube,
  whatsapp: MessageCircle,
};

const platformColors: Record<string, { text: string; bg: string }> = {
  facebook: { text: "text-blue-600", bg: "bg-blue-50" },
  instagram: { text: "text-pink-600", bg: "bg-pink-50" },
  tiktok: { text: "text-gray-900", bg: "bg-gray-100" },
  youtube: { text: "text-red-600", bg: "bg-red-50" },
  whatsapp: { text: "text-green-600", bg: "bg-green-50" },
};

type ConnectedAccount = {
  id: string;
  platform: string;
  platformAccountName: string;
  status: string;
};

export default function DashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ total: 0, scheduled: 0, published: 0, failed: 0 });
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getConnectedAccounts(),
    ])
      .then(([statsData, accountsData]) => {
        setStats(statsData);
        setAccounts(accountsData as ConnectedAccount[]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: t("socialMedia.dashboard.stats.totalPosts"), value: stats.total, icon: FileText, color: "text-blue-600 bg-blue-50" },
    { label: t("socialMedia.dashboard.stats.scheduled"), value: stats.scheduled, icon: Calendar, color: "text-amber-600 bg-amber-50" },
    { label: t("socialMedia.dashboard.stats.published"), value: stats.published, icon: CheckCircle, color: "text-green-600 bg-green-50" },
    { label: t("socialMedia.dashboard.stats.failed"), value: stats.failed, icon: AlertCircle, color: "text-red-600 bg-red-50" },
  ];

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          {t("socialMedia.dashboard.title")}
        </h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const activeAccounts = accounts.filter((a) => a.status === "active");

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("socialMedia.dashboard.title")}
        </h1>
        <Link
          href="/social-media/compose"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <PenSquare className="w-4 h-4" />
          {t("socialMedia.compose.title")}
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-sm text-gray-500">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Connected Accounts */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("socialMedia.sidebar.accounts")}
          </h2>
          <Link
            href="/social-media/accounts"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            {t("socialMedia.accounts.connect")}
          </Link>
        </div>

        {activeAccounts.length === 0 ? (
          <div className="text-center py-6">
            <Link2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-3">
              {t("socialMedia.dashboard.noAccounts")}
            </p>
            <Link
              href="/social-media/accounts"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {t("socialMedia.accounts.connect")}
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAccounts.map((account) => {
              const Icon = platformIcons[account.platform] ?? Link2;
              const colors = platformColors[account.platform] ?? { text: "text-gray-600", bg: "bg-gray-50" };
              return (
                <div
                  key={account.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors.bg}`}>
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {account.platformAccountName}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {account.platform}
                    </p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
