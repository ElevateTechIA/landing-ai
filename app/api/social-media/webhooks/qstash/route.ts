import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { socialCollections } from "@/lib/social-media/firestore";
import { decryptToken, encryptToken } from "@/lib/social-media/encryption";
import { getPlatformAdapter } from "@/lib/social-media/platforms/factory";
import { FieldValue } from "firebase-admin/firestore";
import type { DecryptedSocialAccount, PublishPayload } from "@/lib/social-media/platforms/types";

async function ensureFreshToken(
  accountDocId: string,
  account: DecryptedSocialAccount,
  tokenExpiresAt: FirebaseFirestore.Timestamp | null
): Promise<DecryptedSocialAccount> {
  const expiresMs = tokenExpiresAt?.toMillis?.() ?? 0;
  const shouldRefresh = expiresMs === 0 || expiresMs < Date.now() + 5 * 60 * 1000;
  if (!shouldRefresh) return account;
  if (!account.refreshToken) return account;

  const adapter = getPlatformAdapter(account.platform);
  const result = await adapter.refreshToken(account);
  if (!result) return account;

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

const receiver = new Receiver({
  currentSigningKey: process.env.UPSTASH_QSTASH_CURRENT_SIGNING_KEY!,
  nextSigningKey: process.env.UPSTASH_QSTASH_NEXT_SIGNING_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("upstash-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const isValid = await receiver
      .verify({ body: rawBody, signature })
      .catch(() => false);

    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const { postId } = body;

    if (!postId) {
      return NextResponse.json({ error: "Missing postId" }, { status: 400 });
    }

    // 1. Load post
    const postDoc = await socialCollections.posts().doc(postId).get();
    if (!postDoc.exists) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = postDoc.data()!;

    // Update status to publishing
    await socialCollections.posts().doc(postId).update({
      status: "publishing",
      updatedAt: FieldValue.serverTimestamp(),
    } as never);

    // 2. Get target accounts
    const accountsSnap = await socialCollections
      .socialAccounts()
      .where("userId", "==", post.userId)
      .where("status", "==", "active")
      .get();

    const targetAccounts = accountsSnap.docs.filter((doc) =>
      post.targetAccountIds.includes(doc.id)
    );

    const results: { platform: string; success: boolean; error?: string }[] = [];

    for (const accountDoc of targetAccounts) {
      const account = accountDoc.data();

      // 3. Decrypt tokens
      let refreshToken: string | null = null;
      if (account.refreshTokenEncrypted) {
        try {
          const refreshIV = account.refreshTokenIV ?? account.tokenIV;
          const refreshAuthTag = account.refreshTokenAuthTag ?? account.tokenAuthTag;
          refreshToken = decryptToken(account.refreshTokenEncrypted, refreshIV, refreshAuthTag);
        } catch {
          // Skip if can't decrypt
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

      // Auto-refresh expired tokens
      decryptedAccount = await ensureFreshToken(
        accountDoc.id,
        decryptedAccount,
        account.tokenExpiresAt
      );

      // 4. Build payload
      const adapter = getPlatformAdapter(account.platform);
      const payload: PublishPayload = {
        text: post.content.text,
        hashtags: post.content.hashtags,
        media: (post.content.mediaUrls ?? []).map((url: string, i: number) => ({
          url,
          type: post.content.mediaTypes?.[i] ?? ("image" as const),
          mimeType:
            post.content.mediaTypes?.[i] === "video" ? "video/mp4" : "image/jpeg",
          sizeBytes: 0,
        })),
        platformOverrides: post.platformOverrides?.[account.platform] ?? {},
      };

      // 5. Validate
      const validation = adapter.validatePayload(payload);
      if (!validation.valid) {
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
        results.push({ platform: account.platform, success: false, error: validation.errors.join("; ") });
        continue;
      }

      // 6. Publish
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

    // 7. Update post status
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

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("QStash webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
