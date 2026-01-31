import { NextRequest, NextResponse } from 'next/server';
import { sendHostNotification } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { name, phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    console.log('[REQUEST_CALL] New call request:', { name, phone });

    // Send notification email to the host
    await sendHostNotification({
      name: name || 'Not provided',
      email: 'Not provided',
      phone: phone,
      company: 'Not provided',
      challenge: 'Callback request - User requested to be called',
      objectives: '',
      budget: '',
      timeline: '',
      scheduledTime: new Date().toISOString(),
      zoomLink: 'N/A - Callback request',
      language: 'en',
    });

    console.log('[REQUEST_CALL] Notification email sent to host');

    return NextResponse.json({
      success: true,
      message: 'Call request received successfully',
    });
  } catch (error) {
    console.error('[REQUEST_CALL] Error processing call request:', error);
    return NextResponse.json(
      { error: 'Failed to process call request' },
      { status: 500 }
    );
  }
}
