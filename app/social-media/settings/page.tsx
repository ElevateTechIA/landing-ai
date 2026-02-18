"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { getUserSettings, updateUserSettings } from "@/actions/social-media/auth.actions";
import { Save, Check, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const { t, language, setLanguage } = useLanguage();
  const [timezone, setTimezone] = useState("America/Mexico_City");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getUserSettings().then((settings) => {
      if (settings?.timezone) {
        setTimezone(settings.timezone);
      }
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const result = await updateUserSettings({ timezone });
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
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
              className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-colors ${
                language === "es"
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              Espanol
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`px-4 py-2 rounded-lg border-2 font-medium text-sm transition-colors ${
                language === "en"
                  ? "border-blue-500 bg-blue-50 text-blue-600"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
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
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900"
          >
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
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              {t("socialMedia.settings.save")}
            </>
          ) : saved ? (
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
