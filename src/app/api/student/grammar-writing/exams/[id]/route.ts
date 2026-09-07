import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyStudentSessionToken } from '@/lib/sessionToken';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    const { id } = await params;

    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing session token' }, { status: 401 });
    }

    const session = await verifyStudentSessionToken(sessionToken);
    if (!session || session.programme !== 'GRAMMAR') {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 403 });
    }

    const { data: exam, error } = await supabaseAdmin
      .from('grammar_writing_exams')
      .select('id, title, level, time_limit, source_text')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error || !exam) {
      return NextResponse.json({ error: 'Exam not found or inactive' }, { status: 404 });
    }

    return NextResponse.json({ exam }, { status: 200 });

  } catch (error: any) {
    console.error('API /student/grammar-writing/exams/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
