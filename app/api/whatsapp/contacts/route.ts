import { NextRequest, NextResponse } from 'next/server';
import { parseExcelBuffer, isValidFileType } from '@/lib/excelParser';
import { saveContacts, getContacts, deleteContact, WhatsAppContact } from '@/lib/firebase';

/**
 * GET - List all contacts
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '500');

    const contacts = await getContacts(limit);

    return NextResponse.json({
      success: true,
      contacts,
      total: contacts.length,
    });
  } catch (error) {
    console.error('[CONTACTS API] Error fetching contacts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch contacts' },
      { status: 500 }
    );
  }
}

/**
 * POST - Import contacts from Excel file
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!isValidFileType(file.name)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Supported: xlsx, xls, csv' },
        { status: 400 }
      );
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse Excel file
    const parseResult = parseExcelBuffer(buffer, file.name);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to parse file',
          details: parseResult.errors,
        },
        { status: 400 }
      );
    }

    if (parseResult.contacts.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid contacts found in file',
          skipped: parseResult.skipped,
          errors: parseResult.errors,
        },
        { status: 400 }
      );
    }

    // Prepare contacts for saving
    const contactsToSave: Omit<WhatsAppContact, 'id' | 'createdAt' | 'updatedAt'>[] =
      parseResult.contacts.map((contact) => ({
        phoneNumber: contact.phoneNumber,
        name: contact.name,
        email: contact.email,
        tags: contact.tags,
        importedFrom: file.name,
        importedAt: new Date(),
        optedOut: false,
      }));

    // Save to Firebase
    const saveResult = await saveContacts(contactsToSave);

    if (!saveResult.success) {
      return NextResponse.json(
        { success: false, error: saveResult.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      imported: saveResult.savedCount,
      skipped: parseResult.skipped,
      errors: parseResult.errors,
    });
  } catch (error) {
    console.error('[CONTACTS API] Error importing contacts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import contacts' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Delete a contact
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('id');

    if (!contactId) {
      return NextResponse.json(
        { success: false, error: 'Contact ID required' },
        { status: 400 }
      );
    }

    const result = await deleteContact(contactId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CONTACTS API] Error deleting contact:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete contact' },
      { status: 500 }
    );
  }
}
