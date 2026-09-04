import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: exams, error } = await supabase
      .from('grammar_exams')
      .select(`
        id,
        created_at,
        title,
        level,
        is_active,
        time_limit,
        grammar_questions ( count )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Format the count from the nested relation
    const formattedExams = exams.map((ex: any) => ({
      ...ex,
      questions_count: ex.grammar_questions?.[0]?.count || 0
    }));

    return NextResponse.json({ exams: formattedExams }, { status: 200 });
  } catch (error: any) {
    console.error('Failed to fetch grammar exams:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
