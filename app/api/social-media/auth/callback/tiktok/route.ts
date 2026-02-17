import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const initiate = searchParams.get("initiate");
  const code = searchParams.get("code");

  if (initiate) {
    // TODO: Redirect to TikTok OAuth
    return NextResponse.redirect(
      new URL("/social-media/accounts?error=tiktok_not_configured", request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/social-media/accounts?error=missing_params", request.url)
    );
  }

  // TODO: Exchange code for tokens, encrypt, store
  return NextResponse.redirect(
    new URL("/social-media/accounts?connected=tiktok", request.url)
  );
}
