import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase";
import { socialCollections } from "@/lib/social-media/firestore";
import { encryptToken } from "@/lib/social-media/encryption";
import { FieldValue } from "firebase-admin/firestore";

const OAUTH_STATE_COOKIE = "youtube_oauth_state";
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

  // Step 1: Initiate OAuth flow - redirect to Google
  if (initiate) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.redirect(
        new URL("/social-media/accounts?error=youtube_not_configured", request.url)
      );
    }

    const scopes = [
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.upload",
    ].join(" ");

    const stateParam = randomUUID();

    const authUrl =
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes,
        state: stateParam,
        access_type: "offline",
        prompt: "consent",
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

    const clientId = process.env.GOOGLE_CLIENT_ID!;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI!;

    // 1. Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error("[YouTube] Token exchange failed:", tokenData.error);
      return redirectWithError(request, "token_exchange_failed");
    }

    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token ?? null;
    const expiresIn = tokenData.expires_in ?? 3600;

    // 2. Fetch YouTube channel info
    const channelRes = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const channelData = await channelRes.json();

    if (channelData.error) {
      console.error("[YouTube] Channel fetch failed:", channelData.error);
      return redirectWithError(request, "channel_fetch_failed");
    }

    const channel = channelData.items?.[0];
    if (!channel) {
      console.error("[YouTube] No channel found");
      return redirectWithError(request, "no_channel_found");
    }

    // 3. Encrypt and store
    const encryptedAccess = encryptToken(accessToken);
    const encryptedRefresh = refreshToken ? encryptToken(refreshToken) : null;

    const accountData = {
      userId: user.uid,
      platform: "youtube",
      platformAccountId: channel.id,
      platformAccountName: channel.snippet.title,
      platformAccountAvatar:
        channel.snippet.thumbnails?.high?.url ??
        channel.snippet.thumbnails?.default?.url ??
        null,
      accessTokenEncrypted: encryptedAccess.encrypted,
      refreshTokenEncrypted: encryptedRefresh?.encrypted ?? null,
      tokenIV: encryptedAccess.iv,
      tokenAuthTag: encryptedAccess.authTag,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      tokenRefreshedAt: FieldValue.serverTimestamp(),
      scopes: ["youtube", "youtube.upload"],
      metadata: {
        channelId: channel.id,
        channelTitle: channel.snippet.title,
        customUrl: channel.snippet.customUrl ?? null,
      },
      status: "active" as const,
      lastError: null,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Check if already exists
    const existing = await socialCollections
      .socialAccounts()
      .where("userId", "==", user.uid)
      .where("platform", "==", "youtube")
      .where("platformAccountId", "==", channel.id)
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
      new URL("/social-media/accounts?connected=youtube", request.url)
    );
    response.cookies.delete(OAUTH_STATE_COOKIE);
    return response;
  } catch (err) {
    console.error("[YouTube] OAuth callback error:", err);
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
