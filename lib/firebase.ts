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
