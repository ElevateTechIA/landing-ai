import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAvailability } from '@/lib/google-calendar';
import { getAvailableSlots } from '@/lib/available-slots';
import { scheduleMeeting } from '@/lib/schedule-meeting';
import axios from 'axios';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface ExtractedData {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  purpose?: string;
}

interface ChatResponse {
  success: boolean;
  response: string;
  action: 'collect_info' | 'show_available_slots' | 'show_specific_date_slots' |
          'check_specific_time' | 'confirm_data' | 'schedule_meeting' | 'completed' | 'error';
  extractedData?: Partial<ExtractedData>;
  actionPayload?: Record<string, any>;
  details?: string;
}

/**
 * API Endpoint: AI Chat Scheduler
 * POST /api/chat-scheduler
 *
 * Handles conversational scheduling with AI understanding of natural language
 * including temporal context ("afternoon", "morning", "next monday", etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, language, currentData, selectedSlot } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          action: 'error',
          response: language === 'es'
            ? 'No hay mensajes para procesar'
            : 'No messages to process',
          details: 'Empty messages array'
        },
        { status: 400 }
      );
    }

    console.log('[CHAT_SCHEDULER] Processing conversation:', {
      messageCount: messages.length,
      language,
      hasCurrentData: !!currentData,
      hasSelectedSlot: !!selectedSlot
    });

    // If user selected a slot directly, skip AI and schedule immediately
    if (selectedSlot && selectedSlot.datetime) {
      console.log('[CHAT_SCHEDULER] Direct slot selection detected, scheduling meeting...');

      const scheduleResult = await scheduleMeetingAction(
        { slot: selectedSlot },
        currentData || {},
        language,
        messages
      );

      const successMessage = language === 'es'
        ? `✅ ¡Excelente! Tu reunión ha sido agendada exitosamente.\n\n📅 ${selectedSlot.displayText}\n\n${scheduleResult.zoomLink ? `🔗 Link de Zoom: ${scheduleResult.zoomLink}\n\n` : ''}Te enviaremos un email de confirmación a ${currentData.email}.`
        : `✅ Great! Your meeting has been successfully scheduled.\n\n📅 ${selectedSlot.displayText}\n\n${scheduleResult.zoomLink ? `🔗 Zoom Link: ${scheduleResult.zoomLink}\n\n` : ''}We'll send you a confirmation email at ${currentData.email}.`;

      return NextResponse.json({
        success: true,
        response: successMessage,
        action: 'schedule_meeting',
        extractedData: {},
        actionPayload: {
          success: scheduleResult.success,
          zoomLink: scheduleResult.zoomLink,
          meetingId: scheduleResult.meetingId
        }
      });
    }

    // 1. Analyze conversation with AI
    const analysis = await analyzeConversation(messages, language, currentData || {});
    console.log('[CHAT_SCHEDULER] AI Analysis:', analysis);

    if (!analysis) {
      return NextResponse.json(
        {
          success: false,
          action: 'error',
          response: language === 'es'
            ? 'Error al analizar la conversación'
            : 'Error analyzing conversation',
          details: 'AI analysis returned null'
        },
        { status: 500 }
      );
    }

    // 2. Execute the determined action
    let finalPayload = analysis.actionPayload || {};

    // If action is show_available_slots and no payload provided, fetch slots automatically
    if (analysis.action === 'show_available_slots' && (!finalPayload || !finalPayload.slots)) {
      console.log('[CHAT_SCHEDULER] Fetching available slots automatically...');
      try {
        const slotsResult = await getAvailableSlotsAction(language);
        finalPayload = { ...finalPayload, ...slotsResult };

        // If no slots returned, inform user
        if (!slotsResult.slots || slotsResult.slots.length === 0) {
          console.warn('[CHAT_SCHEDULER] No slots available');
          return NextResponse.json({
            success: true,
            response: language === 'es'
              ? 'Lo siento, no hay horarios disponibles en este momento. Por favor intenta más tarde o contáctanos directamente.'
              : 'Sorry, no time slots are available at this time. Please try again later or contact us directly.',
            action: 'error',
            extractedData: analysis.extractedData,
            actionPayload: {}
          });
        }
      } catch (error) {
        console.error('[CHAT_SCHEDULER] Failed to fetch available slots:', error);
        return NextResponse.json({
          success: true,
          response: language === 'es'
            ? 'Disculpa, hubo un problema al obtener los horarios disponibles. Por favor intenta de nuevo en unos momentos.'
            : 'Sorry, there was a problem getting available times. Please try again in a few moments.',
          action: 'error',
          extractedData: analysis.extractedData,
          actionPayload: {}
        });
      }
    }

    // If action is show_specific_date_slots and no slots provided, fetch them
    if (analysis.action === 'show_specific_date_slots' && (!finalPayload || !finalPayload.slots)) {
      console.log('[CHAT_SCHEDULER] Fetching specific date slots automatically...');
      try {
        const slotsResult = await getSpecificDateSlotsAction(finalPayload, language);
        finalPayload = { ...finalPayload, ...slotsResult };

        // If no slots returned, inform user
        if (!slotsResult.slots || slotsResult.slots.length === 0) {
          console.warn('[CHAT_SCHEDULER] No slots available for specific date');
          return NextResponse.json({
            success: true,
            response: language === 'es'
              ? 'Lo siento, no hay horarios disponibles para esa fecha. ¿Te gustaría ver otros horarios disponibles?'
              : 'Sorry, no time slots are available for that date. Would you like to see other available times?',
            action: 'collect_info',
            extractedData: analysis.extractedData,
            actionPayload: {}
          });
        }
      } catch (error) {
        console.error('[CHAT_SCHEDULER] Failed to fetch specific date slots:', error);
        return NextResponse.json({
          success: true,
          response: language === 'es'
            ? 'Disculpa, hubo un problema al obtener los horarios para esa fecha. Por favor intenta con otra fecha.'
            : 'Sorry, there was a problem getting times for that date. Please try another date.',
          action: 'collect_info',
          extractedData: analysis.extractedData,
          actionPayload: {}
        });
      }
    }

    const actionResult = await handleAction(
      analysis.action,
      finalPayload,
      language,
      currentData || {},
      messages
    );

    return NextResponse.json({
      success: true,
      response: analysis.response,
      action: analysis.action,
      extractedData: analysis.extractedData,
      actionPayload: finalPayload
    });

  } catch (error) {
    console.error('[CHAT_SCHEDULER] Error:', error);
    return NextResponse.json(
      {
        success: false,
        action: 'error',
        response: 'Error processing request',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * Analyzes conversation with Gemini AI to extract info and determine next action
 */
