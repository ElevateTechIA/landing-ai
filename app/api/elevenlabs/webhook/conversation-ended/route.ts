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
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === expectedSignature;
}

export async function POST(request: NextRequest) {
  try {
    console.log('[WEBHOOK] Conversation ended webhook received');

    // 1. Verify HMAC signature (if secret is configured)
    if (ELEVENLABS_WEBHOOK_SECRET) {
      const rawBody = await request.text();
      const signature = request.headers.get('x-elevenlabs-signature') ||
                       request.headers.get('x-signature') ||
                       '';

      if (!signature) {
        console.error('[WEBHOOK] Missing signature header');
        return NextResponse.json({ error: 'Unauthorized - Missing signature' }, { status: 401 });
      }

      const isValid = verifyWebhookSignature(rawBody, signature, ELEVENLABS_WEBHOOK_SECRET);

      if (!isValid) {
        console.error('[WEBHOOK] Invalid signature');
        return NextResponse.json({ error: 'Unauthorized - Invalid signature' }, { status: 401 });
      }

      console.log('[WEBHOOK] Signature verified successfully');

      // Parse JSON from raw body
      var payload = JSON.parse(rawBody);
    } else {
      console.warn('[WEBHOOK] No ELEVENLABS_WEBHOOK_SECRET configured, skipping signature verification');
      // Parse JSON normally
      var payload = await request.json();
    }

    const { conversation_id, ended_at, end_reason } = payload;

    console.log('[WEBHOOK] Conversation ID:', conversation_id);
    console.log('[WEBHOOK] End reason:', end_reason);

    // 2. Fetch conversation transcript from ElevenLabs
    const transcriptResponse = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversation_id}`,
      {
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    if (!transcriptResponse.ok) {
      throw new Error(`Failed to fetch transcript: ${transcriptResponse.statusText}`);
    }

    const conversationData = await transcriptResponse.json();
    const transcript = conversationData.transcript || '';

    console.log('[WEBHOOK] Transcript length:', transcript.length);

    // 3. Extract information using Gemini AI
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

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

    // 4. Validate required data
    if (!extractedData.isComplete || !extractedData.email || !extractedData.name) {
      console.log('[WEBHOOK] Incomplete data, skipping appointment creation');
      return NextResponse.json({
        success: true,
        message: 'Conversation ended but insufficient data for appointment'
      });
    }

    // 5. Determine meeting date/time
    const meetingDateTime = extractedData.preferredDateTime
      ? new Date(extractedData.preferredDateTime)
      : new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow

    // 6. Create Zoom meeting
    const zoomMeeting = await createZoomMeeting(
      `Meeting with ${extractedData.name}`,
      meetingDateTime.toISOString(),
      30,
      'America/New_York'
    );

    console.log('[WEBHOOK] Zoom meeting created:', zoomMeeting.join_url);

    // 7. Create Google Calendar event

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

    // 8. Save to Firebase
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

    // 9. Send confirmation emails
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
