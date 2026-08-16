import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { evaluationSchema } from '@/lib/schemas/evaluation';
import { verifyStudentSessionToken } from '@/lib/sessionToken';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    
    // Server-side Zod validation
    const parsed = evaluationSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }
    
    const body = parsed.data;
    const { studentName, groupName, teacherName, sessionToken, overallScore, overallBand, evaluation } = body;

    // Fix #2: Verify the student session token (signed JWT) and extract the passcode.
    // The raw passcode is never sent by the client — only the token is.
    const session = await verifyStudentSessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session. Please restart your exam.' }, { status: 403 });
    }

    // Re-verify the extracted passcode server-side — never trust client-submitted data alone
    const { data: passcodeRecord, error: passcodeError } = await supabase
      .from('passcodes')
      .select('code')
      .eq('code', session.passcode)
      .eq('is_active', true)
      .single();

    if (passcodeError || !passcodeRecord) {
      return NextResponse.json({ error: 'Invalid or inactive passcode' }, { status: 403 });
    }

    // 1. Insert the submission
    const { data: submissionData, error: submissionError } = await supabase
      .from('submissions')
      .insert({
        student_name: studentName,
        group_name: groupName,
        teacher_name: teacherName,
        passcode_used: session.passcode,   // use the server-verified passcode, not client input
        overall_score: overallScore,
        overall_band: overallBand,
        evaluation_data: evaluation
      })
      .select('id')
      .single();

    if (submissionError || !submissionData) {
      console.error('Submission insert error:', submissionError);
      return NextResponse.json({ error: 'Failed to create submission record' }, { status: 500 });
    }

    const submissionId = submissionData.id;

    // 2. Insert transcripts into question_results
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let resultsToInsert: any[] = [];
    
    if (evaluation.question_responses && evaluation.question_responses.length > 0) {
      resultsToInsert = evaluation.question_responses.map((qr) => ({
        submission_id: submissionId,
        question_id: qr.question_id,
        transcript: qr.transcript || '[No transcript]',
        overall_score: qr.part_score,
        cefr_band: '-',
        ai_feedback: qr.grammar_feedback || 'See overall evaluation', 
        rubric_scores: [],
      }));
    } else if (evaluation.transcripts) {
      resultsToInsert = Object.keys(evaluation.transcripts).map((qId) => ({
        submission_id: submissionId,
        question_id: qId,
        transcript: evaluation.transcripts?.[qId] || '[No transcript]',
        overall_score: 0,
        cefr_band: '-',
        ai_feedback: 'See overall evaluation',
        rubric_scores: [],
      }));
    }

    if (resultsToInsert.length > 0) {
      const { error: resultsError } = await supabase
        .from('question_results')
        .insert(resultsToInsert);

      if (resultsError) {
        console.error('Question results insert error:', resultsError);
      }
    }

    return NextResponse.json({ success: true, submissionId }, { status: 200 });
  } catch (error: unknown) {
    console.error('API /submissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
