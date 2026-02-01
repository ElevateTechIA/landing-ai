import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createZoomMeeting } from '@/lib/zoom';
import { createCalendarEvent, checkAvailability } from '@/lib/google-calendar';
import { saveMeeting } from '@/lib/firebase';
import { sendVoiceChatTranscriptEmail } from '@/lib/email';

interface Message {
  id: string;
  role: 'user' | 'agent';
  message: string;
  timestamp: string;
}

interface ExtractedInfo {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  purpose?: string;
  preferredDate?: string;
}

/**
 * API Endpoint: Process Voice Chat Conversation
 * Extracts information, creates meeting, and sends emails
 * POST /api/voice-chat/process-conversation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, conversationId } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No messages provided' },
        { status: 400 }
      );
    }

    console.log('[VOICE_CHAT_PROCESS] Processing conversation:', {
      conversationId,
      messageCount: messages.length,
    });

    // 1. Extract information from conversation using AI
    const extractedInfo = await extractInformationFromConversation(messages);
    console.log('[VOICE_CHAT_PROCESS] Extracted info:', extractedInfo);

    // 2. Get next available slot if no date provided
    let meetingDate: Date;
    if (extractedInfo.preferredDate) {
      meetingDate = new Date(extractedInfo.preferredDate);
    } else {
      meetingDate = await getNextAvailableSlot();
    }

    console.log('[VOICE_CHAT_PROCESS] Meeting date:', meetingDate.toISOString());

    // 3. Create Zoom meeting
    const meetingTopic = `Consulta de Voz - ${extractedInfo.name || 'Cliente'}`;
    let zoomMeeting;
    try {
      zoomMeeting = await createZoomMeeting(
        meetingTopic,
        meetingDate.toISOString(),
        60,
        'America/New_York'
      );
      console.log('[VOICE_CHAT_PROCESS] Zoom meeting created:', zoomMeeting.id);
    } catch (error) {
      console.error('[VOICE_CHAT_PROCESS] Zoom creation failed:', error);
      // Create fallback meeting object
      zoomMeeting = {
        id: `fallback_${Date.now()}`,
        join_url: 'https://zoom.us/j/placeholder',
        start_time: meetingDate.toISOString(),
      };
    }

    // 4. Create Google Calendar event
    let googleEventId;
    try {
      // Format datetime for Google Calendar API using RFC3339 format with timezone offset
      let meetingStartDateTime: string;
      let timezoneOffset: string;

      if (extractedInfo.preferredDate) {
        // If we have a preferred date with timezone (e.g., "2026-01-30T22:00:00-05:00")
        // Keep the datetime WITH the timezone offset, remove milliseconds if present
        meetingStartDateTime = extractedInfo.preferredDate.replace(/\.\d{3}/, '');

        // Extract timezone offset (e.g., "-05:00" for Eastern Time)
        const offsetMatch = meetingStartDateTime.match(/([-+]\d{2}:\d{2})$/);
        timezoneOffset = offsetMatch ? offsetMatch[1] : '-05:00'; // Default to Eastern Time offset
      } else {
        // Format the date object as ISO string and convert to Eastern timezone with offset
        // Eastern Time is UTC-5 in EST (winter) or UTC-4 in EDT (summer)
        const easternDate = new Date(meetingDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const year = easternDate.getFullYear();
        const month = String(easternDate.getMonth() + 1).padStart(2, '0');
        const day = String(easternDate.getDate()).padStart(2, '0');
        const hours = String(easternDate.getHours()).padStart(2, '0');
        const minutes = String(easternDate.getMinutes()).padStart(2, '0');
        const seconds = String(easternDate.getSeconds()).padStart(2, '0');

        timezoneOffset = '-05:00'; // Eastern Time standard offset
        meetingStartDateTime = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${timezoneOffset}`;
      }

      // Calculate end time (30 minutes later)
      // Parse the datetime without timezone offset
      const [datePart, timePartWithOffset] = meetingStartDateTime.split('T');
      const timePart = timePartWithOffset.replace(/([-+]\d{2}:\d{2})$/, ''); // Remove offset for parsing
      const [hours, minutes, seconds] = timePart.split(':').map(Number);

      const totalMinutes = hours * 60 + minutes + 30;
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;

      // Reconstruct end datetime WITH timezone offset
      const meetingEndDateTime = `${datePart}T${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}${timezoneOffset}`;

      const calendarEvent = {
        summary: meetingTopic,
        description: `
Conversación de Voz - Detalles del Prospecto

${extractedInfo.name ? `Nombre: ${extractedInfo.name}` : ''}
${extractedInfo.email ? `Email: ${extractedInfo.email}` : ''}
${extractedInfo.phone ? `Teléfono: ${extractedInfo.phone}` : ''}
${extractedInfo.company ? `Empresa: ${extractedInfo.company}` : ''}
${extractedInfo.purpose ? `Propósito: ${extractedInfo.purpose}` : ''}

Link de Zoom: ${zoomMeeting.join_url}

---
Conversation ID: ${conversationId}
        `.trim(),
        start: {
          dateTime: meetingStartDateTime, // RFC3339 with timezone offset
        },
        end: {
          dateTime: meetingEndDateTime, // RFC3339 with timezone offset
        },
        attendees: extractedInfo.email ? [{ email: extractedInfo.email }] : [],
      };

      // Use the configured Google Calendar ID (elevatetechagency@gmail.com)
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

      // CHECK AVAILABILITY FIRST
      const startDate = new Date(meetingStartDateTime);
      const endDate = new Date(meetingEndDateTime);

      console.log('[VOICE_CHAT_PROCESS] Checking availability:', {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        calendarId,
      });

      const isAvailable = await checkAvailability(startDate, endDate, calendarId);

      if (!isAvailable) {
        console.error('[VOICE_CHAT_PROCESS] Time slot is NOT available - conflict detected');
        // Don't fail the whole process, but log and continue without calendar event
        // The getNextAvailableSlot should have prevented this, but as a safety check
        console.warn('[VOICE_CHAT_PROCESS] Skipping calendar event creation due to conflict');
      } else {
        console.log('[VOICE_CHAT_PROCESS] Time slot is available, creating event...');
        console.log('[VOICE_CHAT_PROCESS] Creating calendar event:', JSON.stringify(calendarEvent, null, 2));

        const createdEvent = await createCalendarEvent(calendarEvent, calendarId);
        googleEventId = createdEvent.id;
        console.log('[VOICE_CHAT_PROCESS] Google Calendar event created successfully:', googleEventId, 'in calendar:', calendarId);
      }
    } catch (error) {
      console.error('[VOICE_CHAT_PROCESS] Calendar creation failed:', error);
      console.error('[VOICE_CHAT_PROCESS] Full calendar error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      if (error instanceof Error) {
        console.error('[VOICE_CHAT_PROCESS] Error message:', error.message);
        console.error('[VOICE_CHAT_PROCESS] Error stack:', error.stack);
      }
      // Continue without calendar event
    }

    // 5. Save to Firebase
    const meetingData = {
      name: extractedInfo.name || 'No proporcionado',
      email: extractedInfo.email || '',
      phone: extractedInfo.phone || '',
      company: extractedInfo.company || '',
      challenge: extractedInfo.purpose || '',
      objectives: extractedInfo.purpose || '',
      expectations: '',
      budget: 'No especificado',
      timeline: 'No especificado',
      scheduledTime: meetingDate.toISOString(),
      zoomLink: zoomMeeting.join_url,
      zoomId: zoomMeeting.id.toString(),
      zoomMeetingId: zoomMeeting.id.toString(),
      googleCalendarEventId: googleEventId || '',
      status: 'scheduled' as const,
      reminderSent: false,
      attended: false,
      source: 'voice_chat' as const,
      conversationId,
      transcript: messages,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let firebaseMeetingId;
    try {
      const saveResult = await saveMeeting(meetingData);
      firebaseMeetingId = saveResult.id;
      console.log('[VOICE_CHAT_PROCESS] Saved to Firebase:', firebaseMeetingId);
    } catch (error) {
      console.error('[VOICE_CHAT_PROCESS] Firebase save failed:', error);
      // Continue to send emails even if Firebase fails
    }

    // 6. Send emails
    const emailResults = {
      hostEmail: false,
      clientEmail: false,
    };

    // Determine language (default to Spanish)
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

    try {
      // Always send to host
      await sendVoiceChatTranscriptEmail({
        to: 'elevatetechagency@gmail.com',
        recipient: 'host',
        name: extractedInfo.name || 'Cliente sin nombre',
        email: extractedInfo.email || 'No proporcionado',
        phone: extractedInfo.phone || 'No proporcionado',
        company: extractedInfo.company || 'No especificada',
        purpose: extractedInfo.purpose || 'No especificado',
        scheduledTime: formattedTime,
        zoomLink: zoomMeeting.join_url,
        messages,
        conversationId,
        language: emailLanguage,
      });
      emailResults.hostEmail = true;
      console.log('[VOICE_CHAT_PROCESS] Host email sent');
    } catch (error) {
      console.error('[VOICE_CHAT_PROCESS] Host email failed:', error);
    }

    // Send to client if email is available
    if (extractedInfo.email) {
      console.log('[VOICE_CHAT_PROCESS] Sending email to client:', extractedInfo.email);
      try {
        await sendVoiceChatTranscriptEmail({
          to: extractedInfo.email,
          recipient: 'client',
          name: extractedInfo.name || 'Cliente',
          email: extractedInfo.email,
          phone: extractedInfo.phone || '',
          company: extractedInfo.company || '',
          purpose: extractedInfo.purpose || '',
          scheduledTime: formattedTime,
          zoomLink: zoomMeeting.join_url,
          messages,
          conversationId,
          language: emailLanguage,
        });
        emailResults.clientEmail = true;
        console.log('[VOICE_CHAT_PROCESS] Client email sent successfully');
      } catch (error) {
        console.error('[VOICE_CHAT_PROCESS] Client email failed:', error);
      }
    } else {
      console.warn('[VOICE_CHAT_PROCESS] No client email found, skipping client email');
      console.warn('[VOICE_CHAT_PROCESS] Extracted info:', JSON.stringify(extractedInfo, null, 2));
    }

    // 7. SMS/WhatsApp - TEMPORALMENTE DESHABILITADO
    // Razón: Requiere registro 10DLC en Twilio para enviar SMS en EE.UU.
    // TODO: Reactivar cuando se complete el registro 10DLC o toll-free verificado
    const smsSent = false;
    console.log('[VOICE_CHAT_PROCESS] SMS disabled - 10DLC registration pending');
    // if (extractedInfo.phone) {
    //   try {
    //     const { sendMeetingNotification } = await import('@/lib/twilio');
    //     const { saveSMSRecord } = await import('@/lib/firebase');
    //
    //     const smsResult = await sendMeetingNotification({
    //       to: extractedInfo.phone,
    //       name: extractedInfo.name || 'Cliente',
    //       scheduledTime: meetingDate.toISOString(),
    //       zoomLink: zoomMeeting.join_url,
    //       language: emailLanguage as 'en' | 'es'
    //     }, 'confirmation');
    //
    //     await saveSMSRecord({
    //       meetingId: firebaseMeetingId,
    //       phone: extractedInfo.phone,
    //       type: 'confirmation',
    //       channel: smsResult.channel || 'sms',
    //       status: smsResult.success ? 'sent' : 'failed',
    //       messageSid: smsResult.messageSid,
    //       error: smsResult.error,
    //       errorCode: smsResult.errorCode,
    //       language: emailLanguage as 'en' | 'es',
    //       sentAt: new Date(),
    //       createdAt: new Date()
    //     });
    //
    //     if (smsResult.success) {
    //       smsSent = true;
    //       console.log('[VOICE_CHAT_PROCESS] SMS/WhatsApp confirmation sent to:', extractedInfo.phone, 'via', smsResult.channel);
    //     } else {
    //       console.error('[VOICE_CHAT_PROCESS] SMS/WhatsApp confirmation failed:', smsResult.error);
    //     }
    //   } catch (smsError) {
    //     console.error('[VOICE_CHAT_PROCESS] Error sending SMS/WhatsApp:', smsError);
    //   }
    // }

    // 8. Return success response
    return NextResponse.json({
      success: true,
      message: 'Conversación procesada exitosamente',
      data: {
        extractedInfo,
        meetingDate: meetingDate.toISOString(),
        zoomLink: zoomMeeting.join_url,
        zoomId: zoomMeeting.id,
        googleEventId,
        firebaseMeetingId,
        emailsSent: emailResults,
        smsSent,
      },
    });
  } catch (error) {
    console.error('[VOICE_CHAT_PROCESS] Unexpected error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar la conversación',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Uses Gemini AI to extract structured information from conversation
 */
