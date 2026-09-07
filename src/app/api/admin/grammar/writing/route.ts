import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('grammar_writing_exams')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
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
    const { title, level, source_text, time_limit } = await req.json();

    if (!title || !level || !source_text) {
      return NextResponse.json({ error: 'Title, level, and source text are required.' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('grammar_writing_exams')
      .insert({ 
        title, 
        level, 
        source_text,
        time_limit: time_limit || 1200, // default 20 mins
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
