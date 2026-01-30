import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { db, collections } from '@/lib/firebase';
import { checkAvailability } from '@/lib/google-calendar';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface ParsedDateTime {
  success: boolean;
  date?: string; // ISO format
  displayText?: string;
  error?: string;
}

interface SlotCheckResult {
  success: boolean;
  available?: boolean;
  requestedSlot?: {
    datetime: string;
    displayText: string;
  };
  alternatives?: Array<{
    datetime: string;
    displayText: string;
  }>;
  error?: string;
  parseError?: string;
}

// Parsear fecha/hora en lenguaje natural usando Gemini
async function parseDateTimeNatural(
  userInput: string,
  timezone: string,
  language: string
): Promise<ParsedDateTime> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return {
        success: false,
        error: 'Falta configurar GEMINI_API_KEY en el entorno.'
      };
    }

    const now = new Date();
    const modelNames = (process.env.GEMINI_MODELS || process.env.GEMINI_MODEL || 'gemini-2.0-flash,gemini-flash-latest')
      .split(',')
      .map((name) => name.trim())
      .filter(Boolean);

    const prompt = `
Eres un asistente que convierte fechas y horas expresadas en lenguaje natural a formato ISO.

FECHA Y HORA ACTUAL: ${now.toISOString()}
TIMEZONE DEL USUARIO: ${timezone}
IDIOMA: ${language}

ENTRADA DEL USUARIO: "${userInput}"

REGLAS:
1. Solo acepta fechas futuras (no pasadas)
2. Solo acepta horarios laborables: Lunes a Viernes, 9:00 AM a 5:00 PM
3. Si no especifica hora, sugiere 10:00 AM
4. Si dice "mañana", "la próxima semana", etc., calcula la fecha correcta
5. Si la fecha cae en fin de semana, ajusta al lunes siguiente
6. Si la hora está fuera de horario laboral, ajusta a la hora laboral más cercana

RESPONDE ÚNICAMENTE en formato JSON (sin markdown, sin backticks):
{
  "success": true/false,
  "datetime": "YYYY-MM-DDTHH:mm:00.000Z" (en UTC),
  "displayText": "Lunes, 27 de enero 2025 a las 10:00 AM" (en el idioma del usuario),
  "error": "mensaje de error si success es false"
}

EJEMPLOS DE ENTRADAS:
- "mañana a las 3pm" -> calcula mañana + 15:00
- "el viernes" -> próximo viernes a las 10:00
- "la próxima semana" -> lunes de la próxima semana a las 10:00
- "27 de enero a las 2" -> 27 de enero a las 14:00
- "next monday at 11am" -> próximo lunes a las 11:00
`;

    let responseText = '';
    let lastError: unknown;

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(prompt);
        responseText = result.response.text().trim();
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!responseText) {
      throw lastError ?? new Error('No se recibió respuesta de Gemini.');
    }

    // Limpiar posibles backticks o markdown
    const cleanResponse = responseText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    const parsed = JSON.parse(cleanResponse);

    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error || 'No se pudo interpretar la fecha'
      };
    }

    return {
      success: true,
      date: parsed.datetime,
      displayText: parsed.displayText
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const lowerMessage = message.toLowerCase();
    let hint = 'Error al procesar la fecha. Por favor intenta con un formato más claro como "mañana a las 10am" o "el viernes a las 2pm"';

    if (lowerMessage.includes('fetch failed')) {
      hint = 'No se pudo contactar con Gemini. Revisa tu GEMINI_API_KEY y la conexión a internet.';
    } else if (lowerMessage.includes('404') || lowerMessage.includes('not found')) {
      hint = 'El modelo de Gemini no está disponible. Configura GEMINI_MODELS con un modelo válido (por ejemplo: gemini-2.0-flash o gemini-flash-latest).';
    }
    console.error('Error parsing datetime:', error);
    return {
      success: false,
      error: hint
    };
  }
}

