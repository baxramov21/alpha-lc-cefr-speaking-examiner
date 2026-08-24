import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // 1. Get the exam to find out its type
    const { data: exam, error: fetchError } = await supabase
      .from('canonical_exams')
      .select('exam_type')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

    // 2. Set all other exams of this type to inactive
    const { error: resetError } = await supabase
      .from('canonical_exams')
      .update({ is_active: false })
      .eq('exam_type', exam.exam_type);

    if (resetError) throw resetError;

    // 3. Set this exam to active
    const { error: activateError } = await supabase
      .from('canonical_exams')
      .update({ is_active: true })
      .eq('id', id);

    if (activateError) throw activateError;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error setting exam active:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
