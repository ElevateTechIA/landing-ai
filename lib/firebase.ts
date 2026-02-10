import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

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
        storageBucket: `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`,
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

export function getStorageBucket() {
  const projectId = process.env.FIREBASE_PROJECT_ID || 'landing-ai-meetings';
  return getStorage().bucket(`${projectId}.firebasestorage.app`);
}

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
  whatsappSnippets: 'whatsappSnippets',
  whatsappTags: 'whatsappTags',
  whatsappAutoReplies: 'whatsappAutoReplies',
  whatsappAutomationConfig: 'whatsappAutomationConfig',
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

export type ConversationStatus = 'open' | 'resolved' | 'archived';

export interface WhatsAppConversation {
  id?: string;
  phoneNumber: string; // E.164 format
  businessPhoneNumberId?: string; // Which business number owns this conversation
  displayName?: string;
  messages: WhatsAppMessage[];
  language: 'en' | 'es';
  status?: ConversationStatus;
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type LifecycleStage = 'new_lead' | 'qualified' | 'proposal' | 'customer' | 'lost';

export interface ContactNote {
  id: string;
  content: string;
  createdAt: Date;
}

export interface WhatsAppContact {
  id?: string;
  phoneNumber: string; // E.164 format: +1234567890
  name: string;
  email?: string;
  tags?: string[];
  lifecycleStage?: LifecycleStage;
  notes?: ContactNote[];
  company?: string;
  importedFrom?: string; // Excel filename
  importedAt: Date;
  lastContacted?: Date;
  optedOut: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BroadcastAudienceFilter {
  tags?: string[];
  lifecycleStages?: LifecycleStage[];
  excludeOptedOut?: boolean;
}

export interface BroadcastAnalytics {
  deliveredCount: number;
  readCount: number;
  respondedCount: number;
  deliveryRate: number;
  readRate: number;
  responseRate: number;
}

export interface BulkSendJob {
  id?: string;
  name?: string;
  businessPhoneNumberId?: string;
  status: 'pending' | 'scheduled' | 'processing' | 'completed' | 'failed';
  message: string;
  messageType?: 'text' | 'reply_buttons' | 'cta_url' | 'location_request' | 'list' | 'template';
  messagePayload?: {
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
  };
  contactIds: string[];
  totalContacts: number;
  sentCount: number;
  failedCount: number;
  scheduledFor?: Date;
  audienceFilter?: BroadcastAudienceFilter;
  analytics?: BroadcastAnalytics;
  createdAt: Date;
  completedAt?: Date;
  errors: Array<{ contactId: string; phoneNumber: string; error: string }>;
}

// WhatsApp Conversation helper functions
export async function getWhatsAppConversation(
  phoneNumber: string,
  businessPhoneNumberId?: string
): Promise<WhatsAppConversation | null> {
  try {
    let query = db
      .collection(collections.whatsappConversations)
      .where('phoneNumber', '==', phoneNumber);

    if (businessPhoneNumberId) {
      query = query.where('businessPhoneNumberId', '==', businessPhoneNumberId);
    }

    const snapshot = await query.limit(1).get();

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
    // Strip undefined values from messages to avoid Firestore errors
    const cleanMessages = conversation.messages.map(msg => {
      const clean: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(msg)) {
        if (value !== undefined) {
          clean[key] = value;
        }
      }
      return clean;
    });

    // Check if conversation exists
    const existing = await getWhatsAppConversation(conversation.phoneNumber, conversation.businessPhoneNumberId);

    if (existing && existing.id) {
      // Update existing conversation
      await db.collection(collections.whatsappConversations).doc(existing.id).update({
        messages: cleanMessages,
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
        messages: cleanMessages,
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

export async function getRecentWhatsAppConversations(
  limit: number = 50,
  businessPhoneNumberId?: string
): Promise<WhatsAppConversation[]> {
  try {
    const snapshot = await db
      .collection(collections.whatsappConversations)
      .orderBy('lastMessageAt', 'desc')
      .limit(businessPhoneNumberId ? limit * 2 : limit)
      .get();

    let conversations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WhatsAppConversation[];

    if (businessPhoneNumberId) {
      const { getDefaultWhatsAppConfig } = require('@/lib/whatsapp-config');
      const defaultConfig = getDefaultWhatsAppConfig();
      const isDefaultPhone = defaultConfig?.phoneNumberId === businessPhoneNumberId;

      conversations = conversations.filter((c) => {
        if (c.businessPhoneNumberId === businessPhoneNumberId) return true;
        // Legacy conversations (no businessPhoneNumberId) belong to the default phone
        if (!c.businessPhoneNumberId && isDefaultPhone) return true;
        return false;
      }).slice(0, limit);
    }

    return conversations;
  } catch (error) {
    console.error('[FIREBASE] Error getting recent WhatsApp conversations:', error);
    return [];
  }
}

// WhatsApp Contact helper functions
// Helper function to remove undefined values from an object
function removeUndefinedValues<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as T;
}

export async function saveContacts(
  contacts: Omit<WhatsAppContact, 'id' | 'createdAt' | 'updatedAt'>[]
): Promise<{ success: boolean; savedCount: number; error?: string }> {
  try {
    console.log('[FIREBASE] saveContacts: Saving', contacts.length, 'contacts');
    const batch = db.batch();
    let savedCount = 0;
    let newCount = 0;
    let updateCount = 0;

    for (const contact of contacts) {
      // Check if contact already exists by phone number
      const existingSnapshot = await db
        .collection(collections.whatsappContacts)
        .where('phoneNumber', '==', contact.phoneNumber)
        .limit(1)
        .get();

      if (existingSnapshot.empty) {
        const docRef = db.collection(collections.whatsappContacts).doc();
        console.log('[FIREBASE] Creating new contact:', contact.phoneNumber, 'with docId:', docRef.id);
        // Remove undefined values before saving to Firestore
        const contactData = removeUndefinedValues({
          ...contact,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        batch.set(docRef, contactData);
        savedCount++;
        newCount++;
      } else {
        // Update existing contact
        const existingDoc = existingSnapshot.docs[0];
        console.log('[FIREBASE] Updating existing contact:', contact.phoneNumber);
        // Remove undefined values before updating
        const updateData = removeUndefinedValues({
          name: contact.name,
          email: contact.email,
          tags: contact.tags,
          updatedAt: new Date(),
        });
        batch.update(existingDoc.ref, updateData);
        savedCount++;
        updateCount++;
      }
    }

    console.log('[FIREBASE] Committing batch - new:', newCount, 'updated:', updateCount);
    await batch.commit();
    console.log('[FIREBASE] Batch committed successfully. Total saved:', savedCount);
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
    // First, try simple query WITHOUT orderBy to ensure we can read the collection
    console.log('[FIREBASE] getContacts: Fetching contacts from collection:', collections.whatsappContacts);

    const snapshot = await db
      .collection(collections.whatsappContacts)
      .limit(limit)
      .get();

    console.log('[FIREBASE] getContacts: Found', snapshot.docs.length, 'contacts');

    if (snapshot.docs.length > 0) {
      // Log first contact for debugging
      const firstDoc = snapshot.docs[0];
      console.log('[FIREBASE] First contact ID:', firstDoc.id);
      console.log('[FIREBASE] First contact data:', JSON.stringify(firstDoc.data()).substring(0, 200));
    }

    const contacts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WhatsAppContact[];

    // Sort by createdAt in memory (descending) since we're not using orderBy
    contacts.sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt as unknown as string).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt as unknown as string).getTime() : 0;
      return dateB - dateA;
    });

    return contacts;
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

// Individual contact operations (Phase 2 - CRM)
export async function getContactById(contactId: string): Promise<WhatsAppContact | null> {
  try {
    const doc = await db.collection(collections.whatsappContacts).doc(contactId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as WhatsAppContact;
  } catch (error) {
    console.error('[FIREBASE] Error getting contact by ID:', error);
    return null;
  }
}

export async function updateContact(
  contactId: string,
  updates: Partial<Omit<WhatsAppContact, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanUpdates = removeUndefinedValues({ ...updates, updatedAt: new Date() });
    await db.collection(collections.whatsappContacts).doc(contactId).update(cleanUpdates);
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error updating contact:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function addContactNote(
  contactId: string,
  content: string
): Promise<{ success: boolean; note?: ContactNote; error?: string }> {
  try {
    const contact = await getContactById(contactId);
    if (!contact) return { success: false, error: 'Contact not found' };

    const note: ContactNote = {
      id: crypto.randomUUID(),
      content,
      createdAt: new Date(),
    };

    const notes = [...(contact.notes || []), note];
    await db.collection(collections.whatsappContacts).doc(contactId).update({
      notes,
      updatedAt: new Date(),
    });

    return { success: true, note };
  } catch (error) {
    console.error('[FIREBASE] Error adding contact note:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteContactNote(
  contactId: string,
  noteId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const contact = await getContactById(contactId);
    if (!contact) return { success: false, error: 'Contact not found' };

    const notes = (contact.notes || []).filter(n => n.id !== noteId);
    await db.collection(collections.whatsappContacts).doc(contactId).update({
      notes,
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error deleting contact note:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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

// Phase 3: Scheduled broadcasts
export async function getScheduledBroadcasts(): Promise<BulkSendJob[]> {
  try {
    const snapshot = await db
      .collection(collections.whatsappBulkJobs)
      .where('status', '==', 'scheduled')
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as BulkSendJob[];
  } catch (error) {
    console.error('[FIREBASE] Error getting scheduled broadcasts:', error);
    return [];
  }
}

export async function getContactsByFilter(
  filter: BroadcastAudienceFilter,
  limit: number = 1000
): Promise<WhatsAppContact[]> {
  try {
    const allContacts = await getContacts(limit);
    let filtered = allContacts;

    if (filter.excludeOptedOut !== false) {
      filtered = filtered.filter(c => !c.optedOut);
    }

    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter(c =>
        c.tags && c.tags.some(t => filter.tags!.includes(t))
      );
    }

    if (filter.lifecycleStages && filter.lifecycleStages.length > 0) {
      filtered = filtered.filter(c =>
        c.lifecycleStage && filter.lifecycleStages!.includes(c.lifecycleStage)
      );
    }

    return filtered;
  } catch (error) {
    console.error('[FIREBASE] Error filtering contacts:', error);
    return [];
  }
}

export async function updateBroadcastAnalytics(
  jobId: string,
  analytics: Partial<BroadcastAnalytics>
): Promise<{ success: boolean; error?: string }> {
  try {
    const job = await getBulkJob(jobId);
    if (!job) return { success: false, error: 'Job not found' };

    const currentAnalytics: BroadcastAnalytics = job.analytics || {
      deliveredCount: 0,
      readCount: 0,
      respondedCount: 0,
      deliveryRate: 0,
      readRate: 0,
      responseRate: 0,
    };

    const updated = { ...currentAnalytics, ...analytics };
    // Recalculate rates
    if (job.sentCount > 0) {
      updated.deliveryRate = Math.round((updated.deliveredCount / job.sentCount) * 100);
      updated.readRate = Math.round((updated.readCount / job.sentCount) * 100);
      updated.responseRate = Math.round((updated.respondedCount / job.sentCount) * 100);
    }

    await db.collection(collections.whatsappBulkJobs).doc(jobId).update({
      analytics: updated,
    });

    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error updating broadcast analytics:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================
// Snippets (Quick Replies) - Phase 1
// =============================================

export interface WhatsAppSnippet {
  id?: string;
  name: string;
  content: string;
  shortcut: string; // e.g. "greeting" -> type /greeting
  category: string; // e.g. "general", "sales", "support"
  createdAt: Date;
  updatedAt: Date;
}

export async function getSnippets(limit: number = 100): Promise<WhatsAppSnippet[]> {
  try {
    const snapshot = await db
      .collection(collections.whatsappSnippets)
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WhatsAppSnippet[];
  } catch (error) {
    console.error('[FIREBASE] Error getting snippets:', error);
    return [];
  }
}

export async function saveSnippet(
  snippet: Omit<WhatsAppSnippet, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const docRef = await db.collection(collections.whatsappSnippets).add({
      ...snippet,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[FIREBASE] Error saving snippet:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateSnippet(
  snippetId: string,
  updates: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection(collections.whatsappSnippets).doc(snippetId).update({
      ...updates,
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error updating snippet:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteSnippet(
  snippetId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection(collections.whatsappSnippets).doc(snippetId).delete();
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error deleting snippet:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================
// Tags Management - Phase 2
// =============================================

export interface WhatsAppTag {
  id?: string;
  name: string;
  color: string; // hex color e.g. "#3B82F6"
  createdAt: Date;
  updatedAt: Date;
}

export async function getTags(): Promise<WhatsAppTag[]> {
  try {
    const snapshot = await db
      .collection(collections.whatsappTags)
      .limit(100)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as WhatsAppTag[];
  } catch (error) {
    console.error('[FIREBASE] Error getting tags:', error);
    return [];
  }
}

export async function saveTag(
  tag: Omit<WhatsAppTag, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const docRef = await db.collection(collections.whatsappTags).add({
      ...tag,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[FIREBASE] Error saving tag:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteTag(
  tagId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection(collections.whatsappTags).doc(tagId).delete();
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error deleting tag:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================
// Message Status Tracking - Phase 1
// =============================================

/**
 * Update message delivery status in a conversation
 * Called when we receive status webhooks (sent, delivered, read)
 */
export async function updateMessageStatus(
  phoneNumber: string,
  messageId: string,
  status: 'sent' | 'delivered' | 'read' | 'failed',
  timestamp?: Date,
  businessPhoneNumberId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const conversation = await getWhatsAppConversation(phoneNumber, businessPhoneNumberId);
    if (!conversation || !conversation.id) {
      return { success: false, error: 'Conversation not found' };
    }

    // Find the message and update its status
    const messages = conversation.messages.map((msg) => {
      if (msg.messageId === messageId || msg.id === messageId) {
        return {
          ...msg,
          status,
          statusTimestamp: timestamp || new Date(),
        };
      }
      return msg;
    });

    await db.collection(collections.whatsappConversations).doc(conversation.id).update({
      messages,
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error updating message status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// =============================================
// Automation - Phase 4
// =============================================

export type AutoReplyType = 'welcome' | 'away' | 'keyword';

export interface WhatsAppAutoReply {
  id?: string;
  type: AutoReplyType;
  name: string;
  enabled: boolean;
  message: string;
  keywords?: string[];
  matchMode?: 'contains' | 'exact';
  createdAt: Date;
  updatedAt: Date;
}

export interface BusinessHoursSlot {
  day: number; // 0=Sunday, 6=Saturday
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  enabled: boolean;
}

export interface AntiBlockingConfig {
  enableTypingIndicator: boolean;
  enableReadReceipts: boolean;
  minReplyDelaySec: number;
  maxReplyDelaySec: number;
  bulkMessageDelaySec: number;
  bulkBatchSize: number;
  bulkBatchPauseSec: number;
}

export interface AutomationConfig {
  id?: string;
  businessHours: BusinessHoursSlot[];
  autoCloseAfterHours: number;
  timezone: string;
  antiBlocking?: AntiBlockingConfig;
  updatedAt: Date;
}

export async function getAutoReplies(): Promise<WhatsAppAutoReply[]> {
  try {
    const snapshot = await db.collection(collections.whatsappAutoReplies).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as WhatsAppAutoReply[];
  } catch (error) {
    console.error('[FIREBASE] Error getting auto-replies:', error);
    return [];
  }
}

export async function saveAutoReply(
  autoReply: Omit<WhatsAppAutoReply, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const docRef = await db.collection(collections.whatsappAutoReplies).add({
      ...autoReply,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('[FIREBASE] Error saving auto-reply:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateAutoReply(
  id: string,
  updates: Partial<Omit<WhatsAppAutoReply, 'id' | 'createdAt'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanUpdates = removeUndefinedValues({ ...updates, updatedAt: new Date() });
    await db.collection(collections.whatsappAutoReplies).doc(id).update(cleanUpdates);
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error updating auto-reply:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function deleteAutoReply(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection(collections.whatsappAutoReplies).doc(id).delete();
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error deleting auto-reply:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function getAutomationConfig(): Promise<AutomationConfig | null> {
  try {
    const snapshot = await db.collection(collections.whatsappAutomationConfig).limit(1).get();
    if (snapshot.empty) return null;
    return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as AutomationConfig;
  } catch (error) {
    console.error('[FIREBASE] Error getting automation config:', error);
    return null;
  }
}

export async function saveAutomationConfig(
  config: Omit<AutomationConfig, 'id'>
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await getAutomationConfig();
    if (existing?.id) {
      await db.collection(collections.whatsappAutomationConfig).doc(existing.id).update({
        ...config,
        updatedAt: new Date(),
      });
    } else {
      await db.collection(collections.whatsappAutomationConfig).add({
        ...config,
        updatedAt: new Date(),
      });
    }
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error saving automation config:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function updateConversationStatus(
  conversationId: string,
  status: ConversationStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    await db.collection(collections.whatsappConversations).doc(conversationId).update({
      status,
      updatedAt: new Date(),
    });
    return { success: true };
  } catch (error) {
    console.error('[FIREBASE] Error updating conversation status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function isWithinBusinessHours(): Promise<boolean> {
  try {
    const config = await getAutomationConfig();
    if (!config) return true;

    const tz = config.timezone || 'America/New_York';
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: 'numeric',
      hour12: false,
      weekday: 'short',
    });
    const parts = formatter.formatToParts(now);
    const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
    const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
    const weekday = parts.find(p => p.type === 'weekday')?.value || '';

    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const currentDay = dayMap[weekday] ?? now.getDay();
    const currentTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

    const todaySlot = config.businessHours.find(s => s.day === currentDay);
    if (!todaySlot || !todaySlot.enabled) return false;

    return currentTime >= todaySlot.startTime && currentTime <= todaySlot.endTime;
  } catch (error) {
    console.error('[FIREBASE] Error checking business hours:', error);
    return true;
  }
}

export async function findMatchingAutoReply(
  message: string,
  isNewConversation: boolean
): Promise<WhatsAppAutoReply | null> {
  try {
    const autoReplies = await getAutoReplies();
    const enabledReplies = autoReplies.filter(r => r.enabled);

    if (isNewConversation) {
      const welcome = enabledReplies.find(r => r.type === 'welcome');
      if (welcome) return welcome;
    }

    const withinHours = await isWithinBusinessHours();
    if (!withinHours) {
      const away = enabledReplies.find(r => r.type === 'away');
      if (away) return away;
    }

    const lowerMessage = message.toLowerCase().trim();
    for (const rule of enabledReplies.filter(r => r.type === 'keyword')) {
      if (!rule.keywords || rule.keywords.length === 0) continue;
      for (const keyword of rule.keywords) {
        const lowerKeyword = keyword.toLowerCase().trim();
        if (rule.matchMode === 'exact') {
          if (lowerMessage === lowerKeyword) return rule;
        } else {
          if (lowerMessage.includes(lowerKeyword)) return rule;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[FIREBASE] Error finding matching auto-reply:', error);
    return null;
  }
}
