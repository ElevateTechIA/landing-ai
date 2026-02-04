import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  sendWhatsAppCloudMessage,
  markMessageAsRead,
  verifyWebhookSignature,
  parseIncomingMessage,
} from '@/lib/whatsapp';
import {
  getWhatsAppConversation,
  saveWhatsAppConversation,
  WhatsAppMessage,
} from '@/lib/firebase';
import {
  WHATSAPP_SYSTEM_INSTRUCTION,
  buildWhatsAppPrompt,
  detectLanguage,
  getWelcomeMessage,
} from '@/app/lib/chatbot/whatsappPrompt';
import { getAvailableSlots } from '@/lib/available-slots';
import { scheduleMeeting } from '@/lib/schedule-meeting';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * GET - Webhook verification for WhatsApp
 * Meta sends a verification request when setting up the webhook
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

  console.log('[WHATSAPP WEBHOOK] Verification request:', { mode, token, challenge });

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('[WHATSAPP WEBHOOK] Verification successful');
    return new NextResponse(challenge, { status: 200 });
  }

  console.error('[WHATSAPP WEBHOOK] Verification failed');
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * Generate AI response using Gemini
 */
async function generateAIResponse(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  detectedLanguage: 'en' | 'es',
  availableSlots?: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: WHATSAPP_SYSTEM_INSTRUCTION,
  });

  const prompt = buildWhatsAppPrompt(
    userMessage,
    conversationHistory,
    detectedLanguage,
    availableSlots
  );

  const result = await model.generateContent(prompt);
  return result.response.text();
}

