const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase.from('questions').select('*').eq('part', 'part2').is('image_url', null);
  if (error) console.error(error);
  else console.log(`Found ${data.length} Part 2 questions without images.`);
}
run();
