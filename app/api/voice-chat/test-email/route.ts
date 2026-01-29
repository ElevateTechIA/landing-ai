import { NextRequest, NextResponse } from 'next/server';
import { sendVoiceChatTranscriptEmail } from '@/lib/email';
import { createZoomMeeting } from '@/lib/zoom';
import { createCalendarEvent } from '@/lib/google-calendar';

/**
 * API Endpoint: Test Voice Chat Email
 * Sends test emails with hardcoded data to verify functionality
 * POST /api/voice-chat/test-email
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      clientEmail,
      clientName,
      clientPhone,
      clientCompany,
      purpose,
      meetingDateTime, // ISO string
    } = body;

    console.log('[TEST_EMAIL] Testing with data:', {
      clientEmail,
      clientName,
      meetingDateTime,
    });

    // Parse meeting date
    // Input: 2026-01-30T22:00:00-06:00 means 10 PM Mexico time
    const meetingDate = new Date(meetingDateTime);

    // For Google Calendar API: strip the timezone offset from the input string
    // Google Calendar will interpret "2026-01-30T22:00:00" as 10 PM in the specified timeZone
    const mexicoDateTime = meetingDateTime.replace(/[-+]\d{2}:\d{2}$/, ''); // Remove -06:00

    console.log('[TEST_EMAIL] Parsed meeting date:', {
      input: meetingDateTime,
      mexicoDateTime,
      parsedDate: meetingDate.toISOString(),
      displayTime: meetingDate.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' }),
    });

    // Create Zoom meeting
    const meetingTopic = `Consulta de Voz - ${clientName}`;
    let zoomMeeting;
    try {
      zoomMeeting = await createZoomMeeting(
        meetingTopic,
        meetingDate.toISOString(),
        60,
        'America/Mexico_City'
      );
      console.log('[TEST_EMAIL] Zoom meeting created:', zoomMeeting.id);
    } catch (error) {
      console.error('[TEST_EMAIL] Zoom creation failed:', error);
      zoomMeeting = {
        id: `fallback_${Date.now()}`,
        join_url: 'https://zoom.us/j/placeholder',
        start_time: meetingDate.toISOString(),
      };
    }

    // Create Google Calendar event
    let googleEventId;
    try {
      // Calculate end time by adding 30 minutes to the start time string
      // Parse the mexicoDateTime to get hours and minutes
      const [datePart, timePart] = mexicoDateTime.split('T');
      const [hours, minutes, seconds] = timePart.split(':').map(Number);

      // Add 30 minutes
      const totalMinutes = hours * 60 + minutes + 30;
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;

      const mexicoEndDateTime = `${datePart}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      const calendarEvent = {
        summary: meetingTopic,
        description: `
Conversación de Voz - Detalles del Prospecto

Nombre: ${clientName}
Email: ${clientEmail}
Teléfono: ${clientPhone}
Empresa: ${clientCompany}
Propósito: ${purpose}

Link de Zoom: ${zoomMeeting.join_url}

---
TEST EMAIL
        `.trim(),
        start: {
          dateTime: mexicoDateTime,
          timeZone: 'America/Mexico_City',
        },
        end: {
          dateTime: mexicoEndDateTime,
          timeZone: 'America/Mexico_City',
        },
        attendees: [{ email: clientEmail }],
      };

      // Use the configured Google Calendar ID (elevatetechagency@gmail.com)
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      const createdEvent = await createCalendarEvent(calendarEvent, calendarId);
      googleEventId = createdEvent.id;
      console.log('[TEST_EMAIL] Google Calendar event created:', googleEventId, 'in calendar:', calendarId);
    } catch (error) {
      console.error('[TEST_EMAIL] Calendar creation failed:', error);
      // Log the full error for debugging
      console.error('[TEST_EMAIL] Full calendar error:', JSON.stringify(error, null, 2));
    }

    // Format meeting time for display
    const formattedTime = meetingDate.toLocaleString('es-MX', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Mexico_City',
    });

    // Create test messages for transcript
    const testMessages = [
      {
        id: '1',
        role: 'agent' as const,
        message: '¡Hola! Soy Andrea, tu asistente de Elevate AI. ¿En qué puedo ayudarte hoy?',
        timestamp: new Date(Date.now() - 300000).toISOString(),
      },
      {
        id: '2',
        role: 'user' as const,
        message: `Hola, mi nombre es ${clientName}. Me gustaría agendar una reunión.`,
        timestamp: new Date(Date.now() - 240000).toISOString(),
      },
      {
        id: '3',
        role: 'agent' as const,
        message: 'Perfecto, con gusto te ayudo. ¿Cuál es tu correo electrónico?',
        timestamp: new Date(Date.now() - 180000).toISOString(),
      },
      {
        id: '4',
        role: 'user' as const,
        message: `Mi correo es ${clientEmail}`,
        timestamp: new Date(Date.now() - 120000).toISOString(),
      },
      {
        id: '5',
        role: 'agent' as const,
        message: '¿Y tu número de teléfono?',
        timestamp: new Date(Date.now() - 60000).toISOString(),
      },
      {
        id: '6',
        role: 'user' as const,
        message: `Es ${clientPhone}`,
        timestamp: new Date().toISOString(),
      },
    ];

    // Send emails
    const emailResults = {
      hostEmail: false,
      clientEmail: false,
    };

    // Send to host
    try {
      await sendVoiceChatTranscriptEmail({
        to: 'elevatetechagency@gmail.com',
        recipient: 'host',
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        company: clientCompany,
        purpose: purpose,
        scheduledTime: formattedTime,
        zoomLink: zoomMeeting.join_url,
        messages: testMessages,
        conversationId: `test_${Date.now()}`,
      });
      emailResults.hostEmail = true;
      console.log('[TEST_EMAIL] Host email sent');
    } catch (error) {
      console.error('[TEST_EMAIL] Host email failed:', error);
    }

    // Send to client
    try {
      await sendVoiceChatTranscriptEmail({
        to: clientEmail,
        recipient: 'client',
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
        company: clientCompany,
        purpose: purpose,
        scheduledTime: formattedTime,
        zoomLink: zoomMeeting.join_url,
        messages: testMessages,
        conversationId: `test_${Date.now()}`,
      });
      emailResults.clientEmail = true;
      console.log('[TEST_EMAIL] Client email sent');
    } catch (error) {
      console.error('[TEST_EMAIL] Client email failed:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Emails de prueba enviados',
      data: {
        clientName,
        clientEmail,
        formattedTime,
        zoomLink: zoomMeeting.join_url,
        googleEventId,
        emailsSent: emailResults,
      },
    });
  } catch (error) {
    console.error('[TEST_EMAIL] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al enviar emails de prueba',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
