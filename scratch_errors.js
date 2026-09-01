const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: qs } = await supabase.from('questions').select('id, table_data').limit(1);
  const id = qs[0].id;
  
  // Try string array for jsonb
  const { error: e1 } = await supabase.from('questions').update({ table_data: ["a", "b"] }).eq('id', id);
  console.log('Array for JSONB:', e1);

  // Try invalid enum
  const { error: e2 } = await supabase.from('questions').update({ part: 'invalid_part' }).eq('id', id);
  console.log('Invalid enum:', e2);
  
}
run();
