import { NextRequest, NextResponse } from 'next/server';
import { getRecentWhatsAppConversations } from '@/lib/firebase';

/**
 * GET - List recent WhatsApp conversations
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');

    const conversations = await getRecentWhatsAppConversations(limit);

    return NextResponse.json({
      success: true,
      conversations,
      total: conversations.length,
    });
  } catch (error) {
    console.error('[CONVERSATIONS API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}
