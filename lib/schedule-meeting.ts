import { db, collections, Meeting } from './firebase';
import { sendMeetingConfirmation, sendHostNotification } from './email';
import { createZoomMeeting } from './zoom';
import { createCalendarEvent } from './google-calendar';

// Interfaces
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string | Date;
}

export interface ScheduleMeetingParams {
  name: string;
  email: string;
  phone: string;
  company: string;
  challenge: string;
  objectives: string;
  expectations: string;
  budget: string;
  timeline: string;
  selectedSlot: string;
  timezone: string;
  language?: 'en' | 'es';
  messages?: ChatMessage[];
}

export interface ScheduleMeetingResult {
  success: boolean;
  zoomLink?: string;
  zoomId?: string;
  meetingId?: string;
  googleEventId?: string;
  startTime?: string;
  message?: string;
  error?: string;
  details?: string;
}

// Guardar reunión en Firebase
async function saveToFirebase(data: ScheduleMeetingParams & {
  zoomLink: string;
  zoomId: string;
  zoomMeetingId?: string;
  googleCalendarEventId?: string;
}) {
  try {
    const meetingData: Omit<Meeting, 'id'> = {
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      challenge: data.challenge,
      objectives: data.objectives,
      expectations: data.expectations,
      budget: data.budget,
      timeline: data.timeline,
      scheduledTime: data.selectedSlot,
      zoomLink: data.zoomLink,
      zoomId: data.zoomId,
      status: 'scheduled',
      reminderSent: false,
      attended: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Only add optional fields if they have values (Firestore doesn't accept undefined)
    if (data.zoomMeetingId) {
      meetingData.zoomMeetingId = data.zoomMeetingId;
    }
    if (data.googleCalendarEventId) {
      meetingData.googleCalendarEventId = data.googleCalendarEventId;
    }

    const docRef = await db.collection(collections.meetings).add(meetingData);

    console.log('[SCHEDULE_MEETING] Meeting saved to Firebase:', docRef.id);
    return { success: true, meetingId: docRef.id };
  } catch (error) {
    console.error('[SCHEDULE_MEETING] Error saving to Firebase:', error);
    return { success: false, error };
  }
}

// Enviar email de confirmación
async function sendConfirmationEmail(data: ScheduleMeetingParams & { zoomLink: string }) {
  try {
    const result = await sendMeetingConfirmation({
      to: data.email,
      name: data.name,
      company: data.company,
      challenge: data.challenge,
      objectives: data.objectives,
      budget: data.budget,
      timeline: data.timeline,
      scheduledTime: data.selectedSlot,
      zoomLink: data.zoomLink,
      language: data.language || 'en',
      messages: data.messages || [],
      phone: data.phone
    });

    if (result.success) {
      console.log('[SCHEDULE_MEETING] Confirmation email sent to:', data.email);
      return true;
    } else {
      console.error('[SCHEDULE_MEETING] Failed to send confirmation email:', result.error);
      return false;
    }
  } catch (error) {
    console.error('[SCHEDULE_MEETING] Error sending email:', error);
    return false;
  }
}

/**
 * Schedule a meeting with Zoom, Google Calendar, Firebase, and email notifications
 * This function can be called directly without HTTP requests
 */
export async function scheduleMeeting(params: ScheduleMeetingParams): Promise<ScheduleMeetingResult> {
  try {
    console.log('[SCHEDULE_MEETING] Request:', {
      name: params.name,
      email: params.email,
      company: params.company,
      selectedSlot: params.selectedSlot,
      language: params.language
    });

    // Validar datos requeridos
    if (!params.name || !params.email || !params.selectedSlot) {
      return {
        success: false,
        error: 'Missing required data',
        details: 'name, email, and selectedSlot are required'
      };
    }

    // Parsear la fecha seleccionada
    const meetingDate = new Date(params.selectedSlot);
    const meetingEndDate = new Date(meetingDate.getTime() + 30 * 60 * 1000); // +30 minutos
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    let zoomMeeting;
    let googleEvent;

    // 1. Crear reunión en Zoom
    try {
      zoomMeeting = await createZoomMeeting(
        `Consulta: ${params.name} - ${params.company}`,
        meetingDate.toISOString(),
        30,
        params.timezone || 'America/Mexico_City'
      );
      console.log('[SCHEDULE_MEETING] Zoom meeting created:', zoomMeeting.id);
    } catch (error) {
      console.error('[SCHEDULE_MEETING] Error creating Zoom meeting:', error);
      zoomMeeting = {
        id: `temp-${Date.now()}`,
        join_url: `https://zoom.us/j/scheduled-meeting-${Date.now()}`,
        start_time: meetingDate.toISOString(),
        duration: 30
      };
    }

    // 2. Crear evento en Google Calendar
    try {
      googleEvent = await createCalendarEvent({
        summary: `Consulta: ${params.name} - ${params.company}`,
        description: `
          Cliente: ${params.name}
          Email: ${params.email}
          Empresa: ${params.company}

          Desafío: ${params.challenge}
          Objetivos: ${params.objectives}
          Presupuesto: ${params.budget}
          Timeline: ${params.timeline}

          Link de Zoom: ${zoomMeeting.join_url}
        `,
        start: {
          dateTime: meetingDate.toISOString(),
          timeZone: params.timezone || 'America/Mexico_City'
        },
        end: {
          dateTime: meetingEndDate.toISOString(),
          timeZone: params.timezone || 'America/Mexico_City'
        },
        attendees: [
          { email: params.email }
        ]
      }, calendarId);
      console.log('[SCHEDULE_MEETING] Google Calendar event created:', googleEvent.id);
    } catch (error) {
      console.error('[SCHEDULE_MEETING] Error creating Google Calendar event:', error);
      // Continuar sin Google Calendar si falla
    }

    // 3. Guardar en Firebase
    const saveResult = await saveToFirebase({
      ...params,
      zoomLink: zoomMeeting.join_url,
      zoomId: zoomMeeting.id,
      zoomMeetingId: zoomMeeting.id,
      googleCalendarEventId: googleEvent?.id ?? undefined
    });

    if (!saveResult.success) {
      console.error('[SCHEDULE_MEETING] Failed to save to Firebase, but continuing...');
    }

    // 4. Enviar email de confirmación al cliente
    await sendConfirmationEmail({
      ...params,
      zoomLink: zoomMeeting.join_url,
      language: params.language || 'es'
    });

    // 5. Enviar notificación al anfitrión con todos los detalles del prospecto
    await sendHostNotification({
      name: params.name,
      email: params.email,
      phone: params.phone,
      company: params.company,
      challenge: params.challenge,
      objectives: params.objectives,
      budget: params.budget,
      timeline: params.timeline,
      scheduledTime: params.selectedSlot,
      zoomLink: zoomMeeting.join_url,
      language: params.language || 'es',
      messages: params.messages || []
    });

    console.log('[SCHEDULE_MEETING] Success:', {
      zoomId: zoomMeeting.id,
      meetingId: saveResult.meetingId,
      googleEventId: googleEvent?.id
    });

    return {
      success: true,
      zoomLink: zoomMeeting.join_url,
      zoomId: zoomMeeting.id,
      meetingId: saveResult.meetingId,
      googleEventId: googleEvent?.id,
      startTime: zoomMeeting.start_time,
      message: 'Reunión agendada exitosamente'
    };

  } catch (error) {
    console.error('[SCHEDULE_MEETING] Error:', error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      error: 'Error al agendar la reunión. Por favor intenta nuevamente.',
      details: errorMessage
    };
  }
}
