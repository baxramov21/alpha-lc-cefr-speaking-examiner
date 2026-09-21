import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { level, table, study_month } = body;

    if (!level || !table) {
      return NextResponse.json({ error: 'Missing level or table' }, { status: 400 });
    }

    const payload: any = table === 'canonical_exams' ? { grammar_level: level } : { level };
    if (study_month !== undefined) {
      payload.study_month = study_month;
    }

    const { error: updateError } = await supabase
      .from(table)
      .update(payload)
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, level }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating exam level:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
