/**
 * Shared incoming WhatsApp message handler.
 * Used by both Meta Cloud API webhook and Twilio webhook to process
 * incoming messages through the same AI/auto-reply/slot-booking pipeline.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  sendWhatsAppCloudMessage,
  sendWhatsAppInteractiveList,
  markMessageAsRead,
  sendTypingIndicator,
  simulateHumanDelay,
  IncomingWhatsAppMessage,
} from './whatsapp';
import { WhatsAppPhoneConfig } from './whatsapp-config';
import {
  getWhatsAppConversation,
  saveWhatsAppConversation,
  findMatchingAutoReply,
  getAutomationConfig,
  WhatsAppMessage,
} from './firebase';
import {
  WHATSAPP_SYSTEM_INSTRUCTION,
  buildWhatsAppPrompt,
  detectLanguage,
  getWelcomeMessage,
} from '@/app/lib/chatbot/whatsappPrompt';
import { getAvailableSlots, AvailableSlot } from './available-slots';
import { scheduleMeeting } from './schedule-meeting';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
    console.error('[WA_HANDLER] Failed to extract scheduling info:', error);
    return null;
  }
}

/**
 * Process an incoming WhatsApp message through the AI/auto-reply pipeline.
 * Called by both Meta and Twilio webhook routes after they parse their
 * provider-specific payload into the shared IncomingWhatsAppMessage format.
 */
export async function handleIncomingWhatsAppMessage(
  incoming: IncomingWhatsAppMessage,
  phoneConfig: WhatsAppPhoneConfig,
  businessPhoneNumberId: string
): Promise<void> {
  // Only process text messages for now
  if (incoming.type !== 'text' || !incoming.text) {
    console.log('[WA_HANDLER] Non-text message received:', incoming.type);
    return;
  }

  console.log('[WA_HANDLER] Processing message from:', incoming.from, 'to phone:', businessPhoneNumberId);
  console.log('[WA_HANDLER] Message:', incoming.text);

  // Get or create conversation (scoped to business phone number)
  let conversation = await getWhatsAppConversation(incoming.from, businessPhoneNumberId);

  // Check if we already processed this message (deduplication)
  if (conversation?.messages.some(m => m.messageId === incoming.messageId)) {
    console.log('[WA_HANDLER] Message already processed, skipping');
    return;
  }

  // Mark message as read
  await markMessageAsRead(phoneConfig, incoming.messageId);
  const detectedLanguage = detectLanguage(incoming.text);

  if (!conversation) {
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

  const isSlotSelection = incoming.text.startsWith('SLOT_SELECTED:');

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
    console.log(`[WA_HANDLER] Auto-reply triggered: ${autoReplyMatch.name} (${autoReplyMatch.type})`);

    const autoMessage = autoReplyMatch.message
      .replace(/\{\{name\}\}/gi, incoming.displayName || '')
      .replace(/\{\{phone\}\}/gi, incoming.from);

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
    return;
  }

  // Generate AI response
  let aiResponse: string;
  let sendAsInteractiveList = false;
  let interactiveSlots: AvailableSlot[] = [];

  try {
    const conversationHistory = conversation.messages
      .slice(-10)
      .map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

    const isFirstMessage = conversation.messages.length === 1;
    const isGreeting = /^(hi|hello|hola|buenos|buenas|hey)$/i.test(incoming.text.trim());

    if (isFirstMessage && isGreeting) {
      aiResponse = getWelcomeMessage(detectedLanguage);
    } else if (isSlotSelection) {
      const selectedSlotDatetime = incoming.text.replace('SLOT_SELECTED:', '');
      console.log('[WA_HANDLER] User selected slot:', selectedSlotDatetime);

      const info = await extractSchedulingInfo(conversationHistory);

      if (info && info.name && info.email) {
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

      const fetchSlotsMatch = aiResponse.match(/\[FETCH_SLOTS(?::(\d{4}-\d{2}-\d{2}))?\]/);
      if (fetchSlotsMatch) {
        const desiredDate = fetchSlotsMatch[1];
        console.log('[WA_HANDLER] AI requested available slots', desiredDate ? `for date: ${desiredDate}` : 'next available');

        const slotsResult = await getAvailableSlots({
          count: 5,
          language: detectedLanguage,
          desiredDate,
        });

        if (slotsResult.success && slotsResult.slots.length > 0) {
          aiResponse = aiResponse.replace(/\[FETCH_SLOTS(?::\d{4}-\d{2}-\d{2})?\]/g, '').trim();
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

      const bookMatch = aiResponse.match(/\[BOOK_MEETING:([\s\S]*?)\]/);
      if (bookMatch) {
        console.log('[WA_HANDLER] AI requested meeting booking...');
        try {
          const bookingData = JSON.parse(bookMatch[1]);
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
            const confirmMsg = detectedLanguage === 'es'
              ? `\n\nTu reunion ha sido agendada exitosamente! Recibiras un email de confirmacion con el link de Zoom en ${bookingData.email}.`
              : `\n\nYour meeting has been scheduled successfully! You'll receive a confirmation email with the Zoom link at ${bookingData.email}.`;
            aiResponse += confirmMsg;
          } else {
            const errorMsg = detectedLanguage === 'es'
              ? '\n\nHubo un problema al agendar la reunion. Por favor intenta de nuevo o contactanos en elevateai.com.'
              : '\n\nThere was an issue scheduling the meeting. Please try again or contact us at elevateai.com.';
            aiResponse += errorMsg;
          }
        } catch (parseError) {
          console.error('[WA_HANDLER] Failed to parse booking data:', parseError);
          aiResponse = aiResponse.replace(/\[BOOK_MEETING:[\s\S]*?\]/, '').trim();
        }
      }
    }
  } catch (aiError) {
    console.error('[WA_HANDLER] AI Error:', aiError);
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
    console.error('[WA_HANDLER] Failed to send response:', sendResult.error);
  } else {
    assistantMessage.messageId = sendResult.messageId;
    await saveWhatsAppConversation(conversation);
  }
}
