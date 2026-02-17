import { NextRequest, NextResponse } from 'next/server';

/**
 * Exchange a Facebook authorization code for a WhatsApp Cloud API access token.
 * Used during WhatsApp Embedded Signup (including coexistence flow).
 */
export async function POST(request: NextRequest) {
  try {
    const { code, phone_number_id, waba_id } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Authorization code is required' }, { status: 400 });
    }

    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    if (!appId || !appSecret) {
      return NextResponse.json({ error: 'FACEBOOK_APP_ID or WHATSAPP_APP_SECRET not configured' }, { status: 500 });
    }

    // Exchange the code for an access token
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token');
    tokenUrl.searchParams.set('client_id', appId);
    tokenUrl.searchParams.set('client_secret', appSecret);
    tokenUrl.searchParams.set('code', code);

    const tokenRes = await fetch(tokenUrl.toString(), { method: 'GET' });
    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[exchange-token] Token exchange failed:', tokenData.error);
      return NextResponse.json({ error: tokenData.error.message }, { status: 400 });
    }

    const accessToken = tokenData.access_token;

    // Try to get phone number details if we have a phone_number_id
    let phoneDetails = null;
    if (phone_number_id && accessToken) {
      try {
        const phoneRes = await fetch(
          `https://graph.facebook.com/v21.0/${phone_number_id}?access_token=${accessToken}`
        );
        phoneDetails = await phoneRes.json();
      } catch (e) {
        console.error('[exchange-token] Failed to fetch phone details:', e);
      }
    }

    // Subscribe the app to the WABA for webhooks
    if (waba_id && accessToken) {
      try {
        await fetch(
          `https://graph.facebook.com/v21.0/${waba_id}/subscribed_apps`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
      } catch (e) {
        console.error('[exchange-token] Failed to subscribe app to WABA:', e);
      }
    }

    return NextResponse.json({
      success: true,
      access_token: accessToken,
      phone_number_id,
      waba_id,
      phone_details: phoneDetails,
    });
  } catch (error) {
    console.error('[exchange-token] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
