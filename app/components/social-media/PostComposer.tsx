"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/app/context/LanguageContext";
import {
  Image as ImageIcon,
  Hash,
  Send,
  Clock,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import NetworkSelector from "./NetworkSelector";
import { getConnectedAccounts } from "@/actions/social-media/account.actions";
import { createPost, publishPostNow } from "@/actions/social-media/post.actions";

export default function PostComposer() {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [hashtagInput, setHashtagInput] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [whatsappCTA, setWhatsappCTA] = useState(false);
  const [publishResult, setPublishResult] = useState<{
    type: "success" | "error" | "partial";
    message: string;
  } | null>(null);

  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function handleAddHashtag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && hashtagInput.trim()) {
      e.preventDefault();
      const tag = hashtagInput.trim().replace(/^#/, "");
      if (tag && !hashtags.includes(tag)) {
        setHashtags([...hashtags, tag]);
      }
      setHashtagInput("");
    }
  }

  function handleRemoveHashtag(tag: string) {
    setHashtags(hashtags.filter((h) => h !== tag));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    setMediaFiles((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      previewUrlsRef.current.push(url);
      setMediaPreviews((prev) => [...prev, url]);
    });
  }

  function handleRemoveMedia(index: number) {
    URL.revokeObjectURL(mediaPreviews[index]);
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePublish() {
    setLoading(true);
    setPublishResult(null);

    try {
      // 1. Fetch connected accounts to map platform names → account IDs
      const accounts = await getConnectedAccounts();
      const targetAccounts = accounts.filter(
        (a) => selectedPlatforms.includes(a.platform) && a.status === "active"
      );

      if (targetAccounts.length === 0) {
        setPublishResult({
          type: "error",
          message: t("socialMedia.compose.noAccountsError"),
        });
        setLoading(false);
        return;
      }

      // 2. Upload media files via presigned URLs (bypasses Vercel body size limit)
      const mediaUrls: string[] = [];
      const mediaTypes: ("image" | "video")[] = [];

      for (const file of mediaFiles) {
        // Step A: Get presigned upload + read URLs from our API
        const presignRes = await fetch("/api/social-media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, contentType: file.type }),
        });

        if (!presignRes.ok) {
          const err = await presignRes.json();
          setPublishResult({
            type: "error",
            message: `Failed to prepare upload for ${file.name}: ${err.error}`,
          });
          setLoading(false);
          return;
        }

        const { uploadUrl, readUrl, filePath } = await presignRes.json();

        // Step B: Upload file directly to GCS (no Vercel size limit)
        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!putRes.ok) {
          setPublishResult({
            type: "error",
            message: `Failed to upload ${file.name}`,
          });
          setLoading(false);
          return;
        }

        // Step C: Make file publicly accessible
        await fetch("/api/social-media/upload", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filePath }),
        });

        mediaUrls.push(readUrl);
        mediaTypes.push(file.type.startsWith("video/") ? "video" : "image");
      }

      // 3. Create post in Firestore
      const platformOverrides: Record<string, Record<string, string>> = {};
      if (whatsappCTA && selectedPlatforms.includes("facebook")) {
        platformOverrides.facebook = { whatsappCTA: "true" };
      }

      const result = await createPost({
        text,
        hashtags,
        mediaUrls,
        mediaTypes,
        targetPlatforms: selectedPlatforms,
        targetAccountIds: targetAccounts.map((a) => a.id),
        scheduledAt: isScheduling ? new Date(scheduledDate).toISOString() : undefined,
        platformOverrides: Object.keys(platformOverrides).length > 0 ? platformOverrides : undefined,
      });

      if (!result.success) {
        setPublishResult({ type: "error", message: result.error ?? "Unknown error" });
        setLoading(false);
        return;
      }

      // 4. If not scheduling, publish immediately
      if (!isScheduling && result.postId) {
        const publishRes = await publishPostNow(result.postId);

        if (publishRes.success && publishRes.results) {
          const failed = publishRes.results.filter((r) => !r.success);
          if (failed.length > 0 && failed.length < publishRes.results.length) {
            setPublishResult({
              type: "partial",
              message: failed.map((f) => `${f.platform}: ${f.error}`).join(", "),
            });
          } else if (failed.length === publishRes.results.length) {
            setPublishResult({
              type: "error",
              message: failed.map((f) => `${f.platform}: ${f.error}`).join(", "),
            });
          } else {
            setPublishResult({
              type: "success",
              message: t("socialMedia.compose.publishSuccess"),
            });
          }
        } else {
          setPublishResult({
            type: "error",
            message: publishRes.error ?? "Publish failed",
          });
        }
      } else {
        setPublishResult({
          type: "success",
          message: t("socialMedia.compose.scheduleSuccess"),
        });
      }

      // Reset form on success
      setText("");
      setHashtags([]);
      setSelectedPlatforms([]);
      setWhatsappCTA(false);
      setMediaFiles([]);
      setMediaPreviews([]);
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current = [];
    } catch (error) {
      console.error("Publish error:", error);
      setPublishResult({
        type: "error",
        message: error instanceof Error ? error.message : "Unexpected error",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Text input */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("socialMedia.compose.textPlaceholder")}
          rows={4}
          className="w-full resize-none border-0 focus:ring-0 outline-none text-gray-900 placeholder-gray-400"
        />

        {/* Media previews */}
        {mediaPreviews.length > 0 && (
          <div className="flex gap-3 mt-4 flex-wrap">
            {mediaPreviews.map((preview, i) => (
              <div key={i} className="relative w-24 h-24">
                {mediaFiles[i]?.type.startsWith("video/") ? (
                  <video
                    src={preview}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt=""
                    className="w-full h-full object-cover rounded-lg"
                  />
                )}
                <button
                  onClick={() => handleRemoveMedia(i)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Actions bar */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
          <label className="cursor-pointer text-gray-500 hover:text-blue-600 transition-colors">
            <ImageIcon className="w-5 h-5" />
            <input
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Hashtags */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Hash className="w-4 h-4" />
          {t("socialMedia.compose.addHashtags")}
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {hashtags.map((tag) => (
            <span
              key={tag}
              className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm flex items-center gap-1"
            >
              #{tag}
              <button onClick={() => handleRemoveHashtag(tag)}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <input
          type="text"
          value={hashtagInput}
          onChange={(e) => setHashtagInput(e.target.value)}
          onKeyDown={handleAddHashtag}
          placeholder={t("socialMedia.compose.hashtagPlaceholder")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900 placeholder-gray-400"
        />
      </div>

      {/* Network selector */}
      <NetworkSelector
        selected={selectedPlatforms}
        onChange={setSelectedPlatforms}
      />

      {/* WhatsApp CTA button option - shown when Facebook is selected */}
      {selectedPlatforms.includes("facebook") && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={whatsappCTA}
              onChange={(e) => setWhatsappCTA(e.target.checked)}
              className="w-4 h-4 text-green-600 rounded"
            />
            <MessageCircle className="w-5 h-5 text-green-500" />
            <div>
              <span className="text-sm font-medium text-gray-700">
                {t("socialMedia.compose.whatsappButton")}
              </span>
              <p className="text-xs text-gray-400 mt-0.5">
                {t("socialMedia.compose.whatsappButtonDesc")}
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Schedule option */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isScheduling}
            onChange={(e) => setIsScheduling(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded"
          />
          <Clock className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {t("socialMedia.compose.schedule")}
          </span>
        </label>

        {isScheduling && (
          <div className="mt-4">
            <label className="block text-sm text-gray-600 mb-1">
              {t("socialMedia.compose.scheduleFor")}
            </label>
            <input
              type="datetime-local"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm text-gray-900"
            />
          </div>
        )}
      </div>

      {/* Result notification */}
      {publishResult && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border ${
            publishResult.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : publishResult.type === "partial"
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {publishResult.type === "success" ? (
            <CheckCircle className="w-5 h-5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0" />
          )}
          <p className="text-sm">{publishResult.message}</p>
          <button
            onClick={() => setPublishResult(null)}
            className="ml-auto shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Publish button */}
      <button
        onClick={handlePublish}
        disabled={
          loading ||
          (!text.trim() && mediaFiles.length === 0) ||
          selectedPlatforms.length === 0
        }
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isScheduling ? (
          <Clock className="w-5 h-5" />
        ) : (
          <Send className="w-5 h-5" />
        )}
        {loading
          ? t("socialMedia.compose.publishing")
          : isScheduling
            ? t("socialMedia.compose.schedule")
            : t("socialMedia.compose.publishNow")}
      </button>
    </div>
  );
}
