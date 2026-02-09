import { NextRequest, NextResponse } from 'next/server';
import {
  getRecentWhatsAppConversations,
  updateConversationStatus,
  ConversationStatus,
} from '@/lib/firebase';

/**
 * GET - List recent WhatsApp conversations
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const phoneNumberId = searchParams.get('phoneNumberId') || undefined;

    const conversations = await getRecentWhatsAppConversations(limit, phoneNumberId);

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

/**
 * PUT - Update conversation status (open/resolved/archived)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, status } = body as {
      conversationId: string;
      status: ConversationStatus;
    };

    if (!conversationId || !status) {
      return NextResponse.json(
        { success: false, error: 'conversationId and status are required' },
        { status: 400 }
      );
    }

    const validStatuses: ConversationStatus[] = ['open', 'resolved', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status' },
        { status: 400 }
      );
    }

    const result = await updateConversationStatus(conversationId, status);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[CONVERSATIONS API] Error updating status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update conversation status' },
      { status: 500 }
    );
  }
}
