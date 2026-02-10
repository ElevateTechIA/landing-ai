import { NextRequest, NextResponse } from 'next/server';
import {
  sendWhatsAppCloudMessage,
  sendWhatsAppReplyButtons,
  sendWhatsAppCTAButton,
  sendWhatsAppLocationRequest,
  sendWhatsAppInteractiveList,
  sendWhatsAppTemplateMessage,
  getRandomDelayMs,
} from '@/lib/whatsapp';
import { getWhatsAppConfig, getDefaultWhatsAppConfig, WhatsAppPhoneConfig } from '@/lib/whatsapp-config';
import {
  getContacts,
  getContactsByIds,
  getContactsByFilter,
  createBulkJob,
  updateBulkJobProgress,
  getBulkJob,
  getRecentBulkJobs,
  updateContactLastContacted,
  getAutomationConfig,
  BulkSendJob,
  BroadcastAudienceFilter,
} from '@/lib/firebase';

// Message types supported for bulk send
export type BulkMessageType = 'text' | 'reply_buttons' | 'cta_url' | 'location_request' | 'list' | 'template';

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
  // For template
  templateName?: string;
  languageCode?: string;
  templateComponents?: Array<{
    type: 'header' | 'body' | 'button';
    sub_type?: string;
    index?: string;
    parameters: Array<{
      type: string;
      text?: string;
      image?: { link: string };
      video?: { link: string };
      document?: { link: string };
    }>;
  }>;
}

