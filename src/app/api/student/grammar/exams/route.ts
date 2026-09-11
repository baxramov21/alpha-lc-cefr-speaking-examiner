import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyStudentSessionToken } from '@/lib/sessionToken';
import { getSeededRandom } from '@/lib/seededRandom';
export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing session token' }, { status: 401 });
    }

    const session = await verifyStudentSessionToken(sessionToken);
    if (!session || session.programme !== 'GRAMMAR') {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 403 });
    }

    const grammarLevel = session.grammarLevel || 'intermediate'; // fallback

    let exams: any[] = [];

    try {
      const { data: triples } = await supabaseAdmin
        .from('grammar_triples')
        .select('grammar_exam_id')
        .ilike('level', grammarLevel)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (triples && triples.length > 0) {
        const seededRand = getSeededRandom(sessionToken || 'default-seed');
        const randomTriple = triples[Math.floor(seededRand() * triples.length)];
        const { data: tripleExam } = await supabaseAdmin
          .from('grammar_exams')
          .select('id, title, level, time_limit')
          .eq('id', randomTriple.grammar_exam_id)
          .single();
        if (tripleExam) exams = [tripleExam];
      }
    } catch (e) {
      // Table might not exist yet
    }

    // Fallback if no triple active
    if (exams.length === 0) {
      const { data: fallbackExams, error } = await supabaseAdmin
        .from('grammar_exams')
        .select('id, title, level, time_limit')
        .eq('is_active', true)
        .ilike('level', grammarLevel)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching grammar exams:', error);
      } else if (fallbackExams && fallbackExams.length > 0) {
        const seededRand = getSeededRandom(sessionToken || 'default-seed');
        const randomFallback = fallbackExams[Math.floor(seededRand() * fallbackExams.length)];
        exams = [randomFallback];
      }
    }

    // Also fetch canonical native exams for Grammar
    const { data: nativeExams, error: nativeError } = await supabaseAdmin
      .from('canonical_exams')
      .select('id, title, grammar_level as level, time_limit')
      .eq('is_active', true)
      .eq('programme', 'GRAMMAR')
      .ilike('grammar_level', grammarLevel)
      .order('created_at', { ascending: false });
      
    if (!nativeError && nativeExams) {
      const nativeMapped = nativeExams.map((ex: any) => ({
        ...ex,
        isNative: true
      }));
      // Append them to the list of available exams
      exams = [...exams, ...nativeMapped];
    }

    return NextResponse.json({ exams }, { status: 200 });
  } catch (error: unknown) {
    console.error('API /student/grammar/exams error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
