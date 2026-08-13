import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { UzbmbEvaluation } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { studentName, groupName, teacherName, passcodeUsed, overallScore, overallBand, evaluation } = body;
    const evalData = evaluation as UzbmbEvaluation;

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
        evaluation_data: evalData
      })
      .select('id')
      .single();

    if (submissionError || !submissionData) {
      console.error('Submission insert error:', submissionError);
      return NextResponse.json({ error: 'Failed to create submission record' }, { status: 500 });
    }

    const submissionId = submissionData.id;

    // 2. Insert transcripts into question_results
    let resultsToInsert: any[] = [];
    
    if (evalData.question_responses && evalData.question_responses.length > 0) {
      resultsToInsert = evalData.question_responses.map((qr) => ({
        submission_id: submissionId,
        question_id: qr.question_id,
        transcript: qr.transcript || '[No transcript]',
        overall_score: qr.part_score,
        cefr_band: '-',              // Dummy value or could map from score
        ai_feedback: qr.grammar_feedback || 'See overall evaluation', 
        rubric_scores: [],           // Dummy value
      }));
    } else if (evalData.transcripts) {
      resultsToInsert = Object.keys(evalData.transcripts).map((qId) => ({
        submission_id: submissionId,
        question_id: qId,
        transcript: evalData.transcripts?.[qId] || '[No transcript]',
        overall_score: 0,            // Dummy value since we use monolithic scoring now
        cefr_band: '-',              // Dummy value
        ai_feedback: 'See overall evaluation', // Dummy value
        rubric_scores: [],           // Dummy value
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
  } catch (error: any) {
    console.error('API /submissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