// Verificar si un slot específico está disponible
async function isSlotAvailable(datetime: string): Promise<boolean> {
  try {
    const slotDate = new Date(datetime);
    const endTime = new Date(slotDate.getTime() + 30 * 60 * 1000); // +30 minutos
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';

    // Verificar en Firebase primero (si está disponible)
    try {
      const meetingsSnapshot = await db
        .collection(collections.meetings)
        .where('status', 'in', ['scheduled', 'confirmed'])
        .where('scheduledTime', '>=', slotDate.toISOString())
        .where('scheduledTime', '<=', endTime.toISOString())
        .get();

      if (!meetingsSnapshot.empty) {
        return false; // Ya hay una reunión en ese horario
      }
    } catch (firestoreError: any) {
      // Si Firestore no está disponible, solo advertir y continuar con Google Calendar
      if (firestoreError.code === 7 || firestoreError.code === 5 || firestoreError.reason === 'SERVICE_DISABLED') {
        console.warn('Firestore not available (disabled or collection not found). Continuing without Firestore check.');
      } else {
        console.error('Error checking Firestore:', firestoreError);
      }
    }

    // Verificar en Google Calendar
    try {
      const googleAvailable = await checkAvailability(slotDate, endTime, calendarId);
      return googleAvailable;
    } catch (error: any) {
      console.error('Error checking Google Calendar:', error);
      // Si Google Calendar no está habilitado (403) o falla, asumir disponible para permitir testing
      if (error.code === 403 || error.status === 403) {
        console.warn('Google Calendar API not enabled. Assuming slot is available for testing.');
      }
      return true;
    }
  } catch (error) {
    console.error('Error checking slot availability:', error);
    return false;
  }
}

// Generar slots alternativos cercanos
async function generateAlternatives(
  requestedDatetime: string,
  timezone: string,
  count: number = 3
): Promise<Array<{ datetime: string; displayText: string }>> {
  const alternatives: Array<{ datetime: string; displayText: string }> = [];
  const requestedDate = new Date(requestedDatetime);

  // Horarios laborables: 9, 10, 11, 14, 15, 16
  const workHours = [9, 10, 11, 14, 15, 16];

  // Buscar alternativas en los próximos 7 días
  for (let dayOffset = 0; dayOffset <= 7 && alternatives.length < count; dayOffset++) {
    const checkDate = new Date(requestedDate);
    checkDate.setDate(checkDate.getDate() + dayOffset);

    // Saltar fines de semana
    if (checkDate.getDay() === 0 || checkDate.getDay() === 6) {
      continue;
    }

    for (const hour of workHours) {
      if (alternatives.length >= count) break;

      const slotDate = new Date(checkDate);
      slotDate.setHours(hour, 0, 0, 0);

      // Saltar si es el mismo horario solicitado
      if (slotDate.getTime() === requestedDate.getTime()) {
        continue;
      }

      // Saltar si ya pasó
      if (slotDate.getTime() <= Date.now()) {
        continue;
      }

      const slotIso = slotDate.toISOString();
      const isAvailable = await isSlotAvailable(slotIso);

      if (isAvailable) {
        const options: Intl.DateTimeFormatOptions = {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: timezone
        };

        alternatives.push({
          datetime: slotIso,
          displayText: slotDate.toLocaleDateString('es-ES', options)
        });
      }
    }
  }

  return alternatives;
}

export async function POST(request: NextRequest): Promise<NextResponse<SlotCheckResult>> {
  try {
    const body = await request.json();
    const { userInput, timezone = 'America/Mexico_City', language = 'es' } = body;

    if (!userInput || typeof userInput !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Se requiere una fecha y hora'
      }, { status: 400 });
    }

    // 1. Parsear la fecha/hora en lenguaje natural
    const parsed = await parseDateTimeNatural(userInput, timezone, language);

    if (!parsed.success || !parsed.date) {
      return NextResponse.json({
        success: false,
        parseError: parsed.error || 'No se pudo interpretar la fecha'
      });
    }

    // 2. Verificar disponibilidad del slot solicitado
    const available = await isSlotAvailable(parsed.date);

    if (available) {
      // Slot disponible
      return NextResponse.json({
        success: true,
        available: true,
        requestedSlot: {
          datetime: parsed.date,
          displayText: parsed.displayText || ''
        }
      });
    }

    // 3. No disponible - generar alternativas
    const alternatives = await generateAlternatives(parsed.date, timezone, 3);

    return NextResponse.json({
      success: true,
      available: false,
      requestedSlot: {
        datetime: parsed.date,
        displayText: parsed.displayText || ''
      },
      alternatives
    });

  } catch (error) {
    console.error('Error checking slot:', error);
    return NextResponse.json({
      success: false,
      error: 'Error al verificar disponibilidad'
    }, { status: 500 });
  }
}
