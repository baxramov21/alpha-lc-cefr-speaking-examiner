import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('part_timings')
      .select('*');

    if (error) {
      if (error.code === '42P01') {
        // Table doesn't exist yet, return empty
        return NextResponse.json({ data: [] });
      }
      throw error;
    }
    
    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Error fetching timings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { part, prep_seconds, speak_seconds } = body;

    if (!part || typeof prep_seconds !== 'number' || typeof speak_seconds !== 'number') {
      return NextResponse.json({ error: 'Missing or invalid fields' }, { status: 400 });
    }

    // 1. Upsert into part_timings
    const { error: upsertError } = await supabase
      .from('part_timings')
      .upsert({ 
        part, 
        prep_seconds, 
        speak_seconds,
        updated_at: new Date().toISOString()
      }, { onConflict: 'part' });

    if (upsertError) {
      throw upsertError;
    }

    // 2. Update all existing questions for this part
    const { error: updateError } = await supabase
      .from('questions')
      .update({ prep_seconds, speak_seconds })
      .eq('part', part);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ success: true, part, prep_seconds, speak_seconds });
  } catch (error: any) {
    console.error('Error updating timings:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
