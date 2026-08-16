const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zmfnxbiatxohneqcmbhy.supabase.co', 'your-supabase-service-role-key-here', { auth: { persistSession: false }});
supabase.from('questions').select('*').then(res => console.log(JSON.stringify(res, null, 2)));
