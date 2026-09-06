import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const newActiveState = body.is_active;

    if (newActiveState === undefined) {
      return NextResponse.json({ error: 'Missing is_active state' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('grammar_exams')
      .update({ is_active: newActiveState })
      .eq('id', id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, is_active: newActiveState }, { status: 200 });
  } catch (error: any) {
    console.error('Error toggling grammar exam status:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
