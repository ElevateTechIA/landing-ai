import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder');

// Email del anfitrión para todas las reuniones
const HOST_EMAIL = 'elevatetechagency@gmail.com';

/**
 * Format datetime to human-readable format
 * Example: "📅 Friday, January 30 at 11:30 AM"
 */
function formatDateTime(dateTimeStr: string, language: 'en' | 'es'): string {
  try {
    const date = new Date(dateTimeStr);
    const langLocale = language === 'en' ? 'en-US' : 'es-MX';

    const dayOfWeek = date.toLocaleDateString(langLocale, { weekday: 'long' });
    const month = date.toLocaleDateString(langLocale, { month: 'long' });
    const day = date.getDate();
    const time = date.toLocaleTimeString(langLocale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (language === 'es') {
      // Capitalize first letter of day and month in Spanish
      const dayCapitalized = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
      return `📅 ${dayCapitalized}, ${day} de ${month} a las ${time}`;
    } else {
      // Capitalize first letter of day in English
      const dayCapitalized = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
      return `📅 ${dayCapitalized}, ${month} ${day} at ${time}`;
    }
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return `📅 ${dateTimeStr}`;
  }
}

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

// Email translations for bilingual support
const EMAIL_TRANSLATIONS = {
  meetingConfirmation: {
    en: {
      subject: 'Meeting Confirmed - Elevate AI',
      title: '🎉 Meeting Confirmed!',
      greeting: (name: string) => `Hello <strong>${name}</strong>!`,
      intro: 'Your meeting has been successfully confirmed. We\'re excited to learn more about your project.',
      meetingDetails: '📅 Meeting Details',
      dateTime: 'Date and Time:',
      zoomLink: 'Zoom Link:',
      tip: '💡 <strong>Tip:</strong> We recommend joining 5 minutes before the scheduled time.',
      consultationSummary: '📋 Consultation Summary',
      companyLabel: 'Company / Independent',
      challengeLabel: 'Challenge / Project',
      objectivesLabel: 'Main Objectives',
      budgetLabel: 'Estimated Budget',
      timelineLabel: 'Desired Timeline',
      preparationTitle: '📝 Meeting Preparation',
      preparationItems: [
        'Prepare any relevant documentation',
        'Have any specific questions ready',
        'Consider your priorities and constraints'
      ],
      footer: 'Need to reschedule or cancel?<br>Reply to this email or contact us directly.',
      autoEmail: 'This is an automated email. Please do not reply directly.',
      copyright: '© 2026 Landing AI. All rights reserved.'
    },
    es: {
      subject: 'Reunion Confirmada - Elevate AI',
      title: '🎉 ¡Reunión Confirmada!',
      greeting: (name: string) => `¡Hola <strong>${name}</strong>!`,
      intro: 'Tu reunión ha sido confirmada exitosamente. Estamos emocionados de conocer más sobre tu proyecto.',
      meetingDetails: '📅 Detalles de la Reunión',
      dateTime: 'Fecha y Hora:',
      zoomLink: 'Link de Zoom:',
      tip: '💡 <strong>Tip:</strong> Te recomendamos unirte 5 minutos antes de la hora programada.',
      consultationSummary: '📋 Resumen de tu Consulta',
      companyLabel: 'Empresa / Independiente',
      challengeLabel: 'Desafío / Proyecto',
      objectivesLabel: 'Objetivos Principales',
      budgetLabel: 'Presupuesto Estimado',
      timelineLabel: 'Timeline Deseado',
      preparationTitle: '📝 Preparación para la Reunión',
      preparationItems: [
        'Prepara cualquier documentación relevante',
        'Ten lista cualquier pregunta específica',
        'Considera tus prioridades y restricciones'
      ],
      footer: '¿Necesitas reprogramar o cancelar?<br>Responde a este email o contáctanos directamente.',
      autoEmail: 'Este es un email automático. Por favor no respondas directamente.',
      copyright: '© 2026 Landing AI. Todos los derechos reservados.'
    }
  },
  meetingReminder: {
    en: {
      subject: 'Reminder: Meeting Tomorrow - Elevate AI',
      title: '⏰ Meeting Reminder',
      greeting: (name: string) => `Hello <strong>${name}</strong>,`,
      intro: 'This is a reminder that you have a scheduled meeting:',
      dateTime: '📅 Date and Time:',
      zoomLink: '🔗 Zoom Link:',
      closing: 'See you soon!'
    },
    es: {
      subject: 'Recordatorio: Reunion manana - Elevate AI',
      title: '⏰ Recordatorio de Reunión',
      greeting: (name: string) => `Hola <strong>${name}</strong>,`,
      intro: 'Te recordamos que tienes una reunión programada:',
      dateTime: '📅 Fecha y Hora:',
      zoomLink: '🔗 Link de Zoom:',
      closing: '¡Nos vemos pronto!'
    }
  },
  voiceChatTranscript: {
    en: {
      subjectHost: (name: string) => `🆕 New Meeting Scheduled - ${name}`,
      subjectClient: '✅ Meeting Confirmed - Elevate AI',
      titleHost: '🆕 New Meeting Scheduled',
      titleClient: '🎉 Meeting Confirmed',
      greetingClient: (name: string) => `Hello <strong>${name}</strong>!`,
      introClient: 'Your meeting has been successfully confirmed. Below you\'ll find the details and transcript of our conversation.',
      meetingDetails: '📅 Meeting Details',
      dateTime: 'Date and Time:',
      zoomLink: 'Zoom Link:',
      prospectInfo: '👤 Prospect Information',
      consultationSummary: '📋 Consultation Summary',
      name: 'Name:',
      email: 'Email:',
      phone: 'Phone:',
      company: 'Company:',
      purpose: 'Purpose:',
      transcript: '💬 Conversation Transcript',
      transcriptFooter: (id: string, count: number) => `Conversation ID: ${id} • ${count} messages`,
      tipClient: '💡 <strong>Tip:</strong> We recommend joining 5 minutes before the scheduled time to verify your connection.',
      footerHost: 'This email was automatically generated by the Voice Chat system.',
      footerClient: 'Need to reschedule or cancel? Reply to this email or contact us directly.',
      copyright: '© 2026 Elevate AI. All rights reserved.',
      client: 'Client',
      agent: 'Andrea (AI)',
      notProvided: 'Not provided',
      notSpecified: 'Not specified'
    },
    es: {
      subjectHost: (name: string) => `🆕 Nueva Reunión Agendada - ${name}`,
      subjectClient: '✅ Reunión Confirmada - Elevate AI',
      titleHost: '🆕 Nueva Reunión Agendada',
      titleClient: '🎉 Reunión Confirmada',
      greetingClient: (name: string) => `¡Hola <strong>${name}</strong>!`,
      introClient: 'Tu reunión ha sido confirmada exitosamente. A continuación encontrarás los detalles y la transcripción de nuestra conversación.',
      meetingDetails: '📅 Detalles de la Reunión',
      dateTime: 'Fecha y Hora:',
      zoomLink: 'Link de Zoom:',
      prospectInfo: '👤 Información del Prospecto',
      consultationSummary: '📋 Resumen de tu Consulta',
      name: 'Nombre:',
      email: 'Email:',
      phone: 'Teléfono:',
      company: 'Empresa:',
      purpose: 'Propósito:',
      transcript: '💬 Transcripción de la Conversación',
      transcriptFooter: (id: string, count: number) => `Conversación ID: ${id} • ${count} mensajes`,
      tipClient: '💡 <strong>Tip:</strong> Te recomendamos unirte 5 minutos antes de la hora programada para verificar tu conexión.',
      footerHost: 'Este email fue generado automáticamente por el sistema de Voice Chat.',
      footerClient: '¿Necesitas reprogramar o cancelar? Responde a este email o contáctanos directamente.',
      copyright: '© 2026 Elevate AI. Todos los derechos reservados.',
      client: 'Cliente',
      agent: 'Andrea (IA)',
      notProvided: 'No proporcionado',
      notSpecified: 'No especificada'
    }
  },
  hostNotification: {
    en: {
      subject: (name: string, company: string) => `New Meeting: ${name} - ${company}`,
      title: '🆕 New Meeting Scheduled',
      meetingDetails: '📅 Meeting Details',
      dateTime: 'Date and Time:',
      zoomLink: 'Zoom Link:',
      prospectInfo: '👤 Prospect Information',
      name: 'Name:',
      email: 'Email:',
      phone: 'Phone:',
      company: 'Company:',
      projectDetails: '📋 Project Details',
      challenge: 'Challenge / Project:',
      objectives: 'Objectives:',
      budget: '💰 Budget',
      timeline: '⏱️ Timeline',
      footer: 'This email was automatically generated by the scheduling system.',
      copyright: '© 2026 Landing AI. All rights reserved.'
    },
    es: {
      subject: (name: string, company: string) => `Nueva Reunion: ${name} - ${company}`,
      title: '🆕 Nueva Reunión Agendada',
      meetingDetails: '📅 Detalles de la Reunión',
      dateTime: 'Fecha y Hora:',
      zoomLink: 'Link de Zoom:',
      prospectInfo: '👤 Información del Prospecto',
      name: 'Nombre:',
      email: 'Email:',
      phone: 'Teléfono:',
      company: 'Empresa:',
      projectDetails: '📋 Detalles del Proyecto',
      challenge: 'Desafío / Proyecto:',
      objectives: 'Objetivos:',
      budget: '💰 Presupuesto',
      timeline: '⏱️ Timeline',
      footer: 'Este email fue generado automáticamente por el sistema de agendamiento.',
      copyright: '© 2026 Landing AI. Todos los derechos reservados.'
    }
  }
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string;
}

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
  language?: 'en' | 'es';
  messages?: ChatMessage[];
  phone?: string;
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
    zoomLink,
    language = 'es',
    messages = [],
    phone
  } = params;

  const t = EMAIL_TRANSLATIONS.meetingConfirmation[language];
  const formattedDateTime = formatDateTime(scheduledTime, language);

  try {
    // Enviar email al cliente
    const subject = t.subject;
    const preparationItemsHtml = t.preparationItems.map(item => `<li>${item}</li>`).join('');

    // Generate chat transcript HTML if messages exist
    const langLocale = language === 'en' ? 'en-US' : 'es-MX';
    const chatTranscriptHTML = messages.length > 0
      ? messages
          .map(msg => {
            const time = new Date(msg.timestamp).toLocaleTimeString(langLocale, {
              hour: '2-digit',
              minute: '2-digit'
            });

            if (msg.role === 'user') {
              return `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                  <tr>
                    <td align="right">
                      <div style="display: inline-block; max-width: 70%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 16px; border-radius: 18px 18px 4px 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); text-align: left;">
                        <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px; text-align: right;">
                          <strong>${language === 'es' ? 'Tú' : 'You'}</strong> • ${time}
                        </div>
                        <div style="font-size: 14px; line-height: 1.4;">${msg.content}</div>
                      </div>
                    </td>
                  </tr>
                </table>
              `;
            } else {
              return `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                  <tr>
                    <td align="left">
                      <div style="display: inline-block; max-width: 70%; background: white; border: 1px solid #e5e7eb; color: #1f2937; padding: 12px 16px; border-radius: 18px 18px 18px 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); text-align: left;">
                        <div style="font-size: 11px; color: #6b7280; margin-bottom: 4px;">
                          <strong>Elevate AI</strong> • ${time}
                        </div>
                        <div style="font-size: 14px; line-height: 1.4;">${msg.content}</div>
                      </div>
                    </td>
                  </tr>
                </table>
              `;
            }
          })
          .join('')
      : '';

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${t.title}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">${t.title}</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 18px; color: #1f2937;">${t.greeting(name)}</p>

            <p style="font-size: 16px; color: #4b5563;">
              ${t.intro}
            </p>

            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #2563eb; margin-top: 0; font-size: 20px;">${t.meetingDetails}</h2>
              <p style="margin: 10px 0; font-size: 16px;"><strong>${formattedDateTime}</strong></p>
              <p style="margin: 10px 0;">
                <strong>${t.zoomLink}</strong><br>
                <a href="${zoomLink}" style="color: #2563eb; text-decoration: none; word-break: break-all;">${zoomLink}</a>
              </p>
              <div style="margin-top: 15px; padding: 15px; background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;">
                  ${t.tip}
                </p>
              </div>
            </div>

            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #059669; margin-top: 0; font-size: 20px;">${t.consultationSummary}</h2>

              ${phone ? `
              <div style="margin: 15px 0;">
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${language === 'es' ? 'Teléfono' : 'Phone'}</p>
                <p style="margin: 5px 0; font-weight: 600;">${phone}</p>
              </div>
              ` : ''}

              ${company ? `
              <div style="margin: 15px 0;">
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${t.companyLabel}</p>
                <p style="margin: 5px 0; font-weight: 600;">${company}</p>
              </div>
              ` : ''}

              ${challenge ? `
              <div style="margin: 15px 0;">
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${t.challengeLabel}</p>
                <p style="margin: 5px 0;">${challenge}</p>
              </div>
              ` : ''}

              ${objectives && objectives.trim() ? `
              <div style="margin: 15px 0;">
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${t.objectivesLabel}</p>
                <p style="margin: 5px 0;">${objectives}</p>
              </div>
              ` : ''}

              ${budget && budget.trim() ? `
              <div style="margin: 15px 0;">
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${t.budgetLabel}</p>
                <p style="margin: 5px 0; font-weight: 600;">${budget}</p>
              </div>
              ` : ''}

              ${timeline && timeline.trim() ? `
              <div style="margin: 15px 0;">
                <p style="margin: 5px 0; color: #6b7280; font-size: 14px;">${t.timelineLabel}</p>
                <p style="margin: 5px 0; font-weight: 600;">${timeline}</p>
              </div>
              ` : ''}
            </div>

            ${messages.length > 0 ? `
            <!-- Conversation Transcript -->
            <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #0891b2; margin-top: 0; font-size: 20px;">💬 ${language === 'es' ? 'Transcripción de la Conversación' : 'Conversation Transcript'}</h2>

              <div style="background: #f9fafb; border-radius: 12px; padding: 20px; max-height: 500px; overflow-y: auto; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);">
                ${chatTranscriptHTML}
              </div>

              <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
                ${messages.length} ${language === 'es' ? 'mensajes' : 'messages'}
              </p>
            </div>
            ` : ''}

            <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin: 20px 0;">
              <h3 style="color: #92400e; margin-top: 0; font-size: 16px;">${t.preparationTitle}</h3>
              <ul style="color: #78350f; margin: 10px 0; padding-left: 20px;">
                ${preparationItemsHtml}
              </ul>
            </div>

            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">
                ${t.footer}
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
                ${t.autoEmail}
              </p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
            <p>${t.copyright}</p>
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
  language?: 'en' | 'es';
}) {
  const { to, name, scheduledTime, zoomLink, language = 'es' } = params;
  const t = EMAIL_TRANSLATIONS.meetingReminder[language];

  try {
    const subject = t.subject;
    const html = `
        <!DOCTYPE html>
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #f59e0b; padding: 20px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0;">${t.title}</h1>
          </div>

          <div style="padding: 20px;">
            <p style="font-size: 16px;">${t.greeting(name)}</p>

            <p>${t.intro}</p>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>${t.dateTime}</strong> ${scheduledTime}</p>
              <p style="margin: 5px 0;"><strong>${t.zoomLink}</strong><br>
                <a href="${zoomLink}" style="color: #2563eb;">${zoomLink}</a>
              </p>
            </div>

            <p>${t.closing}</p>
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
  language?: 'en' | 'es';
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
    conversationId,
    language = 'es'
  } = params;

  const t = EMAIL_TRANSLATIONS.voiceChatTranscript[language];

  try {
    const isHost = recipient === 'host';
    const subject = isHost
      ? t.subjectHost(name)
      : t.subjectClient;

    const langLocale = language === 'en' ? 'en-US' : 'es-MX';

    // Generate chat transcript HTML
    const chatTranscriptHTML = messages
      .map(msg => {
        const time = new Date(msg.timestamp).toLocaleTimeString(langLocale, {
          hour: '2-digit',
          minute: '2-digit'
        });

        if (msg.role === 'user') {
          return `
            <div style="display: flex; justify-content: flex-end; margin-bottom: 12px;">
              <div style="max-width: 70%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 16px; border-radius: 18px 18px 4px 18px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="font-size: 11px; opacity: 0.8; margin-bottom: 4px; text-align: right;">
                  <strong>${t.client}</strong> • ${time}
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
                  <strong>${t.agent}</strong> • ${time}
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
            <span style="color: white; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">${language === 'es' ? 'NUEVA' : 'NEW'}</span>
          </div>
          <h1 style="color: white; margin: 0; font-size: 26px;">${isHost ? t.titleHost : t.titleClient}</h1>
        </div>

        <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          ${!isHost ? `
            <p style="font-size: 18px; color: #1f2937; margin-bottom: 10px;">${t.greetingClient(name)}</p>
            <p style="font-size: 16px; color: #4b5563; margin-bottom: 25px;">
              ${t.introClient}
            </p>
          ` : ''}

          <!-- Meeting Details -->
          <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 25px; border: 1px solid #e5e7eb;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <span style="font-size: 20px;">📅</span>
              </div>
              <h2 style="color: #1f2937; margin: 0; font-size: 18px;">${t.meetingDetails}</h2>
            </div>

            <div style="margin-left: 48px;">
              <p style="margin: 8px 0;"><strong style="color: #6b7280;">${t.dateTime}</strong> <span style="color: #1f2937;">${scheduledTime}</span></p>
              <p style="margin: 8px 0;">
                <strong style="color: #6b7280;">${t.zoomLink}</strong><br>
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
              <h2 style="color: #1f2937; margin: 0; font-size: 18px;">${isHost ? t.prospectInfo : t.consultationSummary}</h2>
            </div>

            <div style="margin-left: 48px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; width: 120px;">${t.name}</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${name}</td>
                </tr>
                ${email && email !== t.notProvided ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">${t.email}</td>
                  <td style="padding: 8px 0;">
                    <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>
                  </td>
                </tr>
                ` : ''}
                ${phone && phone !== t.notProvided ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">${t.phone}</td>
                  <td style="padding: 8px 0;">
                    <a href="tel:${phone}" style="color: #2563eb; text-decoration: none;">${phone}</a>
                  </td>
                </tr>
                ` : ''}
                ${company && company !== t.notSpecified ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">${t.company}</td>
                  <td style="padding: 8px 0; font-weight: 600; color: #1f2937;">${company}</td>
                </tr>
                ` : ''}
                ${purpose && purpose !== t.notSpecified ? `
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">${t.purpose}</td>
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
              <h2 style="color: #1f2937; margin: 0; font-size: 18px;">${t.transcript}</h2>
            </div>

            <div style="background: white; border-radius: 12px; padding: 20px; max-height: 500px; overflow-y: auto; box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);">
              ${chatTranscriptHTML}
            </div>

            <p style="margin: 15px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
              ${t.transcriptFooter(conversationId, messages.length)}
            </p>
          </div>

          ${!isHost ? `
          <div style="background: #fef3c7; border-radius: 8px; padding: 15px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              ${t.tipClient}
            </p>
          </div>
          ` : ''}

          <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px; margin: 10px 0;">
              ${isHost
                ? t.footerHost
                : t.footerClient
              }
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 20px 0 0 0;">
              ${t.copyright}
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

interface SendHostNotificationParams {
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
  language?: 'en' | 'es';
}

export async function sendHostNotification(params: SendHostNotificationParams) {
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
    zoomLink,
    language = 'es'
  } = params;

  const t = EMAIL_TRANSLATIONS.hostNotification[language];

  try {
    const subject = t.subject(name, company);
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${t.title}</title>
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${t.title}</h1>
          </div>

          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #059669; margin-top: 0; font-size: 20px;">${t.meetingDetails}</h2>
              <p style="margin: 10px 0;"><strong>${t.dateTime}</strong> ${scheduledTime}</p>
              <p style="margin: 10px 0;">
                <strong>${t.zoomLink}</strong><br>
                <a href="${zoomLink}" style="color: #2563eb; text-decoration: none;">${zoomLink}</a>
              </p>
            </div>

            <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #2563eb; margin-top: 0; font-size: 20px;">${t.prospectInfo}</h2>

              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280; width: 120px;">${t.name}</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${t.email}</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <a href="mailto:${email}" style="color: #2563eb;">${email}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${t.phone}</td>
                  <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                    <a href="tel:${phone}" style="color: #2563eb;">${phone}</a>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">${t.company}</td>
                  <td style="padding: 8px 0; font-weight: 600;">${company}</td>
                </tr>
              </table>
            </div>

            <div style="background: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #7c3aed; margin-top: 0; font-size: 20px;">${t.projectDetails}</h2>

              <div style="margin: 15px 0; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px; font-weight: 600;">${t.challenge}</p>
                <p style="margin: 0;">${challenge}</p>
              </div>

              <div style="margin: 15px 0; padding: 15px; background: #f3f4f6; border-radius: 8px;">
                <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px; font-weight: 600;">${t.objectives}</p>
                <p style="margin: 0;">${objectives}</p>
              </div>

              <div style="display: flex; gap: 15px; margin-top: 15px;">
                <div style="flex: 1; padding: 15px; background: #ecfdf5; border-radius: 8px; text-align: center;">
                  <p style="margin: 0 0 5px 0; color: #059669; font-size: 12px; font-weight: 600;">${t.budget}</p>
                  <p style="margin: 0; font-weight: 600; color: #047857;">${budget}</p>
                </div>
                <div style="flex: 1; padding: 15px; background: #eff6ff; border-radius: 8px; text-align: center;">
                  <p style="margin: 0 0 5px 0; color: #2563eb; font-size: 12px; font-weight: 600;">${t.timeline}</p>
                  <p style="margin: 0; font-weight: 600; color: #1d4ed8;">${timeline}</p>
                </div>
              </div>
            </div>

            <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                ${t.footer}
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                ${t.copyright}
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
