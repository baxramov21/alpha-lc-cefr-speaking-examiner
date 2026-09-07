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

    // We no longer deactivate other triples of this level, allowing multiple active triples.

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
