import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  sendWhatsAppCloudMessage,
  sendWhatsAppInteractiveList,
  markMessageAsRead,
  verifyWebhookSignature,
  parseIncomingMessage,
  sendTypingIndicator,
  simulateHumanDelay,
} from '@/lib/whatsapp';
import { getWhatsAppConfig, getDefaultWhatsAppConfig } from '@/lib/whatsapp-config';
import {
  getWhatsAppConversation,
  saveWhatsAppConversation,
  updateMessageStatus,
  findMatchingAutoReply,
  getAutomationConfig,
  WhatsAppMessage,
} from '@/lib/firebase';
import {
  WHATSAPP_SYSTEM_INSTRUCTION,
  buildWhatsAppPrompt,
  detectLanguage,
  getWelcomeMessage,
} from '@/app/lib/chatbot/whatsappPrompt';
import { getAvailableSlots, AvailableSlot } from '@/lib/available-slots';
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
 * Extract scheduling info from conversation history using AI
 */
async function extractSchedulingInfo(
  conversationHistory: Array<{ role: string; content: string }>
): Promise<{ name: string; email: string; company: string; phone: string } | null> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const historyText = conversationHistory
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    const result = await model.generateContent(
      `Extract the scheduling information from this conversation. Return ONLY valid JSON with these fields: name, email, company, phone. If any field is missing, use empty string "". Do not include any other text.\n\nConversation:\n${historyText}`
    );

    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('[WHATSAPP WEBHOOK] Failed to extract scheduling info:', error);
    return null;
  }
}

