require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Map of Question ID to their tailored Q3
const tailoredQ3 = {
  'ad0eb850-5f72-489d-90e5-efefb98590f7': 'How might the types of activities people enjoy change in the future with new technology?',
  '8bf7f5cf-d5b0-4b88-8036-6ab5c112cedb': 'How do you think our diets will evolve over the next fifty years?',
  'c85e6c0a-35fb-4d6d-bd15-e1d4b577c879': 'Do you think people will consume more fast food or healthy food in the future?',
  '721eec8a-f190-4dc8-8ded-905c1f3b6581': 'In the future, do you think more people will choose to live in cities or in the countryside?',
  'ce58a16a-08f0-4fa3-9802-67e199d39d49': 'What role do you think photography will play in our lives in the future?',
  '6714f5d3-91d5-40e1-884a-086188df9082': 'What role do you think photography will play in our lives in the future?',
  'b153232c-ff24-4e81-9f8c-7ba7e1802d8f': 'Do you think physical books will completely disappear in the future?',
  '23304dea-1f65-4481-ba98-4eabe743f5f1': 'How might virtual reality change the way we shop in the future?',
  '775b0643-cc80-467b-b083-9194e745775e': 'How do you think social media will affect face-to-face socializing in the future?',
  '7289588f-5693-429e-aedf-5d5e3430259b': 'How might the shopping experience change with new technologies in the future?',
  'f87ee08a-2871-4c93-ba4a-0694c43b6e1e': 'Do you think physical retail stores will eventually disappear?',
  '9bdfed9e-808d-4e71-965c-7f6c179bb8af': 'How do you think street markets will adapt to modern shopping trends?',
  '99225c1d-a3d8-484b-a21f-1ebe51b0df35': 'How might digital reading devices evolve in the next decade?',
  'de559797-3cd1-4e51-aa54-2988831af935': 'How do you think cities will change to accommodate future populations?',
  '08aeb4a6-e8f3-48f1-aa10-2eef51053329': 'How do you think outdoor recreational spaces will change in the future?',
  'b84f5f0b-8bc7-4d00-8242-3937584c2b1d': 'Do you think historical places will become more or less popular in the future?',
  'd31a89b6-8658-4edd-96f4-f46dc39f41aa': 'How do you think fitness and exercise routines will change with future technology?',
  '631a86ed-96d1-4529-bccd-e919e2477842': 'What kinds of transportation do you think we will use fifty years from now?',
  'b3130f37-c17b-4e4b-8774-4540a9c49acd': 'How do you think the concept of teamwork will change with remote work in the future?'
};

async function main() {
  const { data: questions, error } = await supabase
    .from('questions')
    .select('id, topic, text, table_data')
    .eq('part', 'part1_2');

  if (error) {
    console.error(error);
    return;
  }

  for (const q of questions) {
    const tableData = q.table_data || {};
    
    // Q1 is standard for part 1.2
    const q1 = 'Please describe the pictures shown on the screen and compare them.';
    
    // Q2 is the original text
    const fullText = q.text.replace(/\(Photo A:.*?Photo B:.*?\)/i, '').trim();
    const subQuestions = fullText.split('?').map(q => q.trim()).filter(q => q.length > 5).map(q => q + '?');
    const q2 = subQuestions.length > 0 ? subQuestions[0] : fullText;
    
    // Q3 is the tailored one, fallback to standard if not in map
    const q3 = tailoredQ3[q.id] || 'How do you think this situation will change in the future?';

    tableData.sub_questions = [q1, q2, q3];

    // Update in DB
    const { error: updateError } = await supabase
      .from('questions')
      .update({ table_data: tableData })
      .eq('id', q.id);
      
    if (updateError) {
      console.error(`Failed to update ${q.id}:`, updateError);
    } else {
      console.log(`Updated ${q.id} (Topic: ${q.topic}) with contextual Q3.`);
    }
  }
}

main();
