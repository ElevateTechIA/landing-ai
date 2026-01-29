import { NextRequest, NextResponse } from 'next/server';
import { checkAvailability } from '@/lib/google-calendar';

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
    const desiredDate = searchParams.get('date'); // Optional: YYYY-MM-DD format
    const countParam = searchParams.get('count') || '5';
    const count = parseInt(countParam, 10);

    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    console.log('[AVAILABLE_SLOTS_AGENT] Request received:', {
      desiredDate,
      count,
      calendarId: calendarId === 'primary' ? 'primary (default)' : calendarId,
      hasGoogleCreds: !!process.env.GOOGLE_CLIENT_ID,
    });

    // Business hours configuration
    const BUSINESS_START_HOUR = 8;
    const BUSINESS_END_HOUR = 18; // 6 PM
    const MEETING_DURATION_MINUTES = 30;

    // Determine starting date
    let startDate = new Date();
    if (desiredDate) {
      const parsed = new Date(desiredDate);
      if (!isNaN(parsed.getTime())) {
        startDate = parsed;
      }
    }

    // If the desired date is in the past, start from tomorrow
    const now = new Date();
    if (startDate < now) {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() + 1);
    }

    // Set to business start hour
    startDate.setHours(BUSINESS_START_HOUR, 0, 0, 0);

    const availableSlots: Array<{
      date: string;
      time: string;
      datetime: string;
      dayOfWeek: string;
    }> = [];

    let daysChecked = 0;
    const maxDaysToCheck = 14; // Check up to 2 weeks ahead
    let candidateDate = new Date(startDate);

    // Find available slots
    while (availableSlots.length < count && daysChecked < maxDaysToCheck) {
      // Skip weekends
      const dayOfWeek = candidateDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        candidateDate.setDate(candidateDate.getDate() + 1);
        candidateDate.setHours(BUSINESS_START_HOUR, 0, 0, 0);
        daysChecked++;
        continue;
      }

      // Check each 30-minute slot
      for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (availableSlots.length >= count) break;

          const slotStart = new Date(candidateDate);
          slotStart.setHours(hour, minute, 0, 0);

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + MEETING_DURATION_MINUTES);

          // Check if slot end is within business hours
          if (slotEnd.getHours() > BUSINESS_END_HOUR ||
              (slotEnd.getHours() === BUSINESS_END_HOUR && slotEnd.getMinutes() > 0)) {
            continue;
          }

          // Skip slots in the past
          if (slotStart < now) {
            continue;
          }

          // Check availability in Google Calendar
          try {
            const isAvailable = await checkAvailability(slotStart, slotEnd, calendarId);

            console.log('[AVAILABLE_SLOTS_AGENT] Slot check:', {
              slot: slotStart.toISOString(),
              isAvailable,
            });

            if (isAvailable) {
              // Format the slot for the agent
              const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                  'July', 'August', 'September', 'October', 'November', 'December'];

              const timeString = slotStart.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'America/New_York'
              });

              const dateString = `${monthNames[slotStart.getMonth()]} ${slotStart.getDate()}`;

              availableSlots.push({
                date: dateString,
                time: timeString,
                datetime: slotStart.toISOString(),
                dayOfWeek: dayNames[slotStart.getDay()]
              });
            }
          } catch (error) {
            console.error('[AVAILABLE_SLOTS_AGENT] Error checking availability for slot:', slotStart.toISOString(), error);
            // If there's an error checking calendar, assume slot is available
            // This prevents the entire system from failing if calendar API has issues
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                'July', 'August', 'September', 'October', 'November', 'December'];

            const timeString = slotStart.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
              timeZone: 'America/New_York'
            });

            const dateString = `${monthNames[slotStart.getMonth()]} ${slotStart.getDate()}`;

            availableSlots.push({
              date: dateString,
              time: timeString,
              datetime: slotStart.toISOString(),
              dayOfWeek: dayNames[slotStart.getDay()]
            });
          }
        }
        if (availableSlots.length >= count) break;
      }

      // Move to next day
      candidateDate.setDate(candidateDate.getDate() + 1);
      candidateDate.setHours(BUSINESS_START_HOUR, 0, 0, 0);
      daysChecked++;
    }

    console.log('[AVAILABLE_SLOTS_AGENT] Found slots:', availableSlots.length);

    // Format response for the agent
    if (availableSlots.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No available slots found in the next 2 weeks',
        slots: [],
        count: 0
      });
    }

    // Create a natural language summary for the agent
    const slotDescriptions = availableSlots.map((slot, index) =>
      `${index + 1}. ${slot.dayOfWeek}, ${slot.date} at ${slot.time}`
    ).join('; ');

    return NextResponse.json({
      success: true,
      message: `Found ${availableSlots.length} available slot(s)`,
      summary: slotDescriptions,
      slots: availableSlots,
      count: availableSlots.length
    });

  } catch (error) {
    console.error('[AVAILABLE_SLOTS_AGENT] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch available slots',
        details: error instanceof Error ? error.message : String(error),
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
