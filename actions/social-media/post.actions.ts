"use server";

import { db } from "@/lib/firebase";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getSessionUser } from "./auth.actions";
import { socialCollections } from "@/lib/social-media/firestore";
import { decryptToken, encryptToken } from "@/lib/social-media/encryption";
import { getPlatformAdapter } from "@/lib/social-media/platforms/factory";
import { schedulePost } from "@/lib/social-media/queue";
import type { DecryptedSocialAccount, PublishPayload } from "@/lib/social-media/platforms/types";

/**
 * Refresh the access token if it's expired or about to expire (within 5 minutes).
 * Returns the (possibly refreshed) decrypted account.
 */
async function ensureFreshToken(
  accountDocId: string,
  account: DecryptedSocialAccount,
  tokenExpiresAt: FirebaseFirestore.Timestamp | null
): Promise<DecryptedSocialAccount> {
  // Check if token is expired, expiring within 5 minutes, or has no known expiry
  const expiresMs = tokenExpiresAt?.toMillis?.() ?? 0;
  const shouldRefresh = expiresMs === 0 || expiresMs < Date.now() + 5 * 60 * 1000;

  if (!shouldRefresh) return account;
  if (!account.refreshToken) return account;

  const adapter = getPlatformAdapter(account.platform);
  const result = await adapter.refreshToken(account);
  if (!result) return account;

  // Encrypt and save the new token
  const encrypted = encryptToken(result.accessToken);
  await socialCollections.socialAccounts().doc(accountDocId).update({
    accessTokenEncrypted: encrypted.encrypted,
    tokenIV: encrypted.iv,
    tokenAuthTag: encrypted.authTag,
    tokenExpiresAt: result.expiresAt,
    tokenRefreshedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  } as never);

  return { ...account, accessToken: result.accessToken };
}

