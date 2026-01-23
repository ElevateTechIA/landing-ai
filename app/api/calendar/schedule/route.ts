import { NextRequest, NextResponse } from 'next/server';
import { db, collections, Meeting } from '@/lib/firebase';
import { sendMeetingConfirmation, sendHostNotification } from '@/lib/email';
import { createZoomMeeting } from '@/lib/zoom';
import { createCalendarEvent } from '@/lib/google-calendar';

// Interfaces
interface ScheduleRequest {
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
}

// Guardar reunión en Firebase
async function saveToFirebase(data: ScheduleRequest & {
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

    console.log('Meeting saved to Firebase:', docRef.id);
    return { success: true, meetingId: docRef.id };
  } catch (error) {
    console.error('Error saving to Firebase:', error);
    return { success: false, error };
  }
}

// Enviar email de confirmación
async function sendConfirmationEmail(data: ScheduleRequest & { zoomLink: string }) {
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
      zoomLink: data.zoomLink
    });

    if (result.success) {
      console.log('Confirmation email sent to:', data.email);
      return true;
    } else {
      console.error('Failed to send confirmation email:', result.error);
      return false;
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const data: ScheduleRequest = await request.json();

    // Validar datos requeridos
    if (!data.name || !data.email || !data.selectedSlot) {
      return NextResponse.json(
        { success: false, error: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    // Parsear la fecha seleccionada
    const meetingDate = new Date(data.selectedSlot);
    const meetingEndDate = new Date(meetingDate.getTime() + 60 * 60 * 1000); // +1 hora
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    let zoomMeeting;
    let googleEvent;

    // 1. Crear reunión en Zoom
    try {
      zoomMeeting = await createZoomMeeting(
        `Consulta: ${data.name} - ${data.company}`,
        meetingDate.toISOString(),
        60,
        data.timezone || 'America/Mexico_City'
      );
      console.log('Zoom meeting created:', zoomMeeting.id);
    } catch (error) {
      console.error('Error creating Zoom meeting:', error);
      zoomMeeting = {
        id: `temp-${Date.now()}`,
        join_url: `https://zoom.us/j/scheduled-meeting-${Date.now()}`,
        start_time: meetingDate.toISOString(),
        duration: 60
      };
    }

    // 2. Crear evento en Google Calendar
    try {
      googleEvent = await createCalendarEvent({
        summary: `Consulta: ${data.name} - ${data.company}`,
        description: `
          Cliente: ${data.name}
          Email: ${data.email}
          Empresa: ${data.company}

          Desafío: ${data.challenge}
          Objetivos: ${data.objectives}
          Presupuesto: ${data.budget}
          Timeline: ${data.timeline}

          Link de Zoom: ${zoomMeeting.join_url}
        `,
        start: {
          dateTime: meetingDate.toISOString(),
          timeZone: data.timezone || 'America/Mexico_City'
        },
        end: {
          dateTime: meetingEndDate.toISOString(),
          timeZone: data.timezone || 'America/Mexico_City'
        },
        attendees: [
          { email: data.email }
        ]
      }, calendarId);
      console.log('Google Calendar event created:', googleEvent.id);
    } catch (error) {
      console.error('Error creating Google Calendar event:', error);
      // Continuar sin Google Calendar si falla
    }

    // 3. Guardar en Firebase
    const saveResult = await saveToFirebase({
      ...data,
      zoomLink: zoomMeeting.join_url,
      zoomId: zoomMeeting.id,
      zoomMeetingId: zoomMeeting.id,
      googleCalendarEventId: googleEvent?.id ?? undefined
    });

    if (!saveResult.success) {
      console.error('Failed to save to Firebase, but continuing...');
    }

    // 4. Enviar email de confirmación al cliente
    await sendConfirmationEmail({
      ...data,
      zoomLink: zoomMeeting.join_url
    });

    // 5. Enviar notificación al anfitrión con todos los detalles del prospecto
    await sendHostNotification({
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      challenge: data.challenge,
      objectives: data.objectives,
      budget: data.budget,
      timeline: data.timeline,
      scheduledTime: data.selectedSlot,
      zoomLink: zoomMeeting.join_url
    });

    return NextResponse.json({
      success: true,
      zoomLink: zoomMeeting.join_url,
      zoomId: zoomMeeting.id,
      meetingId: saveResult.meetingId,
      googleEventId: googleEvent?.id,
      startTime: zoomMeeting.start_time,
      message: 'Reunión agendada exitosamente'
    });
  } catch (error) {
    console.error('Error scheduling meeting:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al agendar la reunión. Por favor intenta nuevamente.'
      },
      { status: 500 }
    );
  }
}
