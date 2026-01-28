// ElevenLabs API integration for server-side operations
// IMPORTANT: NEVER expose ELEVENLABS_API_KEY to the frontend

interface ElevenLabsCallOptions {
  agentId: string;
  phoneNumber: string;
  metadata?: Record<string, any>;
  customVariables?: Record<string, any>;
}

interface ConversationResponse {
  conversation_id: string;
  agent_id: string;
  status: string;
  created_at: string;
}

/**
 * Register a call with ElevenLabs Conversational AI
 * This is used for custom Twilio integration (outbound calls)
 * @param options - Call configuration options
 * @returns Conversation ID if successful
 */
export async function registerElevenLabsCall(
  options: ElevenLabsCallOptions
): Promise<{ success: boolean; conversationId?: string; error?: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error('[ELEVENLABS] API key not configured');
    return {
      success: false,
      error: 'ELEVENLABS_API_KEY not configured',
    };
  }

  try {
    console.log('[ELEVENLABS] Registering call:', {
      agentId: options.agentId,
      phoneNumber: options.phoneNumber,
      hasMetadata: !!options.metadata,
      hasCustomVariables: !!options.customVariables,
    });

    // Note: This endpoint may vary based on ElevenLabs API version
    // Check current documentation at: https://elevenlabs.io/docs/api-reference
    const response = await fetch(
      'https://api.elevenlabs.io/v1/convai/conversations',
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: options.agentId,
          phone_number: options.phoneNumber,
          metadata: options.metadata || {},
          custom_llm_extra_body: options.customVariables || {},
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ELEVENLABS] API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      });

      return {
        success: false,
        error: `ElevenLabs API error: ${response.status} ${response.statusText}`,
      };
    }

    const data: ConversationResponse = await response.json();

    console.log('[ELEVENLABS] Call registered successfully:', {
      conversationId: data.conversation_id,
      status: data.status,
    });

    return {
      success: true,
      conversationId: data.conversation_id,
    };
  } catch (error) {
    console.error('[ELEVENLABS] Error registering call:', error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Get conversation transcript from ElevenLabs
 * @param conversationId - ElevenLabs conversation ID
 * @returns Conversation data including transcript
 */
export async function getConversationTranscript(conversationId: string): Promise<{
  success: boolean;
  transcript?: Array<{ role: string; content: string; timestamp: string }>;
  metadata?: Record<string, any>;
  error?: string;
}> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    console.error('[ELEVENLABS] API key not configured');
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversations/${conversationId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ELEVENLABS] Error fetching transcript:', {
        status: response.status,
        error: errorText,
      });

      return {
        success: false,
        error: `Failed to fetch transcript: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      transcript: data.transcript || [],
      metadata: data.metadata || {},
    };
  } catch (error) {
    console.error('[ELEVENLABS] Error:', error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Initialize an outbound call via ElevenLabs + Twilio integration
 * This uses ElevenLabs' native Twilio integration endpoint
 * @param agentId - ElevenLabs agent ID
 * @param phoneNumber - Destination phone number (E.164 format)
 * @param agentPhoneNumberId - Your configured phone number ID in ElevenLabs
 * @returns Call details if successful
 */
export async function initiateElevenLabsCall(
  agentId: string,
  phoneNumber: string,
  agentPhoneNumberId: string
): Promise<{ success: boolean; callId?: string; error?: string }> {
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'API key not configured' };
  }

  try {
    const response = await fetch(
      'https://api.elevenlabs.io/v1/convai/agent/call/twilio',
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          agent_phone_number_id: agentPhoneNumberId,
          to_number: phoneNumber,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ELEVENLABS] Error initiating call:', {
        status: response.status,
        error: errorText,
      });

      return {
        success: false,
        error: `Failed to initiate call: ${response.status}`,
      };
    }

    const data = await response.json();

    return {
      success: true,
      callId: data.call_id,
    };
  } catch (error) {
    console.error('[ELEVENLABS] Error:', error);

    if (error instanceof Error) {
      return { success: false, error: error.message };
    }

    return { success: false, error: 'Unknown error occurred' };
  }
}

/**
 * Validate ElevenLabs webhook signature (if applicable)
 * Note: Check ElevenLabs documentation for current webhook security implementation
 * @param signature - Signature from webhook headers
 * @param body - Raw request body
 * @returns true if valid
 */
export function validateElevenLabsWebhook(
  signature: string,
  body: string
): boolean {
  const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[ELEVENLABS] Webhook secret not configured');
    return false;
  }

  // Implementation depends on ElevenLabs' webhook security scheme
  // This is a placeholder - update based on official documentation
  // Typically involves HMAC-SHA256 signature validation

  return true; // TODO: Implement actual validation
}
