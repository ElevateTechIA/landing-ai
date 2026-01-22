# Chatbot Quick Start Guide

## 🚀 Getting Started (5 minutes)

### 1. Get Your API Key
1. Visit: https://aistudio.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key

### 2. Configure Environment
Create `.env.local` in project root:
```bash
GEMINI_API_KEY=paste_your_key_here
```

### 3. Install & Run
```bash
npm install
npm run dev
```

Visit http://localhost:3000 - the chatbot button appears in the bottom-right corner!

---

## ✅ Quick Test

Try these questions in the chatbot:

**Should Work:**
- "What services do you offer?"
- "How does your process work?"
- "What technology do you use?"
- "How can I contact you?"

**Should Be Refused:**
- "What is Python?"
- "Tell me a joke"
- "How do I code a website?"

---

## 📝 How to Add Information

Edit `app/lib/chatbot/knowledgeBase.ts`:

```typescript
{
  id: 'my-new-info',
  category: 'services',  // services, process, technology, contact
  keywords: ['keyword1', 'keyword2'],
  priority: 7,
  content: `Your information here...`
}
```

**That's it!** The chatbot will immediately use the new information.

---

## 🔧 Common Customizations

### Change Response Length
`app/api/chat/route.ts`:
```typescript
const MAX_RESPONSE_LENGTH = 1000;  // Change this number
```

### Change Rate Limit
`app/lib/chatbot/rateLimiter.ts`:
```typescript
const MAX_REQUESTS_PER_WINDOW = 10;  // Requests per minute
```

### Add New Topic Category
1. Add to `ALLOWED_PATTERNS` in `questionClassifier.ts`
2. Add sections to `knowledgeBase.ts` with new category
3. Done!

---

## 🐛 Troubleshooting

**Chatbot not showing?**
- Check browser console for errors
- Verify `.env.local` exists with API key
- Restart dev server

**Getting wrong answers?**
- Check knowledge base for conflicting info
- Review keywords for retrieval

**Rate limit too strict?**
- Increase in `rateLimiter.ts`
- Or wait 1 minute between bursts

---

## 📚 Full Documentation

See `CHATBOT_README.md` for complete details on:
- Architecture
- Security features
- Anti-hallucination strategy
- Testing
- Production deployment

---

## 🎯 Key Features

✅ Domain-restricted (only answers business questions)
✅ Anti-hallucination (never invents information)
✅ RAG-style retrieval (searches knowledge base)
✅ Rate limiting (prevents abuse)
✅ Input sanitization (blocks prompt injection)
✅ Response validation (detects uncertain language)
✅ Clean, accessible UI

---

## 📞 Example Interactions

**User:** "What do you do?"
**Bot:** Lists services with descriptions

**User:** "How long does a project take?"
**Bot:** Explains timeline varies, provides discovery phase info

**User:** "Do you use React?"
**Bot:** Yes, explains why React/Next.js for web apps

**User:** "How much does it cost?"
**Bot:** Explains pricing depends on scope, offers consultation

**User:** "What is Python?"
**Bot:** "I can help with questions about our software and AI services, but not with that topic..."

---

**Need more help?** Read the full documentation in `CHATBOT_README.md`
