import { google } from 'googleapis';

// Function to check if required environment variables are set
function checkGoogleCredentials() {
  const requiredVars = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
    GOOGLE_REFRESH_TOKEN: process.env.GOOGLE_REFRESH_TOKEN,
  };

  const missing = Object.entries(requiredVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required Google Calendar environment variables: ${missing.join(', ')}. ` +
      `Please configure these in your production environment.`
    );
  }

  return requiredVars;
}

// Lazy initialization - only create client when actually needed
let oauth2Client: any = null;
let calendar: any = null;

function getGoogleCalendar() {
  if (!calendar) {
    // Check credentials first
    const creds = checkGoogleCredentials();

    // Initialize OAuth2 client
    oauth2Client = new google.auth.OAuth2(
      creds.GOOGLE_CLIENT_ID,
      creds.GOOGLE_CLIENT_SECRET,
      creds.GOOGLE_REDIRECT_URI
    );

    // Set refresh token
    oauth2Client.setCredentials({
      refresh_token: creds.GOOGLE_REFRESH_TOKEN,
    });

    // Initialize Google Calendar API
    calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    console.log('[GOOGLE_CALENDAR] Successfully initialized with credentials');
  }

  return calendar;
}

export interface CalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: Array<{ email: string }>;
  conferenceData?: {
    createRequest: {
      requestId: string;
      conferenceSolutionKey: {
        type: string;
      };
    };
  };
}

/**
 * Obtener eventos del calendario en un rango de fechas
 */
export async function getCalendarEvents(
  timeMin: Date,
  timeMax: Date,
  calendarId: string = 'primary'
) {
  try {
    const cal = getGoogleCalendar();
    const response = await cal.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

/**
 * Crear evento en Google Calendar
 */
export async function createCalendarEvent(
  event: CalendarEvent,
  calendarId: string = 'primary'
) {
  try {
    const cal = getGoogleCalendar();
    const response = await cal.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

/**
 * Actualizar evento en Google Calendar
 */
export async function updateCalendarEvent(
  eventId: string,
  event: Partial<CalendarEvent>,
  calendarId: string = 'primary'
) {
  try {
    const cal = getGoogleCalendar();
    const response = await cal.events.patch({
      calendarId,
      eventId,
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

/**
 * Eliminar evento de Google Calendar
 */
export async function deleteCalendarEvent(
  eventId: string,
  calendarId: string = 'primary'
) {
  try {
    const cal = getGoogleCalendar();
    await cal.events.delete({
      calendarId,
      eventId,
    });

    return { success: true };
  } catch (error) {
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

/**
 * Verificar disponibilidad en un rango de tiempo
 */
export async function checkAvailability(
  startTime: Date,
  endTime: Date,
  calendarId: string = 'primary'
): Promise<boolean> {
  try {
    console.log('[checkAvailability] Querying calendar:', {
      calendarId,
      timeMin: startTime.toISOString(),
      timeMax: endTime.toISOString(),
    });

    const cal = getGoogleCalendar();
    const response = await cal.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    console.log('[checkAvailability] Response:', {
      calendarId,
      calendars: Object.keys(response.data.calendars || {}),
      hasCalendarData: !!response.data.calendars?.[calendarId],
    });

    const busy = response.data.calendars?.[calendarId]?.busy || [];
    const isAvailable = busy.length === 0;

    console.log('[checkAvailability] Result:', {
      calendarId,
      busySlots: busy.length,
      isAvailable,
      busyPeriods: busy.map((b: { start?: string; end?: string }) => ({ start: b.start, end: b.end })),
    });

    return isAvailable;
  } catch (error) {
    console.error('[checkAvailability] Error:', {
      calendarId,
      error: error instanceof Error ? error.message : String(error),
      errorDetails: error,
    });
    throw error;
  }
}
