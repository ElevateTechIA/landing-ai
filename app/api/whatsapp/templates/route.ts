import { NextRequest, NextResponse } from 'next/server';
import { getWhatsAppConfig, getDefaultWhatsAppConfig } from '@/lib/whatsapp-config';

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

interface TemplateComponent {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
  format?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  text?: string;
  buttons?: Array<{
    type: string;
    text: string;
    url?: string;
    phone_number?: string;
  }>;
  example?: {
    header_text?: string[];
    body_text?: string[][];
  };
}

interface MessageTemplate {
  name: string;
  language: string;
  category: string;
  status: string;
  components: TemplateComponent[];
  id: string;
}

// Per-WABA cache (5 min TTL)
const templateCache: Record<string, { templates: MessageTemplate[]; timestamp: number }> = {};
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * GET /api/whatsapp/templates?phoneNumberId=xxx
 * List approved message templates from the WhatsApp Business Account
 */
export async function GET(request: NextRequest) {
  try {
    const phoneNumberId = request.nextUrl.searchParams.get('phoneNumberId') || '';
    const config = getWhatsAppConfig(phoneNumberId) || getDefaultWhatsAppConfig();

    if (!config || !config.accessToken || !config.wabaId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing WhatsApp config (access token or WABA ID)',
        },
        { status: 500 }
      );
    }

    const { accessToken, wabaId } = config;

    // Return cached if still valid (keyed by wabaId)
    const cached = templateCache[wabaId];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return NextResponse.json({ success: true, templates: cached.templates });
    }

    const response = await fetch(
      `${WHATSAPP_API_URL}/${wabaId}/message_templates?status=APPROVED&limit=100`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[TEMPLATES API] Error fetching templates:', errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.error?.message || 'Failed to fetch templates',
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const templates: MessageTemplate[] = (data.data || []).map(
      (t: Record<string, unknown>) => ({
        id: t.id as string,
        name: t.name as string,
        language: t.language as string,
        category: t.category as string,
        status: t.status as string,
        components: t.components as TemplateComponent[],
      })
    );

    // Update per-WABA cache
    templateCache[wabaId] = { templates, timestamp: Date.now() };

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('[TEMPLATES API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}
