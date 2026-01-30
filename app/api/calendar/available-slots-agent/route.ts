import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots } from '@/lib/available-slots';

/**
 * API Endpoint for ElevenLabs Agent: Get Available Calendar Slots
 * GET /api/calendar/available-slots-agent?date=YYYY-MM-DD&count=5
 *
 * This endpoint is called by the ElevenLabs voice agent to get available appointment slots
 * in real-time during the conversation.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const desiredDate = searchParams.get('date') || undefined; // Optional: YYYY-MM-DD format
    const countParam = searchParams.get('count') || '5';
    const count = parseInt(countParam, 10);
    const language = (searchParams.get('language') || 'en') as 'en' | 'es';
    const timeRange = searchParams.get('timeRange') as 'morning' | 'afternoon' | 'evening' | undefined;

    console.log('[AVAILABLE_SLOTS_AGENT] Request received:', {
      desiredDate,
      count,
      language,
      timeRange,
    });

    // Call the shared function to get available slots
    const result = await getAvailableSlots({
      desiredDate,
      count,
      language,
      timeRange
    });

    console.log('[AVAILABLE_SLOTS_AGENT] Result:', {
      success: result.success,
      slotsFound: result.slots.length
    });

    // Return the result
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        summary: result.summary,
        slots: result.slots,
        count: result.count
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          details: result.details,
          slots: [],
          count: 0
        },
        { status: result.error?.includes('not configured') ? 503 : 500 }
      );
    }

  } catch (error) {
    console.error('[AVAILABLE_SLOTS_AGENT] Unexpected error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch available slots',
        details: errorMessage,
        slots: [],
        count: 0
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
