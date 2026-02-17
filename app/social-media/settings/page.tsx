"use client";

import { useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { Save, Check } from "lucide-react";

export default function SettingsPage() {
  const { t, setLanguage } = useLanguage();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        {t("socialMedia.settings.title")}
      </h1>

      <div className="max-w-2xl space-y-6">
        {/* Language */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("socialMedia.settings.language")}
          </h2>
          <div className="flex gap-3">
            <button
              onClick={() => setLanguage("es")}
              className="px-4 py-2 rounded-lg border-2 border-indigo-500 bg-indigo-50 text-indigo-600 font-medium text-sm"
            >
              Espanol
            </button>
            <button
              onClick={() => setLanguage("en")}
              className="px-4 py-2 rounded-lg border-2 border-gray-200 text-gray-600 font-medium text-sm hover:border-gray-300"
            >
              English
            </button>
          </div>
        </div>

        {/* Timezone */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("socialMedia.settings.timezone")}
          </h2>
          <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-sm">
            <option value="America/Mexico_City">America/Mexico_City (CST)</option>
            <option value="America/New_York">America/New_York (EST)</option>
            <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
            <option value="America/Bogota">America/Bogota (COT)</option>
            <option value="America/Argentina/Buenos_Aires">America/Buenos_Aires (ART)</option>
            <option value="Europe/Madrid">Europe/Madrid (CET)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          {saved ? (
            <>
              <Check className="w-5 h-5" />
              {t("socialMedia.settings.saved")}
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              {t("socialMedia.settings.save")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
