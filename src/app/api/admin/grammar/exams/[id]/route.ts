import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Fetch the grammar exam
    const { data: exam, error: examError } = await supabase
      .from('grammar_exams')
      .select('*')
      .eq('id', id)
      .single();

    if (examError) throw examError;

    // Fetch its questions
    const { data: questions, error: questionsError } = await supabase
      .from('grammar_questions')
      .select('*')
      .eq('exam_id', id)
      .order('question_number', { ascending: true });

    if (questionsError) throw questionsError;

    return NextResponse.json({ ...exam, questions }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching grammar exam:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, time_limit, questions } = body;

    // 1. Update Grammar Exam
    const { error: examError } = await supabase
      .from('grammar_exams')
      .update({
        title,
        time_limit: time_limit || 2400,
      })
      .eq('id', id);

    if (examError) throw examError;

    // 2. Sync questions
    // Because grammar_questions have ON DELETE CASCADE, deleting them is safe.
    const { error: deleteQuestionsError } = await supabase
      .from('grammar_questions')
      .delete()
      .eq('exam_id', id);
      
    if (deleteQuestionsError) throw deleteQuestionsError;

    // 3. Insert new questions
    if (questions && questions.length > 0) {
      const questionsToInsert = questions.map((q: any, i: number) => ({
        exam_id: id,
        question_number: q.question_number || (i + 1),
        type: q.type,
        question_text: q.question_text,
        options: q.options ? JSON.stringify(q.options) : null,
        correct_answer: q.correct_answer || "",
        explanation: q.explanation || null,
      }));

      const { error: insertQError } = await supabase
        .from('grammar_questions')
        .insert(questionsToInsert);

      if (insertQError) throw insertQError;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating grammar exam:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // grammar_questions has ON DELETE CASCADE to grammar_exams
    // so we can just delete the exam.
    const { error: deleteExamError } = await supabase
      .from('grammar_exams')
      .delete()
      .eq('id', id);

    if (deleteExamError) throw deleteExamError;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting grammar exam:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
