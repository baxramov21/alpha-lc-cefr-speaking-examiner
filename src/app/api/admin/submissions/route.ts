import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
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
    }));

    return NextResponse.json({ submissions: mapped }, { status: 200 });
  } catch (err) {
    console.error('Error in GET /admin/submissions:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
