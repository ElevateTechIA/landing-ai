import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase";
import { socialCollections } from "@/lib/social-media/firestore";
import { encryptToken } from "@/lib/social-media/encryption";
import { FieldValue } from "firebase-admin/firestore";

const OAUTH_STATE_COOKIE = "tiktok_oauth_state";
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

  // Step 1: Initiate OAuth flow - redirect to TikTok
  if (initiate) {
    const clientKey = process.env.TIKTOK_CLIENT_KEY;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI;

    if (!clientKey || !redirectUri) {
      return NextResponse.redirect(
        new URL("/social-media/accounts?error=tiktok_not_configured", request.url)
      );
    }

    const scopes = "user.info.basic,video.upload,video.publish";
    const stateParam = randomUUID();

    const authUrl =
      `https://www.tiktok.com/v2/auth/authorize/?` +
      new URLSearchParams({
        client_key: clientKey,
        response_type: "code",
        scope: scopes,
        redirect_uri: redirectUri,
        state: stateParam,
      }).toString();

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
    console.error(
      "[TikTok] OAuth error:",
      error,
      searchParams.get("error_description")
    );
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
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    const clientKey = process.env.TIKTOK_CLIENT_KEY!;
    const clientSecret = process.env.TIKTOK_CLIENT_SECRET!;
    const redirectUri = process.env.TIKTOK_REDIRECT_URI!;

    // 1. Exchange code for tokens
    const tokenRes = await fetch(
      "https://open.tiktokapis.com/v2/oauth/token/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_key: clientKey,
          client_secret: clientSecret,
          code,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
        }),
      }
    );
    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      console.error(
        "[TikTok] Token exchange failed:",
        JSON.stringify(tokenData)
      );
      return redirectWithError(request, "token_exchange_failed");
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token ?? null;
    const expiresIn = tokenData.expires_in ?? 7200;
    const openId = tokenData.open_id;

    // 2. Fetch user profile
    const profileRes = await fetch(
      "https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const profileData = await profileRes.json();

    const userInfo = profileData.data?.user;
    const displayName = userInfo?.display_name ?? "TikTok User";
    const avatarUrl = userInfo?.avatar_url ?? null;

    // 3. Encrypt and store
    const encryptedAccess = encryptToken(accessToken);
    const encryptedRefresh = refreshToken ? encryptToken(refreshToken) : null;

    const accountData = {
      userId: user.uid,
      platform: "tiktok",
      platformAccountId: openId,
      platformAccountName: displayName,
      platformAccountAvatar: avatarUrl,
      accessTokenEncrypted: encryptedAccess.encrypted,
      refreshTokenEncrypted: encryptedRefresh?.encrypted ?? null,
      tokenIV: encryptedAccess.iv,
      tokenAuthTag: encryptedAccess.authTag,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      tokenRefreshedAt: FieldValue.serverTimestamp(),
      scopes: ["user.info.basic", "video.upload", "video.publish"],
      metadata: {
        openId,
        displayName,
      },
      status: "active" as const,
      lastError: null,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Check if already exists
    const existing = await socialCollections
      .socialAccounts()
      .where("userId", "==", user.uid)
      .where("platform", "==", "tiktok")
      .where("platformAccountId", "==", openId)
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

    const response = NextResponse.redirect(
      new URL("/social-media/accounts?connected=tiktok", request.url)
    );
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch (err) {
    console.error("[TikTok] OAuth callback error:", err);
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
