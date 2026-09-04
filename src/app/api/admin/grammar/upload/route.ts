import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { GrammarExamSchema } from '@/lib/schemas/examSchema';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // 1. Zod Validation
    const validationResult = GrammarExamSchema.safeParse(payload);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation Failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 2. Persist Grammar Exam
    const { data: examData, error: examError } = await supabase
      .from('grammar_exams')
      .insert({
        title: data.title,
        level: data.level,
        time_limit: data.time_limit,
      })
      .select()
      .single();

    if (examError) {
      throw new Error(`Failed to insert grammar exam: ${examError.message}`);
    }

    const examId = examData.id;

    // 3. Persist Questions
    const questionsToInsert = data.questions.map((q) => ({
      exam_id: examId,
      question_number: q.question_number,
      type: q.type,
      question_text: q.question_text,
      options: q.options ? JSON.stringify(q.options) : null,
      correct_answer: q.correct_answer,
      explanation: q.explanation || null,
    }));

    const { error: questionsError } = await supabase
      .from('grammar_questions')
      .insert(questionsToInsert);

    if (questionsError) {
      throw new Error(`Failed to insert grammar questions: ${questionsError.message}`);
    }

    return NextResponse.json({ success: true, examId }, { status: 200 });
  } catch (error: any) {
    console.error('Grammar Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
