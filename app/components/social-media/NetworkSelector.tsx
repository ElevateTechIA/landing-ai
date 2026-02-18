"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import type { PlatformId } from "@/lib/social-media/platforms/types";
import {
  Facebook,
  Instagram,
  Video,
  Youtube,
  MessageCircle,
} from "lucide-react";

const platforms: {
  id: PlatformId;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}[] = [
  { id: "facebook", icon: Facebook, color: "text-blue-600", bgColor: "bg-blue-50" },
  { id: "instagram", icon: Instagram, color: "text-pink-600", bgColor: "bg-pink-50" },
  { id: "tiktok", icon: Video, color: "text-gray-900", bgColor: "bg-gray-100" },
  { id: "youtube", icon: Youtube, color: "text-red-600", bgColor: "bg-red-50" },
  { id: "whatsapp", icon: MessageCircle, color: "text-green-600", bgColor: "bg-green-50" },
];

interface NetworkSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  excludeWhatsapp?: boolean;
}

export default function NetworkSelector({
  selected,
  onChange,
  excludeWhatsapp = true,
}: NetworkSelectorProps) {
  const { t } = useLanguage();

  const availablePlatforms = excludeWhatsapp
    ? platforms.filter((p) => p.id !== "whatsapp")
    : platforms;

  function togglePlatform(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-sm font-medium text-gray-700 mb-4">
        {t("socialMedia.compose.selectNetworks")}
      </h3>
      <div className="flex flex-wrap gap-3">
        {availablePlatforms.map(({ id, icon: Icon, color, bgColor }) => {
          const isSelected = selected.includes(id);
          return (
            <button
              key={id}
              onClick={() => togglePlatform(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                isSelected
                  ? `border-blue-500 ${bgColor} ${color}`
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              <Icon className="w-5 h-5" />
              {t(`socialMedia.accounts.platforms.${id}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