async function extractInformationFromConversation(
  messages: Message[]
): Promise<ExtractedInfo> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[VOICE_CHAT_PROCESS] No GEMINI_API_KEY, returning empty info');
    return {};
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Use gemini-2.5-flash which is currently available
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Format conversation for AI
  const conversationText = messages
    .map((msg) => `${msg.role === 'user' ? 'Cliente' : 'Agente'}: ${msg.message}`)
    .join('\n');

  // Get current date for relative date parsing
  const now = new Date();
  const currentDateInfo = `Fecha y hora actual: ${now.toISOString()} (${now.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })})`;

  const prompt = `Analiza CUIDADOSAMENTE la siguiente conversación de un chat de voz y extrae TODA la información del cliente que se mencione.

${currentDateInfo}

Conversación:
${conversationText}

INSTRUCCIONES CRÍTICAS:
1. Lee TODA la conversación palabra por palabra. La información puede estar en cualquier mensaje.
2. Extrae CADA dato que el cliente mencione sobre sí mismo, sin omitir nada.
3. Para el EMAIL: busca cuidadosamente cualquier correo electrónico que mencione el cliente. Puede estar escrito con letras (ej: "ce-sa-ar-ve-ga punto ce-o-el arroba gmail punto com" = cesarvega.col@gmail.com). DEBE contener @.
4. Para el NOMBRE: extrae el nombre completo exactamente como lo dice (ej: "mi nombre es César Vega", "soy César", etc.)
5. Para TELÉFONO: extrae el número completo incluyendo código de área
6. Para FECHAS Y HORAS:
   - HORARIO DE NEGOCIOS: Solo acepta citas entre 8:00 AM y 6:00 PM (Eastern Time)
   - Si el cliente solicita una hora fuera de este rango, sugiere la siguiente disponible dentro del horario
   - Si dice "mañana" = añade 1 día a la fecha actual
   - Si dice "10 pm", "10 de la noche", "diez de la noche" = 22:00 horas (FUERA DE HORARIO - no aceptar)
   - Si dice "10 am", "10 de la mañana", "diez de la mañana" = 10:00 horas (aceptable)
   - Si dice "3 pm", "3 de la tarde", "tres de la tarde" = 15:00 horas (aceptable)
   - Usa la zona horaria America/New_York (Eastern Time)
   - Formato ISO: YYYY-MM-DDTHH:mm:ss-05:00 (con offset de timezone)

Extrae la siguiente información:
- name: Nombre completo del cliente
- email: Email exactamente como se menciona (con @)
- phone: Número completo con código de área
- company: Empresa o proyecto si lo menciona
- purpose: Propósito detallado de la consulta
- preferredDate: Fecha y hora en formato ISO completo

REGLA DE ORO: Si el cliente dice algo sobre sí mismo, DEBES extraerlo. No omitas información.

Responde SOLO con un objeto JSON válido. No incluyas explicaciones, solo el JSON puro.

Ejemplo:
{
  "name": "César Vega",
  "email": "cesarvega.col@gmail.com",
  "phone": "305 322 0270",
  "company": "Mi Startup",
  "purpose": "Consultoría de desarrollo web",
  "preferredDate": "2026-01-30T14:00:00-05:00"
}`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();

    console.log('[VOICE_CHAT_PROCESS] Raw AI response:', response);

    // Extract JSON from response (remove markdown code blocks if present)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[VOICE_CHAT_PROCESS] No JSON found in AI response');
      console.warn('[VOICE_CHAT_PROCESS] Full response was:', response);
      return {};
    }

    const extractedInfo = JSON.parse(jsonMatch[0]);
    console.log('[VOICE_CHAT_PROCESS] Parsed extracted info:', JSON.stringify(extractedInfo, null, 2));
    return extractedInfo;
  } catch (error) {
    console.error('[VOICE_CHAT_PROCESS] Error extracting info with AI:', error);
    return {};
  }
}

