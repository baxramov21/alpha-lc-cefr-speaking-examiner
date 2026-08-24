import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) dotenv.config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  // Trigger cache reload by calling the rest endpoint directly with a different header? 
  // No, easiest is just querying the table again, maybe the cache has expired since it's been a while.
  const { data, error } = await supabase.from('submissions').select('fluency_score').limit(1);
  console.log('Query result:', error ? error.message : 'OK');
}
fix();
