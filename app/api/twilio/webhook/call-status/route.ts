import { NextRequest, NextResponse } from 'next/server';
import { validateTwilioSignature } from '@/lib/twilio';
import { getCallBySid, updateCallStatus } from '@/lib/firebase';

/**
 * Twilio Webhook: Call Status Updates
 * Receives status updates for all calls (initiated, ringing, answered, completed)
 * https://www.twilio.com/docs/voice/api/call-resource#statuscallback
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Validate Twilio signature for security
    const twilioSignature = request.headers.get('x-twilio-signature');

    if (!twilioSignature) {
      console.error('[TWILIO_WEBHOOK] Missing Twilio signature');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Parse form-encoded data (Twilio sends form data, not JSON)
    const formData = await request.formData();
    const params = Object.fromEntries(formData.entries()) as Record<string, string>;
    const url = request.url;

    // Validate signature
    const isValid = validateTwilioSignature(twilioSignature, url, params);

    if (!isValid) {
      console.error('[TWILIO_WEBHOOK] Invalid signature');
      return NextResponse.json(
        { error: 'Forbidden - Invalid signature' },
        { status: 403 }
      );
    }

    // 2. Extract call data from webhook
    const {
      CallSid,
      From,
      To,
      CallStatus,
      Direction,
      Duration,
      RecordingUrl,
      Timestamp,
    } = params;

    console.log('[TWILIO-STATUS] Call SID:', CallSid);
    console.log('[TWILIO-STATUS] Status:', CallStatus);
    console.log('[TWILIO-STATUS] Direction:', Direction);
    console.log('[TWILIO-STATUS] Duration:', Duration);

    // Log all form data for debugging
    console.log('[TWILIO-STATUS] All params:', params);

    if (!CallSid) {
      return NextResponse.json(
        { error: 'Missing CallSid' },
        { status: 400 }
      );
    }

    // 3. Find call record in Firebase
    const callRecord = await getCallBySid(CallSid);

    if (!callRecord) {
      console.warn('[TWILIO_WEBHOOK] Call record not found for SID:', CallSid);
      // This might be an inbound call not yet in our database
      // Could create a new record here if needed
      return NextResponse.json({ message: 'Call record not found, but webhook received' });
    }

    // 4. Prepare update data based on status
    const updates: Partial<typeof callRecord> = {
      status: CallStatus as any,
    };

    // Update specific timestamps based on status
    switch (CallStatus) {
      case 'ringing':
        updates.status = 'ringing';
        break;

      case 'in-progress':
        updates.status = 'in-progress';
        updates.answeredAt = new Date(Timestamp || Date.now());
        break;

      case 'completed':
        updates.status = 'completed';
        updates.endedAt = new Date(Timestamp || Date.now());
        updates.duration = Duration ? parseInt(Duration, 10) : undefined;
        updates.recordingUrl = RecordingUrl || undefined;
        break;

      case 'busy':
      case 'no-answer':
      case 'failed':
      case 'canceled':
        updates.status = CallStatus as any;
        updates.endedAt = new Date(Timestamp || Date.now());
        updates.failureReason = CallStatus;
        break;

      default:
        console.warn('[TWILIO_WEBHOOK] Unknown call status:', CallStatus);
    }

    // 5. Update Firebase
    const updateResult = await updateCallStatus(callRecord.id!, updates);

    if (!updateResult.success) {
      console.error('[TWILIO_WEBHOOK] Failed to update Firebase:', updateResult.error);
    }

    // 6. Handle post-call actions
    if (CallStatus === 'completed') {
      console.log('[TWILIO-STATUS] Call completed, webhook should handle scheduling');

      // Log call completion details
      console.log('[TWILIO_WEBHOOK] Call completed:', {
        customer: callRecord.customerName,
        phone: callRecord.phoneNumber,
        email: callRecord.customerEmail,
        direction: callRecord.direction,
        duration: Duration,
        recordingUrl: RecordingUrl,
      });

      // NOTE: Appointment scheduling is now handled by ElevenLabs webhook
      // at /api/elevenlabs/webhook/conversation-ended
      // This webhook receives the conversation.ended event and processes
      // the transcript to create Zoom meeting, calendar event, and send emails
    }

    // 7. Handle failed calls
    if (['busy', 'no-answer', 'failed'].includes(CallStatus)) {
      console.warn('[TWILIO_WEBHOOK] Call failed:', {
        callSid: CallSid,
        status: CallStatus,
        customer: callRecord.customerName,
      });

      // TODO: Send follow-up email or SMS
      // TODO: Update CRM/lead score
    }

    // 8. Return success response
    return NextResponse.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('[TWILIO_WEBHOOK] Error processing webhook:', error);

    // Return 200 even on error to prevent Twilio from retrying excessively
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 200 } // Return 200 to acknowledge receipt
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 });
}