async function analyzeConversation(
  messages: Message[],
  language: string,
  currentData: ExtractedData
): Promise<{
  intent: string;
  action: string;
  extractedData?: Partial<ExtractedData>;
  actionPayload?: Record<string, any>;
  response: string;
} | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[CHAT_SCHEDULER] No GEMINI_API_KEY');
    return null;
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  // Format conversation for AI
  const conversationText = messages
    .map((msg) => `${msg.role === 'user' ? 'Cliente' : 'Agente'}: ${msg.content}`)
    .join('\n');

  // Get current date/time
  const now = new Date();
  const currentDateInfo = `Fecha y hora actual: ${now.toISOString()} (${now.toLocaleString('en-US', { timeZone: 'America/New_York' })})`;

  const isFirstMessage = messages.length === 1; // Only the initial greeting
  const userJustSelectedLanguage = isFirstMessage && messages[0]?.role === 'assistant';

  const prompt = `You are a professional scheduling assistant for a consultation service. Analyze the conversation and determine the next action.

${currentDateInfo}
Current Language Setting: ${language === 'es' ? 'Spanish (Español)' : 'English'}
Business Hours: 8:00 AM - 6:00 PM Eastern Time, Monday-Friday
Meeting Duration: 30 minutes

Currently Collected Data:
${JSON.stringify(currentData, null, 2)}

Conversation History:
${conversationText}

${userJustSelectedLanguage ? `
SPECIAL INSTRUCTION: The user is selecting their language preference from the greeting.
- If they say "English", "1", "en", "inglés" → Set language to English, greet warmly, ask for name
- If they say "Español", "Spanish", "2", "es" → Set language to Spanish, greet warmly, ask for name
- Otherwise, treat it as a name or other data
` : ''}

IMPORTANT TEMPORAL UNDERSTANDING:
- "afternoon" = 12:00 PM - 6:00 PM
- "morning" = 8:00 AM - 12:00 PM
- "evening" = 4:00 PM - 6:00 PM
- "tomorrow" = today + 1 day
- "next monday" = the next Monday from today
- "next monday afternoon" = next Monday, 12pm-6pm only

REQUIRED DATA (if not already collected):
1. name (full name)
2. email (must contain @)
3. phone (10+ digits)
4. company (company name, can be "Independent" or "Self-employed")
5. purpose (reason for consultation)

CONVERSATION FLOW:
Step 1: If any data is missing → use "collect_info" (ask naturally for missing fields one by one)
Step 2: Once all data is collected → use "confirm_data" (show collected info, ask for confirmation like "Is this correct?")
Step 3: User confirms (says "yes/ok/looks good/correct/true") → use "show_available_slots" (display available times)
Step 4: User selects a specific slot from the list → use "schedule_meeting" (create the meeting)
IMPORTANT: Do NOT jump from confirm_data directly to schedule_meeting. Always show available slots first.

TASK:
1. Extract ANY new information mentioned: name, email, phone, company, purpose
2. Understand user's intent about scheduling
3. Determine the NEXT ACTION based on EXACT conditions:
   - "collect_info": ONLY if any of these are missing/null: name, email, phone, company, purpose (ask for missing fields naturally)
   - "confirm_data": ONLY if all data is collected AND user hasn't confirmed yet (ask user to confirm collected data before showing slots)
   - "show_available_slots": When user just said "yes/ok/confirmed/true" to confirm_data action, or user explicitly wants to see times but hasn't specified a date
   - "show_specific_date_slots": User mentioned a specific date/time that needs validation OR requested time outside business hours (before 8am, after 6pm, or weekend)
   - "schedule_meeting": ONLY when user mentions a specific time that is WITHIN business hours (8am-6pm Mon-Fri). Examples:
     * Slot format: "Thursday, February 5 at 11:30 AM", "Monday, February 2 at 9:00 AM"
     * Natural format: "Friday at 5:30pm", "tomorrow at 3pm", "next monday at 10am"
     * CRITICAL: VALIDATE the time first - if outside 8am-6pm or on weekend, use show_specific_date_slots instead
   - "check_specific_time": NEVER USE THIS ACTION - it causes the conversation to get stuck
   - "completed": Meeting successfully scheduled

CRITICAL RULES:
1. ALWAYS validate requested times against business hours (8am-6pm ET, Mon-Fri)
2. If time is outside business hours:
   - Use "show_specific_date_slots" to show available times on that date
   - Explain why in your response: "Sorry, our hours are 8am-6pm. Here are available times:"
3. If time is within business hours and data is confirmed:
   - Use "schedule_meeting" to book immediately
4. Examples:
   - "Friday at 7pm" → show_specific_date_slots (7pm is after 6pm cutoff)
   - "Friday at 5:30pm" → schedule_meeting (within 8am-6pm)
   - "Saturday at 10am" → show_available_slots (weekends not available)

CRITICAL BUSINESS HOURS VALIDATION:
Business hours are 8:00 AM - 6:00 PM Eastern Time, Monday-Friday ONLY.
BEFORE scheduling, you MUST validate the requested time:
- If time is BEFORE 8:00 AM → Use "show_specific_date_slots" for that date (morning slots)
- If time is AFTER 6:00 PM → Use "show_specific_date_slots" for that date (afternoon/evening slots until 6pm)
- If day is Saturday/Sunday → Use "show_specific_date_slots" for next Monday
- If time is WITHIN 8am-6pm on a weekday → Use "schedule_meeting"

IMPORTANT FOR schedule_meeting ACTION:
ONLY use this action if the requested time is within business hours (8am-6pm ET, Mon-Fri).
When scheduling, you MUST:
1. Parse the date and time from their message (use current date ${currentDateInfo} as reference)
2. VALIDATE: Is it 8am-6pm ET on a weekday? If NO, use show_specific_date_slots instead
3. Convert to ISO datetime format (YYYY-MM-DDTHH:MM:SS.000Z) in Eastern Time (UTC-5)
4. Include in actionPayload as: { slot: { datetime: "ISO string", displayText: "formatted for display" } }

Examples:
- User says "Friday at 7pm" (AFTER 6pm)
  → INVALID time (after 6pm)
  → Action: "show_specific_date_slots" with date for that Friday
  → Response: "${language === 'es' ? 'Lo siento, nuestro horario es hasta las 6:00 PM. Aquí están los horarios disponibles para el viernes:' : 'Sorry, our hours end at 6:00 PM. Here are the available times for Friday:'}"

- User says "Friday at 5:30 PM" (within 8am-6pm)
  → VALID time
  → Action: "schedule_meeting"
  → { slot: { datetime: "2026-01-31T22:30:00.000Z", displayText: "Friday, January 31 at 5:30 PM" } }

- User says "Saturday at 10am" (weekend)
  → INVALID day (weekend)
  → Action: "show_available_slots"
  → Response: "${language === 'es' ? 'Lo siento, solo agendamos reuniones de lunes a viernes. Aquí están nuestros próximos horarios disponibles:' : 'Sorry, we only schedule meetings Monday-Friday. Here are our next available times:'}"

4. Generate a natural, conversational response in the user's language (${language === 'es' ? 'Spanish' : 'English'})
   - If collecting info: ask for missing fields naturally (don't ask for all at once)
   - If confirming data: list the collected information and ask "Is this correct?" or "Does this look good?"
   - If showing slots because of out-of-hours request: EXPLAIN why their time isn't available
     * Spanish: "Lo siento, nuestro horario de atención es de 8:00 AM a 6:00 PM, de lunes a viernes. Aquí están los horarios disponibles más cercanos:"
     * English: "Sorry, our business hours are 8:00 AM to 6:00 PM, Monday through Friday. Here are the closest available times:"
   - If showing slots (normal): Say something like "Here are the available times" but DO NOT list the actual slots - they will be shown as buttons
   - If scheduling: confirm the meeting is being scheduled with the specific time they requested

CRITICAL: When action is "show_available_slots" or "show_specific_date_slots", your response should NOT include the actual slot times/dates. Just say you're showing them. The slots will appear as clickable buttons below your message.

RESPONSE FORMAT (valid JSON only, no markdown):
{
  "intent": "string describing user's intention",
  "action": "action name from list above",
  "extractedData": {
    "name": "value or null",
    "email": "value or null",
    "phone": "value or null",
    "company": "value or null",
    "purpose": "value or null"
  },
  "actionPayload": {
    // For show_available_slots: { count: 5, language: "${language}" }
    // For show_specific_date_slots: { date: "YYYY-MM-DD" (the date user requested), timeRange: "morning|afternoon|evening|null", language: "${language}" }
    //   - Use this when user requests time outside business hours to show available slots on that date
    //   - Example: User says "Friday at 7pm" → { date: "2026-01-31", timeRange: "afternoon", language: "es" }
    // For schedule_meeting: { slot: { datetime: "ISO datetime string in UTC", displayText: "formatted display like 'Thursday, February 5 at 11:30 AM'" } }
    //   - ONLY use if time is within 8am-6pm ET, Monday-Friday
    // For other actions: {}
  },
  "response": "Natural language response to user in ${language === 'es' ? 'Spanish' : 'English'}"
}`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    console.log('[CHAT_SCHEDULER] Raw AI response:', responseText);

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[CHAT_SCHEDULER] No JSON found in AI response');
      return null;
    }

    const analysis = JSON.parse(jsonMatch[0]);
    console.log('[CHAT_SCHEDULER] Parsed analysis:', JSON.stringify(analysis, null, 2));
    return analysis;
  } catch (error) {
    console.error('[CHAT_SCHEDULER] Error analyzing conversation:', error);
    return null;
  }
}

