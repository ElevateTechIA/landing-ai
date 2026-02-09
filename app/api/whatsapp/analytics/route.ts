import { NextResponse } from 'next/server';
import {
  db,
  collections,
  WhatsAppConversation,
  WhatsAppContact,
  BulkSendJob,
} from '@/lib/firebase';

interface DailyMessageCount {
  date: string; // YYYY-MM-DD
  sent: number;
  received: number;
}

interface ConversationMetrics {
  total: number;
  open: number;
  resolved: number;
  archived: number;
  avgMessagesPerConversation: number;
  avgFirstResponseMinutes: number;
}

interface ContactGrowth {
  date: string; // YYYY-MM-DD
  count: number;
  cumulative: number;
}

interface BroadcastSummary {
  id: string;
  name: string;
  status: string;
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  deliveryRate: number;
  readRate: number;
  responseRate: number;
  createdAt: string;
}

interface AnalyticsData {
  messageVolume: DailyMessageCount[];
  conversationMetrics: ConversationMetrics;
  contactGrowth: ContactGrowth[];
  broadcastPerformance: BroadcastSummary[];
  topMetrics: {
    totalMessages: number;
    totalContacts: number;
    totalBroadcasts: number;
    avgResponseTime: string;
    messagesThisWeek: number;
    newContactsThisWeek: number;
  };
}

function parseTimestamp(ts: unknown): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'string') return new Date(ts);
  if (typeof ts === 'object' && ts !== null) {
    const obj = ts as Record<string, unknown>;
    const seconds = (obj._seconds as number) || (obj.seconds as number);
    if (seconds) return new Date(seconds * 1000);
  }
  return null;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDaysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * GET /api/whatsapp/analytics
 * Aggregate analytics from conversations, contacts, and broadcasts
 */
