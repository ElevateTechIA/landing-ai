import { NextResponse } from 'next/server';

/**
 * Debug endpoint to check environment configuration
 * GET /api/calendar/debug-config
 */
export async function GET() {
  const config = {
    hasGoogleClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasGoogleClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    hasGoogleRefreshToken: !!process.env.GOOGLE_REFRESH_TOKEN,
    hasGoogleCalendarId: !!process.env.GOOGLE_CALENDAR_ID,
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary (not set)',
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  };

  return NextResponse.json({
    success: true,
    config,
    message: 'Configuration check complete',
  });
}
