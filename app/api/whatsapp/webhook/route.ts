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

    // Mark message as read
    await markMessageAsRead(incoming.messageId);

    // Get or create conversation
    let conversation = await getWhatsAppConversation(incoming.from);
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

      // Check if this is a greeting/first message
      const isGreeting = conversation.messages.length === 1 ||
        /^(hi|hello|hola|buenos|buenas|hey)$/i.test(incoming.text.trim());

      if (isGreeting && conversation.messages.length === 1) {
        aiResponse = getWelcomeMessage(detectedLanguage);
      } else {
        // Generate response with Gemini
        const model = genAI.getGenerativeModel({
          model: 'gemini-1.5-flash-latest',
          systemInstruction: WHATSAPP_SYSTEM_INSTRUCTION,
        });

        const prompt = buildWhatsAppPrompt(
          incoming.text,
          conversationHistory.slice(0, -1), // Exclude current message
          detectedLanguage
        );

        const result = await model.generateContent(prompt);
        aiResponse = result.response.text();
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
