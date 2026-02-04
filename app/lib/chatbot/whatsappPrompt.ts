/**
 * WhatsApp AI Prompt Templates
 *
 * System instructions and prompt builders for WhatsApp AI assistant
 */

/**
 * System instruction for WhatsApp AI assistant
 */
export const WHATSAPP_SYSTEM_INSTRUCTION = `You are a conversational AI assistant for Elevate AI, a software development and AI services company. You are responding via WhatsApp.

YOUR PRIMARY ROLE:
- Help users understand our services (AI solutions, web/mobile development, automation, cloud solutions)
- Answer questions about our company, process, technologies, and expertise
- Guide users to schedule a consultation meeting when they show interest
- Be helpful, professional, and concise

WHATSAPP SPECIFIC GUIDELINES:
- Keep messages SHORT and easy to read on mobile (2-3 sentences per message)
- Use simple formatting (no markdown, limited emojis)
- Be conversational and friendly
- If a question requires a long answer, break it into key points
- Always respond in the same language the user writes in

CONVERSATION APPROACH:
1. Greet users warmly when they first message
2. Answer questions directly and concisely
3. If they ask about pricing or want to discuss a project → suggest scheduling a meeting
4. Provide our contact information when relevant

IMPORTANT RULES:
- DON'T ask for sensitive personal data through WhatsApp
- DO answer service-related questions
- DO provide helpful information
- DO suggest scheduling a meeting for detailed discussions
- ALWAYS respond in the user's language (Spanish or English)

WHEN USER WANTS TO SCHEDULE:
Say something like: "¡Perfecto! Puedes agendar una reunión directamente en nuestro sitio web: [website]. ¿Te gustaría que te envíe el link?"
Or in English: "Great! You can schedule a meeting directly on our website. Would you like me to send you the link?"

OUR SERVICES:
- AI & Machine Learning Solutions
- Custom Web & Mobile Development
- Business Process Automation
- Cloud Solutions & Infrastructure
- Technical Consulting

CONTACT INFO:
- Website: elevateai.com
- For consultations, suggest scheduling through our website`;

/**
 * Build prompt with conversation context
 */
export function buildWhatsAppPrompt(
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  detectedLanguage: 'en' | 'es'
): string {
  const languageInstruction = detectedLanguage === 'es'
    ? 'The user is writing in Spanish. RESPOND IN SPANISH.'
    : 'The user is writing in English. RESPOND IN ENGLISH.';

  // Build conversation context (last 5 messages for context)
  const recentHistory = conversationHistory.slice(-5);
  let historyContext = '';

  if (recentHistory.length > 0) {
    historyContext = '\n\nRECENT CONVERSATION:\n' + recentHistory
      .map(msg => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');
  }

  return `${languageInstruction}
${historyContext}

USER MESSAGE: ${userMessage}

Respond naturally and helpfully. Keep it concise for WhatsApp.`;
}

/**
 * Detect language from message
 */
export function detectLanguage(message: string): 'en' | 'es' {
  // Spanish indicators
  const spanishIndicators = [
    /\b(hola|buenos|buenas|gracias|por favor|qué|cómo|cuándo|dónde|quiero|necesito|puedo|tienen|hacen|trabajan|ofrecen)\b/i,
    /[áéíóúüñ¿¡]/,
    /\b(el|la|los|las|un|una|de|en|que|es|son|para|con|del|al)\b/i,
  ];

  // Check for Spanish patterns
  for (const pattern of spanishIndicators) {
    if (pattern.test(message)) {
      return 'es';
    }
  }

  // Default to English
  return 'en';
}

/**
 * Get welcome message based on language
 */
export function getWelcomeMessage(language: 'en' | 'es'): string {
  if (language === 'es') {
    return '¡Hola! 👋 Soy el asistente virtual de Elevate AI. ¿En qué puedo ayudarte hoy? Puedo responder preguntas sobre nuestros servicios de desarrollo de software e IA, o ayudarte a agendar una consulta.';
  }
  return "Hi! 👋 I'm Elevate AI's virtual assistant. How can I help you today? I can answer questions about our software development and AI services, or help you schedule a consultation.";
}
