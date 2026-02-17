"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import PostComposer from "@/app/components/social-media/PostComposer";

export default function ComposePage() {
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        {t("socialMedia.compose.title")}
      </h1>
      <PostComposer />
    </div>
  );
}
