import { NextRequest, NextResponse } from 'next/server';
import {
  getContactById,
  updateContact,
  addContactNote,
  deleteContactNote,
  deleteContact,
  LifecycleStage,
} from '@/lib/firebase';

/**
 * GET /api/whatsapp/contacts/[id]
 * Get a single contact by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const contact = await getContactById(id);

    if (!contact) {
      return NextResponse.json(
        { success: false, error: 'Contact not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, contact });
  } catch (error) {
    console.error('[CONTACT API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contact' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/whatsapp/contacts/[id]
 * Update a contact (name, email, tags, lifecycleStage, company, etc.)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowedFields = ['name', 'email', 'tags', 'lifecycleStage', 'company', 'optedOut'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Validate lifecycleStage if provided
    if (updates.lifecycleStage) {
      const validStages: LifecycleStage[] = ['new_lead', 'qualified', 'proposal', 'customer', 'lost'];
      if (!validStages.includes(updates.lifecycleStage as LifecycleStage)) {
        return NextResponse.json(
          { success: false, error: 'Invalid lifecycle stage' },
          { status: 400 }
        );
      }
    }

    const result = await updateContact(id, updates);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Return updated contact
    const updated = await getContactById(id);
    return NextResponse.json({ success: true, contact: updated });
  } catch (error) {
    console.error('[CONTACT API] Error updating:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update contact' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/contacts/[id]
 * Add a note to a contact
 * Body: { action: 'add_note', content: string } or { action: 'delete_note', noteId: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (body.action === 'add_note') {
      if (!body.content?.trim()) {
        return NextResponse.json(
          { success: false, error: 'Note content is required' },
          { status: 400 }
        );
      }

      const result = await addContactNote(id, body.content.trim());
      return NextResponse.json(result);
    }

    if (body.action === 'delete_note') {
      if (!body.noteId) {
        return NextResponse.json(
          { success: false, error: 'Note ID is required' },
          { status: 400 }
        );
      }

      const result = await deleteContactNote(id, body.noteId);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[CONTACT API] Error with note:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/whatsapp/contacts/[id]
 * Delete a contact
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await deleteContact(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CONTACT API] Error deleting:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
