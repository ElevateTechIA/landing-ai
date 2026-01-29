import { google } from 'googleapis';

// Inicializar OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Set refresh token
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

// Inicializar Google Calendar API
const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

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
    const response = await calendar.events.list({
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
    const response = await calendar.events.insert({
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
    const response = await calendar.events.patch({
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
    await calendar.events.delete({
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
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busy = response.data.calendars?.[calendarId]?.busy || [];
    return busy.length === 0; // true si está disponible
  } catch (error) {
    console.error('Error checking availability:', error);
    throw error;
  }
}
