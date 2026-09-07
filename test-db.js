const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('canonical_exams')
    .select('id, title, programme, grammar_level, is_active')
    .eq('programme', 'GRAMMAR')
    .eq('exam_type', 'CEFR_READING');
  console.log("Canonical Exams:", data);

  if (data && data.length > 0) {
    const examId = data[0].id;
    const { data: passages } = await supabase.from('passages').select('id, exam_id').eq('exam_id', examId);
    console.log("Passages for exam", examId, ":", passages);
  }
}
run();
