# ElevenLabs AI Voice Call Setup Guide

This guide will help you set up the AI voice call feature using ElevenLabs Conversational AI.

## Prerequisites

1. An ElevenLabs account (sign up at https://elevenlabs.io)
2. Access to ElevenLabs Conversational AI feature

## Setup Steps

### 1. Create an ElevenLabs Conversational AI Agent

1. Go to https://elevenlabs.io/app/conversational-ai
2. Click "Create Agent" or "New Agent"
3. Configure your agent:
   - **Name**: "Sophie" (or your preferred name)
   - **Voice**: Choose a professional, friendly voice
   - **Language**: English (or your preferred language)
   - **Greeting**: "Hey, you have reached [Your Company Name]. How can I help you today?"
   - **First Message**: Set what the AI says when the call starts

### 2. Configure Agent Behavior

Set up your agent's knowledge base and behavior:

```
System Prompt Example:
You are Sophie, an AI assistant for [Your Company Name]. Your role is to:
- Greet callers warmly and professionally
- Collect their full name, email, and phone number
- Understand what service they're interested in
- Book appointments based on availability
- Confirm all details before ending the call

Available time slots:
- Monday-Friday: 9am-5pm EST
- Book in 1-hour increments

When collecting information:
1. Always confirm spelling of names
2. Repeat email addresses letter by letter
3. Confirm phone numbers digit by digit
4. Ask one question at a time
5. Be patient and friendly

After booking, always:
- Confirm the date and time
- Confirm you'll send a confirmation email
- Ask if there's anything else they need
- Thank them for calling
```

### 3. Get Your Agent ID and API Key

1. In the ElevenLabs dashboard, go to your agent settings
2. Copy your **Agent ID** (looks like: `abc123def456...`)
3. Go to your profile settings and get your **API Key**

### 4. Configure Environment Variables

1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add your credentials:

```bash
NEXT_PUBLIC_ELEVENLABS_AGENT_ID=your-agent-id-here
NEXT_PUBLIC_ELEVENLABS_API_KEY=your-api-key-here
```

Replace the values with your actual Agent ID and API Key.

### 5. Test the Integration

1. Start your development server:
```bash
npm run dev
```

2. Open your browser to `http://localhost:3000`
3. Click the blue phone icon in the bottom-right corner
4. Allow microphone access when prompted
5. Click the green call button to start a call with Sophie

## Features

The AI voice call component includes:

✅ **Real-time voice conversation** with AI
✅ **Call timer** showing call duration
✅ **Mute/Unmute** functionality
✅ **Professional UI** matching your design
✅ **Floating button** for easy access
✅ **Responsive design** works on all devices

## Customization

### Change AI Avatar
Edit `app/components/AIVoiceCall.tsx` and replace the avatar section with an image:

```tsx
<Image
  src="/images/sophie-avatar.jpg"
  alt="AI Sophie"
  width={128}
  height={128}
  className="rounded-full"
/>
```

### Change AI Name
Edit the component and change "AI Sophie" to your preferred name.

### Modify Colors
The component uses Tailwind CSS. Main colors:
- Primary: `blue-600` (can change to your brand color)
- Success: `green-500` (call button)
- Danger: `red-500` (end call button)

### Custom Positioning
Change the floating button position in `AIVoiceCall.tsx`:
```tsx
// Current: bottom-right
className="fixed bottom-6 right-6 ..."

// Bottom-left
className="fixed bottom-6 left-6 ..."

// Top-right
className="fixed top-6 right-6 ..."
```

## Troubleshooting

### Issue: Microphone not working
- **Solution**: Make sure you allow microphone access in your browser
- Check browser console for errors
- Test in Chrome/Edge (best WebRTC support)

### Issue: WebSocket connection fails
- **Solution**: Verify your Agent ID and API Key are correct
- Check that your ElevenLabs account has Conversational AI enabled
- Make sure `.env.local` file is in the project root

### Issue: No audio from AI
- **Solution**: Check your computer's volume settings
- Verify the ElevenLabs agent has a voice selected
- Check browser console for audio decoding errors

### Issue: Call immediately disconnects
- **Solution**: Check your ElevenLabs account has available credits
- Verify the agent is published and active
- Check for error messages in browser console

## Advanced Configuration

### Add Call Analytics

Track call metrics by adding event listeners:

```typescript
ws.onmessage = async (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'conversation_initiation_metadata') {
    // Track call started
    console.log('Call started:', data.conversation_id);
  }

  if (data.type === 'conversation_end') {
    // Track call ended
    console.log('Call ended. Duration:', callDuration);
  }
};
```

### Customize Agent Response

You can send custom context to the agent:

```typescript
ws.send(JSON.stringify({
  type: 'conversation_context',
  context: {
    user_name: 'John Doe',
    page_url: window.location.href,
    referring_source: document.referrer
  }
}));
```

## Cost Considerations

ElevenLabs Conversational AI pricing (as of 2024):
- Charges per minute of conversation
- Different tiers based on voice quality
- Check current pricing at https://elevenlabs.io/pricing

## Support

- ElevenLabs Documentation: https://elevenlabs.io/docs
- ElevenLabs Discord: https://discord.gg/elevenlabs
- Report issues: Check the browser console for error messages

## Next Steps

1. ✅ Set up your ElevenLabs account
2. ✅ Create and configure your AI agent
3. ✅ Add your credentials to `.env.local`
4. ✅ Test the call feature
5. 🎨 Customize the design to match your brand
6. 📊 Add analytics tracking (optional)
7. 🚀 Deploy to production

## Security Notes

⚠️ **Important**:
- Never commit `.env.local` to version control
- The API key is exposed in the frontend (using `NEXT_PUBLIC_` prefix)
- For production, consider proxying through your backend API
- ElevenLabs recommends signed URLs for production use

## Production Deployment

For production, consider:
1. Using signed URLs instead of API keys
2. Rate limiting on your backend
3. Monitoring call volumes and costs
4. A/B testing different agent personalities
5. Recording calls for quality assurance (with user consent)
