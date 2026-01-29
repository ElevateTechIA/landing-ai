import { NextResponse } from 'next/server';

/**
 * Debug endpoint to check which environment variables are configured
 * GET /api/debug/env-check
 */
export async function GET() {
  const envStatus = {
    // Google Calendar
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REFRESH_TOKEN: !!process.env.GOOGLE_REFRESH_TOKEN,
    GOOGLE_CALENDAR_ID: !!process.env.GOOGLE_CALENDAR_ID,

    // Gemini AI
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,

    // Zoom
    ZOOM_ACCOUNT_ID: !!process.env.ZOOM_ACCOUNT_ID,
    ZOOM_CLIENT_ID: !!process.env.ZOOM_CLIENT_ID,
    ZOOM_CLIENT_SECRET: !!process.env.ZOOM_CLIENT_SECRET,

    // Email SMTP
    SMTP_HOST: !!process.env.SMTP_HOST,
    SMTP_PORT: !!process.env.SMTP_PORT,
    SMTP_USER: !!process.env.SMTP_USER,
    SMTP_PASSWORD: !!process.env.SMTP_PASSWORD,
    SMTP_FROM_EMAIL: !!process.env.SMTP_FROM_EMAIL,
    SMTP_FROM_NAME: !!process.env.SMTP_FROM_NAME,

    // Firebase (optional)
    FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
  };

  // Count missing variables
  const missing = Object.entries(envStatus)
    .filter(([_, exists]) => !exists)
    .map(([key]) => key);

  return NextResponse.json({
    allConfigured: missing.length === 0,
    configured: Object.entries(envStatus)
      .filter(([_, exists]) => exists)
      .map(([key]) => key),
    missing,
    status: envStatus,
  });
}
