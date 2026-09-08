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

    // Only fetch active exams matching student's grammar level, and don't send the source_text to the setup page (only title/id).
    // Wait, let's just fetch active writing exams.
    const { data: exams, error } = await supabaseAdmin
      .from('grammar_writing_exams')
      .select('id, title, level, time_limit')
      .eq('is_active', true)
      .eq('level', session.grammarLevel)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ exams: [] }, { status: 200 });
      }
      throw error;
    }

    let finalExams = exams || [];
    if (finalExams.length > 0) {
      const seededRand = getSeededRandom(sessionToken || 'default-seed');
      const randomExam = finalExams[Math.floor(seededRand() * finalExams.length)];
      finalExams = [randomExam];
    }

    return NextResponse.json({ exams: finalExams }, { status: 200 });

  } catch (error: any) {
    console.error('API /student/grammar-writing/exams error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