export async function GET() {
  try {
    // Fetch all data in parallel
    const [conversationsSnap, contactsSnap, broadcastsSnap] = await Promise.all([
      db.collection(collections.whatsappConversations).get(),
      db.collection(collections.whatsappContacts).get(),
      db.collection(collections.whatsappBulkJobs).orderBy('createdAt', 'desc').limit(20).get(),
    ]);

    const conversations = conversationsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WhatsAppConversation[];

    const contacts = contactsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WhatsAppContact[];

    const broadcasts = broadcastsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BulkSendJob[];

    const now = new Date();
    const thirtyDaysAgo = getDaysAgo(30);
    const sevenDaysAgo = getDaysAgo(7);

    // =============================================
    // 1. Message Volume (last 30 days)
    // =============================================
    const messageVolumeMap: Record<string, { sent: number; received: number }> = {};

    // Initialize all 30 days
    for (let i = 29; i >= 0; i--) {
      const d = getDaysAgo(i);
      messageVolumeMap[formatDate(d)] = { sent: 0, received: 0 };
    }

    let totalMessages = 0;
    let messagesThisWeek = 0;
    const responseTimes: number[] = [];

    for (const conv of conversations) {
      const messages = conv.messages || [];
      let lastUserMessageTime: Date | null = null;

      for (const msg of messages) {
        totalMessages++;
        const msgDate = parseTimestamp(msg.timestamp);
        if (!msgDate) continue;

        const dateKey = formatDate(msgDate);
        if (messageVolumeMap[dateKey]) {
          if (msg.role === 'user') {
            messageVolumeMap[dateKey].received++;
          } else {
            messageVolumeMap[dateKey].sent++;
          }
        }

        if (msgDate >= sevenDaysAgo) {
          messagesThisWeek++;
        }

        // Track response times
        if (msg.role === 'user') {
          lastUserMessageTime = msgDate;
        } else if (msg.role === 'assistant' && lastUserMessageTime) {
          const responseMs = msgDate.getTime() - lastUserMessageTime.getTime();
          if (responseMs > 0 && responseMs < 24 * 60 * 60 * 1000) {
            responseTimes.push(responseMs);
          }
          lastUserMessageTime = null;
        }
      }
    }

    const messageVolume: DailyMessageCount[] = Object.entries(messageVolumeMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, counts]) => ({ date, ...counts }));

    // =============================================
    // 2. Conversation Metrics
    // =============================================
    let openCount = 0;
    let resolvedCount = 0;
    let archivedCount = 0;
    let totalMsgCount = 0;

    for (const conv of conversations) {
      const status = conv.status || 'open';
      if (status === 'open') openCount++;
      else if (status === 'resolved') resolvedCount++;
      else if (status === 'archived') archivedCount++;
      totalMsgCount += (conv.messages || []).length;
    }

    const avgFirstResponse = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length / 60000
      : 0;

    const conversationMetrics: ConversationMetrics = {
      total: conversations.length,
      open: openCount,
      resolved: resolvedCount,
      archived: archivedCount,
      avgMessagesPerConversation: conversations.length > 0
        ? Math.round(totalMsgCount / conversations.length * 10) / 10
        : 0,
      avgFirstResponseMinutes: Math.round(avgFirstResponse * 10) / 10,
    };

    // =============================================
    // 3. Contact Growth (last 30 days)
    // =============================================
    const contactGrowthMap: Record<string, number> = {};

    // Initialize all 30 days
    for (let i = 29; i >= 0; i--) {
      contactGrowthMap[formatDate(getDaysAgo(i))] = 0;
    }

    let newContactsThisWeek = 0;

    for (const contact of contacts) {
      const createdAt = parseTimestamp(contact.createdAt);
      if (!createdAt) continue;

      if (createdAt >= sevenDaysAgo) {
        newContactsThisWeek++;
      }

      if (createdAt >= thirtyDaysAgo) {
        const dateKey = formatDate(createdAt);
        if (contactGrowthMap[dateKey] !== undefined) {
          contactGrowthMap[dateKey]++;
        }
      }
    }

    // Build cumulative growth
    let cumulative = contacts.filter(c => {
      const d = parseTimestamp(c.createdAt);
      return d && d < thirtyDaysAgo;
    }).length;

    const contactGrowth: ContactGrowth[] = Object.entries(contactGrowthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => {
        cumulative += count;
        return { date, count, cumulative };
      });

    // =============================================
    // 4. Broadcast Performance
    // =============================================
    const broadcastPerformance: BroadcastSummary[] = broadcasts
      .filter(b => b.status === 'completed' || b.status === 'processing')
      .map((b) => ({
        id: b.id || '',
        name: b.name || `Broadcast ${formatDate(parseTimestamp(b.createdAt) || now)}`,
        status: b.status,
        totalContacts: b.totalContacts,
        sentCount: b.sentCount,
        failedCount: b.failedCount,
        deliveryRate: b.analytics?.deliveryRate || (b.sentCount > 0 ? Math.round((b.sentCount / b.totalContacts) * 100) : 0),
        readRate: b.analytics?.readRate || 0,
        responseRate: b.analytics?.responseRate || 0,
        createdAt: (parseTimestamp(b.createdAt) || now).toISOString(),
      }));

    // =============================================
    // 5. Top Metrics
    // =============================================
    const avgResponseStr = avgFirstResponse > 60
      ? `${Math.round(avgFirstResponse / 60)}h ${Math.round(avgFirstResponse % 60)}m`
      : avgFirstResponse > 0
        ? `${Math.round(avgFirstResponse)}m`
        : 'N/A';

    const analyticsData: AnalyticsData = {
      messageVolume,
      conversationMetrics,
      contactGrowth,
      broadcastPerformance,
      topMetrics: {
        totalMessages,
        totalContacts: contacts.length,
        totalBroadcasts: broadcasts.filter(b => b.status === 'completed').length,
        avgResponseTime: avgResponseStr,
        messagesThisWeek,
        newContactsThisWeek,
      },
    };

    return NextResponse.json({ success: true, analytics: analyticsData });
  } catch (error) {
    console.error('[ANALYTICS API] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
