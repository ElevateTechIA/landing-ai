"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import { useParams, useRouter } from "next/navigation";
import { getPostById, deletePost } from "@/actions/social-media/post.actions";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  PenSquare,
  Trash2,
  Facebook,
  Instagram,
  Video,
  Youtube,
  ExternalLink,
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

type PublishLog = {
  id: string;
  platform: string;
  status: string;
  platformPostUrl: string | null;
  error: { code: string; message: string } | null;
  publishedAt: string | null;
  createdAt: string | null;
};

type PostDetail = {
  id: string;
  content: { text: string; mediaUrls: string[]; mediaTypes: string[]; hashtags: string[] };
  targetPlatforms: string[];
  status: string;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string | null;
  publishLogs: PublishLog[];
};

export default function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const { t } = useLanguage();
  const router = useRouter();
  const [post, setPost] = useState<PostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (postId) {
      getPostById(postId)
        .then((data) => setPost(data as PostDetail | null))
        .catch(() => setPost(null))
        .finally(() => setLoading(false));
    }
  }, [postId]);

  async function handleDelete() {
    if (!postId || !confirm(t("socialMedia.posts.confirmDelete"))) return;
    setDeleting(true);
    const result = await deletePost(postId);
    if (result.success) {
      router.push("/social-media/posts");
    }
    setDeleting(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{t("socialMedia.posts.notFound")}</p>
        <Link
          href="/social-media/posts"
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          {t("socialMedia.posts.title")}
        </Link>
      </div>
    );
  }

  const cfg = statusConfig[post.status] ?? statusConfig.draft;
  const StatusIcon = cfg.icon;

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/social-media/posts"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex-1">
          {t("socialMedia.posts.viewDetail")}
        </h1>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1.5 disabled:opacity-50"
        >
          {deleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          {t("socialMedia.posts.delete")}
        </button>
      </div>

      {/* Status + dates */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className={`inline-flex items-center gap-1.5 text-sm px-3 py-1 rounded-full ${cfg.bg} ${cfg.color} font-medium`}>
            <StatusIcon className="w-4 h-4" />
            {post.status}
          </span>

          <div className="flex items-center gap-2">
            {post.targetPlatforms.map((p) => {
              const Icon = platformIcons[p];
              return Icon ? (
                <Icon key={p} className={`w-5 h-5 ${platformColors[p] ?? "text-gray-500"}`} />
              ) : null;
            })}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
          {post.createdAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Created: {new Date(post.createdAt).toLocaleString()}
            </span>
          )}
          {post.scheduledAt && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Scheduled: {new Date(post.scheduledAt).toLocaleString()}
            </span>
          )}
          {post.publishedAt && (
            <span className="flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              Published: {new Date(post.publishedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Content</h2>
        {post.content.text ? (
          <p className="text-gray-900 whitespace-pre-wrap">{post.content.text}</p>
        ) : (
          <p className="text-gray-400 italic">No text</p>
        )}

        {post.content.hashtags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {post.content.hashtags.map((tag) => (
              <span key={tag} className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {post.content.mediaUrls.length > 0 && (
          <div className="flex gap-3 mt-4 flex-wrap">
            {post.content.mediaUrls.map((url, i) => (
              <div key={i} className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 relative">
                {post.content.mediaTypes?.[i] === "video" ? (
                  <>
                    <video src={url} className="w-full h-full object-cover" muted preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Video className="w-6 h-6 text-white" />
                    </div>
                  </>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={url} alt="" className="w-full h-full object-cover" />
                )}
              </div>
            ))}
          </div>
        )}

        {post.content.mediaUrls.length === 0 && !post.content.text && (
          <div className="flex items-center justify-center py-6">
            <ImageIcon className="w-8 h-8 text-gray-300" />
          </div>
        )}
      </div>

      {/* Publish Logs */}
      {post.publishLogs.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-sm font-medium text-gray-500 mb-3">Publish Results</h2>
          <div className="space-y-3">
            {post.publishLogs.map((log) => {
              const PlatformIcon = platformIcons[log.platform];
              const isSuccess = log.status === "published";
              return (
                <div
                  key={log.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    isSuccess ? "bg-green-50" : "bg-red-50"
                  }`}
                >
                  {PlatformIcon && (
                    <PlatformIcon className={`w-5 h-5 ${platformColors[log.platform] ?? "text-gray-500"}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isSuccess ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${isSuccess ? "text-green-700" : "text-red-700"}`}>
                        {log.platform} - {log.status}
                      </span>
                    </div>
                    {log.error && (
                      <p className="text-xs text-red-600 mt-1">
                        {log.error.code}: {log.error.message}
                      </p>
                    )}
                  </div>
                  {log.platformPostUrl && (
                    <a
                      href={log.platformPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
