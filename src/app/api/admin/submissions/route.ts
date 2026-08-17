import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const saved = searchParams.get('saved') === 'true';

    let query = supabase.from('submissions').select('*').order('created_at', { ascending: false });
    
    if (saved) {
      query = query.eq('is_saved', true).order('created_at', { ascending: true });
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
      status: 'graded', // Supabase submissions are always graded in this flow
      submittedAt: s.created_at,
      examType: s.evaluation_data?.examType || 'speaking',
    }));

    return NextResponse.json({ submissions: mapped }, { status: 200 });
  } catch (err) {
    console.error('Error in GET /admin/submissions:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
