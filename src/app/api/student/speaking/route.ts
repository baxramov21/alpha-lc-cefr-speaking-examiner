import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

import { getSeededRandomSelection } from '@/lib/seededRandom';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split('Bearer ')[1] || 'default-seed';
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('is_active', true)
      .order('id', { ascending: true });

    if (error) throw error;
    if (!questions) return NextResponse.json({ questions: [] }, { status: 200 });

    const p1Standard = getSeededRandomSelection(questions.filter(q => q.part === 'part1' && q.question_type === 'standard'), 3, token + '-p1s');
    const p1Image = getSeededRandomSelection(questions.filter(q => q.part === 'part1' && q.question_type === 'image'), 3, token + '-p1i');
    const p2 = getSeededRandomSelection(questions.filter(q => q.part === 'part2'), 1, token + '-p2');
    const p3 = getSeededRandomSelection(questions.filter(q => q.part === 'part3'), 1, token + '-p3');

    const examData = [...p1Standard, ...p1Image, ...p2, ...p3];

    const formattedExam = examData.map((q, index) => ({
      id: q.id,
      part: q.part,
      partLabel: q.part === 'part1' ? 'Part 1' : q.part === 'part2' ? 'Part 2' : 'Part 3',
      questionNumber: index + 1,
      text: q.text,
      prepSeconds: q.prep_seconds,
      speakSeconds: q.speak_seconds,
      topic: q.topic,
      imageUrl: q.image_url || undefined,
      tableData: q.table_data || undefined
    }));

    return NextResponse.json({ questions: formattedExam }, { status: 200 });
  } catch (err: any) {
    console.error('Error fetching speaking exam:', err);
    return NextResponse.json({ error: 'Failed to fetch exam' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
