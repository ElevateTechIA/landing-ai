import { NextRequest, NextResponse } from 'next/server';
import { db, collections, updateMeeting, saveSMSRecord } from '@/lib/firebase';
import { sendMeetingNotification } from '@/lib/twilio';

/**
 * Cron endpoint to send meeting reminders
 * Configured to run every hour via vercel.json
 *
 * Sends reminders 1 hour before meeting
 *
 * GET /api/cron/send-reminders
 */
export async function GET(request: NextRequest) {
  // Verify cron secret for security (optional but recommended)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[CRON_REMINDERS] Unauthorized request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // SMS/WhatsApp - TEMPORALMENTE DESHABILITADO
    // Razón: Requiere registro 10DLC en Twilio para enviar SMS en EE.UU.
    // TODO: Reactivar cuando se complete el registro 10DLC o toll-free verificado
    console.log('[CRON_REMINDERS] SMS reminders disabled - 10DLC registration pending');
    return NextResponse.json({
      success: true,
      remindersSent: 0,
      message: 'SMS reminders temporarily disabled - 10DLC registration pending',
      timestamp: new Date().toISOString()
    });

    // Original code below - uncomment when SMS is re-enabled
    /*
    const now = new Date();
    console.log('[CRON_REMINDERS] Starting reminder check at:', now.toISOString());

    // Calculate time window for 1 hour reminder (+/- 30 minutes buffer)
    // This means we look for meetings between 30 and 90 minutes from now
    const reminder1hStart = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
    const reminder1hEnd = new Date(now.getTime() + 90 * 60 * 1000);   // 90 minutes from now

    console.log('[CRON_REMINDERS] Looking for meetings between:', {
      start: reminder1hStart.toISOString(),
      end: reminder1hEnd.toISOString()
    });

    // Query meetings that need reminders
    const snapshot = await db.collection(collections.meetings)
      .where('status', '==', 'scheduled')
      .where('reminderSent', '==', false)
      .get();

    if (snapshot.empty) {
      console.log('[CRON_REMINDERS] No meetings found that need reminders');
      return NextResponse.json({
        success: true,
        remindersSent: 0,
        message: 'No meetings need reminders',
        timestamp: now.toISOString()
      });
    }

    let sentCount = 0;
    let failedCount = 0;
    const results: Array<{meetingId: string; status: string; channel?: string; error?: string}> = [];

    for (const doc of snapshot.docs) {
      const meeting = doc.data();
      const meetingTime = new Date(meeting.scheduledTime);

      // Check if meeting is within the 1 hour reminder window
      if (meetingTime >= reminder1hStart && meetingTime <= reminder1hEnd) {
        console.log('[CRON_REMINDERS] Sending reminder for meeting:', {
          meetingId: doc.id,
          scheduledTime: meeting.scheduledTime,
          name: meeting.name,
          phone: meeting.phone
        });

        // Send SMS/WhatsApp reminder if phone is available
        if (meeting.phone) {
          try {
            const smsResult = await sendMeetingNotification({
              to: meeting.phone,
              name: meeting.name || 'Cliente',
              scheduledTime: meeting.scheduledTime,
              zoomLink: meeting.zoomLink,
              language: 'es' // Default to Spanish
            }, 'reminder');

            // Save SMS record
            await saveSMSRecord({
              meetingId: doc.id,
              phone: meeting.phone,
              type: 'reminder',
              channel: smsResult.channel || 'sms',
              status: smsResult.success ? 'sent' : 'failed',
              messageSid: smsResult.messageSid,
              error: smsResult.error,
              errorCode: smsResult.errorCode,
              language: 'es',
              sentAt: new Date(),
              createdAt: new Date()
            });

            if (smsResult.success) {
              sentCount++;
              results.push({
                meetingId: doc.id,
                status: 'sent',
                channel: smsResult.channel
              });
              console.log('[CRON_REMINDERS] Reminder sent successfully via', smsResult.channel);
            } else {
              failedCount++;
              results.push({
                meetingId: doc.id,
                status: 'failed',
                error: smsResult.error
              });
              console.error('[CRON_REMINDERS] Failed to send reminder:', smsResult.error);
            }
          } catch (error) {
            failedCount++;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            results.push({
              meetingId: doc.id,
              status: 'error',
              error: errorMessage
            });
            console.error('[CRON_REMINDERS] Error sending reminder:', error);
          }
        } else {
          console.warn('[CRON_REMINDERS] No phone number for meeting:', doc.id);
          results.push({
            meetingId: doc.id,
            status: 'skipped',
            error: 'No phone number'
          });
        }

        // Mark reminder as sent (even if SMS failed, to prevent repeated attempts)
        try {
          await updateMeeting(doc.id, { reminderSent: true });
          console.log('[CRON_REMINDERS] Meeting marked as reminder sent:', doc.id);
        } catch (updateError) {
          console.error('[CRON_REMINDERS] Failed to update meeting:', updateError);
        }
      }
    }

    console.log('[CRON_REMINDERS] Completed:', { sentCount, failedCount });

    return NextResponse.json({
      success: true,
      remindersSent: sentCount,
      remindersFailed: failedCount,
      results,
      timestamp: now.toISOString()
    });
    */
  } catch (error) {
    console.error('[CRON_REMINDERS] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process reminders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Handle POST requests as well (some cron services use POST)
export async function POST(request: NextRequest) {
  return GET(request);
}
