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
    let exam: any = null;
    let questions: any = null;
    let isNative = false;
    let time_limit = 3600;
    
    // First try grammar_exams
    const { data: legacyExam, error: legacyError } = await supabaseAdmin
      .from('grammar_exams')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (!legacyError && legacyExam) {
      if (legacyExam.level !== session.grammarLevel) {
        return NextResponse.json({ error: 'Exam level mismatch' }, { status: 403 });
      }
      exam = legacyExam;
      time_limit = exam.time_limit;
      
      const { data: qData, error: qError } = await supabaseAdmin
        .from('grammar_questions')
        .select('id, question_number, type, question_text, options')
        .eq('exam_id', id)
        .order('question_number', { ascending: true });
        
      if (qError) return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 });
      questions = qData;
    } else {
      // Try canonical_exams
      const { data: nativeExam, error: nativeError } = await supabaseAdmin
        .from('canonical_exams')
        .select('*')
        .eq('id', id)
        .eq('programme', 'GRAMMAR')
        .eq('is_active', true)
        .single();
        
      if (nativeError || !nativeExam) {
        return NextResponse.json({ error: 'Exam not found or inactive' }, { status: 404 });
      }
      
      // We don't check level mismatch strictly for native yet, or we can check grammar_level
      if (nativeExam.grammar_level && session.grammarLevel && nativeExam.grammar_level.toLowerCase() !== session.grammarLevel.toLowerCase()) {
         return NextResponse.json({ error: 'Exam level mismatch' }, { status: 403 });
      }
      
      isNative = true;
      exam = nativeExam;
      time_limit = exam.time_limit || 3600;

      // Fetch its parts
      const { data: passages, error: passagesError } = await supabaseAdmin
        .from('passages')
        .select('*, passage_questions(*)')
        .eq('exam_id', exam.id)
        .order('part_number', { ascending: true });

      if (passagesError) return NextResponse.json({ error: 'Failed to fetch passages' }, { status: 500 });

      // Format as tasks for reading session
      questions = passages.map((d: any) => {
        const sortedQs = (d.passage_questions || []).sort((a: any, b: any) => a.question_number - b.question_number);
        return {
          id: d.id,
          exam_id: exam.id,
          partLabel: d.title || `Part ${d.part_number}`,
          passage_html: d.passage_html,
          pdf_url: d.pdf_url,
          image_url: d.image_url,
          instructions: "Read the passage and answer the questions.",
          questions: sortedQs.map((q: any) => ({
            id: q.id,
            number: q.question_number,
            text: q.question_text,
            type: q.type ? q.type.toLowerCase() : 'multiple_choice',
            options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
            correctAnswer: q.correct_answer,
            image_url: q.image_url
          }))
        };
      });
    }

    return NextResponse.json({ exam, questions, isNative, time_limit }, { status: 200 });
  } catch (error: unknown) {
    console.error('API /student/grammar/exams/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
