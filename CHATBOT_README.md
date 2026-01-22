# Domain-Restricted Chatbot Documentation

## Overview

This chatbot is a **domain-restricted, anti-hallucination AI assistant** built for the landing page. It answers ONLY questions about:
- Our services
- Our process and methodology
- Our technology stack
- How to contact us

The chatbot will **refuse to answer** questions outside this scope and will **never invent information**.

---

## Architecture

### 1. Knowledge Base (`app/lib/chatbot/knowledgeBase.ts`)

The chatbot's **single source of truth**. All information must be explicitly defined here.

**Structure:**
```typescript
interface KnowledgeSection {
  id: string;              // Unique identifier
  category: string;        // services, process, technology, contact, etc.
  keywords: string[];      // Search keywords for retrieval
  content: string;         // The actual information
  priority: number;        // Relevance weight (higher = more important)
}
```

**Key Functions:**
- `searchKnowledgeBase(query)` - RAG-style retrieval using keyword matching
- `getSectionsByCategory(category)` - Get all sections in a category
- `getCategories()` - List all available categories

**How to Update:**
Simply edit the `knowledgeBase` array in this file. The chatbot will automatically use the new information.

---

### 2. Question Classifier (`app/lib/chatbot/questionClassifier.ts`)

Determines if a question is **on-topic** or **off-topic** before sending to Gemini.

**Classification Process:**
1. Check for blocked patterns (general knowledge, coding help, etc.)
2. Check for allowed patterns (services, process, technology, contact)
3. Return classification: `{ isAllowed, category, confidence, reason }`

**Key Functions:**
- `classifyQuestion(question)` - Main classification logic
- `getOffTopicResponse()` - Returns refusal message for off-topic questions
- `sanitizeInput(input)` - Removes potential prompt injection attempts

**Anti-Injection Protection:**
- Removes "system:", "assistant:", "user:" patterns
- Limits input length to 500 characters
- Normalizes whitespace

---

### 3. Prompt Templates (`app/lib/chatbot/promptTemplates.ts`)

Contains the **system instruction** and prompt builders that enforce strict behavior.

**System Instruction (Critical):**
The system instruction enforces:
- Domain restriction (only answer business questions)
- Knowledge base only (no external information)
- Honest "I don't know" responses
- Professional tone
- Security (ignore override attempts)

**Key Functions:**
- `buildPrompt(question, sections)` - Constructs prompt with retrieved context
- `buildWelcomePrompt()` - Special prompt for greetings
- `validateResponse(response)` - Checks for hallucination patterns

**Response Validation:**
Detects hallucination indicators:
- Uncertain language ("I think", "probably", "might be")
- External links (unless to our site)
- Competitor mentions

---

### 4. Rate Limiter (`app/lib/chatbot/rateLimiter.ts`)

Prevents abuse with **per-IP rate limiting**.

**Configuration:**
- **10 requests per minute** per IP address
- In-memory store (use Redis in production)
- Automatic cleanup of old entries

**Key Functions:**
- `checkRateLimit(identifier)` - Returns `{ allowed, remaining, resetTime }`
- `getClientIdentifier(request)` - Extracts IP from request headers

---

### 5. API Route (`app/api/chat/route.ts`)

The **backend endpoint** that orchestrates everything.

**Request Flow:**
```
1. Rate Limiting → Check if IP is within limits
2. Input Validation → Ensure message exists and is valid
3. Input Sanitization → Remove injection attempts
4. Question Classification → Determine if on-topic
5. Context Retrieval → Search knowledge base (RAG)
6. Prompt Construction → Build prompt with system instruction + context
7. Gemini API Call → Generate response
8. Response Validation → Check for hallucinations
9. Return Response → Send to client
```

