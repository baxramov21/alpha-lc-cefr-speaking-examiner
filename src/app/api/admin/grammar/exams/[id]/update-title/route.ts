import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { title, table } = body;

    if (!title || !table) {
      return NextResponse.json({ error: 'Missing title or table' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from(table)
      .update({ title })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, title }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating exam title:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
