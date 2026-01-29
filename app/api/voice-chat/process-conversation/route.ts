import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createZoomMeeting } from '@/lib/zoom';
import { createCalendarEvent } from '@/lib/google-calendar';
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
        'America/Mexico_City'
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
      const endDate = new Date(meetingDate);
      endDate.setMinutes(endDate.getMinutes() + 30); // 30 minutes duration

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
          dateTime: meetingDate.toISOString(),
          timeZone: 'America/Mexico_City',
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: 'America/Mexico_City',
        },
        attendees: extractedInfo.email ? [{ email: extractedInfo.email }] : [],
      };

      console.log('[VOICE_CHAT_PROCESS] Creating calendar event:', JSON.stringify(calendarEvent, null, 2));
      // Use the configured Google Calendar ID (elevatetechagency@gmail.com)
      const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
      const createdEvent = await createCalendarEvent(calendarEvent, calendarId);
      googleEventId = createdEvent.id;
      console.log('[VOICE_CHAT_PROCESS] Google Calendar event created successfully:', googleEventId, 'in calendar:', calendarId);
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

    // 7. Return success response
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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
   - Si dice "mañana" = añade 1 día a la fecha actual
   - Si dice "10 pm", "10 de la noche", "diez de la noche" = 22:00 horas
   - Si dice "10 am", "10 de la mañana", "diez de la mañana" = 10:00 horas
   - Usa la zona horaria America/Mexico_City
   - Formato ISO: YYYY-MM-DDTHH:mm:ss.000Z

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
  "preferredDate": "2026-01-30T22:00:00.000Z"
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
 * Gets the next available time slot (next business day at 10 AM)
 */
async function getNextAvailableSlot(): Promise<Date> {
  const now = new Date();
  const nextSlot = new Date(now);

  // Add 1 day
  nextSlot.setDate(nextSlot.getDate() + 1);

  // Set to 10:00 AM
  nextSlot.setHours(10, 0, 0, 0);

  // If it's weekend, move to Monday
  const dayOfWeek = nextSlot.getDay();
  if (dayOfWeek === 0) { // Sunday
    nextSlot.setDate(nextSlot.getDate() + 1);
  } else if (dayOfWeek === 6) { // Saturday
    nextSlot.setDate(nextSlot.getDate() + 2);
  }

  return nextSlot;
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