**Error Handling:**
- 429: Rate limit exceeded
- 400: Invalid input
- 500: Internal server error (doesn't expose details)

**Response Format:**
```json
{
  "response": "The assistant's answer",
  "source": "gemini" | "classification" | "fallback",
  "metadata": {
    "isOnTopic": true,
    "category": "services",
    "confidence": "high",
    "sectionsRetrieved": 3,
    "rateLimitRemaining": 7
  }
}
```

---

### 6. UI Component (`app/components/Chatbot.tsx`)

A clean, accessible chat interface.

**Features:**
- Fixed position chat bubble (bottom-right)
- Expandable chat window
- Message history
- Loading states
- Error handling
- Clear chat functionality
- Auto-scroll to latest message
- Keyboard support (Enter to send)

---

## Setup Instructions

### 1. Get Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Copy the key

### 2. Configure Environment Variables
Create a `.env.local` file in the project root:
```bash
GEMINI_API_KEY=your_api_key_here
```

### 3. Install Dependencies
```bash
npm install @google/generative-ai
```

### 4. Start Development Server
```bash
npm run dev
```

The chatbot will appear as a floating button in the bottom-right corner.

---

## Usage Examples

### ✅ ALLOWED Questions

**Services:**
- "What services do you offer?"
- "Can you build custom software?"
- "Do you do AI automation?"

**Process:**
- "How does your process work?"
- "How long does a project take?"
- "What happens after I contact you?"

**Technology:**
- "What technologies do you use?"
- "Do you use React?"
- "What cloud platform do you use?"

**Contact:**
- "How can I contact you?"
- "Do you offer free consultations?"
- "How much does it cost?"

### ❌ BLOCKED Questions

**General Knowledge:**
- "What is React?"
- "How does AI work?"
- "Who invented Python?"

**Coding Help:**
- "How do I build a website?"
- "Debug my code"
- "Write me a function"

**Unrelated Topics:**
- "What's the weather?"
- "Tell me a joke"
- "Recipe for cookies"

---

## Customization Guide

### Adding New Information

Edit `app/lib/chatbot/knowledgeBase.ts`:

```typescript
{
  id: 'new-section-id',
  category: 'services',  // or process, technology, contact, etc.
  keywords: ['keyword1', 'keyword2'],  // Words that trigger this section
  priority: 7,  // Higher = more relevant (1-10)
  content: `Your information here...`
}
```

### Adjusting Rate Limits

Edit `app/lib/chatbot/rateLimiter.ts`:

```typescript
const RATE_LIMIT_WINDOW = 60 * 1000;  // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;   // 10 requests
```

### Changing Response Length

Edit `app/api/chat/route.ts`:

```typescript
const MAX_RESPONSE_LENGTH = 1000;  // characters
```

### Adding New Allowed Categories

1. Add keywords to `ALLOWED_PATTERNS` in `questionClassifier.ts`
2. Add new category to knowledge base
3. Update type definition for `QuestionClassification`

---

## Security Features

### 1. Prompt Injection Prevention
- Sanitizes user input
- Removes "system:", "assistant:", "user:" patterns
- System instruction explicitly ignores override attempts

### 2. Rate Limiting
- 10 requests per minute per IP
- Prevents spam and abuse
- Returns 429 status when exceeded

### 3. Input Validation
- Max length: 500 characters
- Type checking
- Whitespace normalization

### 4. Domain Restriction
- Pre-classification before API call
- Knowledge base as single source
- Validation of responses

### 5. Error Handling
- Never exposes internal errors
- Generic error messages for clients
- Detailed logging (server-side only)

---

## Anti-Hallucination Strategy

### 1. Knowledge Base Only
- Chatbot can ONLY use predefined information
- No general knowledge from Gemini's training
- Context is explicitly provided in every prompt

### 2. Strict System Instruction
- Clear rules: "Use ONLY the provided context"
- Explicit "I don't know" behavior
- Refusal to answer outside domain

### 3. RAG-Style Retrieval
- Search knowledge base for relevant sections
- Pass only top 3 most relevant sections
- If no sections found → "I don't have that information"

### 4. Response Validation
- Detects uncertain language patterns
- Checks for external links
- Flags competitor mentions

### 5. Question Classification
- Rejects off-topic questions before API call
- Saves costs and prevents misuse

---

## Testing Checklist

### On-Topic Questions
- [ ] Services question → Correct answer from knowledge base
- [ ] Process question → Correct answer from knowledge base
- [ ] Technology question → Correct answer from knowledge base
- [ ] Contact question → Correct answer from knowledge base
- [ ] Greeting → Friendly introduction

### Off-Topic Questions
- [ ] General knowledge → Polite refusal
- [ ] Coding help → Polite refusal
- [ ] Unrelated topic → Polite refusal

### Edge Cases
- [ ] Empty message → Rejected
- [ ] Very long message → Truncated
- [ ] Prompt injection attempt → Sanitized
- [ ] Rate limit → 429 error after 10 requests
- [ ] Unknown information → "I don't have that information"

### UI/UX
- [ ] Chat opens/closes smoothly
- [ ] Messages auto-scroll
- [ ] Loading state shows
- [ ] Errors display properly
- [ ] Clear chat works
- [ ] Enter key sends message

---

## Production Considerations

### 1. Replace In-Memory Rate Limiter
Use **Redis** or **Upstash** for production:
```typescript
// Example with Upstash Redis
import { Redis } from '@upstash/redis';
const redis = new Redis({ /* config */ });
```

### 2. Add Logging
Implement structured logging:
```typescript
import winston from 'winston';
logger.info('Chat request', { userId, question, category });
```

### 3. Add Analytics
Track chatbot usage:
- Questions asked by category
- Response times
- Error rates
- User satisfaction

### 4. Monitor API Costs
- Log Gemini API calls
- Set usage alerts
- Implement daily budget limits

### 5. Content Moderation
Add profanity filter or toxicity detection if needed.

### 6. CORS Configuration
If chatbot will be used cross-origin, configure CORS properly.

---

## Troubleshooting

### Chatbot Not Responding
1. Check `GEMINI_API_KEY` is set in `.env.local`
2. Verify API key is valid
3. Check browser console for errors
4. Check server logs for API errors

### Off-Topic Answers
1. Review knowledge base for conflicting information
2. Check classification keywords
3. Strengthen system instruction
4. Add validation for specific topics

### Rate Limit Too Strict
1. Increase `MAX_REQUESTS_PER_WINDOW`
2. Increase `RATE_LIMIT_WINDOW`
3. Implement user-based rate limiting (requires auth)

### Slow Responses
1. Use `gemini-1.5-flash` (faster model)
2. Reduce number of retrieved sections
3. Implement response caching for common questions

---

## API Reference

### POST /api/chat

**Request:**
```json
{
  "message": "What services do you offer?"
}
```

**Response (Success):**
```json
{
  "response": "We offer five core services...",
  "source": "gemini",
  "metadata": {
    "isOnTopic": true,
    "category": "services",
    "confidence": "high",
    "sectionsRetrieved": 3,
    "rateLimitRemaining": 7
  }
}
```

**Response (Off-Topic):**
```json
{
  "response": "I can help with questions about our software and AI services, but not with that topic...",
  "source": "classification",
  "metadata": {
    "isOnTopic": false,
    "reason": "Off-topic: appears to be a general knowledge question"
  }
}
```

**Response (Rate Limited):**
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again in a moment.",
  "resetTime": 1703001234567
}
```

---

## Maintenance

### Weekly
- Review chat logs for common questions
- Add missing information to knowledge base

### Monthly
- Analyze popular topics
- Optimize keyword matching
- Update content based on user feedback

### Quarterly
- Review and update system instruction
- Evaluate model performance (consider upgrading to newer models)
- Assess API costs and optimize

---

## Contact & Support

For questions about this chatbot implementation, contact the development team.

**Key Files:**
- Knowledge Base: `app/lib/chatbot/knowledgeBase.ts`
- API Route: `app/api/chat/route.ts`
- UI Component: `app/components/Chatbot.tsx`

**External Resources:**
- [Gemini API Documentation](https://ai.google.dev/docs)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
