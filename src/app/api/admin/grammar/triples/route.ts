import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('grammar_triples')
      .select(`
        id, name, level, is_active, created_at,
        reading_exam:canonical_exams!grammar_triples_reading_exam_id_fkey(id, title, exam_type, programme, grammar_level),
        listening_exam:canonical_exams!grammar_triples_listening_exam_id_fkey(id, title, exam_type, programme, grammar_level),
        grammar_exam:grammar_exams!grammar_triples_grammar_exam_id_fkey(id, title, level),
        writing_exam:grammar_writing_exams!grammar_triples_writing_exam_id_fkey(id, title, level)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      // If table doesn't exist yet, return empty array safely instead of crashing UI
      if (error.code === '42P01') {
        return NextResponse.json([], { status: 200 });
      }
      throw error;
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, level, reading_exam_id, listening_exam_id, grammar_exam_id, writing_exam_id } = await req.json();

    if (!name || !level) {
      return NextResponse.json({ error: 'Triple name and level are required.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('grammar_triples')
      .insert({ 
        name, 
        level, 
        reading_exam_id: reading_exam_id || null, 
        listening_exam_id: listening_exam_id || null, 
        grammar_exam_id: grammar_exam_id || null, 
        writing_exam_id: writing_exam_id || null,
        is_active: false 
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
