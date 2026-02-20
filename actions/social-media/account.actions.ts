"use server";

import { FieldValue } from "firebase-admin/firestore";
import { getSessionUser } from "./auth.actions";
import { socialCollections } from "@/lib/social-media/firestore";
import { encryptToken, decryptToken } from "@/lib/social-media/encryption";
import { getPlatformAdapter } from "@/lib/social-media/platforms/factory";
import type { DecryptedSocialAccount } from "@/lib/social-media/platforms/types";

export async function getConnectedAccounts() {
  const user = await getSessionUser();
  if (!user) return [];

  const snap = await socialCollections
    .socialAccounts()
    .where("userId", "==", user.uid)
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    platform: doc.data().platform,
    platformAccountName: doc.data().platformAccountName,
    platformAccountAvatar: doc.data().platformAccountAvatar,
    status: doc.data().status,
    lastError: doc.data().lastError,
    connectedAt: doc.data().connectedAt?.toDate?.()?.toISOString?.() ?? null,
  }));
}

export async function connectAccount(data: {
  platform: string;
  platformAccountId: string;
  platformAccountName: string;
  platformAccountAvatar: string | null;
  accessToken: string;
  refreshToken: string | null;
  tokenExpiresAt: string | null;
  scopes: string[];
  metadata: Record<string, unknown>;
}) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "unauthorized" as const };

  try {
    // Check if account already connected
    const existing = await socialCollections
      .socialAccounts()
      .where("userId", "==", user.uid)
      .where("platform", "==", data.platform)
      .where("platformAccountId", "==", data.platformAccountId)
      .get();

    const encrypted = encryptToken(data.accessToken);
    const refreshEncrypted = data.refreshToken
      ? encryptToken(data.refreshToken)
      : null;

    const accountData = {
      userId: user.uid,
      platform: data.platform,
      platformAccountId: data.platformAccountId,
      platformAccountName: data.platformAccountName,
      platformAccountAvatar: data.platformAccountAvatar,
      accessTokenEncrypted: encrypted.encrypted,
      refreshTokenEncrypted: refreshEncrypted?.encrypted ?? null,
      tokenIV: encrypted.iv,
      tokenAuthTag: encrypted.authTag,
      tokenExpiresAt: data.tokenExpiresAt
        ? new Date(data.tokenExpiresAt)
        : null,
      tokenRefreshedAt: FieldValue.serverTimestamp(),
      scopes: data.scopes,
      metadata: data.metadata,
      status: "active" as const,
      lastError: null,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (!existing.empty) {
      // Update existing account
      await socialCollections
        .socialAccounts()
        .doc(existing.docs[0].id)
        .update(accountData as never);
      return { success: true, accountId: existing.docs[0].id };
    } else {
      // Create new account
      const ref = await socialCollections.socialAccounts().add({
        ...accountData,
        connectedAt: FieldValue.serverTimestamp(),
      } as never);
      return { success: true, accountId: ref.id };
    }
  } catch (error) {
    console.error("Error connecting account:", error);
    return { success: false, error: "connect_failed" as const };
  }
}

export async function disconnectAccount(accountId: string) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "unauthorized" as const };

  try {
    const doc = await socialCollections.socialAccounts().doc(accountId).get();
    if (!doc.exists) return { success: false, error: "not_found" as const };

    if (doc.data()!.userId !== user.uid)
      return { success: false, error: "unauthorized" as const };

    await socialCollections.socialAccounts().doc(accountId).delete();
    return { success: true };
  } catch (error) {
    console.error("Error disconnecting account:", error);
    return { success: false, error: "disconnect_failed" as const };
  }
}

export async function updateAccountWhatsApp(accountId: string, whatsappNumber: string) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "unauthorized" as const };

  try {
    const doc = await socialCollections.socialAccounts().doc(accountId).get();
    if (!doc.exists) return { success: false, error: "not_found" as const };

    const account = doc.data()!;
    if (account.userId !== user.uid)
      return { success: false, error: "unauthorized" as const };

    if (account.platform !== "facebook")
      return { success: false, error: "only_facebook" as const };

    await socialCollections.socialAccounts().doc(accountId).update({
      metadata: {
        ...account.metadata,
        whatsappNumber: whatsappNumber,
      },
      updatedAt: FieldValue.serverTimestamp(),
    } as never);

    return { success: true };
  } catch (error) {
    console.error("Error updating WhatsApp number:", error);
    return { success: false, error: "update_failed" as const };
  }
}

export async function refreshAccountToken(accountId: string) {
  const user = await getSessionUser();
  if (!user) return { success: false, error: "unauthorized" as const };

  try {
    const doc = await socialCollections.socialAccounts().doc(accountId).get();
    if (!doc.exists) return { success: false, error: "not_found" as const };

    const account = doc.data()!;
    if (account.userId !== user.uid)
      return { success: false, error: "unauthorized" as const };

    const adapter = getPlatformAdapter(account.platform);

    let refreshToken: string | null = null;
    if (account.refreshTokenEncrypted) {
      try {
        const refreshIV = account.refreshTokenIV ?? account.tokenIV;
        const refreshAuthTag = account.refreshTokenAuthTag ?? account.tokenAuthTag;
        refreshToken = decryptToken(account.refreshTokenEncrypted, refreshIV, refreshAuthTag);
      } catch {
        // Refresh token may have been encrypted with different IV/authTag
      }
    }

    const decryptedAccount: DecryptedSocialAccount = {
      id: accountId,
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

    const result = await adapter.refreshToken(decryptedAccount);
    if (!result) {
      await socialCollections.socialAccounts().doc(accountId).update({
        status: "expired",
        lastError: "Token refresh failed",
        updatedAt: FieldValue.serverTimestamp(),
      } as never);
      return { success: false, error: "refresh_failed" as const };
    }

    const newEncrypted = encryptToken(result.accessToken);
    const newRefreshEncrypted = result.refreshToken
      ? encryptToken(result.refreshToken)
      : null;

    await socialCollections.socialAccounts().doc(accountId).update({
      accessTokenEncrypted: newEncrypted.encrypted,
      refreshTokenEncrypted: newRefreshEncrypted?.encrypted ?? account.refreshTokenEncrypted,
      tokenIV: newEncrypted.iv,
      tokenAuthTag: newEncrypted.authTag,
      tokenExpiresAt: result.expiresAt ?? null,
      tokenRefreshedAt: FieldValue.serverTimestamp(),
      status: "active",
      lastError: null,
      updatedAt: FieldValue.serverTimestamp(),
    } as never);

    return { success: true };
  } catch (error) {
    console.error("Error refreshing token:", error);
    return { success: false, error: "refresh_failed" as const };
  }
}
