import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIdentifier } from '@/app/lib/chatbot/rateLimiter';
import { formatPhoneNumber, isValidPhoneNumber, makeOutboundCall } from '@/lib/twilio';
import { saveCall } from '@/lib/firebase';

/**
 * API Endpoint: Initiate Outbound Call
 * Starts a phone call from your Twilio number to a customer
 * POST /api/twilio/initiate-call
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting check
    const clientId = getClientIdentifier(request);
    const rateLimitResult = checkRateLimit(clientId);

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many call requests. Please try again later.',
          resetTime: rateLimitResult.resetTime,
        },
        { status: 429 }
      );
    }

    // 2. Parse and validate request body
    const body = await request.json();
    const {
      phoneNumber,
      customerName,
      customerEmail,
      agentId,
      customVariables,
    } = body;

    // Validate required fields
    if (!phoneNumber) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_PHONE_NUMBER',
          message: 'Phone number is required',
        },
        { status: 400 }
      );
    }

    if (!agentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'MISSING_AGENT_ID',
          message: 'Agent ID is required',
        },
        { status: 400 }
      );
    }

    // 3. Validate phone number format
    const formattedPhone = formatPhoneNumber(phoneNumber);

    if (!isValidPhoneNumber(formattedPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: 'INVALID_PHONE_NUMBER',
          message: 'Invalid phone number format. Use E.164 format: +1234567890',
        },
        { status: 400 }
      );
    }

    console.log('[INITIATE_CALL] Starting outbound call:', {
      phone: formattedPhone,
      customerName,
      agentId,
    });

    // 4. Create TwiML URL for connecting to ElevenLabs
    // ElevenLabs will create the conversation when Twilio connects via WebSocket
    const twimlUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/twilio/twiml/connect-agent?agent_id=${agentId}&customer_name=${encodeURIComponent(customerName || '')}`;

    // 5. Initiate call via Twilio
    const twilioResult = await makeOutboundCall(
      formattedPhone,
      process.env.TWILIO_PHONE_NUMBER!,
      twimlUrl
    );

    if (!twilioResult.success) {
      console.error('[INITIATE_CALL] Twilio call failed:', twilioResult.error);
      return NextResponse.json(
        {
          success: false,
          error: 'TWILIO_ERROR',
          message: 'Failed to initiate call. Please check the phone number and try again.',
        },
        { status: 500 }
      );
    }

    console.log('[INITIATE_CALL] Twilio call initiated:', twilioResult.callSid);

    // 6. Save call record to Firebase
    const callRecord = {
      callSid: twilioResult.callSid!,
      conversationId: undefined, // Will be set later when ElevenLabs creates it
      phoneNumber: formattedPhone,
      customerName: customerName || undefined,
      customerEmail: customerEmail || undefined,
      direction: 'outbound' as const,
      status: 'initiated' as const,
      agentId,
      customVariables,
      initiatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const saveResult = await saveCall(callRecord);

    if (!saveResult.success) {
      console.error('[INITIATE_CALL] Failed to save to Firebase:', saveResult.error);
      // Continue even if Firebase save fails - call is already initiated
    }

    // 7. Return success response
    return NextResponse.json({
      success: true,
      callSid: twilioResult.callSid,
      callId: saveResult.callId,
      status: 'initiated',
      message: 'Call initiated successfully. Customer will receive call shortly.',
    });
  } catch (error) {
    console.error('[INITIATE_CALL] Unexpected error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 });
}
