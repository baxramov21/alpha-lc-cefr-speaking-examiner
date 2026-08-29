import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    
    if (!raw.updates || !Array.isArray(raw.updates)) {
      return NextResponse.json({ error: 'Payload must contain an updates array' }, { status: 400 });
    }

    const updates = raw.updates;
    if (updates.length === 0) {
      return NextResponse.json({ success: true, count: 0 }, { status: 200 });
    }

    const promises = updates.map((update: any) => {
      const { id, ...fields } = update;
      return supabase.from('questions').update(fields).eq('id', id);
    });

    const results = await Promise.all(promises);

    const errors = results.filter(r => r.error).map(r => r.error);
    if (errors.length > 0) {
      console.error('Errors in bulk update:', errors);
      return NextResponse.json({ error: 'Some updates failed', details: errors }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: updates.length }, { status: 200 });

  } catch (error: any) {
    console.error('Error in bulk edit:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