/**
 * POST - Receive incoming WhatsApp messages
 */
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Extract businessPhoneNumberId from payload metadata for config lookup
    const entry = (body.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown>;
    const metadata = value?.metadata as Record<string, unknown>;
    const businessPhoneNumberId = (metadata?.phone_number_id as string) || '';

    // Get config for this business phone number
    const phoneConfig = getWhatsAppConfig(businessPhoneNumberId) || getDefaultWhatsAppConfig();
    if (!phoneConfig) {
      console.error('[WHATSAPP WEBHOOK] No WhatsApp config found for phone:', businessPhoneNumberId);
      return NextResponse.json({ error: 'No config' }, { status: 500 });
    }

    // Verify webhook signature
    const signature = request.headers.get('x-hub-signature-256');
    if (signature && phoneConfig.appSecret) {
      const isValid = verifyWebhookSignature(rawBody, signature, phoneConfig.appSecret);
      if (!isValid) {
        console.error('[WHATSAPP WEBHOOK] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    console.log('[WHATSAPP WEBHOOK] Received for phone:', businessPhoneNumberId);

    // Check for message status updates (sent, delivered, read)
    try {
      const statuses = value?.statuses as Array<Record<string, unknown>>;

      if (statuses && statuses.length > 0) {
        for (const statusUpdate of statuses) {
          const msgStatus = statusUpdate.status as string;
          const msgId = statusUpdate.id as string;
          const recipientId = statusUpdate.recipient_id as string;
          const timestamp = statusUpdate.timestamp as string;

          if (msgStatus && msgId && recipientId) {
            console.log(`[WHATSAPP WEBHOOK] Status update: ${msgStatus} for message ${msgId} to ${recipientId}`);

            // Log error details for failed messages (e.g. 131042 payment issue, 131049 marketing pause)
            if (msgStatus === 'failed') {
              const errors = statusUpdate.errors as Array<Record<string, unknown>> | undefined;
              if (errors && errors.length > 0) {
                for (const err of errors) {
                  console.error(`[WHATSAPP WEBHOOK] DELIVERY FAILED - Code: ${err.code}, Title: ${err.title}, Message: ${err.message}, Details: ${JSON.stringify(err.error_data || {})}`);
                }
              } else {
                console.error(`[WHATSAPP WEBHOOK] DELIVERY FAILED - No error details provided for message ${msgId}`);
              }
            }

            await updateMessageStatus(
              recipientId,
              msgId,
              msgStatus as 'sent' | 'delivered' | 'read' | 'failed',
              timestamp ? new Date(parseInt(timestamp) * 1000) : undefined,
              businessPhoneNumberId
            );
          }
        }
        return NextResponse.json({ status: 'ok' });
      }
    } catch (statusError) {
      console.error('[WHATSAPP WEBHOOK] Error processing status update:', statusError);
    }

    // Parse incoming message
    const incoming = parseIncomingMessage(body);

    if (!incoming) {
      // Not a message event
      return NextResponse.json({ status: 'ok' });
    }

    // Only process text messages for now
    if (incoming.type !== 'text' || !incoming.text) {
      console.log('[WHATSAPP WEBHOOK] Non-text message received:', incoming.type);
      return NextResponse.json({ status: 'ok' });
    }

    console.log('[WHATSAPP WEBHOOK] Processing message from:', incoming.from, 'to phone:', businessPhoneNumberId);
    console.log('[WHATSAPP WEBHOOK] Message:', incoming.text);
    console.log('[WHATSAPP WEBHOOK] Message ID:', incoming.messageId);

    // Get or create conversation (scoped to business phone number)
    let conversation = await getWhatsAppConversation(incoming.from, businessPhoneNumberId);

    // Check if we already processed this message (deduplication)
    if (conversation?.messages.some(m => m.messageId === incoming.messageId)) {
      console.log('[WHATSAPP WEBHOOK] Message already processed, skipping');
      return NextResponse.json({ status: 'ok' });
    }

    // Mark message as read
    await markMessageAsRead(phoneConfig, incoming.messageId);
    const detectedLanguage = detectLanguage(incoming.text);

    if (!conversation) {
      // New conversation
      conversation = {
        phoneNumber: incoming.from,
        businessPhoneNumberId,
        displayName: incoming.displayName,
        messages: [],
        language: detectedLanguage,
        lastMessageAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    // Check if user selected a slot from interactive list
    const isSlotSelection = incoming.text.startsWith('SLOT_SELECTED:');

    // Set conversation status to open on new messages
    if (!conversation.status || conversation.status === 'resolved') {
      conversation.status = 'open';
    }

    // Add user message to conversation
    const userMessage: WhatsAppMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: isSlotSelection
        ? `Selected slot: ${incoming.text.replace('SLOT_SELECTED:', '')}`
        : incoming.text,
      timestamp: new Date(),
      messageId: incoming.messageId,
    };
    conversation.messages.push(userMessage);

    // Check auto-reply rules before AI processing
    const isNewConversation = conversation.messages.length === 1;
    const autoReplyMatch = await findMatchingAutoReply(incoming.text, isNewConversation);

    if (autoReplyMatch && !isSlotSelection) {
      console.log(`[WHATSAPP WEBHOOK] Auto-reply triggered: ${autoReplyMatch.name} (${autoReplyMatch.type})`);

      // Personalize auto-reply message
      const autoMessage = autoReplyMatch.message
        .replace(/\{\{name\}\}/gi, incoming.displayName || '')
        .replace(/\{\{phone\}\}/gi, incoming.from);

      // Anti-blocking: typing indicator + small delay before auto-reply
      const config = await getAutomationConfig();
      const ab = config?.antiBlocking;
      if (ab?.enableTypingIndicator !== false) {
        await sendTypingIndicator(phoneConfig, incoming.from);
      }
      await simulateHumanDelay(autoMessage.length, ab?.minReplyDelaySec ?? 1, Math.min(ab?.maxReplyDelaySec ?? 3, 3));

      const assistantMessage: WhatsAppMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: autoMessage,
        timestamp: new Date(),
      };
      conversation.messages.push(assistantMessage);
      conversation.lastMessageAt = new Date();
      conversation.language = detectLanguage(incoming.text);

      await saveWhatsAppConversation(conversation);

      const sendResult = await sendWhatsAppCloudMessage(phoneConfig, incoming.from, autoMessage);
      if (sendResult.success) {
        assistantMessage.messageId = sendResult.messageId;
        await saveWhatsAppConversation(conversation);
      }

      return NextResponse.json({ status: 'ok' });
    }

    // Generate AI response
    let aiResponse: string;
    let sendAsInteractiveList = false;
    let interactiveSlots: AvailableSlot[] = [];

    try {
      // Build conversation history for context
      const conversationHistory = conversation.messages
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Check if this is a first message (only send welcome for truly new conversations)
      const isFirstMessage = conversation.messages.length === 1;
      const isGreeting = /^(hi|hello|hola|buenos|buenas|hey)$/i.test(incoming.text.trim());

      if (isFirstMessage && isGreeting) {
        aiResponse = getWelcomeMessage(detectedLanguage);
      } else if (isSlotSelection) {
        // User selected a slot from the interactive list - book the meeting
        const selectedSlotDatetime = incoming.text.replace('SLOT_SELECTED:', '');
        console.log('[WHATSAPP WEBHOOK] User selected slot:', selectedSlotDatetime);

        // Extract scheduling info from conversation history
        const info = await extractSchedulingInfo(conversationHistory);

        if (info && info.name && info.email) {
          // Build chat messages for context
          const chatMessages = conversation.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          }));

          const meetingResult = await scheduleMeeting({
            name: info.name,
            email: info.email,
            phone: info.phone || incoming.from,
            company: info.company || '',
            challenge: 'WhatsApp inquiry',
            objectives: 'Consultation via WhatsApp',
            expectations: '',
            budget: '',
            timeline: '',
            selectedSlot: selectedSlotDatetime,
            timezone: 'America/New_York',
            language: detectedLanguage,
            messages: chatMessages,
          });

          if (meetingResult.success) {
            console.log('[WHATSAPP WEBHOOK] Meeting booked successfully:', meetingResult.zoomLink);
            const slotDate = new Date(selectedSlotDatetime);
            const formattedDate = slotDate.toLocaleDateString(detectedLanguage === 'es' ? 'es-US' : 'en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              timeZone: 'America/New_York',
            });
            aiResponse = detectedLanguage === 'es'
              ? `Tu reunion ha sido agendada para ${formattedDate} (hora del Este). Recibiras un email de confirmacion con el link de Zoom en ${info.email}. Nos vemos pronto!`
              : `Your meeting has been scheduled for ${formattedDate} (Eastern Time). You'll receive a confirmation email with the Zoom link at ${info.email}. See you soon!`;
          } else {
            console.error('[WHATSAPP WEBHOOK] Meeting booking failed:', meetingResult.error);
            aiResponse = detectedLanguage === 'es'
              ? 'Hubo un problema al agendar la reunion. Por favor intenta de nuevo o contactanos en elevateai.com.'
              : 'There was an issue scheduling the meeting. Please try again or contact us at elevateai.com.';
          }
        } else {
          aiResponse = detectedLanguage === 'es'
            ? 'No pude encontrar tu informacion. Por favor proporcioname tu nombre, email y empresa para agendar la reunion.'
            : "I couldn't find your information. Please provide your name, email, and company to schedule the meeting.";
        }
      } else {
        aiResponse = await generateAIResponse(
          incoming.text,
          conversationHistory.slice(0, -1),
          detectedLanguage
        );

        // Check if AI wants to fetch available slots
        const fetchSlotsMatch = aiResponse.match(/\[FETCH_SLOTS(?::(\d{4}-\d{2}-\d{2}))?\]/);
        if (fetchSlotsMatch) {
          const desiredDate = fetchSlotsMatch[1]; // e.g. "2026-02-10" or undefined
          console.log('[WHATSAPP WEBHOOK] AI requested available slots, fetching...', desiredDate ? `for date: ${desiredDate}` : 'next available');

          const slotsResult = await getAvailableSlots({
            count: 5,
            language: detectedLanguage,
            desiredDate,
          });

          if (slotsResult.success && slotsResult.slots.length > 0) {
            // Remove the [FETCH_SLOTS] tag from the AI response
            aiResponse = aiResponse.replace(/\[FETCH_SLOTS(?::\d{4}-\d{2}-\d{2})?\]/g, '').trim();
            // We'll send the slots as an interactive list
            sendAsInteractiveList = true;
            interactiveSlots = slotsResult.slots;
          } else {
            aiResponse = aiResponse.replace(/\[FETCH_SLOTS(?::\d{4}-\d{2}-\d{2})?\]/g, '').trim();
            const noSlotsMsg = detectedLanguage === 'es'
              ? '\n\nLo siento, no hay horarios disponibles en este momento. Por favor intenta mas tarde o contactanos en elevateai.com.'
              : '\n\nSorry, there are no available slots at the moment. Please try again later or contact us at elevateai.com.';
            aiResponse += noSlotsMsg;
          }
        }

        // Check if AI wants to book a meeting (fallback for text-based booking)
        const bookMatch = aiResponse.match(/\[BOOK_MEETING:([\s\S]*?)\]/);
        if (bookMatch) {
          console.log('[WHATSAPP WEBHOOK] AI requested meeting booking...');

          try {
            const bookingData = JSON.parse(bookMatch[1]);
            console.log('[WHATSAPP WEBHOOK] Booking data:', bookingData);

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

    // Anti-blocking: typing indicator + human-like delay before sending
    {
      const config = await getAutomationConfig();
      const ab = config?.antiBlocking;
      if (ab?.enableTypingIndicator !== false) {
        await sendTypingIndicator(phoneConfig, incoming.from);
      }
      await simulateHumanDelay(aiResponse.length, ab?.minReplyDelaySec ?? 1, ab?.maxReplyDelaySec ?? 5);
    }

    // Send response via WhatsApp
    let sendResult;

    if (sendAsInteractiveList && interactiveSlots.length > 0) {
      // Send as interactive list with selectable slots
      const sectionTitle = detectedLanguage === 'es' ? 'Horarios disponibles' : 'Available times';
      const buttonText = detectedLanguage === 'es' ? 'Ver horarios' : 'View times';

      sendResult = await sendWhatsAppInteractiveList(
        phoneConfig,
        incoming.from,
        aiResponse,
        buttonText,
        [
          {
            title: sectionTitle,
            rows: interactiveSlots.map(slot => ({
              id: slot.datetime,
              title: `${slot.dayOfWeek} ${slot.date}`.substring(0, 24),
              description: slot.time,
            })),
          },
        ]
      );
    } else {
      sendResult = await sendWhatsAppCloudMessage(phoneConfig, incoming.from, aiResponse);
    }

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
