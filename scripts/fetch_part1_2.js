require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, topic, text, part, is_active')
    .eq('part', 'part1_2')
    .order('topic', { ascending: true })
    .order('created_at', { ascending: true }); 

  if (error) {
    console.error(error);
    return;
  }

  const grouped = {};
  for (const q of questions) {
    if (!grouped[q.topic]) {
      grouped[q.topic] = [];
    }
    grouped[q.topic].push(q);
  }

  for (const topic in grouped) {
    console.log(`\n=== Topic: ${topic} ===`);
    const qs = grouped[topic];
    qs.forEach((q, idx) => {
      console.log(`${idx + 1}. [${q.id}] ${q.text}`);
    });
  }
}

main();
