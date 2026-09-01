const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: qs } = await supabase.from('questions').select('id').limit(1);
  const id = qs[0].id;
  
  // Try to update a nonexistent column
  const { error } = await supabase.from('questions').update({ nonexistent_col: 'test' }).eq('id', id);
  console.log('Non-existent column error:', error);
  
  // Try to update with invalid UUID
  const { error: err2 } = await supabase.from('questions').update({ text: 'test' }).eq('id', 'invalid-uuid');
  console.log('Invalid UUID error:', err2);
  
  // Try with empty object
  const { error: err3 } = await supabase.from('questions').update({}).eq('id', id);
  console.log('Empty object error:', err3);
}
run();
