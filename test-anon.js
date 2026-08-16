const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://zmfnxbiatxohneqcmbhy.supabase.co', 'sb_publishable_jGpkvtS1783PHBtDmAmHJQ_68ljUsyq', { auth: { persistSession: false }});
supabase.from('submissions').select('*').limit(1).then(res => console.log('Submissions:', JSON.stringify(res, null, 2)));
supabase.from('questions').select('*').limit(1).then(res => console.log('Questions:', JSON.stringify(res, null, 2)));
