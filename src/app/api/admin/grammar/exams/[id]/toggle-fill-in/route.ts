import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const examId = resolvedParams.id;
    if (!examId) return NextResponse.json({ error: 'Missing exam ID' }, { status: 400 });

    const { is_fill_in_only } = await req.json();

    const { data, error } = await supabase
      .from('grammar_exams')
      .update({ is_fill_in_only: !!is_fill_in_only })
      .eq('id', examId)
      .select('is_fill_in_only')
      .single();

    if (error) throw new Error(`Failed to update exam: ${error.message}`);

    return NextResponse.json({ success: true, is_fill_in_only: data.is_fill_in_only });
  } catch (error: any) {
    console.error('Error toggling grammar exam is_fill_in_only:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
