import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const unsplashKey = process.env.UNSPLASH_ACCESS_KEY!;

function extractKeywords(text: string): [string, string] | null {
  const t = text.toLowerCase().replace(/\n/g, ' ');
  
  let match = t.match(/advantages of (.*?) over (.*?)\?/);
  if (match) return [match[1].trim(), match[2].trim()];

  match = t.match(/difference between (.*?) and (.*?)\?/);
  if (match) return [match[1].trim(), match[2].trim()];

  match = t.match(/advantages of (.*?) and (.*?)\?/);
  if (match) return [match[1].trim(), match[2].trim()];

  match = t.match(/prefer (.*?) or (.*?)\?/);
  if (match) return [match[1].trim(), match[2].trim()];

  // For "advantages of studying in a library? Do you prefer to study at home or in a library?"
  if (t.includes('library') && t.includes('home')) return ['library', 'home'];
  if (t.includes('plane') && t.includes('train')) return ['plane', 'train'];
  if (t.includes('online') && t.includes('popular')) return ['online learning', 'classroom'];
  if (t.includes('men') && t.includes('women')) return ['men cooking', 'women cooking'];
  if (t.includes('zoos') && t.includes('wild')) return ['zoo', 'wild animals'];
  if (t.includes('live') && t.includes('music')) return ['live concert', 'listening to music at home'];
  if (t.includes('cold') && t.includes('weather')) return ['cold weather', 'hot weather'];
  if (t.includes('alone') && t.includes('friends')) return ['eating alone', 'eating with friends'];
  if (t.includes('running') && t.includes('chess')) return ['running', 'playing chess'];
  if (t.includes('technology') && t.includes('agriculture')) return ['modern agriculture', 'manual farming'];
  if (t.includes('playing sports') && t.includes('watching')) return ['playing sports', 'watching sports'];
  if (t.includes('video games')) return ['playing video games', 'reading a book'];
  if (t.includes('electronic map') && t.includes('map')) return ['electronic map', 'paper map'];
  if (t.includes('taxi') && t.includes('bus')) return ['taxi', 'bus'];
  if (t.includes('countryside') && t.includes('city')) return ['countryside', 'city'];
  if (t.includes('photographing') && t.includes('drawing')) return ['photographing', 'drawing'];
  if (t.includes('football') && t.includes('stadium')) return ['watching football at home', 'stadium'];
  if (t.includes('volunteering')) return ['volunteering', 'working'];
  if (t.includes('museum')) return ['museum', 'art gallery'];
  if (t.includes('shopping') && t.includes('malls')) return ['shopping mall', 'small shop'];
  if (t.includes('car free')) return ['car free street', 'traffic jam'];
  if (t.includes('party')) return ['children party', 'adult party'];
  if (t.includes('pets') && t.includes('children')) return ['pets for children', 'no pets'];
  if (t.includes('pool') && t.includes('sea')) return ['swimming pool', 'sea'];
  if (t.includes('art exhibition')) return ['art exhibition', 'museum'];
  if (t.includes('working alone') && t.includes('group')) return ['working alone', 'working in a group'];
  if (t.includes('treadmill') && t.includes('outdoors')) return ['treadmill', 'running outdoors'];
  if (t.includes('outdoor family') && t.includes('gadgets')) return ['outdoor family activities', 'using gadgets'];
  if (t.includes('gifts')) return ['giving gifts', 'receiving gifts'];
  if (t.includes('google maps') && t.includes('direction')) return ['google maps', 'asking for directions'];
  if (t.includes('doctors') && t.includes('alternative')) return ['doctor', 'alternative medicine'];
  if (t.includes('plastic') && t.includes('water')) return ['reducing plastic', 'conserving water'];
  if (t.includes('hot region') || t.includes('hot climate')) return ['hot climate', 'cold climate'];
  if (t.includes('boss')) return ['boss', 'employee'];
  if (t.includes('traffic accident')) return ['traffic accident', 'safe road'];
  if (t.includes('grandparents')) return ['grandparents teaching', 'school education'];

  return null;
}

async function main() {
  const thirtyMinsAgo = new Date(Date.now() - 40 * 60 * 1000).toISOString();

  // Fetch part1_2 questions added in the last 40 minutes
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('part', 'part1_2')
    .gte('created_at', thirtyMinsAgo);

  if (error) {
    console.error('Error fetching questions:', error);
    return;
  }

  if (!questions || questions.length === 0) {
    console.log('No part1_2 questions found in the last 30 minutes.');
    return;
  }

  console.log(`Found ${questions.length} questions. Processing...`);

  let updatedCount = 0;

  for (const q of questions) {
    try {
      let keywordsArray = extractKeywords(q.text);
      
      if (!keywordsArray) {
         console.log(`Could not extract keywords for: ${q.text.split('\n')[1]}`);
         continue;
      }

      if (keywordsArray.length >= 2) {
        const getImgUrl = async (kw: string) => {
          const uRes = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(kw)}&per_page=1&orientation=landscape`, { headers: { 'Authorization': `Client-ID ${unsplashKey}` } });
          if (!uRes.ok) return null;
          const uData = await uRes.json();
          return uData.results && uData.results.length > 0 ? uData.results[0].urls.regular : null;
        };

        const img1 = await getImgUrl(keywordsArray[0]);
        const img2 = await getImgUrl(keywordsArray[1]);

        if (img1 && img2) {
          const tableData = typeof q.table_data === 'object' && q.table_data !== null ? q.table_data : {};
          const { error: updateErr } = await supabase
            .from('questions')
            .update({ 
              image_url: img1, 
              table_data: { ...tableData, image_url_2: img2 },
              question_type: 'image' 
            })
            .eq('id', q.id);
            
          if (!updateErr) {
            console.log(`Updated question ${q.id} with images for "${keywordsArray[0]}" and "${keywordsArray[1]}"`);
            updatedCount++;
          } else {
            console.error(`Failed to update DB for ${q.id}:`, updateErr);
          }
        } else {
            console.log(`Failed to fetch images for keywords: ${keywordsArray}`);
        }
      }
    } catch (err) {
      console.error(`Error processing question ${q.id}:`, err);
    }
    
    // Delay to respect rate limits
    await new Promise(r => setTimeout(r, 600));
  }
  
  console.log(`Finished processing. Updated ${updatedCount} questions.`);
}

main();
