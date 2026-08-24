import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET telegram configuration
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('app_settings')
      .select('value')
      .eq('key', 'telegram_config')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching telegram config:', error);
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
    }

    return NextResponse.json(data?.value || { telegram_bot_token: '', telegram_chat_id: '' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST telegram configuration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { telegram_bot_token, telegram_chat_id } = body;

    const { error } = await supabaseAdmin
      .from('app_settings')
      .upsert({
        key: 'telegram_config',
        value: { telegram_bot_token, telegram_chat_id },
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      console.error('Error saving telegram config:', error);
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