// Default anti-blocking settings for bulk send
const DEFAULT_BULK_DELAY_SEC = 2;
const DEFAULT_BULK_BATCH_SIZE = 50;
const DEFAULT_BULK_BATCH_PAUSE_SEC = 45;

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
    const { message, messagePayload, contactIds, sendToAll, tags, name, scheduledFor, audienceFilter, phoneNumberId } = body as {
      message?: string; // Legacy: plain text message
      messagePayload?: BulkMessagePayload; // New: structured message payload
      contactIds?: string[];
      sendToAll?: boolean;
      tags?: string[];
      name?: string;
      scheduledFor?: string; // ISO date string
      audienceFilter?: BroadcastAudienceFilter;
      phoneNumberId?: string;
    };

    const phoneConfig = getWhatsAppConfig(phoneNumberId || '') || getDefaultWhatsAppConfig();

    // Support both legacy 'message' field and new 'messagePayload'
    const payload: BulkMessagePayload = messagePayload || {
      type: 'text',
      bodyText: message || '',
    };

    if (payload.type === 'template') {
      if (!payload.templateName) {
        return NextResponse.json(
          { success: false, error: 'Template name is required' },
          { status: 400 }
        );
      }
    } else if (!payload.bodyText || payload.bodyText.trim().length === 0) {
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

    if (audienceFilter && (audienceFilter.tags?.length || audienceFilter.lifecycleStages?.length)) {
      // Use audience filter (Phase 3)
      contacts = await getContactsByFilter(audienceFilter);
    } else if (sendToAll) {
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

    // Determine if this is a scheduled broadcast
    const isScheduled = scheduledFor && new Date(scheduledFor) > new Date();

    // Create bulk job
    const job: Omit<BulkSendJob, 'id'> = {
      status: isScheduled ? 'scheduled' : 'pending',
      ...(name?.trim() && { name: name.trim() }),
      message: payload.type === 'template' ? `[Template: ${payload.templateName}]` : payload.bodyText.trim(),
      messageType: payload.type,
      messagePayload: payload,
      contactIds: contacts.map((c) => c.id!),
      totalContacts: contacts.length,
      sentCount: 0,
      failedCount: 0,
      createdAt: new Date(),
      businessPhoneNumberId: phoneNumberId,
      ...(isScheduled && { scheduledFor: new Date(scheduledFor!) }),
      ...(audienceFilter && { audienceFilter }),
      analytics: {
        deliveredCount: 0,
        readCount: 0,
        respondedCount: 0,
        deliveryRate: 0,
        readRate: 0,
        responseRate: 0,
      },
      errors: [],
    };

    const createResult = await createBulkJob(job);

    if (!createResult.success || !createResult.id) {
      return NextResponse.json(
        { success: false, error: createResult.error || 'Failed to create bulk job' },
        { status: 500 }
      );
    }

    const jobId = createResult.id;

    if (isScheduled) {
      // Scheduled broadcast - don't process now
      return NextResponse.json({
        success: true,
        jobId,
        totalContacts: contacts.length,
        scheduledFor: scheduledFor,
        message: `Broadcast scheduled for ${new Date(scheduledFor!).toLocaleString()}`,
      });
    }

    // Start processing in background (non-blocking)
    processBulkJob(jobId, contacts, payload, phoneConfig).catch((error) => {
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
  config: WhatsAppPhoneConfig,
  phoneNumber: string,
  contactName: string,
  payload: BulkMessagePayload
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Personalize body text (replace {{name}} with contact name)
  const personalizedBody = payload.bodyText.replace(/\{\{name\}\}/gi, contactName);

  switch (payload.type) {
    case 'text':
      return sendWhatsAppCloudMessage(config, phoneNumber, personalizedBody);

    case 'reply_buttons':
      return sendWhatsAppReplyButtons(
        config,
        phoneNumber,
        personalizedBody,
        payload.buttons || [],
        payload.headerText,
        payload.footerText
      );

    case 'cta_url':
      return sendWhatsAppCTAButton(
        config,
        phoneNumber,
        personalizedBody,
        payload.buttonText || 'Click here',
        payload.url || '',
        payload.headerText,
        payload.footerText
      );

    case 'location_request':
      return sendWhatsAppLocationRequest(config, phoneNumber, personalizedBody);

    case 'list':
      return sendWhatsAppInteractiveList(
        config,
        phoneNumber,
        personalizedBody,
        payload.listButtonText || 'View options',
        payload.sections || []
      );

    case 'template': {
      // For templates, personalize parameters by replacing {{name}} in each param
      const components = payload.templateComponents?.map(comp => ({
        ...comp,
        parameters: comp.parameters.map(p => ({
          ...p,
          text: p.text?.replace(/\{\{name\}\}/gi, contactName),
        })),
      }));
      return sendWhatsAppTemplateMessage(
        config,
        phoneNumber,
        payload.templateName || '',
        payload.languageCode || 'en',
        components
      );
    }

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
  payload: BulkMessagePayload,
  phoneConfig: WhatsAppPhoneConfig | null
) {
  console.log(`[BULK SEND] Starting job ${jobId} with ${contacts.length} contacts, type: ${payload.type}`);

  // Load anti-blocking config
  const config = await getAutomationConfig();
  const ab = config?.antiBlocking;
  const bulkDelaySec = ab?.bulkMessageDelaySec ?? DEFAULT_BULK_DELAY_SEC;
  const batchSize = ab?.bulkBatchSize ?? DEFAULT_BULK_BATCH_SIZE;
  const batchPauseSec = ab?.bulkBatchPauseSec ?? DEFAULT_BULK_BATCH_PAUSE_SEC;

  // Update job status to processing
  await updateBulkJobProgress(jobId, { status: 'processing' });

  let sentCount = 0;
  let failedCount = 0;
  const errors: Array<{ contactId: string; phoneNumber: string; error: string }> = [];
  const sentMessageIds: Array<{ phoneNumber: string; messageId: string }> = [];

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    try {
      // Send message based on type
      console.log(`[BULK SEND] Sending to ${contact.phoneNumber} (${contact.name})`);
      const result = await sendMessageByType(
        phoneConfig!,
        contact.phoneNumber,
        contact.name,
        payload
      );

      if (result.success) {
        sentCount++;
        if (result.messageId) {
          sentMessageIds.push({ phoneNumber: contact.phoneNumber, messageId: result.messageId });
          console.log(`[BULK SEND] Sent to ${contact.phoneNumber} - messageId: ${result.messageId}`);
        }
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

      // Anti-blocking: random delay between messages (default 1-3s)
      const delayMs = getRandomDelayMs(Math.max(1, bulkDelaySec - 1), bulkDelaySec + 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Anti-blocking: batch pause every N messages
      if (batchSize > 0 && (i + 1) % batchSize === 0 && i + 1 < contacts.length) {
        const pauseMs = getRandomDelayMs(batchPauseSec - 10, batchPauseSec + 10);
        console.log(`[BULK SEND] Batch pause after ${i + 1} messages: ${Math.round(pauseMs / 1000)}s`);
        await new Promise((resolve) => setTimeout(resolve, pauseMs));
      }
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
    ...(sentMessageIds.length > 0 && { sentMessageIds }),
  });

  console.log(
    `[BULK SEND] Job ${jobId} completed. Sent: ${sentCount}, Failed: ${failedCount}`
  );
  if (sentMessageIds.length > 0) {
    console.log(`[BULK SEND] Message IDs:`, sentMessageIds);
  }
}
