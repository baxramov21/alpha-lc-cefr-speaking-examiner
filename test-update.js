const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zmfnxbiatxohneqcmbhy.supabase.co', 'sb_publishable_jGpkvtS1783PHBtDmAmHJQ_68ljUsyq', { auth: { persistSession: false }});
supabase.from('questions').update({ is_active: false }).eq('id', '04f6f99f-f37e-4263-919d-d46ef68d2136').then(res => console.log('Update:', JSON.stringify(res, null, 2)));
