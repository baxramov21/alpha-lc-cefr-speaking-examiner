import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const createPasscodeSchema = z.object({
  code: z.string().min(4).max(64).toUpperCase(),
  group_name: z.string().max(200).optional().default('All Groups'),
  teacher_name: z.string().max(200).optional().default('All Teachers'),
  programme: z.enum(['CEFR', 'IELTS', 'GRAMMAR']).default('CEFR'),
  grammar_level: z.enum(['elementary', 'pre-intermediate', 'intermediate']).optional(),
  is_active: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('passcodes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ passcodes: data }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching passcodes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = createPasscodeSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { error } = await supabase.from('passcodes').insert([parsed.data]);

    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error creating passcode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export const dynamic = 'force-dynamic';
