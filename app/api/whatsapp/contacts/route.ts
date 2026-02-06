import { NextRequest, NextResponse } from 'next/server';
import { parseExcelBuffer, isValidFileType } from '@/lib/excelParser';
import {
  saveContacts,
  getContacts,
  deleteContact,
  WhatsAppContact,
  getRecentWhatsAppConversations,
} from '@/lib/firebase';
import { formatPhoneNumber } from '@/lib/whatsapp';

/**
 * GET - List all contacts
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '500');

    console.log('[CONTACTS API] Fetching contacts with limit:', limit);
    const contacts = await getContacts(limit);
    console.log('[CONTACTS API] Retrieved', contacts.length, 'contacts');

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
 * POST - Import contacts from Excel file OR add single contact OR import from conversations
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle JSON body (single contact or import from conversations)
    if (contentType.includes('application/json')) {
      const body = await request.json();

      // Import from conversations
      if (body.importFromConversations) {
        console.log('[CONTACTS API] Importing contacts from conversations...');
        const conversations = await getRecentWhatsAppConversations(500);
        console.log('[CONTACTS API] Found', conversations.length, 'conversations');

        if (conversations.length === 0) {
          return NextResponse.json({
            success: true,
            imported: 0,
            message: 'No conversations to import',
          });
        }

        // Get existing contacts to avoid duplicates
        const existingContacts = await getContacts(1000);
        console.log('[CONTACTS API] Found', existingContacts.length, 'existing contacts');
        const existingPhones = new Set(existingContacts.map(c => c.phoneNumber));

        // Filter out conversations that are already contacts
        const newContacts = conversations
          .filter(conv => !existingPhones.has(conv.phoneNumber))
          .map(conv => ({
            phoneNumber: conv.phoneNumber,
            name: conv.displayName || conv.phoneNumber,
            email: undefined,
            tags: ['from-conversations'],
            importedFrom: 'WhatsApp Conversations',
            importedAt: new Date(),
            optedOut: false,
          }));

        console.log('[CONTACTS API] New contacts to import:', newContacts.length);

        if (newContacts.length === 0) {
          return NextResponse.json({
            success: true,
            imported: 0,
            message: 'All conversations are already in contacts',
          });
        }

        const saveResult = await saveContacts(newContacts);
        console.log('[CONTACTS API] Save result:', saveResult);

        return NextResponse.json({
          success: true,
          imported: saveResult.savedCount || newContacts.length,
          message: `Imported ${saveResult.savedCount || newContacts.length} contacts from conversations`,
        });
      }

      // Add single contact
      const { name, phoneNumber, email, tags } = body as {
        name: string;
        phoneNumber: string;
        email?: string;
        tags?: string[];
      };

      if (!name || !phoneNumber) {
        return NextResponse.json(
          { success: false, error: 'Name and phone number are required' },
          { status: 400 }
        );
      }

      // Format phone number
      const formattedPhone = formatPhoneNumber(phoneNumber);

      // Check if contact already exists
      const existingContacts = await getContacts(1000);
      const exists = existingContacts.some(c => c.phoneNumber === formattedPhone);

      if (exists) {
        return NextResponse.json(
          { success: false, error: 'Contact with this phone number already exists' },
          { status: 400 }
        );
      }

      const contactToSave: Omit<WhatsAppContact, 'id' | 'createdAt' | 'updatedAt'>[] = [{
        phoneNumber: formattedPhone,
        name: name.trim(),
        email: email?.trim(),
        tags: tags || [],
        importedFrom: 'Manual',
        importedAt: new Date(),
        optedOut: false,
      }];

      const saveResult = await saveContacts(contactToSave);

      if (!saveResult.success) {
        return NextResponse.json(
          { success: false, error: saveResult.error },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        imported: 1,
        message: 'Contact added successfully',
      });
    }

    // Handle file upload (Excel import)
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
