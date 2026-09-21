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
      .select('id, question_number, question_text, correct_answer, explanation, points')
      .eq('exam_id', examId);

    if (qError || !questions) {
      return NextResponse.json({ error: 'Failed to fetch questions for grading' }, { status: 500 });
    }

    // 2. Grade the answers
    let totalScore = 0;
    const maxScore = questions.reduce((acc, q) => acc + (q.points || 1), 0);
    const questionResults = [];

    const cleanAnswer = (ans: string | null | undefined) => {
      if (!ans) return '';
      // Remove a) b) c) or (a) (b) (c) prefixes
      let cleaned = String(ans).replace(/^[\s\(]*[a-zA-Z][\)\.]\s*/i, '');
      // Remove all non-alphanumeric chars (keep spaces)
      cleaned = cleaned.replace(/[^a-zA-Z0-9\s]/g, '');
      // Collapse multiple spaces to single
      cleaned = cleaned.replace(/\s+/g, ' ').trim().toLowerCase();
      return cleaned;
    };

    for (const q of questions) {
      const userAnswer = String(answers[q.id] || '');
      const correctAnswer = String(q.correct_answer || '');
      const cleanedUserAnswer = cleanAnswer(userAnswer);
      const cleanedCorrectAnswer = cleanAnswer(correctAnswer);
      
      const isCorrect = cleanedUserAnswer === cleanedCorrectAnswer || userAnswer.trim().toLowerCase() === correctAnswer.trim().toLowerCase();
      
      if (isCorrect) {
        totalScore += (q.points || 1);
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

    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    // 3. Save to grammar_submissions
    const { data: submission, error: subError } = await supabaseAdmin
      .from('grammar_submissions')
      .insert({
        exam_id: examId,
        student_name: session.fullName || 'Unknown Student',
        group_name: session.groupName || 'Unknown Group',
        teacher_name: session.teacherName || 'Unknown Teacher',
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
