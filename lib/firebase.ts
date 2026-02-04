import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Inicializar Firebase Admin solo una vez
let db: ReturnType<typeof getFirestore>;

try {
  const apps = getApps();

  if (!apps.length) {
    // Validar que existan las variables de entorno
    if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
      console.warn('Firebase credentials not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local');
    } else {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
      });
      console.log('Firebase initialized successfully');
    }
  }

  db = getFirestore();
} catch (error) {
  console.error('Error initializing Firebase:', error);
  // Crear un mock DB para desarrollo sin credenciales
  db = {} as ReturnType<typeof getFirestore>;
}

export { db };

// Colecciones
export const collections = {
  meetings: 'meetings',
  blockedDates: 'blockedDates',
  availabilitySlots: 'availabilitySlots',
  calls: 'calls',
  callLogs: 'callLogs',
  smsRecords: 'smsRecords',
  whatsappConversations: 'whatsappConversations',
  whatsappContacts: 'whatsappContacts',
  whatsappBulkJobs: 'whatsappBulkJobs',
};

// Tipos para TypeScript
export interface Meeting {
  id?: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  challenge: string;
  objectives: string;
  expectations: string;
  budget: string;
  timeline: string;
  scheduledTime: string;
  zoomLink: string;
  zoomId: string;
  zoomMeetingId?: string;
  googleCalendarEventId?: string;
  status: 'scheduled' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  reminderSent: boolean;
  attended: boolean;
  notes?: string;
  source?: 'chatbot' | 'voice_chat' | 'manual'; // Source of the meeting
  conversationId?: string; // Voice chat conversation ID
  transcript?: Array<{
    id: string;
    role: 'user' | 'agent';
    message: string;
    timestamp: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlockedDate {
  id?: string;
  date: Date;
  reason?: string;
  createdAt: Date;
}

export interface AvailabilitySlot {
  id?: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // Format: "09:00"
  endTime: string; // Format: "17:00"
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Call {
  id?: string;

  // Twilio data
  callSid: string; // Twilio Call SID (unique identifier)
  phoneNumber: string; // E.164 format: +15551234567
  direction: 'inbound' | 'outbound'; // Call direction
  status: 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'busy' | 'no-answer' | 'failed' | 'canceled';
  duration?: number; // Call duration in seconds
  recordingUrl?: string; // Twilio recording URL

  // ElevenLabs data
  conversationId?: string; // ElevenLabs conversation ID
  agentId: string; // ElevenLabs agent ID
  transcript?: Array<{
    // Conversation transcript
    role: 'agent' | 'user';
    content: string;
    timestamp: Date;
  }>;

  // Customer data
  customerName?: string;
  customerEmail?: string;
  customVariables?: Record<string, any>; // Dynamic variables passed to agent

  // Metadata
  initiatedAt: Date; // When call was initiated
  answeredAt?: Date; // When call was answered
  endedAt?: Date; // When call ended
  failureReason?: string; // Error message if failed

  // Follow-up actions
  meetingScheduled?: boolean;
  meetingId?: string; // Reference to meetings collection
  followUpRequired?: boolean;
  notes?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface CallLog {
  id?: string;
  date: Date; // Date of log (for aggregation)
  totalCalls: number;
  inboundCalls: number;
  outboundCalls: number;
  completedCalls: number;
  failedCalls: number;
  totalDuration: number; // Total minutes
  averageDuration: number; // Average call length
  answeredRate: number; // Percentage answered
  createdAt: Date;
}

export interface SMSRecord {
  id?: string;
  meetingId?: string;
  phone: string;
  type: 'confirmation' | 'reminder';
  channel: 'sms' | 'whatsapp';
  status: 'sent' | 'failed' | 'delivered' | 'undelivered';
  messageSid?: string;
  error?: string;
  errorCode?: string;
  language: 'en' | 'es';
  sentAt: Date;
  deliveredAt?: Date;
  createdAt: Date;
}

// Call helper functions
export async function saveCall(callData: Omit<Call, 'id'>): Promise<{ success: boolean; callId?: string; error?: string }> {
  try {
    const docRef = await db.collection(collections.calls).add(callData);
    console.log('[FIREBASE] Call saved:', docRef.id);
    return { success: true, callId: docRef.id };
  } catch (error) {
    console.error('[FIREBASE] Error saving call:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

export async function updateCallStatus(
  callId: string,
  updates: Partial<Call>
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection(collections.calls).doc(callId).update({
      ...updates,
      updatedAt: new Date(),
    });
    console.log('[FIREBASE] Call updated:', callId);
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error updating call:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

export async function getCallBySid(callSid: string): Promise<Call | null> {
  try {
    const snapshot = await db
      .collection(collections.calls)
      .where('callSid', '==', callSid)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Call;
  } catch (error) {
    console.error('[FIREBASE] Error getting call by SID:', error);
    return null;
  }
}

export async function getRecentCalls(limit: number = 50): Promise<Call[]> {
  try {
    const snapshot = await db
      .collection(collections.calls)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Call[];
  } catch (error) {
    console.error('[FIREBASE] Error getting recent calls:', error);
    return [];
  }
}

// Meeting helper functions
export async function saveMeeting(meetingData: Omit<Meeting, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const docRef = await db.collection(collections.meetings).add(meetingData);
    console.log('[FIREBASE] Meeting saved:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[FIREBASE] Error saving meeting:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

export async function getMeetingById(meetingId: string): Promise<Meeting | null> {
  try {
    const doc = await db.collection(collections.meetings).doc(meetingId).get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as Meeting;
  } catch (error) {
    console.error('[FIREBASE] Error getting meeting:', error);
    return null;
  }
}

export async function updateMeeting(
  meetingId: string,
  updates: Partial<Meeting>
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection(collections.meetings).doc(meetingId).update({
      ...updates,
      updatedAt: new Date(),
    });
    console.log('[FIREBASE] Meeting updated:', meetingId);
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error updating meeting:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

// SMS Record helper functions
export async function saveSMSRecord(
  smsData: Omit<SMSRecord, 'id'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const docRef = await db.collection(collections.smsRecords).add({
      ...smsData,
      createdAt: new Date()
    });
    console.log('[FIREBASE] SMS record saved:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[FIREBASE] Error saving SMS record:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

export async function updateSMSStatus(
  smsId: string,
  updates: Partial<SMSRecord>
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection(collections.smsRecords).doc(smsId).update(updates);
    console.log('[FIREBASE] SMS record updated:', smsId);
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error updating SMS record:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

export async function getSMSRecordsByMeetingId(meetingId: string): Promise<SMSRecord[]> {
  try {
    const snapshot = await db
      .collection(collections.smsRecords)
      .where('meetingId', '==', meetingId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as SMSRecord[];
  } catch (error) {
    console.error('[FIREBASE] Error getting SMS records:', error);
    return [];
  }
}

// WhatsApp Types
export interface WhatsAppMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  messageId?: string; // WhatsApp message ID
}

export interface WhatsAppConversation {
  id?: string;
  phoneNumber: string; // E.164 format
  displayName?: string;
  messages: WhatsAppMessage[];
  language: 'en' | 'es';
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WhatsAppContact {
  id?: string;
  phoneNumber: string; // E.164 format: +1234567890
  name: string;
  email?: string;
  tags?: string[];
  importedFrom?: string; // Excel filename
  importedAt: Date;
  lastContacted?: Date;
  optedOut: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BulkSendJob {
  id?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
  contactIds: string[];
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  createdAt: Date;
  completedAt?: Date;
  errors: Array<{ contactId: string; phoneNumber: string; error: string }>;
}

// WhatsApp Conversation helper functions
export async function getWhatsAppConversation(phoneNumber: string): Promise<WhatsAppConversation | null> {
  try {
    const snapshot = await db
      .collection(collections.whatsappConversations)
      .where('phoneNumber', '==', phoneNumber)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as WhatsAppConversation;
  } catch (error) {
    console.error('[FIREBASE] Error getting WhatsApp conversation:', error);
    return null;
  }
}

export async function saveWhatsAppConversation(
  conversation: Omit<WhatsAppConversation, 'id'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Check if conversation exists
    const existing = await getWhatsAppConversation(conversation.phoneNumber);

    if (existing && existing.id) {
      // Update existing conversation
      await db.collection(collections.whatsappConversations).doc(existing.id).update({
        messages: conversation.messages,
        displayName: conversation.displayName,
        language: conversation.language,
        lastMessageAt: conversation.lastMessageAt,
        updatedAt: new Date(),
      });
      return { success: true, id: existing.id };
    } else {
      // Create new conversation
      const docRef = await db.collection(collections.whatsappConversations).add({
        ...conversation,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      return { success: true, id: docRef.id };
    }
  } catch (error) {
    console.error('[FIREBASE] Error saving WhatsApp conversation:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

export async function getRecentWhatsAppConversations(limit: number = 50): Promise<WhatsAppConversation[]> {
  try {
    const snapshot = await db
      .collection(collections.whatsappConversations)
      .orderBy('lastMessageAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WhatsAppConversation[];
  } catch (error) {
    console.error('[FIREBASE] Error getting recent WhatsApp conversations:', error);
    return [];
  }
}

// WhatsApp Contact helper functions
export async function saveContacts(
  contacts: Omit<WhatsAppContact, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<{ success: boolean; savedCount: number; error?: string }> {
  try {
    const batch = db.batch();
    let savedCount = 0;

    for (const contact of contacts) {
      // Check if contact already exists by phone number
      const existingSnapshot = await db
        .collection(collections.whatsappContacts)
        .where('phoneNumber', '==', contact.phoneNumber)
        .limit(1)
        .get();

      if (existingSnapshot.empty) {
        const docRef = db.collection(collections.whatsappContacts).doc();
        batch.set(docRef, {
          ...contact,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        savedCount++;
      } else {
        // Update existing contact
        const existingDoc = existingSnapshot.docs[0];
        batch.update(existingDoc.ref, {
          name: contact.name,
          email: contact.email,
          tags: contact.tags,
          updatedAt: new Date(),
        });
        savedCount++;
      }
    }

    await batch.commit();
    console.log('[FIREBASE] Contacts saved:', savedCount);
    return { success: true, savedCount };
  } catch (error) {
    console.error('[FIREBASE] Error saving contacts:', error);
    if (error instanceof Error) {
      return { success: false, savedCount: 0, error: error.message };
    }
    return { success: false, savedCount: 0, error: 'Unknown error occurred' };
  }
}

export async function getContacts(limit: number = 500): Promise<WhatsAppContact[]> {
  try {
    const snapshot = await db
      .collection(collections.whatsappContacts)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WhatsAppContact[];
  } catch (error) {
    console.error('[FIREBASE] Error getting contacts:', error);
    return [];
  }
}

export async function getContactsByIds(contactIds: string[]): Promise<WhatsAppContact[]> {
  try {
    if (contactIds.length === 0) return [];

    // Firestore 'in' query supports max 10 items, so we batch
    const contacts: WhatsAppContact[] = [];
    const batches = [];

    for (let i = 0; i < contactIds.length; i += 10) {
      batches.push(contactIds.slice(i, i + 10));
    }

    for (const batch of batches) {
      const snapshot = await db
        .collection(collections.whatsappContacts)
        .where('__name__', 'in', batch)
        .get();

      contacts.push(...snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as WhatsAppContact[]);
    }

    return contacts;
  } catch (error) {
    console.error('[FIREBASE] Error getting contacts by IDs:', error);
    return [];
  }
}

export async function deleteContact(contactId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection(collections.whatsappContacts).doc(contactId).delete();
    console.log('[FIREBASE] Contact deleted:', contactId);
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error deleting contact:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

export async function updateContactLastContacted(
  phoneNumber: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const snapshot = await db
      .collection(collections.whatsappContacts)
      .where('phoneNumber', '==', phoneNumber)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      await snapshot.docs[0].ref.update({
        lastContacted: new Date(),
        updatedAt: new Date(),
      });
    }
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error updating contact last contacted:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

// Bulk Send Job helper functions
export async function createBulkJob(
  job: Omit<BulkSendJob, 'id'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const docRef = await db.collection(collections.whatsappBulkJobs).add(job);
    console.log('[FIREBASE] Bulk job created:', docRef.id);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[FIREBASE] Error creating bulk job:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

export async function updateBulkJobProgress(
  jobId: string,
  updates: Partial<BulkSendJob>
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection(collections.whatsappBulkJobs).doc(jobId).update(updates);
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error updating bulk job:', error);
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  }
}

export async function getBulkJob(jobId: string): Promise<BulkSendJob | null> {
  try {
    const doc = await db.collection(collections.whatsappBulkJobs).doc(jobId).get();

    if (!doc.exists) {
      return null;
    }

    return { id: doc.id, ...doc.data() } as BulkSendJob;
  } catch (error) {
    console.error('[FIREBASE] Error getting bulk job:', error);
    return null;
  }
}

export async function getRecentBulkJobs(limit: number = 20): Promise<BulkSendJob[]> {
  try {
    const snapshot = await db
      .collection(collections.whatsappBulkJobs)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BulkSendJob[];
  } catch (error) {
    console.error('[FIREBASE] Error getting bulk jobs:', error);
    return [];
  }
}
