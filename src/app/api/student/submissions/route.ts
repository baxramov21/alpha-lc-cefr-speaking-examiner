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

    // Fetch submissions for this student by their name.
    // We use ilike for case-insensitivity. We omit passcode_used filter 
    // so students can still see their history even if the teacher rotates the global passcode.
    let query = supabaseAdmin
      .from('submissions')
      .select('id, created_at, overall_score, overall_band, evaluation_data');
      
    if (session.fullName) {
      query = query.ilike('student_name', session.fullName);
    } else {
      // Fallback: if no name provided, only show exams for this exact passcode to prevent data leaks
      query = query.eq('passcode_used', session.passcode);
    }

    const { data: rawSubmissions, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching student submissions:', error);
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
    }

    // Extract examType from evaluation_data so the frontend can filter by it
    const submissions = (rawSubmissions || []).map((sub: any) => ({
      id: sub.id,
      created_at: sub.created_at,
      overall_score: sub.overall_score,
      overall_band: sub.overall_band,
      examType: sub.evaluation_data?.examType || 'speaking' // Default to speaking if not set
    }));

    return NextResponse.json({ submissions }, { status: 200 });
  } catch (error: unknown) {
    console.error('API /student/submissions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
