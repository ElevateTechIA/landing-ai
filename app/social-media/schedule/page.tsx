"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { getUserPosts } from "@/actions/social-media/post.actions";
import {
  Calendar,
  Clock,
  Loader2,
  Facebook,
  Instagram,
  Video,
  Youtube,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";

const platformIcons: Record<string, React.ElementType> = {
  facebook: Facebook,
  instagram: Instagram,
  tiktok: Video,
  youtube: Youtube,
};

const platformColors: Record<string, string> = {
  facebook: "text-blue-600",
  instagram: "text-pink-600",
  tiktok: "text-gray-900",
  youtube: "text-red-600",
};

type ScheduledPost = {
  id: string;
  content: { text: string; mediaUrls: string[]; mediaTypes: string[]; hashtags: string[] };
  targetPlatforms: string[];
  status: string;
  scheduledAt: string | null;
  createdAt: string | null;
};

export default function SchedulePage() {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserPosts("scheduled")
      .then((data) => setPosts(data as ScheduledPost[]))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-8">
          {t("socialMedia.sidebar.schedule")}
        </h1>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">
        {t("socialMedia.sidebar.schedule")}
      </h1>

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">{t("socialMedia.schedule.empty")}</p>
          <Link
            href="/social-media/compose"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            {t("socialMedia.compose.title")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
            >
              <div className="flex items-start gap-4">
                {post.content.mediaUrls?.[0] ? (
                  post.content.mediaTypes?.[0] === "video" ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-900 flex items-center justify-center relative">
                      <video src={post.content.mediaUrls[0]} className="w-full h-full object-cover" muted preload="metadata" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Video className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.content.mediaUrls[0]} alt="" className="w-full h-full object-cover" />
                    </div>
                  )
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <ImageIcon className="w-6 h-6 text-gray-300" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-2">
                    {post.content.text || "(No text)"}
                  </p>

                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1 text-xs text-amber-600">
                      <Clock className="w-3.5 h-3.5" />
                      {post.scheduledAt
                        ? new Date(post.scheduledAt).toLocaleString()
                        : "—"}
                    </div>

                    <div className="flex items-center gap-1">
                      {post.targetPlatforms.map((p) => {
                        const Icon = platformIcons[p];
                        return Icon ? (
                          <Icon
                            key={p}
                            className={`w-4 h-4 ${platformColors[p] ?? "text-gray-500"}`}
                          />
                        ) : null;
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
