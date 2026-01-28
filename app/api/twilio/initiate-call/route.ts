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

    // 4. Validate ElevenLabs phone number ID is configured
    if (!process.env.ELEVENLABS_PHONE_NUMBER_ID) {
      console.error('[INITIATE_CALL] Missing ELEVENLABS_PHONE_NUMBER_ID');
      return NextResponse.json(
        {
          success: false,
          error: 'CONFIGURATION_ERROR',
          message: 'ElevenLabs phone number ID not configured. Please contact support.',
        },
        { status: 500 }
      );
    }

    // 5. Initiate call through ElevenLabs Twilio API
    const elevenLabsResponse = await fetch(
      'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: process.env.ELEVENLABS_PHONE_NUMBER_ID,
          to_number: formattedPhone,
          conversation_initiation_client_data: customVariables ? {
            dynamic_variables: customVariables,
          } : undefined,
        }),
      }
    );

    if (!elevenLabsResponse.ok) {
      const errorText = await elevenLabsResponse.text();
      console.error('[INITIATE_CALL] ElevenLabs call failed:', {
        status: elevenLabsResponse.status,
        error: errorText,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'ELEVENLABS_ERROR',
          message: 'Failed to initiate call through ElevenLabs. Please try again.',
        },
        { status: 500 }
      );
    }

    const elevenLabsData = await elevenLabsResponse.json();

    console.log('[INITIATE_CALL] ElevenLabs call initiated:', {
      conversationId: elevenLabsData.conversation_id,
      callSid: elevenLabsData.callSid,
    });

    // 6. Save call record to Firebase
    const callRecord = {
      callSid: elevenLabsData.callSid || `EL_${Date.now()}`,
      conversationId: elevenLabsData.conversation_id || undefined,
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
      callSid: elevenLabsData.callSid,
      conversationId: elevenLabsData.conversation_id,
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
