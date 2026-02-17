"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import { Calendar } from "lucide-react";

export default function SchedulePage() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        {t("socialMedia.sidebar.schedule")}
      </h1>

      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Calendar view coming soon...</p>
      </div>
    </div>
  );
}
