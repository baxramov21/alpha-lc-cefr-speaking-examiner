const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { error } = await supabase.from('questions').update({ image_url: null }).eq('id', '123e4567-e89b-12d3-a456-426614174000');
  console.log('Null image_url check:', error);
}
run();