/**
 * Gets the next available time slot between 8 AM - 6 PM
 * Checks host's Google Calendar for conflicts
 */
async function getNextAvailableSlot(): Promise<Date> {
  const now = new Date();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

  // Business hours: 8 AM to 6 PM Eastern Time
  const BUSINESS_START_HOUR = 8;
  const BUSINESS_END_HOUR = 18; // 6 PM
  const MEETING_DURATION_MINUTES = 30;

  // Start checking from tomorrow
  let candidateDate = new Date(now);
  candidateDate.setDate(candidateDate.getDate() + 1);
  candidateDate.setHours(BUSINESS_START_HOUR, 0, 0, 0);

  // Try to find available slot within next 30 days
  const maxDaysToCheck = 30;
  let daysChecked = 0;

  while (daysChecked < maxDaysToCheck) {
    // Skip weekends
    const dayOfWeek = candidateDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      candidateDate.setDate(candidateDate.getDate() + 1);
      candidateDate.setHours(BUSINESS_START_HOUR, 0, 0, 0);
      daysChecked++;
      continue;
    }

    // Check each hour from 8 AM to 5:30 PM (last slot ends at 6 PM)
    for (let hour = BUSINESS_START_HOUR; hour < BUSINESS_END_HOUR; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotStart = new Date(candidateDate);
        slotStart.setHours(hour, minute, 0, 0);

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + MEETING_DURATION_MINUTES);

        // Check if slot end is within business hours
        if (slotEnd.getHours() > BUSINESS_END_HOUR ||
            (slotEnd.getHours() === BUSINESS_END_HOUR && slotEnd.getMinutes() > 0)) {
          continue; // Skip this slot as it would end after business hours
        }

        // Check if slot is available in Google Calendar
        try {
          const isAvailable = await checkAvailability(slotStart, slotEnd, calendarId);
          if (isAvailable) {
            console.log('[GET_NEXT_SLOT] Found available slot:', slotStart.toISOString());
            return slotStart;
          }
        } catch (error) {
          console.error('[GET_NEXT_SLOT] Error checking availability:', error);
          // If there's an error checking calendar, return this slot anyway
          return slotStart;
        }
      }
    }

    // Move to next day
    candidateDate.setDate(candidateDate.getDate() + 1);
    candidateDate.setHours(BUSINESS_START_HOUR, 0, 0, 0);
    daysChecked++;
  }

  // Fallback: return tomorrow at 10 AM if no slot found
  const fallback = new Date(now);
  fallback.setDate(fallback.getDate() + 1);
  fallback.setHours(10, 0, 0, 0);
  console.log('[GET_NEXT_SLOT] No available slot found, using fallback:', fallback.toISOString());
  return fallback;
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
