import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

// Email del anfitrión para todas las reuniones
const HOST_EMAIL = 'elevatetechagency@gmail.com';


const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 465;
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || '';

const useSmtp = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS && SMTP_FROM);
const smtpTransport = useSmtp
  ? nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  })
  : null;

interface SendMeetingConfirmationParams {
  to: string;
  name: string;
  company: string;
  challenge: string;
  objectives: string;
  budget: string;
  timeline: string;
  scheduledTime: string;
  zoomLink: string;
}

export async function sendMeetingConfirmation(params: SendMeetingConfirmationParams) {
  const {
    to,
    name,
    company,
    challenge,
    objectives,
    budget,
    timeline,
    scheduledTime,
    zoomLink
  } = params;

  try {
    // Enviar email al cliente
    const subject = 'Reunion Confirmada - Elevate AI';
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reunión Confirmada</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 ¡Reunión Confirmada!</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; color: #1f2937;">¡Hola <strong>${name}</strong>!</p>
            
            <p style="font-size: 16px; color: #4b5563;">
              Tu reunión ha sido confirmada exitosamente. Estamos emocionados de conocer más sobre tu proyecto.
            </p>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #2563eb; margin-top: 0; font-size: 20px;">📅 Detalles de la Reunión</h2>
              <p style="margin: 10px 0;"><strong>Fecha y Hora:</strong> ${scheduledTime}</p>
              <p style="margin: 10px 0;">
                <strong>Link de Zoom:</strong><br>
                <a href="${zoomLink}" style="color: #2563eb; text-decoration: none; word-break: break-all;">${zoomLink}</a>
              </p>
              <div style="margin-top: 15px; padding: 15px; background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  💡 <strong>Tip:</strong> Te recomendamos unirte 5 minutos antes de la hora programada.
                </p>
              </div>
            </div>
            
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #059669; margin-top: 0; font-size: 20px;">📋 Resumen de tu Consulta</h2>
              
              <div style="margin: 15px 0;">
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Empresa / Independiente</p>
                <p style="margin: 5px 0; font-weight: 600;">${company}</p>
              </div>
              
              <div style="margin: 15px 0;">
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Desafío / Proyecto</p>
                <p style="margin: 5px 0;">${challenge}</p>
              </div>
              
              <div style="margin: 15px 0;">
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Objetivos Principales</p>
                <p style="margin: 5px 0;">${objectives}</p>
              </div>
              
              <div style="margin: 15px 0;">
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Presupuesto Estimado</p>
                <p style="margin: 5px 0; font-weight: 600;">${budget}</p>
              </div>
              
              <div style="margin: 15px 0;">
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">Timeline Deseado</p>
                <p style="margin: 5px 0; font-weight: 600;">${timeline}</p>
              </div>
            </div>
            
            <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">📝 Preparación para la Reunión</h3>
              <ul style="color: #78350f; margin: 10px 0; padding-left: 20px;">
                <li>Prepara cualquier documentación relevante</li>
                <li>Ten lista cualquier pregunta específica</li>
                <li>Considera tus prioridades y restricciones</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">
                ¿Necesitas reprogramar o cancelar?<br>
                Responde a este email o contáctanos directamente.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                Este es un email automático. Por favor no respondas directamente.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>© 2026 Landing AI. Todos los derechos reservados.</p>
          </div>
        </body>
        </html>
      `;

    if (useSmtp && smtpTransport) {
      await smtpTransport.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        html
      });
      console.log('Meeting confirmation email sent via SMTP:', to);
      return { success: true };
    }

    const { data, error } = await resend.emails.send({
      from: 'Elevate AI <onboarding@resend.dev>',
      to: [to],
      subject,
      html
    });


    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }

    console.log('Meeting confirmation email sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send meeting confirmation:', error);
    return { success: false, error };
  }
}

export async function sendMeetingReminder(params: {
  to: string;
  name: string;
  scheduledTime: string;
  zoomLink: string;
}) {
  const { to, name, scheduledTime, zoomLink } = params;

  try {
    const subject = 'Recordatorio: Reunion manana - Elevate AI';
    const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f59e0b; padding: 20px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">⏰ Recordatorio de Reunión</h1>
          </div>
          
          <div style="padding: 20px;">
            <p style="font-size: 16px;">Hola <strong>${name}</strong>,</p>
            
            <p>Te recordamos que tienes una reunión programada:</p>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>📅 Fecha y Hora:</strong> ${scheduledTime}</p>
              <p style="margin: 5px 0;"><strong>🔗 Link de Zoom:</strong><br>
                <a href="${zoomLink}" style="color: #2563eb;">${zoomLink}</a>
              </p>
            </div>
            
            <p>¡Nos vemos pronto!</p>
          </div>
        </body>
        </html>
      `;

    if (useSmtp && smtpTransport) {
      await smtpTransport.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        html
      });
      console.log('Meeting reminder email sent via SMTP:', to);
      return { success: true };
    }

    const { data, error } = await resend.emails.send({
      from: 'Elevate AI <onboarding@resend.dev>',
      to: [to],
      subject,
      html
    });


    if (error) {
      console.error('Error sending reminder:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Failed to send reminder:', error);
    return { success: false, error };
  }
}

