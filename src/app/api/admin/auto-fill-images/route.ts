import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Supabase with Service Role to bypass RLS for admin tasks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');
const unsplashKey = process.env.UNSPLASH_ACCESS_KEY;

export async function POST(req: NextRequest) {
  try {
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No question IDs provided' }, { status: 400 });
    }

    if (!apiKey) return NextResponse.json({ error: 'Gemini API key is missing' }, { status: 500 });
    if (!unsplashKey) return NextResponse.json({ error: 'Unsplash API key is missing' }, { status: 500 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Fetch the target questions
    const { data: questions, error: fetchErr } = await supabase
      .from('questions')
      .select('*')
      .in('id', ids);

    if (fetchErr) {
      console.error('Supabase fetch error:', fetchErr);
      return NextResponse.json({ error: 'Database fetch error' }, { status: 500 });
    }

    if (!questions || questions.length === 0) {
      return NextResponse.json({ message: 'No questions needed updating' }, { status: 200 });
    }

    // Process each question
    // Note: We await sequentially to avoid rate-limiting Gemini and Unsplash, 
    // but since this is a Serverless function, we should be mindful of timeouts (60s).
    // In Next.js App Router, edge functions or serverless functions might timeout if too many are processed.
    let updatedCount = 0;

    for (const q of questions) {
      try {
        const isDual = q.part === 'part1';
        
        let prompt = '';
        if (isDual) {
          prompt = `Analyze the following text and extract TWO contrasting or complementary visual concepts that represent the choices or sides presented in the question. Return a valid JSON array of exactly two strings, where each string is a 1-3 word search query for a stock image site like Unsplash.\n\nText: "${q.text}"\n\nExample Output: ["bustling city", "peaceful countryside"]`;
        } else {
          prompt = `Extract 1 to 3 main visual keywords from the following text to be used as a search query for a stock image site like Unsplash. Return ONLY the keywords separated by spaces. Do not use quotes or any other text.\n\nText: "${q.text}"`;
        }
        
        const result = await model.generateContent(prompt);
        const rawOutput = (await result.response).text().trim();
        
        if (isDual) {
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
              if (!updateErr) updatedCount++;
            }
          }
        } else {
          // Standard single image logic
          const keywords = rawOutput;
          if (!keywords) continue;

          const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keywords)}&per_page=1&orientation=landscape`;
          const uRes = await fetch(unsplashUrl, { headers: { 'Authorization': `Client-ID ${unsplashKey}` } });
          if (!uRes.ok) continue;
          
          const uData = await uRes.json();
          if (uData.results && uData.results.length > 0) {
            const imageUrl = uData.results[0].urls.regular;
            const { error: updateErr } = await supabase
              .from('questions')
              .update({ image_url: imageUrl, question_type: 'image' })
              .eq('id', q.id);
              
            if (!updateErr) updatedCount++;
          }
        }
      } catch (err) {
        console.error(`Error processing question ${q.id}:`, err);
      }
      
      // Delay to respect rate limits
      await new Promise(r => setTimeout(r, 600));
    }

    return NextResponse.json({ message: `Successfully auto-filled ${updatedCount} images.`, updatedCount }, { status: 200 });

  } catch (error: any) {
    console.error('Error auto-filling images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
