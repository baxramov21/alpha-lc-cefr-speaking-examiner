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
    const { studentName, groupName, teacherName, sessionToken, overallScore, fluencyScore, lexicalScore, grammarScore, pronunciationScore, overallBand, evaluation, examType } = body;

    // Inject examType directly into the evaluation JSONB before saving to Supabase
    // This allows us to filter submissions by exam type without running a DB migration
    if (examType) {
      evaluation.examType = examType;
    }

    // Fix #2: Verify the student session token (signed JWT) and extract the passcode.
    // The raw passcode is never sent by the client — only the token is.
    const session = await verifyStudentSessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session. Please restart your exam.' }, { status: 403 });
    }

    // Re-verify the extracted passcode server-side — never trust client-submitted data alone
    // 1. Check legacy global passcode from app_settings
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'auth_settings')
      .single();

    const globalPasscode = settingsData?.value?.student_password || process.env.STUDENT_PASSWORD || 'ALPHA2024';
    let isValidPasscode = false;

    if (session.passcode === globalPasscode.toUpperCase()) {
      isValidPasscode = true;
    } else {
      // 2. Check new passcodes table
      const { data: passcodeRecord } = await supabase
        .from('passcodes')
        .select('code')
        .eq('code', session.passcode)
        .eq('is_active', true)
        .single();
        
      if (passcodeRecord) {
        isValidPasscode = true;
      }
    }

    if (!isValidPasscode) {
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
    
    const evalData = evaluation as any;
    if (evalData.question_responses && evalData.question_responses.length > 0) {
      resultsToInsert = evalData.question_responses.map((qr: any) => ({
        submission_id: submissionId,
        question_id: qr.question_id,
        transcript: qr.transcript || '[No transcript]',
        overall_score: qr.part_score,
        cefr_band: '-',
        ai_feedback: qr.grammar_feedback || 'See overall evaluation', 
        rubric_scores: [],
      }));
    } else if (evalData.transcripts) {
      resultsToInsert = Object.keys(evalData.transcripts).map((qId) => ({
        submission_id: submissionId,
        question_id: qId,
        transcript: evalData.transcripts?.[qId] || '[No transcript]',
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
