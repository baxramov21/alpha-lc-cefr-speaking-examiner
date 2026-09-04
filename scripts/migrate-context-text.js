const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  console.log('Starting migration...');

  const { data: questions, error: fetchError } = await supabase
    .from('passage_questions')
    .select('id, question_text, passage_id')
    .like('question_text', '%<div class="bg-slate-100 border border-slate-200 rounded-xl p-4 mb-4%');

  if (fetchError) {
    console.error('Error fetching questions:', fetchError);
    return;
  }

  console.log(`Found ${questions.length} questions to migrate.`);

  // Group by passage_id
  const passagesToUpdate = {};
  
  for (const q of questions) {
    // Extract context text and the real question
    const match = q.question_text.match(/<div class="bg-slate-100[^>]+>(.*?)<\/div><div class="font-semibold text-slate-800">(.*?)<\/div>/s);
    if (match) {
      const contextHtml = match[1];
      const realQuestionText = match[2];

      // Update question text
      const { error: updateQError } = await supabase
        .from('passage_questions')
        .update({ question_text: realQuestionText })
        .eq('id', q.id);
        
      if (updateQError) {
        console.error(`Failed to update question ${q.id}:`, updateQError);
      } else {
        if (!passagesToUpdate[q.passage_id]) {
          passagesToUpdate[q.passage_id] = [];
        }
        passagesToUpdate[q.passage_id].push(contextHtml);
      }
    }
  }

  // Update passages
  for (const [passageId, contextHtmls] of Object.entries(passagesToUpdate)) {
    const { data: passage, error: pError } = await supabase
      .from('passages')
      .select('passage_html')
      .eq('id', passageId)
      .single();

    if (pError || !passage) {
      console.error(`Failed to fetch passage ${passageId}:`, pError);
      continue;
    }

    let newHtml = passage.passage_html || '';
    for (const contextHtml of contextHtmls) {
      newHtml += `\n<div class="bg-slate-50 border-l-4 border-indigo-500 rounded-r-2xl p-6 mt-8 mb-4 text-xl text-slate-800 shadow-sm leading-relaxed font-medium">\n  <div class="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-2">Options / Context</div>\n  ${contextHtml}\n</div>`;
    }

    const { error: updatePError } = await supabase
      .from('passages')
      .update({ passage_html: newHtml })
      .eq('id', passageId);
      
    if (updatePError) {
      console.error(`Failed to update passage ${passageId}:`, updatePError);
    } else {
      console.log(`Successfully migrated passage ${passageId}`);
    }
  }

  console.log('Migration complete.');
}

migrate();