export async function createPost(data: {
  text: string;
  hashtags: string[];
  mediaUrls: string[];
  mediaTypes: ("image" | "video")[];
  targetPlatforms: string[];
  targetAccountIds: string[];
  scheduledAt?: string;
  platformOverrides?: Record<string, Record<string, string>>;
}) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "unauthorized" as const };

  // Validate inputs
  if (!data.text.trim() && data.mediaUrls.length === 0) {
    return { success: false, error: "content_required" as const };
  }
  if (data.text.length > 63206) {
    return { success: false, error: "text_too_long" as const };
  }
  if (data.targetPlatforms.length === 0 || data.targetAccountIds.length === 0) {
    return { success: false, error: "targets_required" as const };
  }
  if (data.hashtags.length > 30) {
    return { success: false, error: "too_many_hashtags" as const };
  }
  if (data.scheduledAt) {
    const scheduledDate = new Date(data.scheduledAt);
    if (isNaN(scheduledDate.getTime()) || scheduledDate <= new Date()) {
      return { success: false, error: "invalid_schedule_date" as const };
    }
  }

  try {
    const postRef = socialCollections.posts().doc();

    const scheduledAtTs = data.scheduledAt
      ? Timestamp.fromDate(new Date(data.scheduledAt))
      : null;

    const status = scheduledAtTs ? "scheduled" : "draft";

    await postRef.set({
      userId: user.uid,
      content: {
        text: data.text,
        hashtags: data.hashtags,
        mediaUrls: data.mediaUrls,
        mediaTypes: data.mediaTypes,
        thumbnailUrl: data.mediaUrls[0] ?? null,
      },
      targetPlatforms: data.targetPlatforms,
      targetAccountIds: data.targetAccountIds,
      status,
      scheduledAt: scheduledAtTs,
      publishedAt: null,
      platformOverrides: data.platformOverrides ?? {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    } as never);

    // If scheduled, create QStash job
    if (scheduledAtTs && data.scheduledAt) {
      const messageId = await schedulePost(
        postRef.id,
        new Date(data.scheduledAt)
      );

      await db.collection("scheduledJobs").add({
        postId: postRef.id,
        userId: user.uid,
        scheduledAt: scheduledAtTs,
        status: "pending",
        qstashMessageId: messageId || null,
        attempts: 0,
        maxAttempts: 3,
        lastAttemptAt: null,
        error: null,
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    return { success: true, postId: postRef.id };
  } catch (error) {
    console.error("Error creating post:", error);
    return { success: false, error: "create_failed" as const };
  }
}

export async function publishPostNow(postId: string) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "unauthorized" as const };

  try {
    const postDoc = await socialCollections.posts().doc(postId).get();
    if (!postDoc.exists) return { success: false, error: "not_found" as const };

    const post = postDoc.data()!;
    if (post.userId !== user.uid)
      return { success: false, error: "unauthorized" as const };

    // Update status to publishing
    await socialCollections.posts().doc(postId).update({
      status: "publishing",
      updatedAt: FieldValue.serverTimestamp(),
    } as never);

    // Get target accounts
    const accountsSnap = await socialCollections
      .socialAccounts()
      .where("userId", "==", user.uid)
      .where("status", "==", "active")
      .get();

    const targetAccounts = accountsSnap.docs.filter((doc) =>
      post.targetAccountIds.includes(doc.id)
    );

    const results: { platform: string; success: boolean; error?: string }[] = [];

    for (const accountDoc of targetAccounts) {
      const account = accountDoc.data();

      // Decrypt tokens
      let refreshToken: string | null = null;
      if (account.refreshTokenEncrypted) {
        try {
          const refreshIV = account.refreshTokenIV ?? account.tokenIV;
          const refreshAuthTag = account.refreshTokenAuthTag ?? account.tokenAuthTag;
          refreshToken = decryptToken(account.refreshTokenEncrypted, refreshIV, refreshAuthTag);
        } catch {
          // Refresh token may have been encrypted with different IV/authTag — skip it
        }
      }

      let decryptedAccount: DecryptedSocialAccount = {
        id: accountDoc.id,
        userId: account.userId,
        platform: account.platform,
        platformAccountId: account.platformAccountId,
        platformAccountName: account.platformAccountName,
        accessToken: decryptToken(
          account.accessTokenEncrypted,
          account.tokenIV,
          account.tokenAuthTag
        ),
        refreshToken,
        metadata: account.metadata,
      };

      // Auto-refresh expired tokens (e.g., YouTube tokens expire after 1 hour)
      decryptedAccount = await ensureFreshToken(
        accountDoc.id,
        decryptedAccount,
        account.tokenExpiresAt
      );

      const adapter = getPlatformAdapter(account.platform);
      const payload: PublishPayload = {
        text: post.content.text,
        hashtags: post.content.hashtags,
        media: post.content.mediaUrls.map((url: string, i: number) => ({
          url,
          type: post.content.mediaTypes[i] ?? ("image" as const),
          mimeType:
            post.content.mediaTypes[i] === "video"
              ? "video/mp4"
              : "image/jpeg",
          sizeBytes: 0,
        })),
        platformOverrides: post.platformOverrides?.[account.platform] ?? {},
      };

      // Validate
      const validation = adapter.validatePayload(payload);
      if (!validation.valid) {
        // Log failure
        await socialCollections.publishLogs(postId).add({
          platform: account.platform,
          accountId: accountDoc.id,
          status: "failed",
          platformPostId: null,
          platformPostUrl: null,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.errors.join("; "),
            retryable: false,
            rawResponse: null,
          },
          attempts: 1,
          lastAttemptAt: FieldValue.serverTimestamp(),
          publishedAt: null,
          createdAt: FieldValue.serverTimestamp(),
        } as never);
        results.push({
          platform: account.platform,
          success: false,
          error: validation.errors.join("; "),
        });
        continue;
      }

      // Publish
      const result = await adapter.publish(decryptedAccount, payload);

      await socialCollections.publishLogs(postId).add({
        platform: account.platform,
        accountId: accountDoc.id,
        status: result.success ? "published" : "failed",
        platformPostId: result.platformPostId ?? null,
        platformPostUrl: result.platformPostUrl ?? null,
        error: result.error
          ? {
              code: result.error.code,
              message: result.error.message,
              retryable: result.error.retryable,
              rawResponse: result.error.rawResponse ?? null,
            }
          : null,
        attempts: 1,
        lastAttemptAt: FieldValue.serverTimestamp(),
        publishedAt: result.success ? FieldValue.serverTimestamp() : null,
        createdAt: FieldValue.serverTimestamp(),
      } as never);

      results.push({
        platform: account.platform,
        success: result.success,
        error: result.error?.message,
      });
    }

    // Update post status based on results
    const allSuccess = results.every((r) => r.success);
    const allFailed = results.every((r) => !r.success);
    const finalStatus = allSuccess
      ? "completed"
      : allFailed
        ? "failed"
        : "partial";

    await socialCollections.posts().doc(postId).update({
      status: finalStatus,
      publishedAt: allSuccess ? FieldValue.serverTimestamp() : null,
      updatedAt: FieldValue.serverTimestamp(),
    } as never);

    return { success: true, results };
  } catch (error) {
    console.error("Error publishing post:", error);
    return { success: false, error: "publish_failed" as const };
  }
}

