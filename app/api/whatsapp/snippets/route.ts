import { NextRequest, NextResponse } from 'next/server';
import {
  getSnippets,
  saveSnippet,
  updateSnippet,
  deleteSnippet,
} from '@/lib/firebase';

/**
 * GET /api/whatsapp/snippets
 * List all quick reply snippets
 */
export async function GET() {
  try {
    const snippets = await getSnippets();
    return NextResponse.json({ success: true, snippets });
  } catch (error) {
    console.error('[SNIPPETS API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch snippets' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/snippets
 * Create a new snippet
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, content, shortcut, category } = body;

    if (!name || !content) {
      return NextResponse.json(
        { success: false, error: 'Name and content are required' },
        { status: 400 }
      );
    }

    const result = await saveSnippet({
      name: name.trim(),
      content: content.trim(),
      shortcut: shortcut?.trim() || '',
      category: category?.trim() || 'general',
    });

    return NextResponse.json({
      success: result.success,
      id: result.id,
      error: result.error,
    });
  } catch (error) {
    console.error('[SNIPPETS API] Error creating snippet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create snippet' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/whatsapp/snippets
 * Update an existing snippet
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, content, shortcut, category } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Snippet ID is required' },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name.trim();
    if (content !== undefined) updates.content = content.trim();
    if (shortcut !== undefined) updates.shortcut = shortcut.trim();
    if (category !== undefined) updates.category = category.trim();

    const result = await updateSnippet(id, updates);

    return NextResponse.json({
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('[SNIPPETS API] Error updating snippet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update snippet' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/whatsapp/snippets?id=xxx
 * Delete a snippet
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Snippet ID is required' },
        { status: 400 }
      );
    }

    const result = await deleteSnippet(id);

    return NextResponse.json({
      success: result.success,
      error: result.error,
    });
  } catch (error) {
    console.error('[SNIPPETS API] Error deleting snippet:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete snippet' },
      { status: 500 }
    );
  }
}