/**
 * Executes the action determined by AI
 */
async function handleAction(
  action: string,
  payload: Record<string, any>,
  language: string,
  currentData: ExtractedData,
  messages: Message[]
): Promise<Record<string, any> | null> {
  try {
    switch (action) {
      case 'collect_info':
      case 'confirm_data':
      case 'completed':
      case 'error':
        // No backend action needed
        return {};

      case 'show_available_slots':
        // Fetch available slots from calendar
        return await getAvailableSlotsAction(language);

      case 'show_specific_date_slots':
        // Fetch slots for specific date/time range
        return await getSpecificDateSlotsAction(payload, language);

      case 'check_specific_time':
        // DEPRECATED: This action causes the flow to get stuck
        // If somehow the AI still uses this, just return empty to avoid errors
        console.warn('[CHAT_SCHEDULER] check_specific_time action used - this is deprecated');
        return {};

      case 'schedule_meeting':
        // Schedule the meeting
        return await scheduleMeetingAction(payload, currentData, language, messages);

      default:
        return {};
    }
  } catch (error) {
    console.error('[CHAT_SCHEDULER] Error handling action:', action, error);
    return null;
  }
}

/**
 * Gets next available slots
 */
async function getAvailableSlotsAction(language: string): Promise<Record<string, any>> {
  try {
    console.log('[CHAT_SCHEDULER] Fetching available slots directly (no HTTP)');

    const result = await getAvailableSlots({
      count: 5,
      language: language as 'en' | 'es'
    });

    console.log('[CHAT_SCHEDULER] Available slots result:', result);

    if (!result.success) {
      throw new Error(result.error || 'Failed to get slots');
    }

    return {
      slots: result.slots || [],
      summary: result.summary || ''
    };
  } catch (error) {
    console.error('[CHAT_SCHEDULER] Error getting available slots:', error);
    throw error;
  }
}

