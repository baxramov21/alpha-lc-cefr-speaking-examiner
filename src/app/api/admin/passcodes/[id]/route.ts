import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const patchPasscodeSchema = z.object({
  is_active: z.boolean().optional(),
  code: z.string().min(4).max(64).optional(),
  group_name: z.string().min(1).max(200).optional(),
  teacher_name: z.string().min(1).max(200).optional(),
}).strict(); // .strict() rejects any unknown keys

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const raw = await req.json();
    const parsed = patchPasscodeSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { error } = await supabase.from('passcodes').update(parsed.data).eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error updating passcode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { error } = await supabase.from('passcodes').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error deleting passcode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
