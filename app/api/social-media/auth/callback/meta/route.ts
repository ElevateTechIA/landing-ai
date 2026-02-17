import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const OAUTH_STATE_COOKIE = "meta_oauth_state";

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
      "pages_manage_posts",
      "pages_read_engagement",
      "pages_show_list",
      "instagram_basic",
      "instagram_content_publish",
      "whatsapp_business_management",
      "whatsapp_business_messaging",
    ].join(",");

    const stateParam = randomUUID();

    const cookieStore = await cookies();
    cookieStore.set(OAUTH_STATE_COOKIE, stateParam, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?client_id=${metaAppId}&redirect_uri=${encodeURIComponent(redirectUri!)}&scope=${scopes}&state=${stateParam}&response_type=code`;

    return NextResponse.redirect(authUrl);
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
  const cookieStore = await cookies();
  const savedState = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  cookieStore.delete(OAUTH_STATE_COOKIE);

  if (!savedState || savedState !== state) {
    return NextResponse.redirect(
      new URL("/social-media/accounts?error=invalid_state", request.url)
    );
  }

  try {
    // TODO: Implement full OAuth flow:
    // 1. Exchange code for short-lived token
    // 2. Exchange for long-lived token
    // 3. Fetch /me/accounts for Page Access Tokens
    // 4. Fetch Instagram Business Account ID
    // 5. Fetch WhatsApp Business Account info
    // 6. Encrypt tokens
    // 7. Store in Firestore socialAccounts collection

    return NextResponse.redirect(
      new URL("/social-media/accounts?connected=meta", request.url)
    );
  } catch {
    return NextResponse.redirect(
      new URL("/social-media/accounts?error=oauth_failed", request.url)
    );
  }
}
