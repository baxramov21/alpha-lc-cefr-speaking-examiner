import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyStudentSessionToken } from '@/lib/sessionToken';

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing session token' }, { status: 401 });
    }

    const session = await verifyStudentSessionToken(sessionToken);
    if (!session || session.programme !== 'GRAMMAR') {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 403 });
    }

    const { examId, answers } = await req.json();
    // answers is an object mapping question_id -> user answer string

    if (!examId || !answers) {
      return NextResponse.json({ error: 'Missing examId or answers' }, { status: 400 });
    }

    // 1. Fetch correct answers from DB
    const { data: questions, error: qError } = await supabaseAdmin
      .from('grammar_questions')
      .select('id, question_number, question_text, correct_answer, explanation')
      .eq('exam_id', examId);

    if (qError || !questions) {
      return NextResponse.json({ error: 'Failed to fetch questions for grading' }, { status: 500 });
    }

    // 2. Grade the answers
    let totalScore = 0;
    const maxScore = questions.length;
    const questionResults = [];

    for (const q of questions) {
      const userAnswer = answers[q.id] || '';
      // Simple case-insensitive exact string match. We can improve this for fill_in if needed.
      const isCorrect = userAnswer.trim().toLowerCase() === q.correct_answer.trim().toLowerCase();
      if (isCorrect) {
        totalScore++;
      }
      
      questionResults.push({
        question_id: q.id,
        question_number: q.question_number,
        question_text: q.question_text,
        user_answer: userAnswer,
        correct_answer: q.correct_answer,
        is_correct: isCorrect,
        explanation: q.explanation || null
      });
    }

    const percentage = Math.round((totalScore / maxScore) * 100);

    // 3. Save to grammar_submissions
    const { data: submission, error: subError } = await supabaseAdmin
      .from('grammar_submissions')
      .insert({
        exam_id: examId,
        student_name: session.fullName,
        group_name: session.groupName,
        teacher_name: session.teacherName,
        passcode_used: session.passcode,
        grammar_level: session.grammarLevel || 'intermediate',
        total_score: totalScore,
        max_score: maxScore,
        percentage,
        question_results: JSON.stringify(questionResults)
      })
      .select('id')
      .single();

    if (subError) {
      console.error('Failed to save grammar submission:', subError);
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
    }

    // 4. Return results immediately as requested
    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      totalScore,
      maxScore,
      percentage,
      questionResults
    }, { status: 200 });

  } catch (error: unknown) {
    console.error('API /student/grammar/submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
