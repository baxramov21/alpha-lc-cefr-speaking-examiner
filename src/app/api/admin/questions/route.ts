import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const createQuestionSchema = z.object({
  part: z.enum(['part1', 'part2', 'part3', 'task1', 'task1_2', 'task2']),
  question_type: z.enum(['standard', 'image', 'debate']),
  text: z.string().min(1).max(2000),
  prep_seconds: z.number().int().min(0).max(300),
  speak_seconds: z.number().int().min(0).max(600),
  topic: z.string().min(1).max(200).optional().nullable(),
  image_url: z.string().max(500).optional().nullable(),
  table_data: z.record(z.string(), z.unknown()).optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ questions: data }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = createQuestionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { data: existing, error: checkErr } = await supabase
      .from('questions')
      .select('id')
      .ilike('text', parsed.data.text.trim())
      .limit(1);

    if (checkErr) throw checkErr;
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: 'A question with this exact text already exists.', existingId: existing[0].id }, { status: 409 });
    }

    const { error } = await supabase.from('questions').insert([{
      ...parsed.data,
      text: parsed.data.text.trim()
    }]);

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error creating question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
