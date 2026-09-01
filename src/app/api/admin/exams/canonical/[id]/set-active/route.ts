import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const forceActive = body.active; // if true: set active, if false: deactivate, if undefined: toggle

    // 1. Get the exam to find its type and current state
    const { data: exam, error: fetchError } = await supabase
      .from('canonical_exams')
      .select('exam_type, is_active')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!exam) return NextResponse.json({ error: 'Exam not found' }, { status: 404 });

    const newActiveState = forceActive !== undefined ? forceActive : !exam.is_active;

    if (newActiveState) {
      // Deactivate all other exams of the same type first
      const { error: resetError } = await supabase
        .from('canonical_exams')
        .update({ is_active: false })
        .eq('exam_type', exam.exam_type)
        .neq('id', id);

      if (resetError) throw resetError;
    }

    // Set the target exam's new state
    const { error: updateError } = await supabase
      .from('canonical_exams')
      .update({ is_active: newActiveState })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, is_active: newActiveState }, { status: 200 });
  } catch (error: any) {
    console.error('Error toggling exam active:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
