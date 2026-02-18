"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { getUserPosts } from "@/actions/social-media/post.actions";
import Link from "next/link";
import {
  PenSquare,
  Loader2,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Facebook,
  Instagram,
  Video,
  Youtube,
  Image as ImageIcon,
} from "lucide-react";

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

const statusConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  completed: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
  published: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
  scheduled: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
  draft: { icon: PenSquare, color: "text-gray-500", bg: "bg-gray-50" },
  publishing: { icon: Loader2, color: "text-blue-600", bg: "bg-blue-50" },
  failed: { icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  partial: { icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50" },
};

type Post = {
  id: string;
  content: { text: string; mediaUrls: string[]; mediaTypes: string[]; hashtags: string[] };
  targetPlatforms: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string | null;
};

export default function PostsPage() {
  const { t } = useLanguage();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUserPosts()
      .then((data) => setPosts(data as Post[]))
      .catch(() => setPosts([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {t("socialMedia.posts.title")}
          </h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("socialMedia.posts.title")}
        </h1>
        <Link
          href="/social-media/compose"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <PenSquare className="w-4 h-4" />
          {t("socialMedia.compose.title")}
        </Link>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <p className="text-gray-500">{t("socialMedia.posts.empty")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => {
            const cfg = statusConfig[post.status] ?? statusConfig.draft;
            const StatusIcon = cfg.icon;

            return (
              <Link
                key={post.id}
                href={`/social-media/posts/${post.id}`}
                className="block bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:border-blue-200 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {post.content.mediaUrls?.[0] ? (
                    post.content.mediaTypes?.[0] === "video" ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-900 flex items-center justify-center relative">
                        <video
                          src={post.content.mediaUrls[0]}
                          className="w-full h-full object-cover"
                          muted
                          preload="metadata"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Video className="w-5 h-5 text-white" />
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-gray-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.content.mediaUrls[0]}
                          alt=""
                          className="w-full h-full object-cover"
                        />
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

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {post.status}
                      </span>

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

                      <span className="text-xs text-gray-400">
                        {post.createdAt
                          ? new Date(post.createdAt).toLocaleDateString()
                          : ""}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
