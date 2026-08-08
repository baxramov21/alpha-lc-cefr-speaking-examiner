import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { QuestionResult } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentName, groupName, teacherName, passcodeUsed, overallScore, overallBand, questionResults } = body;

    // 1. Insert the submission
    const { data: submissionData, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        student_name: studentName,
        group_name: groupName,
        teacher_name: teacherName,
        passcode_used: passcodeUsed,
        overall_score: overallScore,
        overall_band: overallBand,
      })
      .select('id')
      .single();

    if (submissionError || !submissionData) {
      console.error('Submission insert error:', submissionError);
      return NextResponse.json({ error: 'Failed to create submission record' }, { status: 500 });
    }

    const submissionId = submissionData.id;

    // 2. Insert question results
    const resultsToInsert = (questionResults as QuestionResult[]).map((qr) => ({
      submission_id: submissionId,
      question_id: qr.questionId,
      transcript: qr.transcript,
      overall_score: qr.overallScore,
      cefr_band: qr.cefrBand,
      ai_feedback: qr.aiFeedback,
      rubric_scores: qr.rubricScores,
    }));

    const { error: resultsError } = await supabase
      .from('question_results')
      .insert(resultsToInsert);

    if (resultsError) {
      console.error('Question results insert error:', resultsError);
      // We might have a partial insert, but we'll flag it as 500
      return NextResponse.json({ error: 'Failed to insert question results' }, { status: 500 });
    }

    return NextResponse.json({ success: true, submissionId }, { status: 200 });
  } catch (error: any) {
    console.error('API /submissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
