"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import { MessageCircle } from "lucide-react";

export default function WhatsAppPage() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        {t("socialMedia.whatsapp.title")}
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("socialMedia.whatsapp.templates")}
          </h2>
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t("socialMedia.whatsapp.noTemplates")}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("socialMedia.whatsapp.contacts")}
          </h2>
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">{t("socialMedia.whatsapp.noContacts")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
