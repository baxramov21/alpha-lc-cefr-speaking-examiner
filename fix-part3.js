import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) dotenv.config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const newPart3 = {
  part: 'part3',
  question_type: 'debate',
  text: 'Art and music classes should be removed from the school curriculum.\n\nPlease discuss both sides and give your opinion.',
  prep_seconds: 60,
  speak_seconds: 120,
  topic: 'Art and Music Classes',
  table_data: {
    forPoints: [
      'Schools should focus more on science, technology, and math.',
      'Learning art and music does not help in finding a job.',
      'It is a waste of time for students who have no talent.'
    ],
    againstPoints: [
      'Art and music help children develop creativity and imagination.',
      'These subjects provide a necessary break from difficult academic lessons.',
      'Studying art helps students understand and appreciate different cultures.'
    ]
  },
  is_active: true
};

async function update() {
  await supabase.from('questions').delete().eq('part', 'part3');
  const { data, error } = await supabase.from('questions').insert([newPart3]);
  console.log('Update result:', error ? error : 'Success!');
}
update();
