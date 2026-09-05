import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Validate actual file magic bytes — not the browser-supplied Content-Type
    // Renaming malware.svg to image.jpg won't pass this check
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !(ALLOWED_MIME_TYPES as readonly string[]).includes(detected.mime)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage (exam-audio bucket, images directory)
    const filename = `${crypto.randomUUID()}.${detected.ext}`;
    const filePath = `images/${filename}`;

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('exam-audio')
      .upload(filePath, buffer, {
        contentType: detected.mime,
        upsert: false
      });

    if (uploadError) {
      console.error('Supabase upload error:', uploadError);
      throw new Error(`Supabase upload failed: ${uploadError.message}`);
    }

    const { data: publicData } = supabase
      .storage
      .from('exam-audio')
      .getPublicUrl(filePath);
    
    return NextResponse.json({ url: publicData.publicUrl }, { status: 200 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
