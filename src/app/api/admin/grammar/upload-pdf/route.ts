import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { GrammarPdfExamSchema } from '@/lib/schemas/examSchema';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    const validationResult = GrammarPdfExamSchema.safeParse(payload);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation Failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 1. Persist Grammar Exam
    const { data: examData, error: examError } = await supabase
      .from('grammar_exams')
      .insert({
        title: data.title,
        level: data.level,
        time_limit: data.time_limit,
        pdf_url: data.pdf_url,
        is_active: true
      })
      .select()
      .single();

    if (examError) throw new Error(`Failed to insert grammar exam: ${examError.message}`);

    const examId = examData.id;

    // 2. Format questions from answer key
    const questionsToInsert = Object.entries(data.answers).map(([qNum, qData]) => {
      return {
        exam_id: examId,
        question_number: parseInt(qNum, 10) || 0,
        question_text: `Question ${qNum}`,
        type: qData.type || 'MULTIPLE_CHOICE',
        correct_answer: qData.correct_answer
      };
    });

    if (questionsToInsert.length > 0) {
      const { error: questionsError } = await supabase
        .from('grammar_questions')
        .insert(questionsToInsert);

      if (questionsError) throw new Error(`Failed to insert questions: ${questionsError.message}`);
    }

    return NextResponse.json({ success: true, examId }, { status: 200 });

  } catch (error: any) {
    console.error('Error in /api/admin/grammar/upload-pdf:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