/**
 * POST - Receive incoming WhatsApp messages
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('x-hub-signature-256');
    if (signature && process.env.WHATSAPP_APP_SECRET) {
      const isValid = verifyWebhookSignature(rawBody, signature);
      if (!isValid) {
        console.error('[WHATSAPP WEBHOOK] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    console.log('[WHATSAPP WEBHOOK] Received:', JSON.stringify(body, null, 2));

    // Parse incoming message
    const incoming = parseIncomingMessage(body);

    if (!incoming) {
      // Not a message event (could be status update, etc.)
      return NextResponse.json({ status: 'ok' });
    }

    // Only process text messages for now
    if (incoming.type !== 'text' || !incoming.text) {
      console.log('[WHATSAPP WEBHOOK] Non-text message received:', incoming.type);
      return NextResponse.json({ status: 'ok' });
    }

    console.log('[WHATSAPP WEBHOOK] Processing message from:', incoming.from);
    console.log('[WHATSAPP WEBHOOK] Message:', incoming.text);
    console.log('[WHATSAPP WEBHOOK] Message ID:', incoming.messageId);

    // Get or create conversation
    let conversation = await getWhatsAppConversation(incoming.from);

    // Check if we already processed this message (deduplication)
    if (conversation?.messages.some(m => m.messageId === incoming.messageId)) {
      console.log('[WHATSAPP WEBHOOK] Message already processed, skipping');
      return NextResponse.json({ status: 'ok' });
    }

    // Mark message as read
    await markMessageAsRead(incoming.messageId);
    const detectedLanguage = detectLanguage(incoming.text);

    if (!conversation) {
      // New conversation
      conversation = {
        phoneNumber: incoming.from,
        displayName: incoming.displayName,
        messages: [],
        language: detectedLanguage,
        lastMessageAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Add user message to conversation
    const userMessage: WhatsAppMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: incoming.text,
      timestamp: new Date(),
      messageId: incoming.messageId,
    };
    conversation.messages.push(userMessage);

    // Generate AI response
    let aiResponse: string;

    try {
      // Build conversation history for context
      const conversationHistory = conversation.messages
        .slice(-10) // Last 10 messages for context
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Check if this is a first message (only send welcome for truly new conversations)
      const isFirstMessage = conversation.messages.length === 1;
      const isGreeting = /^(hi|hello|hola|buenos|buenas|hey)$/i.test(incoming.text.trim());

      if (isFirstMessage && isGreeting) {
        aiResponse = getWelcomeMessage(detectedLanguage);
      } else {
        aiResponse = await generateAIResponse(
          incoming.text,
          conversationHistory.slice(0, -1), // Exclude current message
          detectedLanguage
        );

        // Check if AI wants to fetch available slots
        if (aiResponse.includes('[FETCH_SLOTS]')) {
          console.log('[WHATSAPP WEBHOOK] AI requested available slots, fetching...');

          const slotsResult = await getAvailableSlots({
            count: 5,
            language: detectedLanguage,
          });

          if (slotsResult.success && slotsResult.slots.length > 0) {
            // Format slots for the AI
            const slotsText = slotsResult.slots
              .map((slot, i) => `${i + 1}. ${slot.dayOfWeek} ${slot.date} at ${slot.time} (${slot.datetime})`)
              .join('\n');

            // Re-generate response with actual slots
            aiResponse = await generateAIResponse(
              incoming.text,
              conversationHistory.slice(0, -1),
              detectedLanguage,
              slotsText
            );

            // Clean up any remaining [FETCH_SLOTS] tags
            aiResponse = aiResponse.replace(/\[FETCH_SLOTS\]/g, '').trim();
          } else {
            // No slots available - remove tag and append message
            aiResponse = aiResponse.replace(/\[FETCH_SLOTS\]/g, '').trim();
            const noSlotsMsg = detectedLanguage === 'es'
              ? '\n\nLo siento, no hay horarios disponibles en este momento. Por favor intenta mas tarde o contactanos en elevateai.com.'
              : '\n\nSorry, there are no available slots at the moment. Please try again later or contact us at elevateai.com.';
            aiResponse += noSlotsMsg;
          }
        }

        // Check if AI wants to book a meeting
        const bookMatch = aiResponse.match(/\[BOOK_MEETING:([\s\S]*?)\]/);
        if (bookMatch) {
          console.log('[WHATSAPP WEBHOOK] AI requested meeting booking...');

          try {
            const bookingData = JSON.parse(bookMatch[1]);
            console.log('[WHATSAPP WEBHOOK] Booking data:', bookingData);

            // Build chat messages for context
            const chatMessages = conversation.messages.map(msg => ({
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
            }));

            const meetingResult = await scheduleMeeting({
              name: bookingData.name,
              email: bookingData.email,
              phone: bookingData.phone || incoming.from,
              company: bookingData.company || '',
              challenge: 'WhatsApp inquiry',
              objectives: 'Consultation via WhatsApp',
              expectations: '',
              budget: '',
              timeline: '',
              selectedSlot: bookingData.slot,
              timezone: 'America/New_York',
              language: detectedLanguage,
              messages: chatMessages,
            });

            // Remove the booking tag from the response
            aiResponse = aiResponse.replace(/\[BOOK_MEETING:[\s\S]*?\]/, '').trim();

            if (meetingResult.success) {
              console.log('[WHATSAPP WEBHOOK] Meeting booked successfully:', meetingResult.zoomLink);
              const confirmMsg = detectedLanguage === 'es'
                ? `\n\nTu reunion ha sido agendada exitosamente! Recibiras un email de confirmacion con el link de Zoom en ${bookingData.email}.`
                : `\n\nYour meeting has been scheduled successfully! You'll receive a confirmation email with the Zoom link at ${bookingData.email}.`;
              aiResponse += confirmMsg;
            } else {
              console.error('[WHATSAPP WEBHOOK] Meeting booking failed:', meetingResult.error);
              const errorMsg = detectedLanguage === 'es'
                ? '\n\nHubo un problema al agendar la reunion. Por favor intenta de nuevo o contactanos en elevateai.com.'
                : '\n\nThere was an issue scheduling the meeting. Please try again or contact us at elevateai.com.';
              aiResponse += errorMsg;
            }
          } catch (parseError) {
            console.error('[WHATSAPP WEBHOOK] Failed to parse booking data:', parseError);
            aiResponse = aiResponse.replace(/\[BOOK_MEETING:[\s\S]*?\]/, '').trim();
          }
        }
      }

      console.log('[WHATSAPP WEBHOOK] AI Response:', aiResponse);
    } catch (aiError) {
      console.error('[WHATSAPP WEBHOOK] AI Error:', aiError);
      aiResponse = detectedLanguage === 'es'
        ? 'Lo siento, estoy teniendo dificultades técnicas. Por favor, intenta de nuevo en un momento.'
        : "I'm sorry, I'm experiencing technical difficulties. Please try again in a moment.";
    }

    // Add AI response to conversation
    const assistantMessage: WhatsAppMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
    };
    conversation.messages.push(assistantMessage);
    conversation.lastMessageAt = new Date();
    conversation.language = detectedLanguage;

    // Save conversation
    await saveWhatsAppConversation(conversation);

    // Send response via WhatsApp
    const sendResult = await sendWhatsAppCloudMessage(incoming.from, aiResponse);

    if (!sendResult.success) {
      console.error('[WHATSAPP WEBHOOK] Failed to send response:', sendResult.error);
    } else {
      // Update the assistant message with the WhatsApp message ID
      assistantMessage.messageId = sendResult.messageId;
      await saveWhatsAppConversation(conversation);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[WHATSAPP WEBHOOK] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
