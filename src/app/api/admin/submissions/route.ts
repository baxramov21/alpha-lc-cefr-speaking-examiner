import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const saved = searchParams.get('saved') === 'true';
    const programme = searchParams.get('programme'); // CEFR | IELTS | GRAMMAR

    if (programme === 'GRAMMAR') {
      // 1. Fetch Legacy Grammar Submissions
      const { data: grammarSubmissions, error: grammarError } = await supabase
        .from('grammar_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (grammarError) {
        console.error('Error fetching grammar submissions:', grammarError);
        return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
      }

      // 2. Fetch Canonical Submissions for Grammar (Reading/Listening)
      const { data: canonicalSubmissions, error: canonicalError } = await supabase
        .from('submissions')
        .select('*')
        .eq('programme', 'GRAMMAR')
        .order('created_at', { ascending: false });

      if (canonicalError) {
        console.error('Error fetching canonical submissions:', canonicalError);
      }

      // 3. Map Legacy Grammar
      const mappedGrammar = grammarSubmissions.map((s) => ({
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
        studyMonth: s.study_month || null,
      }));

      // 4. Map Canonical
      const mappedCanonical = (canonicalSubmissions || []).map((s) => ({
        id: s.id,
        studentName: s.student_name,
        groupName: s.group_name,
        teacherName: s.teacher_name,
        overallScore: s.overall_score,
        overallCefrBand: s.overall_band,
        status: 'graded',
        submittedAt: s.created_at,
        examType: s.evaluation_data?.examType || 'speaking',
        programme: s.programme || 'GRAMMAR',
        level: s.evaluation_data?.grammarLevel || null,
        studyMonth: s.evaluation_data?.studyMonth || null,
      }));

      // Combine and sort
      const allSubmissions = [...mappedGrammar, ...mappedCanonical].sort(
        (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
      );

      return NextResponse.json({ submissions: allSubmissions }, { status: 200 });
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
