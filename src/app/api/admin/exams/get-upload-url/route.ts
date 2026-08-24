import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { fileName, contentType } = await req.json();

    if (!fileName) {
      return NextResponse.json({ error: 'fileName is required' }, { status: 400 });
    }

    // Generate a unique path in the storage bucket
    const filePath = `listening/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    // Create a signed upload URL valid for 1 hour (3600 seconds)
    const { data: signedData, error: signedError } = await supabase
      .storage
      .from('exam-audio')
      .createSignedUploadUrl(filePath);

    if (signedError || !signedData) {
      throw new Error(`Failed to generate signed URL: ${signedError?.message}`);
    }

    // Get the public URL for the final location
    const { data: publicData } = supabase
      .storage
      .from('exam-audio')
      .getPublicUrl(filePath);

    return NextResponse.json({
      signedUrl: signedData.signedUrl,
      publicUrl: publicData.publicUrl,
      path: filePath
    }, { status: 200 });

  } catch (error: any) {
    console.error('Upload URL generation error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error.message }, { status: 500 });
  }
}
