import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch the most recent active listening exam
    const { data: exams, error: examError } = await supabase
      .from('canonical_exams')
      .select('*')
      .eq('exam_type', 'CEFR_LISTENING')
      .order('is_active', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (examError) throw examError;
    if (!exams || exams.length === 0) {
      return NextResponse.json({ tasks: [], time_limit: 2400, prep_time: 300 }, { status: 200 });
    }

    const exam = exams[0];

    // 2. Fetch its parts
    const { data: passages, error: passagesError } = await supabase
      .from('passages')
      .select('*, passage_questions(*)')
      .eq('exam_id', exam.id)
      .order('part_number', { ascending: true });

    if (passagesError) throw passagesError;

    // 3. Map to format expected by frontend
    const mappedTasks = passages.map((d: any) => {
      const sortedQs = (d.passage_questions || []).sort((a: any, b: any) => a.question_number - b.question_number);
      
      return {
        id: d.id,
        partLabel: d.title || `Part ${d.part_number}`,
        audioUrls: Array.isArray(d.audio_urls) ? d.audio_urls : (typeof d.audio_urls === 'string' ? JSON.parse(d.audio_urls) : []),
        passage_html: d.passage_html,
        instructions: "Listen to the audio and answer the questions.",
        questions: sortedQs.map((q: any) => ({
          id: q.id,
          number: q.question_number,
          text: q.question_text,
          type: q.type.toLowerCase(),
          options: q.options ? (typeof q.options === 'string' ? JSON.parse(q.options) : q.options) : [],
          correctAnswer: q.correct_answer
        }))
      };
    });

    return NextResponse.json({ 
      tasks: mappedTasks,
      time_limit: exam.time_limit || 2400,
      prep_time: exam.prep_time || 300
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching listening tasks:', error);
    return NextResponse.json({ error: 'Failed to load listening tasks' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
