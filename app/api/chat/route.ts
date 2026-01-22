/**
 * Chatbot API Route
 *
 * Handles chat requests with domain restriction, RAG-style retrieval,
 * and anti-hallucination safeguards.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { searchKnowledgeBase } from '@/app/lib/chatbot/knowledgeBase';
import {
  classifyQuestion,
  getOffTopicResponse,
  sanitizeInput
} from '@/app/lib/chatbot/questionClassifier';
import {
  SYSTEM_INSTRUCTION,
  buildPrompt,
  buildWelcomePrompt,
  validateResponse
} from '@/app/lib/chatbot/promptTemplates';
import {
  checkRateLimit,
  getClientIdentifier
} from '@/app/lib/chatbot/rateLimiter';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Response limits
const MAX_RESPONSE_LENGTH = 1000;

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const clientId = getClientIdentifier(request);
    const rateLimitResult = checkRateLimit(clientId);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again in a moment.',
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate request
    const body = await request.json();
    const { message, language = 'en' } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request', message: 'Message is required' },
        { status: 400 }
      );
    }

    // 3. Sanitize input
    const sanitizedMessage = sanitizeInput(message);

    if (sanitizedMessage.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input', message: 'Message cannot be empty' },
        { status: 400 }
      );
    }

    // 4. Classify question
    const classification = classifyQuestion(sanitizedMessage);

    // If off-topic, return refusal response immediately
    if (!classification.isAllowed) {
      return NextResponse.json({
        response: getOffTopicResponse(classification),
        source: 'classification',
        metadata: {
          isOnTopic: false,
          reason: classification.reason
        }
      });
    }

    // 5. Check for greeting/welcome
    const greetings = ['hello', 'hi', 'hey', 'greetings'];
    const isGreeting = greetings.some(g =>
      sanitizedMessage.toLowerCase().trim().startsWith(g)
    );

    let prompt: string;
    let retrievedSections: any[] = [];

    if (isGreeting) {
      prompt = buildWelcomePrompt();
    } else {
      // 6. Retrieve relevant context from knowledge base
      retrievedSections = searchKnowledgeBase(sanitizedMessage);

      // Take top 3 most relevant sections to keep context concise
      const topSections = retrievedSections.slice(0, 3);

      // 7. Build prompt with retrieved context
      prompt = buildPrompt(sanitizedMessage, topSections);
    }

    // 8. Call Gemini API
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: language === 'es' 
        ? SYSTEM_INSTRUCTION.replace(/You are/g, 'Eres').replace(/you/g, 'tú').replace(/your/g, 'tu')
        : SYSTEM_INSTRUCTION,
    });

    const languageInstruction = language === 'es'
      ? '\n\nIMPORTANTE: Responde SIEMPRE en español, sin importar el idioma de la pregunta.'
      : '\n\nIMPORTANT: Always respond in English, regardless of the question language.';
    
    const result = await model.generateContent(prompt + languageInstruction);
    const response = result.response;
    let text = response.text();

    // 9. Truncate if too long
    if (text.length > MAX_RESPONSE_LENGTH) {
      text = text.substring(0, MAX_RESPONSE_LENGTH) + '...';
    }

    // 10. Validate response for hallucinations
    const validation = validateResponse(text);

    if (!validation.isValid) {
      console.warn('Response validation failed:', validation.issues);
      // In production, you might want to log this and return a safe fallback
      return NextResponse.json({
        response: "I don't have that specific information, but I can connect you with our team who can help. Please use the contact form on our website.",
        source: 'fallback',
        metadata: {
          validationFailed: true,
          issues: validation.issues
        }
      });
    }

    // 11. Return successful response
    return NextResponse.json({
      response: text,
      source: 'gemini',
      metadata: {
        isOnTopic: true,
        category: classification.category,
        confidence: classification.confidence,
        sectionsRetrieved: retrievedSections.length,
        rateLimitRemaining: rateLimitResult.remaining
      }
    });

  } catch (error) {
    console.error('Chat API error:', error);

    // Don't expose internal errors to client
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Sorry, something went wrong. Please try again later.'
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS (if needed)
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 });
}
