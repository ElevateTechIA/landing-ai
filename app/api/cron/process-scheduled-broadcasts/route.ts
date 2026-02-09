import { NextResponse } from 'next/server';
import {
  getScheduledBroadcasts,
  getContactsByIds,
  updateBulkJobProgress,
  updateContactLastContacted,
  getAutomationConfig,
  BulkSendJob,
} from '@/lib/firebase';
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

const DEFAULT_BULK_DELAY_SEC = 2;
const DEFAULT_BULK_BATCH_SIZE = 50;
const DEFAULT_BULK_BATCH_PAUSE_SEC = 45;

interface BulkMessagePayload {
  type: string;
  bodyText: string;
  headerText?: string;
  footerText?: string;
  buttons?: Array<{ id: string; title: string }>;
  buttonText?: string;
  url?: string;
  listButtonText?: string;
  sections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
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

async function sendMessageByType(
  config: WhatsAppPhoneConfig,
  phoneNumber: string,
  contactName: string,
  payload: BulkMessagePayload
): Promise<{ success: boolean; error?: string }> {
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

async function processJob(job: BulkSendJob) {
  console.log(`[CRON] Processing scheduled broadcast: ${job.id} (${job.name || 'unnamed'})`);

  await updateBulkJobProgress(job.id!, { status: 'processing' });

  const phoneConfig = getWhatsAppConfig(job.businessPhoneNumberId || '') || getDefaultWhatsAppConfig();

  const contacts = await getContactsByIds(job.contactIds);
  const payload = job.messagePayload as BulkMessagePayload;

  if (!payload) {
    await updateBulkJobProgress(job.id!, {
      status: 'failed',
      errors: [{ contactId: '', phoneNumber: '', error: 'No message payload found' }],
    });
    return;
  }

  // Load anti-blocking config
  const config = await getAutomationConfig();
  const ab = config?.antiBlocking;
  const bulkDelaySec = ab?.bulkMessageDelaySec ?? DEFAULT_BULK_DELAY_SEC;
  const batchSize = ab?.bulkBatchSize ?? DEFAULT_BULK_BATCH_SIZE;
  const batchPauseSec = ab?.bulkBatchPauseSec ?? DEFAULT_BULK_BATCH_PAUSE_SEC;

  let sentCount = 0;
  let failedCount = 0;
  const errors: Array<{ contactId: string; phoneNumber: string; error: string }> = [];

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    try {
      const result = await sendMessageByType(
        phoneConfig!,
        contact.phoneNumber,
        contact.name,
        payload
      );

      if (result.success) {
        sentCount++;
        await updateContactLastContacted(contact.phoneNumber);
      } else {
        failedCount++;
        errors.push({
          contactId: contact.id || '',
          phoneNumber: contact.phoneNumber,
          error: result.error || 'Unknown error',
        });
      }

      if ((sentCount + failedCount) % 10 === 0) {
        await updateBulkJobProgress(job.id!, { sentCount, failedCount, errors });
      }

      // Anti-blocking: random delay between messages
      const delayMs = getRandomDelayMs(Math.max(1, bulkDelaySec - 1), bulkDelaySec + 1);
      await new Promise((resolve) => setTimeout(resolve, delayMs));

      // Anti-blocking: batch pause every N messages
      if (batchSize > 0 && (i + 1) % batchSize === 0 && i + 1 < contacts.length) {
        const pauseMs = getRandomDelayMs(batchPauseSec - 10, batchPauseSec + 10);
        console.log(`[CRON] Batch pause after ${i + 1} messages: ${Math.round(pauseMs / 1000)}s`);
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

  await updateBulkJobProgress(job.id!, {
    status: 'completed',
    sentCount,
    failedCount,
    errors,
    completedAt: new Date(),
  });

  console.log(
    `[CRON] Broadcast ${job.id} completed. Sent: ${sentCount}, Failed: ${failedCount}`
  );
}

/**
 * GET /api/cron/process-scheduled-broadcasts
 * Process any scheduled broadcasts that are due
 * Should be called periodically (e.g., every minute via Vercel Cron)
 */
export async function GET() {
  try {
    const scheduledJobs = await getScheduledBroadcasts();
    const now = new Date();

    const dueJobs = scheduledJobs.filter((job) => {
      if (!job.scheduledFor) return false;
      const scheduledTime = job.scheduledFor instanceof Date
        ? job.scheduledFor
        : new Date((job.scheduledFor as unknown as { _seconds: number })._seconds * 1000);
      return scheduledTime <= now;
    });

    console.log(`[CRON] Found ${dueJobs.length} due broadcasts out of ${scheduledJobs.length} scheduled`);

    if (dueJobs.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: 'No broadcasts due',
      });
    }

    // Process each due job
    const results = [];
    for (const job of dueJobs) {
      try {
        await processJob(job);
        results.push({ jobId: job.id, status: 'processed' });
      } catch (error) {
        console.error(`[CRON] Error processing job ${job.id}:`, error);
        results.push({ jobId: job.id, status: 'error', error: String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('[CRON] Error processing scheduled broadcasts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process scheduled broadcasts' },
      { status: 500 }
    );
  }
}
