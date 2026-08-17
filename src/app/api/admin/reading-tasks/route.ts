import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { data, error } = await supabase
      .from('reading_tasks')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    // Map snake_case to camelCase
    const mappedTasks = data.map(d => ({
      id: d.id,
      partLabel: d.part_label,
      pdfUrl: d.pdf_url,
      passageText: d.passage_text,
      instructions: d.instructions,
      questions: d.questions
    }));

    return NextResponse.json({ tasks: mappedTasks }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching reading tasks:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing ID' }, { status: 400 });

    const { error } = await supabase.from('reading_tasks').delete().eq('id', id);
    if (error) throw error;
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
