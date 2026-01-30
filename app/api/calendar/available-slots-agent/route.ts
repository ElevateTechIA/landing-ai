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
    const language = (searchParams.get('language') || 'en') as 'en' | 'es';
    const timeRange = (searchParams.get('timeRange') as 'morning' | 'afternoon' | 'evening' | undefined) || undefined;

    const calendarId = (process.env.GOOGLE_CALENDAR_ID || 'primary').trim();

    console.log('[AVAILABLE_SLOTS_AGENT] Request received:', {
      desiredDate,
      count,
      language,
      timeRange,
      calendarId: calendarId === 'primary' ? 'primary (default)' : calendarId,
      calendarIdLength: calendarId.length,
      calendarIdHex: Buffer.from(calendarId).toString('hex'),
      hasGoogleCreds: !!process.env.GOOGLE_CLIENT_ID,
    });

    // Business hours configuration
    const BUSINESS_START_HOUR = 8;
    const BUSINESS_END_HOUR = 18; // 6 PM
    const MEETING_DURATION_MINUTES = 30;

    // Helper function to get time range based on timeRange parameter
    const getTimeRangeHours = (range?: string): { startHour: number; endHour: number } => {
      switch (range) {
        case 'morning':
          return { startHour: 8, endHour: 12 };
        case 'afternoon':
          return { startHour: 12, endHour: 18 };
        case 'evening':
          return { startHour: 16, endHour: 18 };
        default:
          return { startHour: BUSINESS_START_HOUR, endHour: BUSINESS_END_HOUR };
      }
    };

    const { startHour, endHour } = getTimeRangeHours(timeRange);

    // Get current time (UTC)
    const now = new Date();

    // Get current date/time in Eastern Time using Intl
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const etParts = formatter.formatToParts(now);
    const currentETYear = parseInt(etParts.find(p => p.type === 'year')!.value);
    const currentETMonth = parseInt(etParts.find(p => p.type === 'month')!.value);
    const currentETDay = parseInt(etParts.find(p => p.type === 'day')!.value);
    const currentETHour = parseInt(etParts.find(p => p.type === 'hour')!.value);
    const currentETMinute = parseInt(etParts.find(p => p.type === 'minute')!.value);

    // Determine starting date in ET
    let startYear = currentETYear;
    let startMonth = currentETMonth;
    let startDay = currentETDay;

    if (desiredDate) {
      // Parse the desired date (YYYY-MM-DD format)
      const match = desiredDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (match) {
        startYear = parseInt(match[1]);
        startMonth = parseInt(match[2]);
        startDay = parseInt(match[3]);
      }
    }

    // Check if start date is before today (in ET)
    const startDateForComparison = `${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`;
    const todayForComparison = `${currentETYear}-${String(currentETMonth).padStart(2, '0')}-${String(currentETDay).padStart(2, '0')}`;

    if (startDateForComparison < todayForComparison) {
      // Start from today instead
      startYear = currentETYear;
      startMonth = currentETMonth;
      startDay = currentETDay;
    }

    const availableSlots: Array<{
      date: string;
      time: string;
      datetime: string;
      dayOfWeek: string;
    }> = [];

    let daysChecked = 0;
    const maxDaysToCheck = 14; // Check up to 2 weeks ahead

    // Use a Date object just for date math (adding days)
    let candidateDate = new Date(`${startYear}-${String(startMonth).padStart(2, '0')}-${String(startDay).padStart(2, '0')}T12:00:00-05:00`);

    // Find available slots
    while (availableSlots.length < count && daysChecked < maxDaysToCheck) {
      // Skip weekends
      const dayOfWeek = candidateDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        candidateDate = new Date(candidateDate.getTime() + (24 * 60 * 60 * 1000));
        daysChecked++;
        continue;
      }

      // Check each 30-minute slot
      // Extract date components in Eastern Time (not server timezone)
      const etDateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const etDateParts = etDateFormatter.formatToParts(candidateDate);
      const year = etDateParts.find(p => p.type === 'year')!.value;
      const month = etDateParts.find(p => p.type === 'month')!.value;
      const day = etDateParts.find(p => p.type === 'day')!.value;

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          if (availableSlots.length >= count) break;

          const hourStr = String(hour).padStart(2, '0');
          const minuteStr = String(minute).padStart(2, '0');

          // Create ISO string with ET offset: YYYY-MM-DDTHH:mm:ss-05:00
          const slotStartISO = `${year}-${month}-${day}T${hourStr}:${minuteStr}:00-05:00`;
          const slotStart = new Date(slotStartISO);

          const slotEnd = new Date(slotStart.getTime() + (MEETING_DURATION_MINUTES * 60 * 1000));

          // Check if slot end is within business hours (using Eastern Time)
          const slotEndETFormatter = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/New_York',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
          const slotEndETParts = slotEndETFormatter.formatToParts(slotEnd);
          const slotEndETHour = parseInt(slotEndETParts.find(p => p.type === 'hour')!.value);
          const slotEndETMinute = parseInt(slotEndETParts.find(p => p.type === 'minute')!.value);

          if (slotEndETHour > BUSINESS_END_HOUR ||
              (slotEndETHour === BUSINESS_END_HOUR && slotEndETMinute > 0)) {
            continue;
          }

          // Skip slots in the past (compare UTC times directly)
          if (slotStart <= now) {
            continue;
          }

          // Check availability in Google Calendar
          try {
            const isAvailable = await checkAvailability(slotStart, slotEnd, calendarId);

            console.log('[AVAILABLE_SLOTS_AGENT] Slot check:', {
              slot: slotStart.toISOString(),
              slotET: slotStart.toLocaleString('en-US', { timeZone: 'America/New_York' }),
              isAvailable,
              calendarId,
            });

            if (isAvailable) {
              // Format the slot for the agent
              const dayNames = language === 'es'
                ? ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
                : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
              const monthNames = language === 'es'
                ? ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
                : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

              const timeString = slotStart.toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', {
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
            console.error('[AVAILABLE_SLOTS_AGENT] Error checking availability for slot:', {
              slot: slotStart.toISOString(),
              slotET: slotStart.toLocaleString('en-US', { timeZone: 'America/New_York' }),
              calendarId,
              error: error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined,
            });
            // If there's an error checking calendar, assume slot is available
            // This prevents the entire system from failing if calendar API has issues
            const dayNames = language === 'es'
              ? ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
              : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const monthNames = language === 'es'
              ? ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
              : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

            const timeString = slotStart.toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', {
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

      // Move to next day (add 24 hours to handle month/year rollover automatically)
      candidateDate = new Date(candidateDate.getTime() + (24 * 60 * 60 * 1000));
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

    // Sort slots chronologically from earliest to latest
    availableSlots.sort((a, b) => {
      const dateA = new Date(a.datetime).getTime();
      const dateB = new Date(b.datetime).getTime();
      return dateA - dateB;
    });

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

    // Check if it's a credentials error
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isCredentialsError = errorMessage.includes('Missing required Google Calendar environment variables');

    return NextResponse.json(
      {
        success: false,
        error: isCredentialsError
          ? 'Google Calendar integration not configured'
          : 'Failed to fetch available slots',
        details: errorMessage,
        slots: [],
        count: 0
      },
      { status: isCredentialsError ? 503 : 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
