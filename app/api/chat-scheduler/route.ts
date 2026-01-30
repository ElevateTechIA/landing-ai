import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAvailability } from '@/lib/google-calendar';
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
    const { messages, language, currentData } = body;

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
      hasCurrentData: !!currentData
    });

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
      const slotsResult = await getAvailableSlotsAction(language);
      finalPayload = { ...finalPayload, ...slotsResult };
    }

    const actionResult = await handleAction(
      analysis.action,
      finalPayload,
      language,
      currentData || {}
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

TASK:
1. Extract ANY new information mentioned: name, email, phone, company, purpose
2. Understand user's intent about scheduling
3. Determine the NEXT ACTION:
   - "collect_info": Still missing required data (ask for missing fields naturally)
   - "show_available_slots": User wants to see available times (no specific date mentioned)
   - "show_specific_date_slots": User mentioned a specific date or time range (morning/afternoon/evening)
   - "check_specific_time": User mentioned a specific date AND time
   - "confirm_data": All required data collected, need confirmation before scheduling
   - "schedule_meeting": User confirmed, ready to book
   - "completed": Meeting successfully scheduled

4. Generate a natural, conversational response in the user's language (${language === 'es' ? 'Spanish' : 'English'})
   - If collecting info: ask for missing fields naturally (don't ask for all at once)
   - If showing slots: explain what slots you're showing
   - If confirming: list the collected information and ask for confirmation
   - If scheduling: confirm the meeting is booked

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
    // For show_specific_date_slots: { date: "YYYY-MM-DD", timeRange: "morning|afternoon|evening|null", language: "${language}" }
    // For check_specific_time: { userInput: "user's date/time request", language: "${language}" }
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
  currentData: ExtractedData
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
        // Validate specific date/time
        return await checkSpecificTimeAction(payload, language);

      case 'schedule_meeting':
        // Schedule the meeting
        return await scheduleMeetingAction(payload, currentData, language);

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
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const response = await fetch(
      `${baseUrl}/api/calendar/available-slots-agent?language=${language}&count=5`,
      { method: 'GET' }
    );

    const data = await response.json();
    console.log('[CHAT_SCHEDULER] Available slots response:', data);

    return {
      slots: data.slots || [],
      summary: data.summary || ''
    };
  } catch (error) {
    console.error('[CHAT_SCHEDULER] Error getting available slots:', error);
    return { slots: [] };
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

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    // Build query string
    let query = `/api/calendar/available-slots-agent?date=${date}&count=8&language=${language}`;
    if (timeRange) {
      query += `&timeRange=${timeRange}`;
    }

    const response = await fetch(
      `${baseUrl}${query}`,
      { method: 'GET' }
    );

    const data = await response.json();
    console.log('[CHAT_SCHEDULER] Specific date slots response:', data);

    return {
      slots: data.slots || [],
      summary: data.summary || ''
    };
  } catch (error) {
    console.error('[CHAT_SCHEDULER] Error getting specific date slots:', error);
    return { slots: [] };
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
  language: string
): Promise<Record<string, any>> {
  try {
    const { slot } = payload;

    if (!slot || !currentData.email) {
      return { success: false };
    }

    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

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
      selectedSlot: slot,
      timezone: 'America/New_York',
      language
    };

    const response = await fetch(
      `${baseUrl}/api/calendar/schedule`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleData)
      }
    );

    const data = await response.json();
    console.log('[CHAT_SCHEDULER] Schedule response:', data);

    return {
      success: data.success || false,
      zoomLink: data.zoomLink || '',
      meetingId: data.meetingId || ''
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