/**
 * Envía notificación al anfitrión sobre una nueva reunión agendada
 */
/**
 * Envía email con transcripción del voice chat
 */
interface VoiceChatMessage {
  id: string;
  role: 'user' | 'agent';
  message: string;
  timestamp: string;
}

interface SendVoiceChatTranscriptParams {
  to: string;
  recipient: 'host' | 'client';
  name: string;
  email: string;
  phone: string;
  company: string;
  purpose: string;
  scheduledTime: string;
  zoomLink: string;
  messages: VoiceChatMessage[];
  conversationId: string;
}

export async function sendVoiceChatTranscriptEmail(params: SendVoiceChatTranscriptParams) {
  const {
    to,
    recipient,
    name,
    email,
    phone,
    company,
    purpose,
    scheduledTime,
    zoomLink,
    messages,
    conversationId
  } = params;

  try {
    const isHost = recipient === 'host';
    const subject = isHost
      ? `🆕 Nueva Reunión Agendada - ${name}`
      : `✅ Reunión Confirmada - Elevate AI`;

    // Generate chat transcript HTML
    const chatTranscriptHTML = messages
      .map(msg => {
        const time = new Date(msg.timestamp).toLocaleTimeString('es-MX', {
          hour: '2-digit',
          minute: '2-digit'
        });

        if (msg.role === 'user') {
          return `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
              <div style="max-width: 70%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 16px; border-radius: 18px 18px 4px 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px; text-align: right;">
                  <strong>Cliente</strong> • ${time}
                </div>
                <div style="font-size: 14px; line-height: 1.4;">${msg.message}</div>
              </div>
            </div>
          `;
        } else {
          return `
            <div style="display: flex; justify-content: flex-start; margin-bottom: 12px;">
              <div style="max-width: 70%; background: white; border: 1px solid #e5e7eb; color: #1f2937; padding: 12px 16px; border-radius: 18px 18px 18px 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
                  <strong>Andrea (AI)</strong> • ${time}
                </div>
                <div style="font-size: 14px; line-height: 1.4;">${msg.message}</div>
              </div>
            </div>
          `;
        }
      })
      .join('');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 650px; margin: 0 auto; padding: 20px; background-color: #f3f4f6;">
        <div style="background: linear-gradient(135deg, ${isHost ? '#10b981 0%, #059669 100%' : '#667eea 0%, #764ba2 100%'}); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <div style="background: rgba(255,255,255,0.15); display: inline-block; padding: 8px 16px; border-radius: 20px; margin-bottom: 10px;">
            <span style="color: white; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">NUEVA</span>
          </div>
          <h1 style="color: white; margin: 0; font-size: 26px;">${isHost ? '🆕 Nueva Reunión Agendada' : '🎉 Reunión Confirmada'}</h1>
        </div>

        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${!isHost ? `
            <p style="font-size: 18px; color: #1f2937; margin-bottom: 10px;">¡Hola <strong>${name}</strong>!</p>
            <p style="font-size: 16px; color: #4b5563; margin-bottom: 25px;">
              Tu reunión ha sido confirmada exitosamente. A continuación encontrarás los detalles y la transcripción de nuestra conversación.
            </p>
          ` : ''}

          <!-- Meeting Details -->
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <span style="font-size: 20px;">📅</span>
              </div>
              <h2 style="color: #1f2937; margin: 0; font-size: 18px;">Detalles de la Reunión</h2>
            </div>

            <div style="margin-left: 48px;">
              <p style="margin: 8px 0;"><strong style="color: #6b7280;">Fecha y Hora:</strong> <span style="color: #1f2937;">${scheduledTime}</span></p>
              <p style="margin: 8px 0;">
                <strong style="color: #6b7280;">Link de Zoom:</strong><br>
                <a href="${zoomLink}" style="color: #2563eb; text-decoration: none; word-break: break-all; font-size: 14px;">${zoomLink}</a>
              </p>
            </div>
          </div>

          <!-- Prospect Information (for host) or Summary (for client) -->
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <span style="font-size: 20px;">${isHost ? '👤' : '📋'}</span>
              </div>
              <h2 style="color: #1f2937; margin: 0; font-size: 18px;">${isHost ? 'Información del Prospecto' : 'Resumen de tu Consulta'}</h2>
            </div>

            <div style="margin-left: 48px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 120px;">Nombre:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${name}</td>
                </tr>
                ${email && email !== 'No proporcionado' ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Email:</td>
                  <td style="padding: 8px 0;">
                    <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>
                  </td>
                </tr>
                ` : ''}
                ${phone && phone !== 'No proporcionado' ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Teléfono:</td>
                  <td style="padding: 8px 0;">
                    <a href="tel:${phone}" style="color: #2563eb; text-decoration: none;">${phone}</a>
                  </td>
                </tr>
                ` : ''}
                ${company && company !== 'No especificada' ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Empresa:</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${company}</td>
                </tr>
                ` : ''}
                ${purpose && purpose !== 'No especificado' ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Propósito:</td>
                  <td style="padding: 8px 0; color: #1f2937;">${purpose}</td>
                </tr>
                ` : ''}
              </table>
            </div>
          </div>

          <!-- Chat Transcript -->
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; margin-bottom: 20px;">
              <div style="background: linear-gradient(135deg, #06b6d4, #0891b2); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <span style="font-size: 20px;">💬</span>
              </div>
              <h2 style="color: #1f2937; margin: 0; font-size: 18px;">Transcripción de la Conversación</h2>
            </div>

            <div style="background: white; border-radius: 12px; padding: 20px; max-height: 500px; overflow-y: auto; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);">
              ${chatTranscriptHTML}
            </div>

            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
              Conversación ID: ${conversationId} • ${messages.length} mensajes
            </p>
          </div>

          ${!isHost ? `
          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              💡 <strong>Tip:</strong> Te recomendamos unirte 5 minutos antes de la hora programada para verificar tu conexión.
            </p>
          </div>
          ` : ''}

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">
              ${isHost
                ? 'Este email fue generado automáticamente por el sistema de Voice Chat.'
                : '¿Necesitas reprogramar o cancelar? Responde a este email o contáctanos directamente.'
              }
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
              © 2026 Elevate AI. Todos los derechos reservados.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (useSmtp && smtpTransport) {
      await smtpTransport.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        html
      });
      console.log(`Voice chat transcript email sent via SMTP to ${recipient}:`, to);
      return { success: true };
    }

    const { data, error } = await resend.emails.send({
      from: 'Elevate AI <onboarding@resend.dev>',
      to: [to],
      subject,
      html
    });

    if (error) {
      console.error(`Error sending voice chat email to ${recipient}:`, error);
      return { success: false, error };
    }

    console.log(`Voice chat transcript email sent to ${recipient}:`, data);
    return { success: true, data };
  } catch (error) {
    console.error(`Failed to send voice chat transcript to ${recipient}:`, error);
    return { success: false, error };
  }
}

