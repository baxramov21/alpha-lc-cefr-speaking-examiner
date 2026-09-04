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

    // Fetch active exams for this level
    const { data: exams, error } = await supabaseAdmin
      .from('grammar_exams')
      .select('id, title, level, time_limit')
      .eq('is_active', true)
      .eq('level', grammarLevel)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching grammar exams:', error);
      return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 });
    }

    return NextResponse.json({ exams }, { status: 200 });
  } catch (error: unknown) {
    console.error('API /student/grammar/exams error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
