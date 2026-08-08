import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    const { data: qResults, error: qrError } = await supabase
      .from('question_results')
      .select('*')
      .eq('submission_id', id);

    if (qrError) {
      return NextResponse.json({ error: 'Error fetching question results' }, { status: 500 });
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
      questionResults: qResults.map(qr => ({
        questionId: qr.question_id,
        questionText: 'Question ' + qr.question_id, // we might not have text in db
        part: 'part1',
        transcript: qr.transcript,
        overallScore: qr.overall_score,
        cefrBand: qr.cefr_band,
        aiFeedback: qr.ai_feedback,
        rubricScores: qr.rubric_scores,
      }))
    };

    return NextResponse.json({ submission: mapped }, { status: 200 });
  } catch (err) {
    console.error('Error GET /admin/submissions/[id]:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
