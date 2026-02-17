"use client";

import { useLanguage } from "@/app/context/LanguageContext";
import { useParams } from "next/navigation";

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { t } = useLanguage();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        {t("socialMedia.posts.viewDetail")} - {postId}
      </h1>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <p className="text-gray-500">Post detail coming soon...</p>
      </div>
    </div>
  );
}