export async function getUserPosts(
  statusFilter?: string,
  limit = 20
) {
  const user = await getSessionUser();
  if (!user) return [];

  const snap = await socialCollections
    .posts()
    .where("userId", "==", user.uid)
    .get();

  let docs = snap.docs;
  if (statusFilter) {
    docs = docs.filter((doc) => doc.data().status === statusFilter);
  }

  // Sort by createdAt descending in memory (avoids composite index requirement)
  docs.sort((a, b) => {
    const aTime = a.data().createdAt?.toMillis?.() ?? 0;
    const bTime = b.data().createdAt?.toMillis?.() ?? 0;
    return bTime - aTime;
  });

  return docs.slice(0, limit).map((doc) => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.() ?? null,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString?.() ?? null,
    scheduledAt: doc.data().scheduledAt?.toDate?.()?.toISOString?.() ?? null,
    publishedAt: doc.data().publishedAt?.toDate?.()?.toISOString?.() ?? null,
  }));
}

export async function getPostById(postId: string) {
  const user = await getSessionUser();
  if (!user) return null;

  const doc = await socialCollections.posts().doc(postId).get();
  if (!doc.exists) return null;

  const data = doc.data()!;
  if (data.userId !== user.uid) return null;

  // Get publish logs
  const logsSnap = await socialCollections.publishLogs(postId).get();
  const logs = logsSnap.docs.map((logDoc) => ({
    id: logDoc.id,
    ...logDoc.data(),
    lastAttemptAt:
      logDoc.data().lastAttemptAt?.toDate?.()?.toISOString?.() ?? null,
    publishedAt:
      logDoc.data().publishedAt?.toDate?.()?.toISOString?.() ?? null,
    createdAt: logDoc.data().createdAt?.toDate?.()?.toISOString?.() ?? null,
  }));

  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
    updatedAt: data.updatedAt?.toDate?.()?.toISOString?.() ?? null,
    scheduledAt: data.scheduledAt?.toDate?.()?.toISOString?.() ?? null,
    publishedAt: data.publishedAt?.toDate?.()?.toISOString?.() ?? null,
    publishLogs: logs,
  };
}

export async function deletePost(postId: string) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "unauthorized" as const };

  const doc = await socialCollections.posts().doc(postId).get();
  if (!doc.exists) return { success: false, error: "not_found" as const };

  const data = doc.data()!;
  if (data.userId !== user.uid)
    return { success: false, error: "unauthorized" as const };

  await socialCollections.posts().doc(postId).delete();
  return { success: true };
}
