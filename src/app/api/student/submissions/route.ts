import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyStudentSessionToken } from '@/lib/sessionToken';

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing session token' }, { status: 401 });
    }

    const session = await verifyStudentSessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 403 });
    }

    // Fetch submissions for this student by their passcode/name
    const { data: submissions, error } = await supabaseAdmin
      .from('submissions')
      .select('id, created_at, overall_score, overall_band')
      .eq('passcode_used', session.passcode)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching student submissions:', error);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    return NextResponse.json({ submissions }, { status: 200 });
  } catch (error: unknown) {
    console.error('API /student/submissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
