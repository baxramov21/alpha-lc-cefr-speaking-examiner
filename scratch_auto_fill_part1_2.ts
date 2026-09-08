import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);
const unsplashKey = process.env.UNSPLASH_ACCESS_KEY!;

async function main() {
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

  // Fetch part1_2 questions added in the last 30 minutes
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

  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  for (const q of questions) {
    try {
      const prompt = `Analyze the following text and extract TWO highly contrasting or controversial visual concepts that represent the choices or sides presented in the question. Return a valid JSON array of exactly two strings, where each string is a 1-3 word search query for a stock image site like Unsplash.\n\nText: "${q.text}"\n\nExample Output: ["crowded city", "empty countryside"]`;
      
      const result = await model.generateContent(prompt);
      const rawOutput = (await result.response).text().trim();
      
      let keywordsArray: string[] = [];
      try {
        const jsonMatch = rawOutput.match(/\[[\s\S]*\]/);
        keywordsArray = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawOutput);
      } catch (e) {
        keywordsArray = [rawOutput.substring(0, 15), rawOutput.substring(15, 30)];
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
  
  console.log('Finished processing all questions.');
}

main();
