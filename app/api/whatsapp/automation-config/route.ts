import { NextRequest, NextResponse } from 'next/server';
import {
  getAutomationConfig,
  saveAutomationConfig,
  BusinessHoursSlot,
  AntiBlockingConfig,
} from '@/lib/firebase';

/**
 * GET /api/whatsapp/automation-config
 * Get automation configuration (business hours, etc.)
 */
export async function GET() {
  try {
    const config = await getAutomationConfig();

    // Return defaults if no config exists
    if (!config) {
      const defaultConfig = {
        businessHours: [
          { day: 0, startTime: '09:00', endTime: '17:00', enabled: false },
          { day: 1, startTime: '09:00', endTime: '17:00', enabled: true },
          { day: 2, startTime: '09:00', endTime: '17:00', enabled: true },
          { day: 3, startTime: '09:00', endTime: '17:00', enabled: true },
          { day: 4, startTime: '09:00', endTime: '17:00', enabled: true },
          { day: 5, startTime: '09:00', endTime: '17:00', enabled: true },
          { day: 6, startTime: '09:00', endTime: '17:00', enabled: false },
        ],
        autoCloseAfterHours: 24,
        timezone: 'America/New_York',
        antiBlocking: {
          enableTypingIndicator: true,
          enableReadReceipts: true,
          minReplyDelaySec: 1,
          maxReplyDelaySec: 5,
          bulkMessageDelaySec: 2,
          bulkBatchSize: 50,
          bulkBatchPauseSec: 45,
        },
      };
      return NextResponse.json({ success: true, config: defaultConfig });
    }

    return NextResponse.json({ success: true, config });
  } catch (error) {
    console.error('[AUTOMATION CONFIG API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch automation config' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/whatsapp/automation-config
 * Save automation configuration
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessHours, autoCloseAfterHours, timezone, antiBlocking } = body as {
      businessHours: BusinessHoursSlot[];
      autoCloseAfterHours?: number;
      timezone?: string;
      antiBlocking?: AntiBlockingConfig;
    };

    if (!businessHours || !Array.isArray(businessHours)) {
      return NextResponse.json(
        { success: false, error: 'Business hours are required' },
        { status: 400 }
      );
    }

    const result = await saveAutomationConfig({
      businessHours,
      autoCloseAfterHours: autoCloseAfterHours || 24,
      timezone: timezone || 'America/New_York',
      antiBlocking: antiBlocking || undefined,
      updatedAt: new Date(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[AUTOMATION CONFIG API] Error saving:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save automation config' },
      { status: 500 }
    );
  }
}
