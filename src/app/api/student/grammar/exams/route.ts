import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyStudentSessionToken } from '@/lib/sessionToken';

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
      const { data: triple } = await supabaseAdmin
        .from('grammar_triples')
        .select('grammar_exam_id')
        .eq('level', grammarLevel)
        .eq('is_active', true)
        .single();

      if (triple?.grammar_exam_id) {
        const { data: tripleExam } = await supabaseAdmin
          .from('grammar_exams')
          .select('id, title, level, time_limit')
          .eq('id', triple.grammar_exam_id)
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
        .eq('level', grammarLevel)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching grammar exams:', error);
        return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 });
      }
      
      exams = fallbackExams || [];
    }

    return NextResponse.json({ exams }, { status: 200 });
  } catch (error: unknown) {
    console.error('API /student/grammar/exams error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
