import { NextRequest, NextResponse } from 'next/server';
import {
  sendWhatsAppCloudMessage,
  sendWhatsAppReplyButtons,
  sendWhatsAppCTAButton,
  sendWhatsAppLocationRequest,
  sendWhatsAppInteractiveList,
} from '@/lib/whatsapp';
import {
  getContacts,
  getContactsByIds,
  createBulkJob,
  updateBulkJobProgress,
  getBulkJob,
  getRecentBulkJobs,
  updateContactLastContacted,
  BulkSendJob,
} from '@/lib/firebase';

// Message types supported for bulk send
export type BulkMessageType = 'text' | 'reply_buttons' | 'cta_url' | 'location_request' | 'list';

export interface BulkMessagePayload {
  type: BulkMessageType;
  // Common fields
  bodyText: string;
  headerText?: string;
  footerText?: string;
  // For reply_buttons
  buttons?: Array<{ id: string; title: string }>;
  // For cta_url
  buttonText?: string;
  url?: string;
  // For list
  listButtonText?: string;
  sections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

// Rate limiting: 10 messages per second (100ms between messages)
const MESSAGE_DELAY_MS = 100;

/**
 * GET - Get bulk job status or list recent jobs
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const jobId = searchParams.get('jobId');

    if (jobId) {
      // Get specific job status
      const job = await getBulkJob(jobId);

      if (!job) {
        return NextResponse.json(
          { success: false, error: 'Job not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, job });
    }

    // List recent jobs
    const jobs = await getRecentBulkJobs(20);
    return NextResponse.json({ success: true, jobs });
  } catch (error) {
    console.error('[BULK SEND API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch job status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Start a bulk send job
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, messagePayload, contactIds, sendToAll, tags } = body as {
      message?: string; // Legacy: plain text message
      messagePayload?: BulkMessagePayload; // New: structured message payload
      contactIds?: string[];
      sendToAll?: boolean;
      tags?: string[];
    };

    // Support both legacy 'message' field and new 'messagePayload'
    const payload: BulkMessagePayload = messagePayload || {
      type: 'text',
      bodyText: message || '',
    };

    if (!payload.bodyText || payload.bodyText.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message body is required' },
        { status: 400 }
      );
    }

    // Validate payload based on type
    if (payload.type === 'reply_buttons') {
      if (!payload.buttons || payload.buttons.length === 0) {
        return NextResponse.json(
          { success: false, error: 'At least one button is required for reply buttons' },
          { status: 400 }
        );
      }
      if (payload.buttons.length > 3) {
        return NextResponse.json(
          { success: false, error: 'Maximum 3 buttons allowed' },
          { status: 400 }
        );
      }
    }

    if (payload.type === 'cta_url') {
      if (!payload.buttonText || !payload.url) {
        return NextResponse.json(
          { success: false, error: 'Button text and URL are required for CTA button' },
          { status: 400 }
        );
      }
    }

    if (payload.type === 'list') {
      if (!payload.listButtonText || !payload.sections || payload.sections.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Button text and sections are required for list message' },
          { status: 400 }
        );
      }
    }

    // Get contacts to send to
    let contacts;

    if (sendToAll) {
      // Get all contacts
      contacts = await getContacts(1000);
    } else if (contactIds && contactIds.length > 0) {
      // Get specific contacts
      contacts = await getContactsByIds(contactIds);
    } else if (tags && tags.length > 0) {
      // Get contacts by tags
      const allContacts = await getContacts(1000);
      contacts = allContacts.filter(
        (c) => c.tags && c.tags.some((t) => tags.includes(t))
      );
    } else {
      return NextResponse.json(
        { success: false, error: 'Must specify contacts, tags, or sendToAll' },
        { status: 400 }
      );
    }

    // Filter out opted-out contacts
    contacts = contacts.filter((c) => !c.optedOut);

    if (contacts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No eligible contacts found' },
        { status: 400 }
      );
    }

    // Create bulk job
    const job: Omit<BulkSendJob, 'id'> = {
      status: 'pending',
      message: payload.bodyText.trim(),
      messageType: payload.type,
      messagePayload: payload,
      contactIds: contacts.map((c) => c.id!),
      totalContacts: contacts.length,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      errors: [],
    };

    const createResult = await createBulkJob(job);

    if (!createResult.success || !createResult.id) {
      return NextResponse.json(
        { success: false, error: 'Failed to create bulk job' },
        { status: 500 }
      );
    }

    const jobId = createResult.id;

    // Start processing in background (non-blocking)
    processBulkJob(jobId, contacts, payload).catch((error) => {
      console.error('[BULK SEND] Background processing error:', error);
    });

    return NextResponse.json({
      success: true,
      jobId,
      totalContacts: contacts.length,
      message: 'Bulk send job started',
    });
  } catch (error) {
    console.error('[BULK SEND API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start bulk send' },
      { status: 500 }
    );
  }
}

/**
 * Send a single message based on payload type
 */
async function sendMessageByType(
  phoneNumber: string,
  contactName: string,
  payload: BulkMessagePayload
): Promise<{ success: boolean; error?: string }> {
  // Personalize body text (replace {{name}} with contact name)
  const personalizedBody = payload.bodyText.replace(/\{\{name\}\}/gi, contactName);

  switch (payload.type) {
    case 'text':
      return sendWhatsAppCloudMessage(phoneNumber, personalizedBody);

    case 'reply_buttons':
      return sendWhatsAppReplyButtons(
        phoneNumber,
        personalizedBody,
        payload.buttons || [],
        payload.headerText,
        payload.footerText
      );

    case 'cta_url':
      return sendWhatsAppCTAButton(
        phoneNumber,
        personalizedBody,
        payload.buttonText || 'Click here',
        payload.url || '',
        payload.headerText,
        payload.footerText
      );

    case 'location_request':
      return sendWhatsAppLocationRequest(phoneNumber, personalizedBody);

    case 'list':
      return sendWhatsAppInteractiveList(
        phoneNumber,
        personalizedBody,
        payload.listButtonText || 'View options',
        payload.sections || []
      );

    default:
      return { success: false, error: `Unknown message type: ${payload.type}` };
  }
}

/**
 * Process bulk job in background
 */
async function processBulkJob(
  jobId: string,
  contacts: Array<{ id?: string; phoneNumber: string; name: string }>,
  payload: BulkMessagePayload
) {
  console.log(`[BULK SEND] Starting job ${jobId} with ${contacts.length} contacts, type: ${payload.type}`);

  // Update job status to processing
  await updateBulkJobProgress(jobId, { status: 'processing' });

  let sentCount = 0;
  let failedCount = 0;
  const errors: Array<{ contactId: string; phoneNumber: string; error: string }> = [];

  for (const contact of contacts) {
    try {
      // Send message based on type
      const result = await sendMessageByType(
        contact.phoneNumber,
        contact.name,
        payload
      );

      if (result.success) {
        sentCount++;
        // Update contact's lastContacted
        await updateContactLastContacted(contact.phoneNumber);
      } else {
        failedCount++;
        errors.push({
          contactId: contact.id || '',
          phoneNumber: contact.phoneNumber,
          error: result.error || 'Unknown error',
        });
      }

      // Update progress every 10 messages
      if ((sentCount + failedCount) % 10 === 0) {
        await updateBulkJobProgress(jobId, {
          sentCount,
          failedCount,
          errors,
        });
      }

      // Rate limiting delay
      await new Promise((resolve) => setTimeout(resolve, MESSAGE_DELAY_MS));
    } catch (error) {
      failedCount++;
      errors.push({
        contactId: contact.id || '',
        phoneNumber: contact.phoneNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Final update
  await updateBulkJobProgress(jobId, {
    status: 'completed',
    sentCount,
    failedCount,
    errors,
    completedAt: new Date(),
  });

  console.log(
    `[BULK SEND] Job ${jobId} completed. Sent: ${sentCount}, Failed: ${failedCount}`
  );
}
