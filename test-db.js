import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data: grammarExams } = await supabase.from('grammar_exams').select('*');
  console.log('Grammar Exams:', grammarExams?.length);
  
  const { data: canonicalExams } = await supabase.from('canonical_exams').select('id, title, level, exam_type');
  console.log('Canonical Exams:', canonicalExams?.length);
  console.log(canonicalExams);
}
check();
