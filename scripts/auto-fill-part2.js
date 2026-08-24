require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

async function run() {
  console.log('Fetching Part 2 questions without images...');
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .eq('part', 'part2')
    .is('image_url', null);

  if (error) {
    console.error('Supabase error:', error);
    return;
  }

  console.log(`Found ${questions.length} questions. Starting auto-fill...`);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    console.log(`\nProcessing [${i+1}/${questions.length}]: ${q.text.substring(0, 50)}...`);

    try {
      // 1. Extract keywords
      const prompt = `Extract 1 to 3 main visual keywords from the following text to be used as a search query for a stock image site like Unsplash. Return ONLY the keywords separated by spaces. Do not use quotes or any other text.\n\nText: "${q.text}"`;
      const result = await model.generateContent(prompt);
      const keywords = (await result.response).text().trim();
      console.log(`  -> Keywords: ${keywords}`);

      // 2. Search Unsplash
      const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&per_page=1&orientation=landscape`;
      const uRes = await fetch(unsplashUrl, { headers: { 'Authorization': `Client-ID ${unsplashKey}` } });
      
      if (!uRes.ok) {
        console.error(`  -> Unsplash error: ${uRes.status}`);
        continue;
      }
      
      const uData = await uRes.json();
      if (uData.results && uData.results.length > 0) {
        const imageUrl = uData.results[0].urls.regular;
        console.log(`  -> Found image: ${imageUrl}`);
        
        // 3. Update Supabase
        const { error: updateErr } = await supabase
          .from('questions')
          .update({ image_url: imageUrl, question_type: 'image' })
          .eq('id', q.id);
          
        if (updateErr) {
          console.error(`  -> Update error:`, updateErr);
        } else {
          console.log(`  -> Successfully updated!`);
        }
      } else {
        console.log(`  -> No images found for keywords: ${keywords}`);
      }
      
    } catch (err) {
      console.error(`  -> Error processing question:`, err.message);
    }
    
    // Slight delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log('\nFinished auto-fill process.');
}

run();
