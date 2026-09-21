import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    sql: `ALTER TABLE grammar_questions ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT NULL;`
  });

  if (error) {
    // Try raw query approach
    const { error: error2 } = await supabaseAdmin
      .from('grammar_questions')
      .update({ topic: null })
      .eq('id', '00000000-0000-0000-0000-000000000000');
    
    return NextResponse.json({ 
      message: 'RPC failed, tried alternative', 
      rpcError: error.message,
      altError: error2?.message || 'no error (column may already exist)'
    });
  }

  return NextResponse.json({ success: true, data });
}
