"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import Link from "next/link";
import { PenSquare } from "lucide-react";

export default function PostsPage() {
  const { t } = useLanguage();

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("socialMedia.posts.title")}
        </h1>
        <Link
          href="/social-media/compose"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <PenSquare className="w-4 h-4" />
          {t("socialMedia.compose.title")}
        </Link>
      </div>

      <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
        <p className="text-gray-500">{t("socialMedia.posts.empty")}</p>
      </div>
    </div>
  );
}
