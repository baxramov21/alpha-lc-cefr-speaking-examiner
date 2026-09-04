import { NextRequest, NextResponse } from 'next/server';
import { CefrBand } from '@/lib/types';
import { verifyStudentSessionToken } from '@/lib/sessionToken';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Force dynamic evaluation
export const dynamic = 'force-dynamic';

function determineCefrBand(score: number, maxScore: number): CefrBand {
  const percentage = score / maxScore;
  if (percentage >= 0.85) return 'C1';
  if (percentage >= 0.65) return 'B2';
  if (percentage >= 0.45) return 'B1';
  if (percentage >= 0.25) return 'A2';
  return 'A1';
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export async function POST(req: NextRequest) {
  try {
    const { sessionToken, studentName, groupName, teacherName, answers, tasks } = await req.json();
    
    const session = await verifyStudentSessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Forbidden. Valid exam session required.' }, { status: 403 });
    }

    // Calculate Score based on the provided tasks and answers
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    const questionResults = [];
    let maxScore = 0;

    for (const task of tasks) {
      const taskQuestions = task.questions || [];
      for (const q of taskQuestions) {
        maxScore++;
        const userAnswerRaw = answers[q.id] || '';
        const correctAnswerRaw = q.correctAnswer;
        
        let isCorrect = false;
        
        // If the database has no correct answer, it's impossible to be correct
        if (!correctAnswerRaw || correctAnswerRaw.trim() === '') {
          isCorrect = false;
        } else if (q.type === 'multiple_choice' || q.type === 'matching') {
          const options = q.options || [];
          const userIndex = options.indexOf(userAnswerRaw);
          const userLetter = userIndex >= 0 ? String.fromCharCode(65 + userIndex) : userAnswerRaw;
          isCorrect = (userAnswerRaw === correctAnswerRaw) || (userLetter === correctAnswerRaw);
        } else {
          isCorrect = normalizeText(userAnswerRaw) === normalizeText(correctAnswerRaw);
        }

        if (isCorrect) correctAnswers++;
        else incorrectAnswers++;

        questionResults.push({
          question_id: q.id,
          user_answer: userAnswerRaw,
          correct_answer: correctAnswerRaw,
          is_correct: isCorrect
        });
      }
    }

    const evaluation = {
      total_score: correctAnswers,
      max_score: maxScore,
      cefr_level: determineCefrBand(correctAnswers, maxScore),
      correct_answers: correctAnswers,
      incorrect_answers: incorrectAnswers,
      question_results: questionResults
    };

    // Save to Supabase Submissions Table
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    const submissionData = {
      student_name: studentName || 'Unknown',
      group_name: groupName || 'Unknown',
      teacher_name: teacherName || 'Unknown',
      passcode_used: session.passcode,
      overall_score: evaluation.total_score,
      overall_band: evaluation.cefr_level,
      evaluation_data: { ...evaluation, examType: 'reading' },
      is_saved: false
    };

    const { error } = await supabaseAdmin.from('submissions').insert([submissionData]);
    if (error) {
      console.error('Supabase insert error:', error);
    }

    return NextResponse.json(evaluation, { status: 200 });
  } catch (error: any) {
    console.error('Error evaluating reading:', error);
    return NextResponse.json({ error: 'Failed to grade reading test.' }, { status: 500 });
  }
}
