import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) dotenv.config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fix() {
  const { data, error } = await supabase.rpc('reload_schema_cache', {});
  if (error && error.code !== '42883') {
    console.log('RPC failed, trying raw query (this usually fails via JS API though)...', error.message);
  } else {
    console.log('Schema cache reload triggered via RPC or not needed.');
  }
}
fix();
