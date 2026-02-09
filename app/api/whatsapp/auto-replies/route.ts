import { NextRequest, NextResponse } from 'next/server';
import {
  getAutoReplies,
  saveAutoReply,
  updateAutoReply,
  deleteAutoReply,
  AutoReplyType,
} from '@/lib/firebase';

/**
 * GET /api/whatsapp/auto-replies
 * List all auto-reply rules
 */
export async function GET() {
  try {
    const autoReplies = await getAutoReplies();
    return NextResponse.json({ success: true, autoReplies });
  } catch (error) {
    console.error('[AUTO-REPLIES API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch auto-replies' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/auto-replies
 * Create a new auto-reply rule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, name, message, enabled, keywords, matchMode } = body as {
      type: AutoReplyType;
      name: string;
      message: string;
      enabled?: boolean;
      keywords?: string[];
      matchMode?: 'contains' | 'exact';
    };

    if (!type || !name?.trim() || !message?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Type, name, and message are required' },
        { status: 400 }
      );
    }

    const validTypes: AutoReplyType[] = ['welcome', 'away', 'keyword'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid type. Must be: welcome, away, or keyword' },
        { status: 400 }
      );
    }

    if (type === 'keyword' && (!keywords || keywords.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Keywords are required for keyword type' },
        { status: 400 }
      );
    }

    const result = await saveAutoReply({
      type,
      name: name.trim(),
      message: message.trim(),
      enabled: enabled !== false,
      ...(type === 'keyword' && {
        keywords: keywords?.map(k => k.trim()).filter(Boolean),
        matchMode: matchMode || 'contains',
      }),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[AUTO-REPLIES API] Error creating:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create auto-reply' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/whatsapp/auto-replies
 * Update an existing auto-reply rule
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Auto-reply ID is required' },
        { status: 400 }
      );
    }

    const result = await updateAutoReply(id, updates);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[AUTO-REPLIES API] Error updating:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update auto-reply' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/whatsapp/auto-replies?id=xxx
 * Delete an auto-reply rule
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Auto-reply ID is required' },
        { status: 400 }
      );
    }

    const result = await deleteAutoReply(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[AUTO-REPLIES API] Error deleting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete auto-reply' },
      { status: 500 }
    );
  }
}
