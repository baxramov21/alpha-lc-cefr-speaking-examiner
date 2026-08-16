import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey || serviceRoleKey === 'your-supabase-service-role-key-here') {
  console.warn('WARNING: Using ANON_KEY for admin operations because SUPABASE_SERVICE_ROLE_KEY is missing or invalid.');
  serviceRoleKey = supabaseKey;
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Use this ONLY in server-side API routes for admin tasks — bypasses RLS!
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

