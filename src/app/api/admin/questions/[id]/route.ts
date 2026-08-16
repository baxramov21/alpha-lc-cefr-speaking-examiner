import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const patchQuestionSchema = z.object({
  part: z.enum(['part1', 'part2', 'part3']).optional(),
  question_type: z.enum(['standard', 'image', 'debate']).optional(),
  text: z.string().min(1).max(2000).optional(),
  topic: z.string().min(1).max(200).optional(),
  is_active: z.boolean().optional(),
  prep_seconds: z.number().int().min(0).max(300).optional(),
  speak_seconds: z.number().int().min(0).max(600).optional(),
  image_url: z.string().max(500).optional().nullable(),
  table_data: z.record(z.string(), z.unknown()).optional().nullable(),
}).strict(); // Reject any unknown fields

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const raw = await req.json();
    const parsed = patchQuestionSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { error } = await supabase.from('questions').update(parsed.data).eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error updating question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('questions').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error deleting question:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
