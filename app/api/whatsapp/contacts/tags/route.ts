import { NextRequest, NextResponse } from 'next/server';
import { getTags, saveTag, deleteTag } from '@/lib/firebase';

/**
 * GET /api/whatsapp/contacts/tags
 * List all tags
 */
export async function GET() {
  try {
    const tags = await getTags();
    return NextResponse.json({ success: true, tags });
  } catch (error) {
    console.error('[TAGS API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/contacts/tags
 * Create a new tag
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, color } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Tag name is required' },
        { status: 400 }
      );
    }

    const result = await saveTag({
      name: name.trim(),
      color: color || '#3B82F6',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[TAGS API] Error creating tag:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/whatsapp/contacts/tags?id=xxx
 * Delete a tag
 */
export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Tag ID is required' },
        { status: 400 }
      );
    }

    const result = await deleteTag(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[TAGS API] Error deleting tag:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}
