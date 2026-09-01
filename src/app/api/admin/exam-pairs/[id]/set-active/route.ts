import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Set all pairs to inactive first
    const { error: resetError } = await supabase
      .from('exam_pairs')
      .update({ is_active: false })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // update all rows

    if (resetError) throw resetError;

    // Now activate the target pair
    const { error: activateError } = await supabase
      .from('exam_pairs')
      .update({ is_active: true })
      .eq('id', id);

    if (activateError) throw activateError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
