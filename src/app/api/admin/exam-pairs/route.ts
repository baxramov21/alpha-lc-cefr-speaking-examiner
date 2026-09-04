import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('exam_pairs')
      .select(`
        id, name, is_active, created_at,
        reading_exam:canonical_exams!exam_pairs_reading_exam_id_fkey(id, title, exam_type, programme),
        listening_exam:canonical_exams!exam_pairs_listening_exam_id_fkey(id, title, exam_type, programme)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(data, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, reading_exam_id, listening_exam_id } = await req.json();

    if (!name) {
      return NextResponse.json({ error: 'Pair name is required.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('exam_pairs')
      .insert({ name, reading_exam_id: reading_exam_id || null, listening_exam_id: listening_exam_id || null, is_active: false })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
