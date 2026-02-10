import { NextRequest, NextResponse } from 'next/server';
import { getStorageBucket } from '@/lib/firebase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: 'File type not allowed. Use JPG, PNG, WebP, MP4, or PDF.' },
        { status: 400 }
      );
    }

    // Max 16MB
    if (file.size > 16 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'File too large. Maximum 16MB.' },
        { status: 400 }
      );
    }

    const bucket = getStorageBucket();
    const buffer = Buffer.from(await file.arrayBuffer());

    const ext = file.name.split('.').pop() || 'bin';
    const fileName = `whatsapp-media/${crypto.randomUUID()}.${ext}`;
    const blob = bucket.file(fileName);

    await blob.save(buffer, {
      metadata: {
        contentType: file.type,
      },
    });

    // Make publicly accessible
    await blob.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('[UPLOAD] Error:', errMsg, error);
    return NextResponse.json(
      { success: false, error: errMsg },
      { status: 500 }
    );
  }
}
