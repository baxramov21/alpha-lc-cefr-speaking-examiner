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

    const { data: submission, error } = await supabaseAdmin
      .from('grammar_writing_submissions')
      .select('*, grammar_writing_exams (title, level, source_text)')
      .eq('id', id)
      .eq('student_name', session.fullName)
      .single();

    if (error || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    return NextResponse.json({ submission }, { status: 200 });

  } catch (error: any) {
    console.error('API /student/grammar-writing/submissions/[id] error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