export async function sendHostNotification(params: {
  name: string;
  email: string;
  phone: string;
  company: string;
  challenge: string;
  objectives: string;
  budget: string;
  timeline: string;
  scheduledTime: string;
  zoomLink: string;
}) {
  const {
    name,
    email,
    phone,
    company,
    challenge,
    objectives,
    budget,
    timeline,
    scheduledTime,
    zoomLink
  } = params;

  try {
    const subject = `Nueva Reunion: ${name} - ${company}`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Nueva Reunión Agendada</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🆕 Nueva Reunión Agendada</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #059669; margin-top: 0; font-size: 20px;">📅 Detalles de la Reunión</h2>
              <p style="margin: 10px 0;"><strong>Fecha y Hora:</strong> ${scheduledTime}</p>
              <p style="margin: 10px 0;">
                <strong>Link de Zoom:</strong><br>
                <a href="${zoomLink}" style="color: #2563eb; text-decoration: none;">${zoomLink}</a>
              </p>
            </div>

            <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #2563eb; margin-top: 0; font-size: 20px;">👤 Información del Prospecto</h2>

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px;">Nombre:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Email:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <a href="mailto:${email}" style="color: #2563eb;">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">Teléfono:</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <a href="tel:${phone}" style="color: #2563eb;">${phone}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Empresa:</td>
                  <td style="padding: 8px 0; font-weight: 600;">${company}</td>
                </tr>
              </table>
            </div>

            <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #7c3aed; margin-top: 0; font-size: 20px;">📋 Detalles del Proyecto</h2>

              <div style="margin: 15px 0; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Desafío / Proyecto:</p>
                <p style="margin: 0;">${challenge}</p>
              </div>

              <div style="margin: 15px 0; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Objetivos:</p>
                <p style="margin: 0;">${objectives}</p>
              </div>

              <div style="display: flex; gap: 15px; margin-top: 15px;">
                <div style="flex: 1; padding: 15px; background: #ecfdf5; border-radius: 8px; text-align: center;">
                  <p style="margin: 0 0 5px 0; color: #059669; font-size: 12px; font-weight: 600;">💰 Presupuesto</p>
                  <p style="margin: 0; font-weight: 600; color: #047857;">${budget}</p>
                </div>
                <div style="flex: 1; padding: 15px; background: #eff6ff; border-radius: 8px; text-align: center;">
                  <p style="margin: 0 0 5px 0; color: #2563eb; font-size: 12px; font-weight: 600;">⏱️ Timeline</p>
                  <p style="margin: 0; font-weight: 600; color: #1d4ed8;">${timeline}</p>
                </div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Este email fue generado automáticamente por el sistema de agendamiento.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

    if (useSmtp && smtpTransport) {
      await smtpTransport.sendMail({
        from: SMTP_FROM,
        to: HOST_EMAIL,
        subject,
        html
      });
      console.log('Host notification sent via SMTP:', HOST_EMAIL);
      return { success: true };
    }

    const { data, error } = await resend.emails.send({
      from: 'Elevate AI <onboarding@resend.dev>',
      to: [HOST_EMAIL],
      subject,
      html
    });


    if (error) {
      console.error('Error sending host notification:', error);
      return { success: false, error };
    }

    console.log('Host notification sent:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send host notification:', error);
    return { success: false, error };
  }
}
