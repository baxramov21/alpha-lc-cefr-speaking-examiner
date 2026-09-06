import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const body = await req.json().catch(() => ({}));
    const { level } = body;
    
    if (!level) {
      return NextResponse.json({ error: 'Level is required to set active triple.' }, { status: 400 });
    }

    // Set all triples of this level to inactive first
    const { error: resetError } = await supabase
      .from('grammar_triples')
      .update({ is_active: false })
      .eq('level', level)
      .neq('id', '00000000-0000-0000-0000-000000000000'); // update all rows matching level

    if (resetError) throw resetError;

    // Now activate the target triple
    const { error: activateError } = await supabase
      .from('grammar_triples')
      .update({ is_active: true })
      .eq('id', id);

    if (activateError) throw activateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
