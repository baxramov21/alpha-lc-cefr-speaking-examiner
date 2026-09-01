const { loadEnvConfig } = require('@next/env');
loadEnvConfig(process.cwd());

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: qs } = await supabase.from('questions').select('id, part').limit(1);
  if (!qs || qs.length === 0) return console.log('no qs');
  
  const id = qs[0].id;
  const { data, error } = await supabase.from('questions').update({
    part: 'part1_2',
    image_url: 'https://example.com/img1.jpg',
    table_data: { image_url_2: 'https://example.com/img2.jpg' }
  }).eq('id', id).select();
  
  console.log('Update Result:', JSON.stringify(error, null, 2) || 'SUCCESS');
}
run();
