import { NextRequest, NextResponse } from 'next/server';
import { sendVoiceChatTranscriptEmail } from '@/lib/email';
import { createZoomMeeting } from '@/lib/zoom';
import { createCalendarEvent, checkAvailability } from '@/lib/google-calendar';

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
    // Input: 2026-01-30T22:00:00-05:00 means 10 PM Eastern Time
    const meetingDate = new Date(meetingDateTime);

    // Use RFC3339 format WITH timezone offset for Google Calendar
    // Ensure format is: YYYY-MM-DDTHH:mm:ss-05:00 (no milliseconds)
    const meetingDateTimeWithOffset = meetingDateTime.replace(/\.\d{3}/, ''); // Remove milliseconds if present

    console.log('[TEST_EMAIL] Parsed meeting date:', {
      input: meetingDateTime,
      meetingDateTimeWithOffset,
      parsedDate: meetingDate.toISOString(),
      displayTime: meetingDate.toLocaleString('en-US', { timeZone: 'America/New_York' }),
    });

    // Validate business hours (8 AM - 6 PM Eastern Time)
    const BUSINESS_START_HOUR = 8;
    const BUSINESS_END_HOUR = 18; // 6 PM
    const MEETING_DURATION_MINUTES = 30;

    // Get the hour in Eastern Time
    const etFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const etParts = etFormatter.formatToParts(meetingDate);
    const etHour = parseInt(etParts.find(p => p.type === 'hour')!.value);
    const etMinute = parseInt(etParts.find(p => p.type === 'minute')!.value);

    // Check if start time is within business hours
    if (etHour < BUSINESS_START_HOUR || etHour >= BUSINESS_END_HOUR) {
      console.error('[TEST_EMAIL] Meeting time outside business hours:', {
        etHour,
        etMinute,
        businessHours: `${BUSINESS_START_HOUR}:00 - ${BUSINESS_END_HOUR}:00`
      });
      return NextResponse.json(
        {
          success: false,
          error: `El horario debe estar entre ${BUSINESS_START_HOUR}:00 AM y ${BUSINESS_END_HOUR === 18 ? '6:00 PM' : BUSINESS_END_HOUR + ':00'} Eastern Time`,
          message: `Selected time ${etHour}:${String(etMinute).padStart(2, '0')} is outside business hours`,
        },
        { status: 400 }
      );
    }

    // Check if meeting end time would be within business hours
    const meetingEndDate = new Date(meetingDate.getTime() + (MEETING_DURATION_MINUTES * 60 * 1000));
    const endEtParts = etFormatter.formatToParts(meetingEndDate);
    const endEtHour = parseInt(endEtParts.find(p => p.type === 'hour')!.value);
    const endEtMinute = parseInt(endEtParts.find(p => p.type === 'minute')!.value);

    if (endEtHour > BUSINESS_END_HOUR || (endEtHour === BUSINESS_END_HOUR && endEtMinute > 0)) {
      console.error('[TEST_EMAIL] Meeting would end outside business hours:', {
        endEtHour,
        endEtMinute,
        businessEndHour: BUSINESS_END_HOUR
      });
      return NextResponse.json(
        {
          success: false,
          error: `La reunión terminaría después de las ${BUSINESS_END_HOUR === 18 ? '6:00 PM' : BUSINESS_END_HOUR + ':00'}. Por favor selecciona un horario más temprano.`,
          message: `Meeting would end at ${endEtHour}:${String(endEtMinute).padStart(2, '0')}, which is outside business hours`,
        },
        { status: 400 }
      );
    }

    console.log('[TEST_EMAIL] Time validation passed:', {
      startTime: `${etHour}:${String(etMinute).padStart(2, '0')} ET`,
      endTime: `${endEtHour}:${String(endEtMinute).padStart(2, '0')} ET`,
      businessHours: `${BUSINESS_START_HOUR}:00 - ${BUSINESS_END_HOUR}:00 ET`
    });

    // Create Zoom meeting
    const meetingTopic = `Consulta de Voz - ${clientName}`;
    let zoomMeeting;
    try {
      zoomMeeting = await createZoomMeeting(
        meetingTopic,
        meetingDate.toISOString(),
        60,
        'America/New_York'
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
      // Extract timezone offset from meetingDateTimeWithOffset (e.g., "-05:00" for Eastern Time)
      const timezoneOffsetMatch = meetingDateTimeWithOffset.match(/([-+]\d{2}:\d{2})$/);
      const timezoneOffset = timezoneOffsetMatch ? timezoneOffsetMatch[1] : '';

      // Parse the meetingDateTimeWithOffset to get hours and minutes (without timezone)
      const [datePart, timePartWithOffset] = meetingDateTimeWithOffset.split('T');
      const timePart = timePartWithOffset.replace(/([-+]\d{2}:\d{2})$/, ''); // Remove offset for parsing
      const [hours, minutes, seconds] = timePart.split(':').map(Number);

      // Add 30 minutes
      const totalMinutes = hours * 60 + minutes + 30;
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;

      // Reconstruct end datetime WITH timezone offset
      const meetingEndDateTimeWithOffset = `${datePart}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${timezoneOffset}`;

      // Use the configured Google Calendar ID (elevatetechagency@gmail.com)
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      // CHECK AVAILABILITY FIRST
      const startDate = new Date(meetingDateTimeWithOffset);
      const endDate = new Date(meetingEndDateTimeWithOffset);

      console.log('[TEST_EMAIL] Checking availability:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        calendarId,
      });

      const isAvailable = await checkAvailability(startDate, endDate, calendarId);

      if (!isAvailable) {
        console.error('[TEST_EMAIL] Time slot is NOT available - conflict detected');
        return NextResponse.json(
          {
            success: false,
            error: 'El horario seleccionado ya está ocupado',
            message: 'This time slot is already taken. Please choose a different time.',
            conflictDetected: true,
          },
          { status: 409 } // 409 Conflict
        );
      }

      console.log('[TEST_EMAIL] Time slot is available, creating event...');

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
          dateTime: meetingDateTimeWithOffset, // Has timezone offset, no need for timeZone parameter
        },
        end: {
          dateTime: meetingEndDateTimeWithOffset, // Has timezone offset, no need for timeZone parameter
        },
        attendees: [{ email: clientEmail }],
      };

      const createdEvent = await createCalendarEvent(calendarEvent, calendarId);
      googleEventId = createdEvent.id;
      console.log('[TEST_EMAIL] Google Calendar event created:', googleEventId, 'in calendar:', calendarId);
    } catch (error) {
      console.error('[TEST_EMAIL] Calendar creation failed:', error);
      // Log the full error for debugging
      console.error('[TEST_EMAIL] Full calendar error:', JSON.stringify(error, null, 2));
    }

    // Determine email language (default to Spanish)
    const emailLanguage = 'es';
    const langLocale = 'es-US';

    // Format meeting time for display
    const formattedTime = meetingDate.toLocaleString(langLocale, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/New_York',
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
        language: emailLanguage,
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
        language: emailLanguage,
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
