import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

function getRandomSelection(arr: any[], count: number) {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.slice(0, count);
}

export async function GET() {
  try {
    const { data: questions, error } = await supabase
      .from('questions')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    if (!questions) return NextResponse.json({ questions: [] }, { status: 200 });

    const p1Standard = getRandomSelection(questions.filter(q => q.part === 'part1' && q.question_type === 'standard'), 3);
    const p1Image = getRandomSelection(questions.filter(q => q.part === 'part1' && q.question_type === 'image'), 3);
    const p2 = getRandomSelection(questions.filter(q => q.part === 'part2'), 1);
    const p3 = getRandomSelection(questions.filter(q => q.part === 'part3'), 1);

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
