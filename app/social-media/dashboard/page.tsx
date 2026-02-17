"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import { FileText, Calendar, CheckCircle, AlertCircle } from "lucide-react";

export default function DashboardPage() {
  const { t } = useLanguage();

  const stats = [
    { label: t("socialMedia.dashboard.stats.totalPosts"), value: 0, icon: FileText, color: "text-blue-600 bg-blue-50" },
    { label: t("socialMedia.dashboard.stats.scheduled"), value: 0, icon: Calendar, color: "text-amber-600 bg-amber-50" },
    { label: t("socialMedia.dashboard.stats.published"), value: 0, icon: CheckCircle, color: "text-green-600 bg-green-50" },
    { label: t("socialMedia.dashboard.stats.failed"), value: 0, icon: AlertCircle, color: "text-red-600 bg-red-50" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        {t("socialMedia.dashboard.title")}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map(({ label, value, icon: Icon, color }) => (
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
    </div>
  );
}
