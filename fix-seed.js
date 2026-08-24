import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) dotenv.config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const imageQuestions = [
  { part: 'part2', question_type: 'image', text: 'Describe a memorable journey you have taken. Where did you go and who did you go with? What happened during the trip that made it so special? How did you feel about this experience?', prep_seconds: 60, speak_seconds: 120, topic: 'A Memorable Journey', image_url: '/images/exam_samples/part2_career_path_1786650667719.png', is_active: true },
  { part: 'part2', question_type: 'image', text: 'Tell me about a critical decision you have made in your life. What factors had the highest impact on your choice? How did you feel making it, and how has this decision influenced your life today?', prep_seconds: 60, speak_seconds: 120, topic: 'An Important Decision', image_url: '/images/exam_samples/part2_environmental_impact_1786650678421.png', is_active: true },
  { part: 'part2', question_type: 'image', text: 'Describe a special gift you received that was important to you. Who gave it to you and what was the occasion? Why was this gift so meaningful, and how did you feel when you received it?', prep_seconds: 60, speak_seconds: 120, topic: 'A Special Gift', image_url: '/images/exam_samples/part2_technology_evolution_1786650690041.png', is_active: true },
  { part: 'part2', question_type: 'image', text: 'Tell me about a personal goal you successfully achieved. What challenges did you face along the way? How did you overcome them, and how did you feel when you finally reached your goal?', prep_seconds: 60, speak_seconds: 120, topic: 'A Goal Achieved', image_url: '/images/exam_samples/part2_healthy_lifestyle_1786650700681.png', is_active: true },
  { part: 'part2', question_type: 'image', text: 'Describe a person who has had a significant positive influence on your life. How did you meet them? What exactly did they do to help you, and how has their influence changed you?', prep_seconds: 60, speak_seconds: 120, topic: 'A Helpful Person', image_url: '/images/exam_samples/part2_financial_planning_1786650712694.png', is_active: true }
];

async function update() {
  // delete existing part 2 image questions
  await supabase.from('questions').delete().eq('part', 'part2').eq('question_type', 'image');
  
  const { data, error } = await supabase.from('questions').insert(imageQuestions);
  console.log('Update result:', error ? error : 'Success!');
}
update();
