import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyStudentSessionToken } from '@/lib/sessionToken';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing session token' }, { status: 401 });
    }

    const session = await verifyStudentSessionToken(sessionToken);
    if (!session || session.programme !== 'GRAMMAR') {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = resolvedParams.id;

    // Fetch the exam
    const { data: exam, error: examError } = await supabaseAdmin
      .from('grammar_exams')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: 'Exam not found or inactive' }, { status: 404 });
    }

    if (exam.level !== session.grammarLevel) {
      return NextResponse.json({ error: 'Exam level mismatch' }, { status: 403 });
    }

    // Fetch questions
    // Exclude the correct_answer from the payload sent to the student so they can't cheat!
    const { data: questions, error: qError } = await supabaseAdmin
      .from('grammar_questions')
      .select('id, question_number, type, question_text, options')
      .eq('exam_id', id)
      .order('question_number', { ascending: true });

    if (qError) {
      return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
    }

    return NextResponse.json({ exam, questions }, { status: 200 });
  } catch (error: unknown) {
    console.error('API /student/grammar/exams/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