/**
 * Gets slots for a specific date or date range
 */
async function getSpecificDateSlotsAction(
  payload: Record<string, any>,
  language: string
): Promise<Record<string, any>> {
  try {
    const { date, timeRange } = payload;

    if (!date) {
      return { slots: [] };
    }

    console.log('[CHAT_SCHEDULER] Fetching specific date slots directly (no HTTP):', { date, timeRange });

    const result = await getAvailableSlots({
      desiredDate: date,
      count: 8,
      language: language as 'en' | 'es',
      timeRange: timeRange as 'morning' | 'afternoon' | 'evening' | undefined
    });

    console.log('[CHAT_SCHEDULER] Specific date slots result:', result);

    if (!result.success) {
      throw new Error(result.error || 'Failed to get slots');
    }

    return {
      slots: result.slots || [],
      summary: result.summary || ''
    };
  } catch (error) {
    console.error('[CHAT_SCHEDULER] Error getting specific date slots:', error);
    throw error;
  }
}

/**
 * Checks if a specific time is available
 */
async function checkSpecificTimeAction(
  payload: Record<string, any>,
  language: string
): Promise<Record<string, any>> {
  try {
    const { userInput } = payload;

    if (!userInput) {
      return { available: false };
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const response = await fetch(
      `${baseUrl}/api/calendar/check-slot`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput,
          timezone: 'America/New_York',
          language
        })
      }
    );

    const data = await response.json();
    console.log('[CHAT_SCHEDULER] Check slot response:', data);

    return {
      available: data.available || false,
      requestedSlot: data.requestedSlot || null,
      alternatives: data.alternatives || []
    };
  } catch (error) {
    console.error('[CHAT_SCHEDULER] Error checking specific time:', error);
    return { available: false };
  }
}

/**
 * Schedules the meeting
 */
async function scheduleMeetingAction(
  payload: Record<string, any>,
  currentData: ExtractedData,
  language: string,
  messages: Message[]
): Promise<Record<string, any>> {
  try {
    const { slot } = payload;

    if (!slot || !currentData.email) {
      return { success: false };
    }

    const scheduleData = {
      name: currentData.name || '',
      email: currentData.email || '',
      phone: currentData.phone || '',
      company: currentData.company || '',
      challenge: currentData.purpose || '',
      objectives: '',
      expectations: '',
      budget: '',
      timeline: '',
      selectedSlot: typeof slot === 'string' ? slot : slot.datetime, // Extract datetime if slot is an object
      timezone: 'America/New_York',
      language: language as 'en' | 'es',
      messages: messages // Pass conversation transcript
    };

    // Call the shared scheduling function directly (no HTTP request)
    const result = await scheduleMeeting(scheduleData);
    console.log('[CHAT_SCHEDULER] Schedule result:', result);

    return {
      success: result.success || false,
      zoomLink: result.zoomLink || '',
      meetingId: result.meetingId || ''
    };
  } catch (error) {
    console.error('[CHAT_SCHEDULER] Error scheduling meeting:', error);
    return { success: false };
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
