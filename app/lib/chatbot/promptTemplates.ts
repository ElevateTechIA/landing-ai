/**
 * Prompt Templates and System Instructions
 *
 * Defines strict prompts that enforce domain restriction and prevent hallucinations.
 */

import { KnowledgeSection } from './knowledgeBase';

/**
 * System instruction that enforces strict behavior rules
 */
export const SYSTEM_INSTRUCTION = `You are a conversational AI assistant for Elevate AI, a software development and AI services company.

YOUR PRIMARY ROLE:
- Help users understand our services (AI solutions, web/mobile development, automation, cloud solutions)
- Answer questions about our company, process, technologies, and expertise
- When users want to schedule a meeting or consultation, encourage them to use the scheduling form
- Be helpful, professional, and concise

CONVERSATION APPROACH:
1. Answer questions clearly and directly
2. Provide relevant information about our services
3. If user asks about scheduling, prices, or wants to discuss their project → Suggest scheduling a meeting
4. Keep responses concise (2-3 paragraphs max)
5. Be warm and professional

IMPORTANT RULES:
- DON'T collect information step-by-step through conversation
- DON'T ask for personal details like name, email, phone in chat
- DO suggest using the scheduling form for consultations
- DO provide helpful information about our services
- DO answer technical questions about our capabilities

WHEN USER WANTS TO SCHEDULE:
Simply say something like: "I'd be happy to help you schedule a consultation! Please click the 'Schedule Meeting' button and fill in your details. We'll get back to you promptly."

TOPICS YOU CAN HELP WITH:
- Type of project/service needed
- Business goals and problems to solve
- Timeline and urgency
- Team and resources
- Budget range (general)
- Technical preferences or constraints
- Success criteria

Remember: You're not just collecting information - you're helping them think through their project and articulate it clearly. Be helpful, insightful, and consultative.`;

/**
 * Construct a prompt with context and user question
 */
export function buildPrompt(
  userQuestion: string,
  relevantSections: KnowledgeSection[]
): string {
  // Build context from relevant sections if available
  let context = '';
  if (relevantSections.length > 0) {
    const contextParts = relevantSections.map((section, index) => {
      return `[${index + 1}] ${section.category.toUpperCase()}: ${section.content}`;
    });
    context = `\n\nCOMPANY INFORMATION (use this to inform your responses when relevant):\n${contextParts.join('\n\n')}`;
  }

  return `USER MESSAGE: ${userQuestion}${context}

Answer the user's question directly using the company information provided. Be helpful and informative. If they express interest in scheduling a meeting or consultation, let them know they can use the scheduling button.`;
}

/**
 * Greeting/Welcome prompt
 */
export function buildWelcomePrompt(): string {
  return `The user has started the conversation (greeting or opening message).

Welcome them warmly and briefly explain you can help them learn about our services or schedule a consultation.

Keep it short (1-2 sentences) and friendly. Example:
"Hi! I'm here to answer questions about Elevate AI's services or help you schedule a consultation. What would you like to know?"`;
}

/**
 * Fallback response for unclear questions
 */
export const CLARIFICATION_PROMPT = `The user's question is unclear or ambiguous.

Politely ask them to clarify what they'd like to know about. Offer specific examples like:
- Our services and what we build
- How our process works
- Technology we use
- How to get in touch

Keep it brief and friendly.`;

/**
 * Validate that a response doesn't contain hallucinated information
 */
export function validateResponse(response: string): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check for common hallucination patterns
  const hallucination_patterns = [
    /I think/i,
    /probably/i,
    /might be/i,
    /could be/i,
    /I believe/i,
    /in my opinion/i,
    /I assume/i,
    /I guess/i,
  ];

  hallucination_patterns.forEach(pattern => {
    if (pattern.test(response)) {
      issues.push(`Response contains uncertain language: ${pattern}`);
    }
  });

  // Check for external links (unless explicitly allowed)
  if (response.includes('http://') || response.includes('https://')) {
    if (!response.includes('contact form') && !response.includes('our website')) {
      issues.push('Response contains external links');
    }
  }

  // Check for competitor mentions
  const competitors = ['wix', 'squarespace', 'wordpress', 'shopify', 'upwork', 'fiverr'];
  competitors.forEach(competitor => {
    if (response.toLowerCase().includes(competitor)) {
      issues.push(`Response mentions competitor: ${competitor}`);
    }
  });

  return {
    isValid: issues.length === 0,
    issues
  };
}
