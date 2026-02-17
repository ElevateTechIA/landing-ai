'use client';

import { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';

const FB_APP_ID = '873439175578545';
const CONFIG_ID = process.env.NEXT_PUBLIC_WHATSAPP_CONFIG_ID || '';

interface SignupResult {
  access_token: string;
  phone_number_id: string;
  waba_id: string;
  phone_details?: {
    display_phone_number?: string;
    verified_name?: string;
  };
}

declare global {
  interface Window {
    FB: {
      init: (params: Record<string, unknown>) => void;
      login: (
        callback: (response: { authResponse?: { code?: string } }) => void,
        options: Record<string, unknown>
      ) => void;
    };
    fbAsyncInit: () => void;
  }
}

export default function WhatsAppSignupPage() {
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SignupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.fbAsyncInit = () => {
      window.FB.init({
        appId: FB_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v21.0',
      });
      setSdkReady(true);
    };

    // If FB SDK already loaded
    if (window.FB) {
      window.FB.init({
        appId: FB_APP_ID,
        cookie: true,
        xfbml: true,
        version: 'v21.0',
      });
      setSdkReady(true);
    }
  }, []);

  const sessionInfoListener = useCallback((event: MessageEvent) => {
    if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
      return;
    }

    try {
      const data = JSON.parse(event.data);
      if (data.type === 'WA_EMBEDDED_SIGNUP') {
        // data.data contains: { phone_number_id, waba_id }
        if (data.data) {
          console.log('[WhatsApp Signup] Session info:', data.data);
          // Store for later use when the login callback fires
          (window as unknown as Record<string, unknown>).__wa_signup_data = data.data;
        }
      }
    } catch {
      // Not a JSON message, ignore
    }
  }, []);

  useEffect(() => {
    window.addEventListener('message', sessionInfoListener);
    return () => window.removeEventListener('message', sessionInfoListener);
  }, [sessionInfoListener]);

  const handleSignup = () => {
    if (!window.FB) {
      setError('Facebook SDK not loaded yet. Please wait and try again.');
      return;
    }

    if (!CONFIG_ID) {
      setError(
        'NEXT_PUBLIC_WHATSAPP_CONFIG_ID not set. Create a WhatsApp Embedded Signup configuration in your Facebook App Dashboard and add it to .env.local'
      );
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    window.FB.login(
      (response) => {
        if (!response.authResponse?.code) {
          setLoading(false);
          setError('Login cancelled or failed — no authorization code received.');
          return;
        }

        const code = response.authResponse.code;
        const signupData = (window as unknown as Record<string, unknown>).__wa_signup_data as
          | { phone_number_id?: string; waba_id?: string }
          | undefined;

        const phone_number_id = signupData?.phone_number_id || '';
        const waba_id = signupData?.waba_id || '';

        console.log('[WhatsApp Signup] Got code, exchanging for token...', {
          code: code.substring(0, 20) + '...',
          phone_number_id,
          waba_id,
        });

        fetch('/api/whatsapp/exchange-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, phone_number_id, waba_id }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.error) {
              setError(data.error);
            } else {
              setResult(data);
            }
          })
          .catch((err) => {
            setError(`Token exchange failed: ${err}`);
          })
          .finally(() => {
            setLoading(false);
          });
      },
      {
        config_id: CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '3',
        },
      }
    );
  };

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 20px', fontFamily: 'system-ui', color: '#111' }}>
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        async
        defer
      />

      <h1 style={{ fontSize: 24, marginBottom: 8 }}>WhatsApp Embedded Signup</h1>
      <p style={{ color: '#555', marginBottom: 32 }}>
        Connect an existing WhatsApp Business App number to the Cloud API (coexistence mode).
      </p>

      <button
        onClick={() => handleSignup()}
        disabled={!sdkReady || loading}
        style={{
          background: sdkReady && !loading ? '#1877F2' : '#ccc',
          color: 'white',
          border: 'none',
          padding: '14px 28px',
          borderRadius: 8,
          fontSize: 16,
          fontWeight: 600,
          cursor: sdkReady && !loading ? 'pointer' : 'not-allowed',
        }}
      >
        {loading ? 'Connecting...' : sdkReady ? 'Connect WhatsApp Business App' : 'Loading Facebook SDK...'}
      </button>

      {error && (
        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 8,
            color: '#DC2626',
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div
          style={{
            marginTop: 24,
            padding: 20,
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 8,
          }}
        >
          <h2 style={{ fontSize: 18, color: '#16A34A', marginTop: 0 }}>Connected successfully!</h2>

          <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
            Copy these values to your <code>.env.local</code> as Phone 3:
          </p>

          <pre
            style={{
              background: '#1E293B',
              color: '#E2E8F0',
              padding: 16,
              borderRadius: 8,
              fontSize: 13,
              overflow: 'auto',
              lineHeight: 1.6,
            }}
          >
{`# Phone 3 (ELEVATE AI — Coexistence)
WHATSAPP_PHONE_3_PHONE_NUMBER_ID=${result.phone_number_id}
WHATSAPP_PHONE_3_ACCESS_TOKEN=${result.access_token}
WHATSAPP_PHONE_3_WABA_ID=${result.waba_id}
WHATSAPP_PHONE_3_APP_SECRET=${process.env.NEXT_PUBLIC_WHATSAPP_APP_SECRET || 'dbb1412e7035b220b958474fa53c8310'}
WHATSAPP_PHONE_3_DISPLAY_NAME=ELEVATE AI
WHATSAPP_PHONE_3_DISPLAY_PHONE=+13055425070`}
          </pre>

          {result.phone_details && (
            <p style={{ marginTop: 12, fontSize: 14, color: '#444' }}>
              Phone: {result.phone_details.display_phone_number} — Name:{' '}
              {result.phone_details.verified_name}
            </p>
          )}
        </div>
      )}

      <div style={{ marginTop: 40, padding: 16, background: '#F8FAFC', borderRadius: 8, fontSize: 14, color: '#333' }}>
        <h3 style={{ fontSize: 16, marginTop: 0 }}>How it works</h3>
        <ol style={{ paddingLeft: 20, lineHeight: 1.8 }}>
          <li>Click the button above to open the Facebook signup flow</li>
          <li>Choose &quot;Connect existing WhatsApp Business App&quot;</li>
          <li>Scan the QR code with your WhatsApp Business App on the phone</li>
          <li>Authorize sharing chat history</li>
          <li>Copy the generated env vars to your <code>.env.local</code></li>
        </ol>
      </div>
    </div>
  );
}
