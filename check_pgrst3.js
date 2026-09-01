const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: qs } = await supabase.from('questions').select('id, part').limit(1);
  const id = qs[0].id;
  
  // Try to update with something invalid for JSON
  const { error } = await supabase.from('questions').update({ table_data: "invalid json string" }).eq('id', id);
  console.log('Invalid JSON for JSONB error:', error);
  
}
run();
