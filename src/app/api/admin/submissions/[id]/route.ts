import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const { data: submission, error: submissionError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (submissionError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const mapped = {
      id: submission.id,
      studentName: submission.student_name,
      groupName: submission.group_name,
      teacherName: submission.teacher_name,
      overallScore: submission.overall_score,
      overallCefrBand: submission.overall_band,
      status: 'graded',
      submittedAt: submission.created_at,
      evaluation: submission.evaluation_data,
      adminNotes: submission.admin_notes,
      isSaved: submission.is_saved
    };

    return NextResponse.json({ submission: mapped }, { status: 200 });
  } catch (err) {
    console.error('Error GET /admin/submissions/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updates: any = {};
    if (body.adminNotes !== undefined) updates.admin_notes = body.adminNotes;
    if (body.isSaved !== undefined) updates.is_saved = body.isSaved;

    const { error } = await supabase
      .from('submissions')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error(error);
      return NextResponse.json({ error: 'Failed to update submission' }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Error PATCH /admin/submissions/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
