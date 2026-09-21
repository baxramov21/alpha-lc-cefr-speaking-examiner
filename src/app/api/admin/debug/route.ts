import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('grammar_submissions')
    .insert({
      exam_id: '123e4567-e89b-12d3-a456-426614174000',
      student_name: 'Test',
      group_name: 'Test',
      teacher_name: 'Test',
      passcode_used: '123',
      grammar_level: 'beginner',
      total_score: 10,
      max_score: 10,
      percentage: 100,
      question_results: JSON.stringify([])
    });

  return NextResponse.json({ data, error });
}
