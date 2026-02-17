import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase";
import { socialCollections } from "@/lib/social-media/firestore";
import { encryptToken } from "@/lib/social-media/encryption";
import { FieldValue } from "firebase-admin/firestore";

const OAUTH_STATE_COOKIE = "meta_oauth_state";
const SESSION_COOKIE_NAME = "sm_session";

async function getAuthenticatedUser(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;
  try {
    const auth = getAdminAuth();
    return await auth.verifySessionCookie(session, true);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const initiate = searchParams.get("initiate");
  const error = searchParams.get("error");

  // Step 1: Initiate OAuth flow - redirect to Meta
  if (initiate) {
    const metaAppId = process.env.META_APP_ID;
    const redirectUri = process.env.META_REDIRECT_URI;
    const scopes = [
      "business_management",
      "pages_manage_posts",
      "pages_read_engagement",
      "pages_show_list",
      "instagram_basic",
      "instagram_content_publish",
      "whatsapp_business_management",
      "whatsapp_business_messaging",
    ].join(",");

    const stateParam = randomUUID();

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(redirectUri!)}&scope=${scopes}&state=${stateParam}&response_type=code`;

    const response = NextResponse.redirect(authUrl);
    response.cookies.set(OAUTH_STATE_COOKIE, stateParam, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return response;
  }

  // Step 2: Handle OAuth callback
  if (error) {
    return NextResponse.redirect(
      new URL("/social-media/accounts?error=oauth_denied", request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL("/social-media/accounts?error=missing_params", request.url)
    );
  }

  // Verify CSRF state
  const savedState = request.cookies.get(OAUTH_STATE_COOKIE)?.value;

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      new URL("/social-media/accounts?error=invalid_state", request.url)
    );
  }

  try {
    // Verify user is authenticated
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.redirect(
        new URL("/auth/login", request.url)
      );
    }

    const metaAppId = process.env.META_APP_ID!;
    const metaAppSecret = process.env.META_APP_SECRET!;
    const redirectUri = process.env.META_REDIRECT_URI!;

    // 1. Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: metaAppId,
          client_secret: metaAppSecret,
          redirect_uri: redirectUri,
          code,
        })
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("Token exchange failed:", tokenData.error);
      return redirectWithError(request, "token_exchange_failed");
    }

    const shortLivedToken = tokenData.access_token;

    // 2. Exchange for long-lived token
    const longTokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: "fb_exchange_token",
          client_id: metaAppId,
          client_secret: metaAppSecret,
          fb_exchange_token: shortLivedToken,
        })
    );
    const longTokenData = await longTokenRes.json();

    const longLivedToken = longTokenData.access_token ?? shortLivedToken;
    const tokenExpiresIn = longTokenData.expires_in ?? 5184000; // 60 days default

    // 3. Fetch /me/accounts for Facebook Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,picture,access_token,instagram_business_account{id,name,profile_picture_url}&access_token=${longLivedToken}`
    );
    const pagesData = await pagesRes.json();

    if (pagesData.error) {
      console.error("Pages fetch failed:", pagesData.error);
      return redirectWithError(request, "pages_fetch_failed");
    }

    const pages = pagesData.data ?? [];
    let connectedCount = 0;

    for (const page of pages) {
      // Save Facebook Page account
      await saveAccount({
        userId: user.uid,
        platform: "facebook",
        platformAccountId: page.id,
        platformAccountName: page.name,
        platformAccountAvatar: page.picture?.data?.url ?? null,
        accessToken: page.access_token,
        tokenExpiresIn,
        scopes: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
        metadata: { pageId: page.id, pageName: page.name },
      });
      connectedCount++;

      // 4. If page has Instagram Business Account, save it too
      if (page.instagram_business_account) {
        const igAccount = page.instagram_business_account;
        await saveAccount({
          userId: user.uid,
          platform: "instagram",
          platformAccountId: igAccount.id,
          platformAccountName: igAccount.name ?? page.name,
          platformAccountAvatar: igAccount.profile_picture_url ?? null,
          accessToken: page.access_token, // Instagram uses the page token
          tokenExpiresIn,
          scopes: ["instagram_basic", "instagram_content_publish"],
          metadata: {
            igBusinessAccountId: igAccount.id,
            linkedPageId: page.id,
            linkedPageName: page.name,
          },
        });
        connectedCount++;
      }
    }

    // 5. Try to fetch WhatsApp Business Accounts
    try {
      // First check granted scopes
      const debugRes = await fetch(
        `https://graph.facebook.com/v21.0/me/permissions?access_token=${longLivedToken}`
      );
      const debugData = await debugRes.json();
      console.log("[WhatsApp] Granted permissions:", JSON.stringify(debugData));

      const wabaRes = await fetch(
        `https://graph.facebook.com/v21.0/me?fields=businesses{owned_whatsapp_business_accounts{id,name,account_review_status}}&access_token=${longLivedToken}`
      );
      const wabaData = await wabaRes.json();
      console.log("[WhatsApp] WABA response:", JSON.stringify(wabaData));

      if (wabaData.error) {
        console.error("[WhatsApp] API error:", wabaData.error);
      }

      const businesses = wabaData.businesses?.data ?? [];
      console.log("[WhatsApp] Found businesses:", businesses.length);

      for (const biz of businesses) {
        const wabas = biz.owned_whatsapp_business_accounts?.data ?? [];
        console.log(`[WhatsApp] Business ${biz.id} has ${wabas.length} WABA(s):`, JSON.stringify(wabas));
        for (const waba of wabas) {
          console.log(`[WhatsApp] WABA ${waba.id}: status=${waba.account_review_status}, name=${waba.name}`);
          if (waba.account_review_status === "APPROVED") {
            await saveAccount({
              userId: user.uid,
              platform: "whatsapp",
              platformAccountId: waba.id,
              platformAccountName: waba.name ?? "WhatsApp Business",
              platformAccountAvatar: null,
              accessToken: longLivedToken,
              tokenExpiresIn,
              scopes: ["whatsapp_business_management", "whatsapp_business_messaging"],
              metadata: { wabaId: waba.id, businessId: biz.id },
            });
            connectedCount++;
          }
        }
      }
    } catch (waErr) {
      console.error("[WhatsApp] Exception:", waErr);
    }

    const response = NextResponse.redirect(
      new URL(`/social-media/accounts?connected=meta&count=${connectedCount}`, request.url)
    );
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch (err) {
    console.error("OAuth callback error:", err);
    return redirectWithError(request, "oauth_failed");
  }
}

