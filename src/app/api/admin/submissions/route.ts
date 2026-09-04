import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const saved = searchParams.get('saved') === 'true';
    const programme = searchParams.get('programme'); // CEFR | IELTS | GRAMMAR

    if (programme === 'GRAMMAR') {
      const { data: grammarSubmissions, error } = await supabase
        .from('grammar_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching grammar submissions:', error);
        return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
      }

      // Map to a similar structure for the UI
      const mapped = grammarSubmissions.map((s) => ({
        id: s.id,
        studentName: s.student_name,
        groupName: s.group_name,
        teacherName: s.teacher_name,
        overallScore: s.total_score,
        overallCefrBand: `${s.percentage}%`,
        status: 'graded',
        submittedAt: s.created_at,
        examType: 'grammar',
        programme: 'GRAMMAR',
        level: s.grammar_level,
      }));

      return NextResponse.json({ submissions: mapped }, { status: 200 });
    }

    // Handle CEFR / IELTS (from submissions table)
    let query = supabase.from('submissions').select('*').order('created_at', { ascending: false });
    
    if (saved) {
      query = query.eq('is_saved', true).order('created_at', { ascending: true });
    }

    if (programme && (programme === 'CEFR' || programme === 'IELTS')) {
      query = query.eq('programme', programme);
    }

    const { data: submissions, error } = await query;

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    if (saved) {
      return NextResponse.json({ submissions }, { status: 200 });
    }

    // Map to SubmissionSummary
    const mapped = submissions.map((s) => ({
      id: s.id,
      studentName: s.student_name,
      groupName: s.group_name,
      teacherName: s.teacher_name,
      overallScore: s.overall_score,
      overallCefrBand: s.overall_band,
      status: 'graded',
      submittedAt: s.created_at,
      examType: s.evaluation_data?.examType || 'speaking',
      programme: s.programme || 'CEFR',
    }));

    return NextResponse.json({ submissions: mapped }, { status: 200 });
  } catch (err) {
    console.error('Error in GET /admin/submissions:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
