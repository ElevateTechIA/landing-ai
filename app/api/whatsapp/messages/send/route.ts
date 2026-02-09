import { NextRequest, NextResponse } from 'next/server';
import {
  sendWhatsAppCloudMessage,
  sendWhatsAppImage,
  sendWhatsAppDocument,
  sendWhatsAppAudio,
  sendWhatsAppVideo,
  sendWhatsAppReaction,
  sendWhatsAppReply,
  uploadWhatsAppMedia,
  sendWhatsAppMediaById,
  sendWhatsAppTemplateMessage,
} from '@/lib/whatsapp';
import { getWhatsAppConfig, getDefaultWhatsAppConfig } from '@/lib/whatsapp-config';
import {
  getWhatsAppConversation,
  saveWhatsAppConversation,
} from '@/lib/firebase';

/**
 * POST /api/whatsapp/messages/send
 * Send a message from the dashboard to a WhatsApp contact
 * Supports: text, image, document, audio, video, reaction
 */
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Handle file uploads (multipart form data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const to = formData.get('to') as string;
      const mediaType = formData.get('mediaType') as 'image' | 'document' | 'audio' | 'video';
      const caption = formData.get('caption') as string | null;
      const filename = formData.get('filename') as string | null;
      const replyToMessageId = formData.get('replyToMessageId') as string | null;
      const phoneNumberId = formData.get('phoneNumberId') as string | null;

      const config = getWhatsAppConfig(phoneNumberId || '') || getDefaultWhatsAppConfig();
      if (!config) {
        return NextResponse.json({ success: false, error: 'No WhatsApp config found' }, { status: 500 });
      }

      if (!file || !to || !mediaType) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields: file, to, mediaType' },
          { status: 400 }
        );
      }

      // Upload media first
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      const uploadResult = await uploadWhatsAppMedia(config, fileBuffer, file.type, file.name);

      if (!uploadResult.success || !uploadResult.mediaId) {
        return NextResponse.json(
          { success: false, error: uploadResult.error || 'Failed to upload media' },
          { status: 500 }
        );
      }

      // Send using media ID
      const sendResult = await sendWhatsAppMediaById(config, to, mediaType, uploadResult.mediaId, {
        caption: caption || undefined,
        filename: filename || file.name,
        replyToMessageId: replyToMessageId || undefined,
      });

      if (sendResult.success) {
        await appendMessageToConversation(to, config.phoneNumberId, {
          role: 'assistant',
          content: caption || `[${mediaType}]`,
          messageId: sendResult.messageId,
          type: mediaType,
        });
      }

      return NextResponse.json({
        success: sendResult.success,
        messageId: sendResult.messageId,
        error: sendResult.error,
      });
    }

    // Handle JSON requests (text, reaction, media by URL)
    const body = await request.json();
    const { to, type, text, replyToMessageId, mediaUrl, caption, filename, emoji, messageId, templateName, languageCode, components: templateComponents, phoneNumberId } = body;

    const config = getWhatsAppConfig(phoneNumberId || '') || getDefaultWhatsAppConfig();
    if (!config) {
      return NextResponse.json({ success: false, error: 'No WhatsApp config found' }, { status: 500 });
    }

    if (!to) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: to' },
        { status: 400 }
      );
    }

    let result: { success: boolean; messageId?: string; error?: string };

    switch (type) {
      case 'text':
        if (!text) {
          return NextResponse.json({ success: false, error: 'Missing text' }, { status: 400 });
        }
        if (replyToMessageId) {
          result = await sendWhatsAppReply(config, to, text, replyToMessageId);
        } else {
          result = await sendWhatsAppCloudMessage(config, to, text);
        }
        if (result.success) {
          await appendMessageToConversation(to, config.phoneNumberId, {
            role: 'assistant',
            content: text,
            messageId: result.messageId,
            type: 'text',
            replyTo: replyToMessageId,
          });
        }
        break;

      case 'image':
        if (!mediaUrl) {
          return NextResponse.json({ success: false, error: 'Missing mediaUrl' }, { status: 400 });
        }
        result = await sendWhatsAppImage(config, to, mediaUrl, caption, replyToMessageId);
        if (result.success) {
          await appendMessageToConversation(to, config.phoneNumberId, {
            role: 'assistant',
            content: caption || '[Image]',
            messageId: result.messageId,
            type: 'image',
            mediaUrl,
          });
        }
        break;

      case 'document':
        if (!mediaUrl) {
          return NextResponse.json({ success: false, error: 'Missing mediaUrl' }, { status: 400 });
        }
        result = await sendWhatsAppDocument(config, to, mediaUrl, filename || 'document', caption, replyToMessageId);
        if (result.success) {
          await appendMessageToConversation(to, config.phoneNumberId, {
            role: 'assistant',
            content: caption || `[Document: ${filename || 'file'}]`,
            messageId: result.messageId,
            type: 'document',
            mediaUrl,
          });
        }
        break;

      case 'audio':
        if (!mediaUrl) {
          return NextResponse.json({ success: false, error: 'Missing mediaUrl' }, { status: 400 });
        }
        result = await sendWhatsAppAudio(config, to, mediaUrl, replyToMessageId);
        if (result.success) {
          await appendMessageToConversation(to, config.phoneNumberId, {
            role: 'assistant',
            content: '[Audio]',
            messageId: result.messageId,
            type: 'audio',
            mediaUrl,
          });
        }
        break;

      case 'video':
        if (!mediaUrl) {
          return NextResponse.json({ success: false, error: 'Missing mediaUrl' }, { status: 400 });
        }
        result = await sendWhatsAppVideo(config, to, mediaUrl, caption, replyToMessageId);
        if (result.success) {
          await appendMessageToConversation(to, config.phoneNumberId, {
            role: 'assistant',
            content: caption || '[Video]',
            messageId: result.messageId,
            type: 'video',
            mediaUrl,
          });
        }
        break;

      case 'reaction':
        if (!emoji || !messageId) {
          return NextResponse.json({ success: false, error: 'Missing emoji or messageId' }, { status: 400 });
        }
        result = await sendWhatsAppReaction(config, to, messageId, emoji);
        break;

      case 'template':
        if (!templateName) {
          return NextResponse.json({ success: false, error: 'Missing templateName' }, { status: 400 });
        }
        result = await sendWhatsAppTemplateMessage(config, to, templateName, languageCode || 'en', templateComponents);
        if (result.success) {
          const paramValues = (templateComponents || [])
            .flatMap((c: { parameters?: Array<{ text?: string }> }) => (c.parameters || []).map((p: { text?: string }) => p.text || ''))
            .filter(Boolean);
          const contentPreview = paramValues.length > 0
            ? `[Template: ${templateName}] ${paramValues.join(', ')}`
            : `[Template: ${templateName}]`;
          await appendMessageToConversation(to, config.phoneNumberId, {
            role: 'assistant',
            content: contentPreview,
            messageId: result.messageId,
            type: 'template',
          });
        }
        break;

      default:
        return NextResponse.json(
          { success: false, error: `Unsupported message type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error,
    });
  } catch (error) {
    console.error('[MESSAGES/SEND] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper: Append a sent message to the conversation in Firebase
 */
async function appendMessageToConversation(
  phoneNumber: string,
  businessPhoneNumberId: string,
  message: {
    role: 'assistant';
    content: string;
    messageId?: string;
    type?: string;
    mediaUrl?: string;
    replyTo?: string;
  }
) {
  try {
    const conversation = await getWhatsAppConversation(phoneNumber, businessPhoneNumberId);

    if (conversation) {
      const newMessage = {
        id: message.messageId || `sent_${Date.now()}`,
        role: 'assistant' as const,
        content: message.content,
        timestamp: new Date(),
        ...(message.messageId && { messageId: message.messageId }),
        ...(message.type && { type: message.type }),
        ...(message.mediaUrl && { mediaUrl: message.mediaUrl }),
        ...(message.replyTo && { replyTo: message.replyTo }),
      };

      conversation.messages.push(newMessage);
      conversation.lastMessageAt = new Date();

      await saveWhatsAppConversation({
        phoneNumber: conversation.phoneNumber,
        businessPhoneNumberId: conversation.businessPhoneNumberId,
        displayName: conversation.displayName,
        messages: conversation.messages,
        language: conversation.language,
        lastMessageAt: new Date(),
        createdAt: conversation.createdAt,
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error('[MESSAGES/SEND] Error saving to conversation:', error);
  }
}
