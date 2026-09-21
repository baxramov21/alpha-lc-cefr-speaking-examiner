import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('grammar_exams')
    .select('*')
    .limit(1);

  const columns = data && data.length > 0 ? Object.keys(data[0]) : [];

  return NextResponse.json({ columns, error: error?.message || null });
}
