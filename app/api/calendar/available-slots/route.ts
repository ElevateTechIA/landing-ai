import { NextRequest, NextResponse } from 'next/server';
import { db, collections } from '@/lib/firebase';
import { checkAvailability } from '@/lib/google-calendar';

// Implementación con Firebase Firestore y Google Calendar API

interface AvailableSlot {
  datetime: string;
  displayText: string;
}

// Función para generar slots disponibles usando Firebase y Google Calendar
async function generateAvailableSlots(timezone: string): Promise<AvailableSlot[]> {
  const slots: AvailableSlot[] = [];
  const now = new Date();
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'primary';
  
  try {
    // Obtener todas las reuniones existentes de Firebase
    const meetingsSnapshot = await db
      .collection(collections.meetings)
      .where('status', 'in', ['scheduled', 'confirmed'])
      .where('scheduledTime', '>=', now.toISOString())
      .get();
    
    const bookedTimes = new Set(
      meetingsSnapshot.docs.map(doc => doc.data().scheduledTime)
    );
    
    // Obtener fechas bloqueadas de Firebase
    const blockedDatesSnapshot = await db
      .collection(collections.blockedDates)
      .where('date', '>=', now)
      .get();
    
    const blockedDateStrings = new Set(
      blockedDatesSnapshot.docs.map(doc => {
        const data = doc.data();
        const date = data.date.toDate();
        return date.toISOString().split('T')[0];
      })
    );
    
    // Generar slots para los próximos 14 días
    for (let day = 1; day <= 14; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      
      const dateString = date.toISOString().split('T')[0];
      
      // Saltar fechas bloqueadas
      if (blockedDateStrings.has(dateString)) {
        continue;
      }
      
      // Solo días laborables (lunes a viernes)
      if (date.getDay() !== 0 && date.getDay() !== 6) {
        // Horarios: 9:00, 11:00, 14:00, 16:00
        const hours = [9, 11, 14, 16];
        
        for (const hour of hours) {
          const slotDate = new Date(date);
          slotDate.setHours(hour, 0, 0, 0);
          
          const slotIso = slotDate.toISOString();
          
          // Verificar si el slot ya está ocupado en Firebase
          if (!bookedTimes.has(slotIso)) {
            // Verificar disponibilidad en Google Calendar
            const endTime = new Date(slotDate.getTime() + 30 * 60 * 1000); // +30 minutos
            
            try {
              const isAvailable = await checkAvailability(slotDate, endTime, calendarId);
              
              if (isAvailable) {
                // Formatear la fecha para mostrar
                const options: Intl.DateTimeFormatOptions = {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: timezone
                };
                
                slots.push({
                  datetime: slotIso,
                  displayText: slotDate.toLocaleDateString('es-ES', options)
                });
              }
            } catch (error) {
              console.error('Error checking Google Calendar availability:', error);
              // Si falla Google Calendar, incluir el slot de todos modos
              const options: Intl.DateTimeFormatOptions = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                timeZone: timezone
              };
              
              slots.push({
                datetime: slotIso,
                displayText: slotDate.toLocaleDateString('es-ES', options)
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error generating available slots:', error);
  }
  
  return slots;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { timezone } = body;

    // Generar slots disponibles considerando Firebase y Google Calendar
    const availableSlots = await generateAvailableSlots(timezone || 'America/Mexico_City');
    
    // Limitar a los primeros 10 slots disponibles
    const limitedSlots = availableSlots.slice(0, 10);

    return NextResponse.json({
      success: true,
      slots: limitedSlots.map(slot => slot.displayText),
      raw: limitedSlots.map(slot => slot.datetime),
      timezone: timezone,
      total: availableSlots.length
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener horarios disponibles' },
      { status: 500 }
    );
  }
}
