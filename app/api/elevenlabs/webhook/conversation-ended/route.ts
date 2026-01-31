import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createZoomMeeting } from '@/lib/zoom';
import { createCalendarEvent } from '@/lib/google-calendar';
import { saveMeeting } from '@/lib/firebase';
import { sendMeetingConfirmation, sendHostNotification } from '@/lib/email';
import crypto from 'crypto';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const ELEVENLABS_WEBHOOK_SECRET = process.env.ELEVENLABS_WEBHOOK_SECRET;

// Verify HMAC signature from ElevenLabs
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // ElevenLabs signature format: "t=<timestamp>,v0=<hash>"
  // Extract timestamp and hash
  const timestampMatch = signature.match(/t=(\d+)/);
  const hashMatch = signature.match(/v0=([a-f0-9]+)/);

  if (!timestampMatch || !hashMatch) {
    console.error('[WEBHOOK] Invalid signature format:', signature);
    return false;
  }

  const timestamp = timestampMatch[1];
  const receivedHash = hashMatch[1];

  // Compute expected signature using timestamp.payload format
  const signedPayload = `${timestamp}.${payload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  console.log('[WEBHOOK] Signature verification:', {
    timestamp,
    receivedHash: receivedHash.substring(0, 16) + '...',
    expectedHash: expectedSignature.substring(0, 16) + '...',
    match: receivedHash === expectedSignature
  });

  return receivedHash === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[WEBHOOK] Conversation ended webhook received');

    // 1. Verify HMAC signature (if secret is configured)
    if (ELEVENLABS_WEBHOOK_SECRET) {
      const rawBody = await request.text();
      const signature = request.headers.get('elevenlabs-signature') ||
                       request.headers.get('x-elevenlabs-signature') ||
                       request.headers.get('x-signature') ||
                       '';

      if (!signature) {
        console.warn('[WEBHOOK] Missing signature header - proceeding without verification');
        console.warn('[WEBHOOK] Available headers:', JSON.stringify(Object.fromEntries(request.headers.entries())));
        // Parse JSON from raw body and continue
        var payload = JSON.parse(rawBody);
      } else {
        const isValid = verifyWebhookSignature(rawBody, signature, ELEVENLABS_WEBHOOK_SECRET);

        if (!isValid) {
          console.error('[WEBHOOK] Invalid signature');
          return NextResponse.json({ error: 'Unauthorized - Invalid signature' }, { status: 401 });
        }

        console.log('[WEBHOOK] Signature verified successfully');
        var payload = JSON.parse(rawBody);
      }
    } else {
      console.warn('[WEBHOOK] No ELEVENLABS_WEBHOOK_SECRET configured, skipping signature verification');
      // Parse JSON normally
      var payload = await request.json();
    }

    // 2. Extract data from payload (ElevenLabs sends data in payload.data)
    const data = payload.data;
    if (!data) {
      console.error('[WEBHOOK] Missing data object in payload');
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    const conversation_id = data.conversation_id;
    const transcriptArray = data.transcript || [];

    console.log('[WEBHOOK] Conversation ID:', conversation_id);
    console.log('[WEBHOOK] Transcript messages:', transcriptArray.length);

    // 3. Convert transcript array to text format
    const transcript = transcriptArray
      .map((msg: any) => {
        const role = msg.role === 'agent' ? 'Agent' : 'User';
        const message = msg.message || '';
        return `${role}: ${message}`;
      })
      .join('\n');

    console.log('[WEBHOOK] Transcript length:', transcript.length);

    // 4. Extract information using Gemini AI
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const extractionPrompt = `
Extract the following information from this conversation transcript and return it as JSON:

{
  "name": "full name of the person",
  "email": "email address",
  "phone": "phone number",
  "company": "company name if mentioned",
  "challenge": "main challenge or reason for meeting",
  "preferredDateTime": "preferred date/time mentioned (ISO format if possible)",
  "language": "en" or "es" (detect from conversation),
  "isComplete": true if all required info (name, email, phone) is present
}

Transcript:
${transcript}

