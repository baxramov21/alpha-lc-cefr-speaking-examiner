import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { verifyStudentSessionToken } from '@/lib/sessionToken';
import { getSeededRandomSelection, getSeededRandom } from '@/lib/seededRandom';
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1] || null;
    const session = await verifyStudentSessionToken(token);
    
    const programme = session?.programme || 'CEFR';
    const grammarLevel = session?.grammarLevel || null;

    // 1. Fetch the most recent active reading exam
    let exam = null;

    if (programme === 'GRAMMAR' && grammarLevel) {
      try {
        const { data: triples } = await supabase
          .from('grammar_triples')
          .select('reading_exam_id')
          .ilike('level', grammarLevel)
          .eq('is_active', true)
          .order('created_at', { ascending: false });
          
        if (triples && triples.length > 0) {
          const seededRand = getSeededRandom(token || 'default-seed');
          const randomTriple = triples[Math.floor(seededRand() * triples.length)];
          const { data: tripleExam } = await supabase
            .from('canonical_exams')
            .select('*')
            .eq('id', randomTriple.reading_exam_id)
            .single();
          if (tripleExam) exam = tripleExam;
        }
      } catch (e) {
        // Table might not exist yet, fallback
      }
    }

    if (!exam) {
      let query = supabase
        .from('canonical_exams')
        .select('*')
        .eq('exam_type', 'CEFR_READING')
        .eq('is_active', true)
        .eq('programme', programme);
        
      if (programme === 'GRAMMAR' && grammarLevel) {
        query = query.ilike('grammar_level', grammarLevel);
      }

      const { data: exams, error: examError } = await query
        .order('created_at', { ascending: false });

      if (examError) throw examError;
      if (exams && exams.length > 0) {
        const seededRand = getSeededRandom(token || 'default-seed');
        exam = exams[Math.floor(seededRand() * exams.length)];
      }
    }

    if (!exam) {
      return NextResponse.json({ tasks: [], time_limit: 3600 }, { status: 200 });
    }

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
        passage_html: d.passage_html,
        pdf_url: d.pdf_url,
        instructions: "Read the passage and answer the questions.",
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
      time_limit: exam.time_limit || 3600 
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching reading tasks:', error);
    return NextResponse.json({ error: 'Failed to load reading tasks' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
