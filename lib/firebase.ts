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