Return ONLY the JSON object, no additional text.
    `;

    const result = await model.generateContent(extractionPrompt);
    const extractedText = result.response.text();

    // Parse JSON from response
    const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[WEBHOOK] Failed to extract JSON from AI response');
      return NextResponse.json({ error: 'Failed to extract information' }, { status: 500 });
    }

    const extractedData = JSON.parse(jsonMatch[0]);
    console.log('[WEBHOOK] Extracted data:', extractedData);

    // 5. Fix and validate email format
    if (extractedData.email) {
      const originalEmail = extractedData.email;

      // Fix common email format issues from voice transcription
      let fixedEmail = originalEmail
        .toLowerCase()
        .replace(/\s+at\s+/g, '@')         // "at" -> "@"
        .replace(/\sat\s/g, '@')            // " at " -> "@"
        .replace(/\.arroba\./g, '@')        // ".arroba." -> "@" (Spanish)
        .replace(/arroba/g, '@')            // "arroba" -> "@" (Spanish)
        .replace(/\s+arroba\s+/g, '@')     // " arroba " -> "@" (Spanish with spaces)
        .replace(/\sdot\s/g, '.')           // " dot " -> "."
        .replace(/\spunto\s/g, '.')         // " punto " -> "." (Spanish)
        .replace(/\.com\./g, '.com')        // ".com." -> ".com"
        .replace(/\.net\./g, '.net')        // ".net." -> ".net"
        .replace(/\s+/g, '');               // Remove all spaces

      // If still missing @, try to detect and fix common patterns
      if (!fixedEmail.includes('@')) {
        // Try to detect pattern like "cesarvega.col.gmail.com"
        // Should be "cesarvega.col@gmail.com"
        const parts = fixedEmail.split('.');
        if (parts.length >= 3) {
          // Check if last 2 parts look like a domain (e.g., gmail.com, outlook.com)
          const possibleDomain = parts[parts.length - 2] + '.' + parts[parts.length - 1];
          const commonDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'];

          if (commonDomains.includes(possibleDomain)) {
            // Insert @ before the domain
            const localPart = parts.slice(0, parts.length - 2).join('.');
            fixedEmail = localPart + '@' + possibleDomain;
            console.log('[WEBHOOK] Fixed email format (missing @):', { original: originalEmail, fixed: fixedEmail });
          }
        }
      }

      // Basic email validation
      const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fixedEmail);

      if (originalEmail !== fixedEmail && isValidEmail) {
        console.log('[WEBHOOK] Email format corrected:', { original: originalEmail, fixed: fixedEmail });
        extractedData.email = fixedEmail;
      } else if (!isValidEmail) {
        console.warn('[WEBHOOK] Invalid email format:', fixedEmail);
        extractedData.isComplete = false;
      } else {
        extractedData.email = fixedEmail;
      }
    }

    // 6. Validate required data
    if (!extractedData.isComplete || !extractedData.email || !extractedData.name) {
      console.log('[WEBHOOK] Incomplete data, skipping appointment creation');
      return NextResponse.json({
        success: true,
        message: 'Conversation ended but insufficient data for appointment'
      });
    }

    // 7. Determine meeting date/time
    const meetingDateTime = extractedData.preferredDateTime
      ? new Date(extractedData.preferredDateTime)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

    // 8. Create Zoom meeting
    const zoomMeeting = await createZoomMeeting(
      `Meeting with ${extractedData.name}`,
      meetingDateTime.toISOString(),
      30,
      'America/New_York'
    );

    console.log('[WEBHOOK] Zoom meeting created:', zoomMeeting.join_url);

    // 9. Create Google Calendar event

    const calendarEvent = await createCalendarEvent({
      summary: `Meeting with ${extractedData.name}`,
      description: `Challenge: ${extractedData.challenge || 'Not specified'}\n\nZoom: ${zoomMeeting.join_url}`,
      start: {
        dateTime: meetingDateTime.toISOString(),
        timeZone: 'America/New_York',
      },
      end: {
        dateTime: new Date(meetingDateTime.getTime() + 30 * 60 * 1000).toISOString(),
        timeZone: 'America/New_York',
      },
      attendees: [{ email: extractedData.email }],
    });

    console.log('[WEBHOOK] Calendar event created:', calendarEvent.id);

    // 10. Save to Firebase
    const meetingData = {
      name: extractedData.name,
      email: extractedData.email,
      phone: extractedData.phone || '',
      company: extractedData.company || '',
      challenge: extractedData.challenge || '',
      objectives: '',
      expectations: '',
      budget: '',
      timeline: '',
      scheduledTime: meetingDateTime.toISOString(),
      zoomLink: zoomMeeting.join_url,
      zoomId: zoomMeeting.id.toString(),
      zoomMeetingId: zoomMeeting.id.toString(),
      googleCalendarEventId: calendarEvent.id,
      status: 'scheduled' as const,
      reminderSent: false,
      attended: false,
      source: 'voice_chat' as const,
      conversationId: conversation_id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saveResult = await saveMeeting(meetingData);
    if (saveResult.success) {
      console.log('[WEBHOOK] Meeting saved to Firebase:', saveResult.id);
    } else {
      console.error('[WEBHOOK] Failed to save meeting:', saveResult.error);
    }

    // 11. Send confirmation emails
    const language = extractedData.language || 'en';

    // Send email to client
    await sendMeetingConfirmation({
      to: extractedData.email,
      name: extractedData.name,
      company: extractedData.company || '',
      challenge: extractedData.challenge || '',
      objectives: '',
      budget: '',
      timeline: '',
      scheduledTime: meetingDateTime.toISOString(),
      zoomLink: zoomMeeting.join_url,
      language,
      phone: extractedData.phone || '',
    });

    // Send notification to host
    await sendHostNotification({
      name: extractedData.name,
      email: extractedData.email,
      phone: extractedData.phone || '',
      company: extractedData.company || '',
      challenge: extractedData.challenge || '',
      objectives: '',
      budget: '',
      timeline: '',
      scheduledTime: meetingDateTime.toISOString(),
      zoomLink: zoomMeeting.join_url,
      language,
    });

    console.log('[WEBHOOK] Emails sent successfully');

    return NextResponse.json({
      success: true,
      message: 'Appointment scheduled successfully',
      meetingId: calendarEvent.id,
    });

  } catch (error) {
    console.error('[WEBHOOK] Error processing conversation:', error);
    return NextResponse.json(
      { error: 'Failed to process conversation', details: String(error) },
      { status: 500 }
    );
  }
}
