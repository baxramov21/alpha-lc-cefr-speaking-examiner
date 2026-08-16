import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileTypeFromBuffer } from 'file-type';

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

    // Use extension from detected file type, NOT from user-supplied filename
    const filename = `${crypto.randomUUID()}.${detected.ext}`;
    const publicPath = path.join(process.cwd(), 'public', 'images', 'uploads');
    
    await fs.mkdir(publicPath, { recursive: true });
    
    // Fix #4 (mitigation): Add a disk usage cap (e.g. max 500 files) to prevent
    // an admin account compromise from filling the server disk.
    const existingFiles = await fs.readdir(publicPath);
    if (existingFiles.length >= 500) {
      return NextResponse.json(
        { error: 'Upload directory is full. Please delete older images before uploading new ones.' },
        { status: 403 }
      );
    }
    
    const filePath = path.join(publicPath, filename);
    await fs.writeFile(filePath, buffer);

    const imageUrl = `/images/uploads/${filename}`;
    
    return NextResponse.json({ url: imageUrl }, { status: 200 });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