function redirectWithError(request: NextRequest, error: string) {
  const response = NextResponse.redirect(
    new URL(`/social-media/accounts?error=${error}`, request.url)
  );
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

async function saveAccount(data: {
  userId: string;
  platform: "facebook" | "instagram" | "whatsapp";
  platformAccountId: string;
  platformAccountName: string;
  platformAccountAvatar: string | null;
  accessToken: string;
  tokenExpiresIn: number;
  scopes: string[];
  metadata: Record<string, unknown>;
}) {
  const encrypted = encryptToken(data.accessToken);

  const accountData = {
    userId: data.userId,
    platform: data.platform,
    platformAccountId: data.platformAccountId,
    platformAccountName: data.platformAccountName,
    platformAccountAvatar: data.platformAccountAvatar,
    accessTokenEncrypted: encrypted.encrypted,
    refreshTokenEncrypted: null,
    tokenIV: encrypted.iv,
    tokenAuthTag: encrypted.authTag,
    tokenExpiresAt: new Date(Date.now() + data.tokenExpiresIn * 1000),
    tokenRefreshedAt: FieldValue.serverTimestamp(),
    scopes: data.scopes,
    metadata: data.metadata,
    status: "active" as const,
    lastError: null,
    updatedAt: FieldValue.serverTimestamp(),
  };

  // Check if already exists
  const existing = await socialCollections
    .socialAccounts()
    .where("userId", "==", data.userId)
    .where("platform", "==", data.platform)
    .where("platformAccountId", "==", data.platformAccountId)
    .get();

  if (!existing.empty) {
    await socialCollections
      .socialAccounts()
      .doc(existing.docs[0].id)
      .update(accountData as never);
  } else {
    await socialCollections.socialAccounts().add({
      ...accountData,
      connectedAt: FieldValue.serverTimestamp(),
    } as never);
  }
}
