import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin as supabase } from '@/lib/supabase';

const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    const parsed = bulkDeleteSchema.safeParse(raw);
    
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input', details: parsed.error.format() }, { status: 400 });
    }

    const { ids } = parsed.data;

    const { error } = await supabase.from('questions').delete().in('id', ids);

    if (error) throw error;
    
    return NextResponse.json({ success: true, count: ids.length }, { status: 200 });
  } catch (error: unknown) {
    console.error('Error in bulk deleting questions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
