import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // Only fetch tasks, don't expose sensitive info if there was any
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
    return NextResponse.json({ error: 'Failed to load reading tasks' }, { status: 500 });
  }
}
