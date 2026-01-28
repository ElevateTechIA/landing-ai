import { NextRequest, NextResponse } from 'next/server';

/**
 * API Endpoint: TwiML Connect Agent
 * Generates TwiML to connect Twilio call to ElevenLabs WebSocket
 * GET/POST /api/twilio/twiml/connect-agent?conversation_id=xxx&agent_id=xxx
 */
export async function GET(request: NextRequest) {
  return handleTwiMLRequest(request);
}

export async function POST(request: NextRequest) {
  return handleTwiMLRequest(request);
}

async function handleTwiMLRequest(request: NextRequest) {
  try {
    // Extract query parameters
    const searchParams = request.nextUrl.searchParams;
    const conversationId = searchParams.get('conversation_id');
    const agentId = searchParams.get('agent_id');

    if (!conversationId) {
      console.error('[TWIML] Missing conversation_id parameter');
      return new NextResponse(
        generateErrorTwiML('Missing conversation ID'),
        {
          status: 400,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    if (!agentId) {
      console.error('[TWIML] Missing agent_id parameter');
      return new NextResponse(
        generateErrorTwiML('Missing agent ID'),
        {
          status: 400,
          headers: { 'Content-Type': 'text/xml' },
        }
      );
    }

    console.log('[TWIML] Generating TwiML for:', {
      conversationId,
      agentId,
    });

    // Generate TwiML to connect call to ElevenLabs WebSocket
    const twiml = generateConnectTwiML(conversationId, agentId);

    return new NextResponse(twiml, {
      status: 200,
      headers: {
        'Content-Type': 'text/xml',
      },
    });
  } catch (error) {
    console.error('[TWIML] Error generating TwiML:', error);

    return new NextResponse(
      generateErrorTwiML('Internal server error'),
      {
        status: 500,
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  }
}

/**
 * Generate TwiML to connect Twilio call to ElevenLabs WebSocket
 * @param conversationId - ElevenLabs conversation ID
 * @param agentId - ElevenLabs agent ID
 * @returns TwiML XML string
 */
function generateConnectTwiML(conversationId: string, agentId: string): string {
  // ElevenLabs WebSocket URL for conversation
  const websocketUrl = `wss://api.elevenlabs.io/v1/convai/conversation?conversation_id=${conversationId}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${websocketUrl}">
      <Parameter name="agent_id" value="${agentId}" />
      <Parameter name="conversation_id" value="${conversationId}" />
    </Stream>
  </Connect>
</Response>`;
}

/**
 * Generate error TwiML to say error message and hang up
 * @param message - Error message to say
 * @returns TwiML XML string
 */
function generateErrorTwiML(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="en-US">We're sorry, but we encountered an error: ${message}. Please try again later.</Say>
  <Hangup />
</Response>`;
}
