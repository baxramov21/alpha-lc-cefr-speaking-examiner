const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  // Using RPC to run raw SQL is not directly supported by default, but we can do it via a predefined RPC or just using pg.
  // Wait, I can just use pg directly with the connection string!
  console.log('Use postgres directly');
}
run();
