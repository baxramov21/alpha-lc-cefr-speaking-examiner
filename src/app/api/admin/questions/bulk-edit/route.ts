import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { z } from 'zod';

const patchQuestionSchema = z.object({
  part: z.enum(['part1', 'part1_2', 'part2', 'part3', 'task1', 'task1_2', 'task2']).optional(),
  question_type: z.enum(['standard', 'image', 'debate']).optional(),
  text: z.string().min(1).max(2000).optional(),
  topic: z.string().min(1).max(200).optional(),
  is_active: z.boolean().optional(),
  prep_seconds: z.number().int().min(0).max(300).optional(),
  speak_seconds: z.number().int().min(0).max(600).optional(),
  image_url: z.string().max(500).optional().nullable(),
  table_data: z.record(z.string(), z.unknown()).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    
    if (!raw.updates || !Array.isArray(raw.updates)) {
      return NextResponse.json({ error: 'Payload must contain an updates array' }, { status: 400 });
    }

    const updates = raw.updates;
    if (updates.length === 0) {
      return NextResponse.json({ success: true, count: 0 }, { status: 200 });
    }

    const promises = updates.map((update: any) => {
      const { id, ...fields } = update;
      // Filter fields through zod to remove anything unwanted/invalid
      const parsed = patchQuestionSchema.safeParse(fields);
      if (!parsed.success) {
        throw new Error(`Invalid fields for ID ${id}: ${JSON.stringify(parsed.error.format())}`);
      }
      return supabase.from('questions').update(parsed.data).eq('id', id);
    });

    const results = await Promise.all(promises);

    const errors = results.filter(r => r.error).map(r => r.error);
    if (errors.length > 0) {
      console.error('Errors in bulk update:', errors);
      return NextResponse.json({ error: 'Some updates failed', details: errors }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: updates.length }, { status: 200 });

  } catch (error: any) {
    console.error('Error in bulk edit:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
