import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import DOMPurify from 'isomorphic-dompurify';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Fetch the canonical exam
    const { data: exam, error: examError } = await supabase
      .from('canonical_exams')
      .select('*')
      .eq('id', id)
      .single();

    if (examError) throw examError;

    // Fetch its parts (passages)
    const { data: passages, error: passagesError } = await supabase
      .from('passages')
      .select('*, passage_questions(*)')
      .eq('exam_id', id)
      .order('part_number', { ascending: true });

    if (passagesError) throw passagesError;

    // Reconstruct the nested structure
    const parts = passages.map((p: any) => ({
      id: p.id,
      part_number: p.part_number,
      title: p.title,
      passage_html: p.passage_html,
      audio_urls: p.audio_urls ? (typeof p.audio_urls === 'string' ? JSON.parse(p.audio_urls) : p.audio_urls) : [],
      questions: (p.passage_questions || []).sort((a: any, b: any) => a.question_number - b.question_number).map((q: any) => ({
        id: q.id,
        question_number: q.question_number,
        type: q.type,
        question_text: q.question_text,
        options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
        correct_answer: q.correct_answer
      }))
    }));

    return NextResponse.json({ ...exam, parts }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching canonical exam:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, exam_type, time_limit, prep_time, parts } = body;

    // 1. Update Canonical Exam
    const { error: examError } = await supabase
      .from('canonical_exams')
      .update({
        title,
        exam_type,
        time_limit: time_limit || 3600,
        prep_time: prep_time || 300,
      })
      .eq('id', id);

    if (examError) throw examError;

    // 2. Fully sync parts and questions by deleting existing passages for this exam
    // Because passages cascade delete passage_questions, deleting passages is enough.
    // However, if ON DELETE CASCADE is not set on passages->exam, we might need manual cleanup.
    // Let's do manual cascade just to be safe.
    
    // Find passages to delete
    const { data: existingPassages, error: fetchPassagesError } = await supabase
      .from('passages')
      .select('id')
      .eq('exam_id', id);

    if (fetchPassagesError) throw fetchPassagesError;

    if (existingPassages && existingPassages.length > 0) {
      const passageIds = existingPassages.map(p => p.id);
      
      const { error: deleteQuestionsError } = await supabase
        .from('passage_questions')
        .delete()
        .in('passage_id', passageIds);
      
      if (deleteQuestionsError) throw deleteQuestionsError;

      const { error: deletePassagesError } = await supabase
        .from('passages')
        .delete()
        .eq('exam_id', id);

      if (deletePassagesError) throw deletePassagesError;
    }

    // 3. Insert new parts and questions
    if (parts && parts.length > 0) {
      for (const part of parts) {
        const sanitizedHtml = DOMPurify.sanitize(part.passage_html, {
          ALLOWED_TAGS: ['p', 'b', 'i', 'strong', 'em', 'table', 'tr', 'td', 'th', 'ul', 'ol', 'li', 'span'],
        });

        const { data: insertedPassage, error: insertPassageError } = await supabase
          .from('passages')
          .insert({
            exam_id: id,
            part_number: part.part_number,
            title: part.title,
            exam_type: exam_type, // carry over for legacy logic if any
            passage_html: sanitizedHtml,
            audio_urls: part.audio_urls ? JSON.stringify(part.audio_urls) : null,
          })
          .select()
          .single();

        if (insertPassageError) throw insertPassageError;

        if (part.questions && part.questions.length > 0) {
          const questionsToInsert = part.questions.map((q: any, i: number) => ({
            passage_id: insertedPassage.id,
            question_number: q.question_number || (i + 1),
            type: q.type,
            question_text: q.question_text,
            options: q.options ? JSON.stringify(q.options) : null,
            correct_answer: q.correct_answer || "",
          }));

          const { error: insertQError } = await supabase
            .from('passage_questions')
            .insert(questionsToInsert);

          if (insertQError) throw insertQError;
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating canonical exam:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Manual cascade delete
    // 1. Fetch passages for this exam
    const { data: passages, error: fetchPassagesError } = await supabase
      .from('passages')
      .select('id')
      .eq('exam_id', id);

    if (fetchPassagesError) throw fetchPassagesError;

    if (passages && passages.length > 0) {
      const passageIds = passages.map(p => p.id);
      
      // 2. Delete questions
      const { error: deleteQuestionsError } = await supabase
        .from('passage_questions')
        .delete()
        .in('passage_id', passageIds);
        
      if (deleteQuestionsError) throw deleteQuestionsError;

      // 3. Delete passages
      const { error: deletePassagesError } = await supabase
        .from('passages')
        .delete()
        .eq('exam_id', id);
        
      if (deletePassagesError) throw deletePassagesError;
    }

    // 4. Delete canonical exam
    const { error: deleteExamError } = await supabase
      .from('canonical_exams')
      .delete()
      .eq('id', id);

    if (deleteExamError) throw deleteExamError;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting canonical exam:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
