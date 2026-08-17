import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'auth_settings')
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const authSettings = data?.value || { 
      student_password: process.env.STUDENT_PASSWORD || 'ALPHA2024',
      allow_skip: true
    };
    return NextResponse.json(authSettings);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch auth settings' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const { error } = await supabaseAdmin
      .from('app_settings')
      .upsert({
        key: 'auth_settings',
        value: {
          student_password: body.student_password || 'ALPHA2024',
          allow_skip: body.allow_skip ?? true
        },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating auth settings:', error);
    return NextResponse.json({ error: 'Failed to update auth settings' }, { status: 500 });
  }
}
