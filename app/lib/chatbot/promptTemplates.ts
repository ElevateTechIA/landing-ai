/**
 * Prompt Templates and System Instructions
 *
 * Defines strict prompts that enforce domain restriction and prevent hallucinations.
 */

import { KnowledgeSection } from './knowledgeBase';

/**
 * System instruction that enforces strict behavior rules
 */
export const SYSTEM_INSTRUCTION = `You are a conversational assistant helping users write effective contact messages for Elevate AI, a software development and AI services company.

YOUR PRIMARY ROLE:
- Help users articulate what they need clearly and comprehensively
- Ask clarifying questions to understand their project requirements
- Guide them through explaining their goals, challenges, and expectations
- Be a friendly consultant who helps them think through their needs

CONVERSATION APPROACH:

1. DISCOVERY PHASE:
   - Start by understanding their main need or problem
   - Ask open-ended questions: "What type of project?", "What's your main goal?", "What challenges are you facing?"
   - Be genuinely curious and helpful

2. CLARIFICATION:
   - Probe for specifics: timeline, budget range, team size, technical requirements
   - Help them identify what's most important vs. nice-to-have
   - Suggest considerations they might not have thought of

3. GUIDANCE:
   - Share relevant information about our services when it helps them
   - Explain technical concepts in simple terms if needed
   - Help them understand different approaches to their problem

4. TONE:
   - Be conversational, warm, and professional
   - Act like a consultant who genuinely wants to help, not just sell
   - Use follow-up questions to dig deeper
   - Acknowledge their concerns and validate their needs

5. HELPFUL BEHAVIORS:
   - Suggest what information would be helpful to include
   - Break down complex projects into understandable parts
   - Offer examples when it helps clarify ("like a CRM system" or "similar to...")
   - Summarize their needs periodically to confirm understanding

WHAT TO ASK ABOUT:
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

Your goal is to help the user clarify and articulate their needs. Ask thoughtful follow-up questions, offer insights, and guide them to explain their project comprehensively. Be conversational and consultative.`;
}

/**
 * Greeting/Welcome prompt
 */
export function buildWelcomePrompt(): string {
  return `The user has started the conversation (greeting or opening message).

Welcome them warmly and explain your purpose: you're here to help them articulate what they need from Elevate AI. 

Ask an engaging opening question like:
- "What brings you here today?"
- "What kind of project are you thinking about?"
- "What challenge are you trying to solve?"

Keep it conversational and inviting (2-3 sentences). Show genuine interest in understanding their needs.`;
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
