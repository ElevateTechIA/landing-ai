import { NextRequest, NextResponse } from 'next/server';
import { scheduleMeeting, ScheduleMeetingParams } from '@/lib/schedule-meeting';

export async function POST(request: NextRequest) {
  try {
    const data: ScheduleMeetingParams = await request.json();

    // Call the shared scheduling function
    const result = await scheduleMeeting(data);

    if (result.success) {
      return NextResponse.json({
        success: true,
        zoomLink: result.zoomLink,
        zoomId: result.zoomId,
        meetingId: result.meetingId,
        googleEventId: result.googleEventId,
        startTime: result.startTime,
        message: result.message
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          details: result.details
        },
        { status: result.error?.includes('required') ? 400 : 500 }
      );
    }
  } catch (error) {
    console.error('[SCHEDULE_API] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al agendar la reunión. Por favor intenta nuevamente.'
      },
      { status: 500 }
    );
  }
}
