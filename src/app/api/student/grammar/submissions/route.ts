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

    let query = supabaseAdmin
      .from('grammar_submissions')
      .select('id, created_at, total_score, max_score, percentage, exam_id');
      
    if (session.fullName) {
      query = query.ilike('student_name', session.fullName);
    } else {
      query = query.eq('passcode_used', session.passcode);
    }

    const { data: rawSubmissions, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching grammar submissions:', error);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    // Fetch exam titles for these submissions
    const examIds = [...new Set((rawSubmissions || []).map((sub: any) => sub.exam_id))];
    let examTitles: Record<string, string> = {};
    if (examIds.length > 0) {
      const { data: exams } = await supabaseAdmin
        .from('grammar_exams')
        .select('id, title')
        .in('id', examIds);
      if (exams) {
        exams.forEach(ex => {
          examTitles[ex.id] = ex.title;
        });
      }
    }

    const submissions = (rawSubmissions || []).map((sub: any) => ({
      id: sub.id,
      created_at: sub.created_at,
      total_score: sub.total_score,
      max_score: sub.max_score,
      percentage: sub.percentage,
      exam_title: examTitles[sub.exam_id] || 'Grammar Test'
    }));

    return NextResponse.json({ submissions }, { status: 200 });
  } catch (error: unknown) {
    console.error('API /student/grammar/submissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
