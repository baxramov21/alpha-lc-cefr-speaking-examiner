import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase';

const API_KEY = process.env.GEMINI_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

// POST method only — GET is cacheable and could be triggered by proxies/prefetchers
export async function POST() {
  if (!API_KEY || !SUPABASE_URL) {
    return NextResponse.json({ error: 'Missing environment variables.' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  // Fix #5: Use supabaseAdmin (service role) — the anon client would silently
  // fail delete/insert operations once RLS write-restriction policies are applied.

  try {
    // 1. Generate 40 Part 1 questions
    const p1Prompt = `
    You are an expert English examiner for the UZBMB exam.
    Generate exactly 40 short, text-based questions for Part 1 (Short Answer).
    They should cover everyday topics (hobbies, hometown, studies, future plans, routines, sports, travel).
    Return ONLY a JSON array of objects with this schema:
    [
      { "text": "Question text here?", "prep_seconds": 10, "speak_seconds": 30, "topic": "Topic Name" }
    ]
    `;
    const p1Result = await model.generateContent(p1Prompt);
    const p1Raw = p1Result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const p1Questions = JSON.parse(p1Raw).map((q: any) => ({
      part: 'part1',
      question_type: 'standard',
      text: q.text,
      prep_seconds: 10,
      speak_seconds: 30,
      topic: q.topic,
      is_active: true
    }));

    // 2. Generate 20 Part 3 questions
    const p3Prompt = `
    You are an expert English examiner.
    Generate exactly 20 complex, debate-style questions for Part 3 (Abstract Discussion).
    They should cover social issues, technology, education, environment, economics.
    Return ONLY a JSON array of objects with this schema:
    [
      { 
        "text": "Statement to debate. Discuss both sides and give your opinion.", 
        "prep_seconds": 60, 
        "speak_seconds": 120, 
        "topic": "Topic Name",
        "table_data": {
          "forPoints": ["point 1", "point 2"],
          "againstPoints": ["point 1", "point 2"]
        }
      }
    ]
    `;
    const p3Result = await model.generateContent(p3Prompt);
    const p3Raw = p3Result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const p3Questions = JSON.parse(p3Raw).map((q: any) => ({
      part: 'part3',
      question_type: 'debate',
      text: q.text,
      prep_seconds: 60,
      speak_seconds: 120,
      topic: q.topic,
      table_data: q.table_data,
      is_active: true
    }));

    // 3. Manual Image Questions (from the images we generated)
    const imageQuestions = [
      // Part 1 Image Questions (5)
      { part: 'part1', question_type: 'image', text: 'Compare these two living environments. What are the advantages of each?', prep_seconds: 30, speak_seconds: 45, topic: 'Living Environments', image_url: '/images/exam_samples/part1_city_vs_country_1786650608493.png', is_active: true },
      { part: 'part1', question_type: 'image', text: 'Compare these two ways of shopping. Which do you prefer and why?', prep_seconds: 30, speak_seconds: 45, topic: 'Shopping', image_url: '/images/exam_samples/part1_online_vs_traditional_shopping_1786650618245.png', is_active: true },
      { part: 'part1', question_type: 'image', text: 'Compare these two types of diets. How do they affect our lifestyle?', prep_seconds: 30, speak_seconds: 45, topic: 'Diet and Health', image_url: '/images/exam_samples/part1_fastfood_vs_healthy_1786650627345.png', is_active: true },
      { part: 'part1', question_type: 'image', text: 'Compare these two modes of transportation. Which is more beneficial for a city?', prep_seconds: 30, speak_seconds: 45, topic: 'Transportation', image_url: '/images/exam_samples/part1_public_transport_vs_car_1786650636823.png', is_active: true },
      { part: 'part1', question_type: 'image', text: 'Compare reading a physical book to reading on a tablet. What are the pros and cons?', prep_seconds: 30, speak_seconds: 45, topic: 'Reading Habits', image_url: '/images/exam_samples/part1_reading_book_vs_tablet_1786650645886.png', is_active: true },
      
      // Part 2 Image Questions (5)
      { part: 'part2', question_type: 'image', text: 'Look at this infographic about career paths. Describe the steps involved in achieving success and how networking plays a role.', prep_seconds: 60, speak_seconds: 120, topic: 'Career Path', image_url: '/images/exam_samples/part2_career_path_1786650667719.png', is_active: true },
      { part: 'part2', question_type: 'image', text: 'Look at this infographic comparing environmental impacts. Discuss the transition from fossil fuels to renewable energy.', prep_seconds: 60, speak_seconds: 120, topic: 'Environment', image_url: '/images/exam_samples/part2_environmental_impact_1786650678421.png', is_active: true },
      { part: 'part2', question_type: 'image', text: 'Look at this timeline of technology evolution. Discuss how communication has changed over the decades.', prep_seconds: 60, speak_seconds: 120, topic: 'Technology', image_url: '/images/exam_samples/part2_technology_evolution_1786650690041.png', is_active: true },
      { part: 'part2', question_type: 'image', text: 'Look at this infographic about a healthy lifestyle. Discuss the importance of balancing physical exercise and mental well-being.', prep_seconds: 60, speak_seconds: 120, topic: 'Health', image_url: '/images/exam_samples/part2_healthy_lifestyle_1786650700681.png', is_active: true },
      { part: 'part2', question_type: 'image', text: 'Look at this infographic on financial planning. Discuss the steps necessary to secure a stable financial future.', prep_seconds: 60, speak_seconds: 120, topic: 'Finance', image_url: '/images/exam_samples/part2_financial_planning_1786650712694.png', is_active: true }
    ];

    const allQuestions = [...p1Questions, ...p3Questions, ...imageQuestions];

    // Delete existing to avoid duplicates if run multiple times
    await supabaseAdmin.from('questions').delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    // Insert all
    const { error } = await supabaseAdmin.from('questions').insert(allQuestions);
    
    if (error) throw error;

    return NextResponse.json({ message: 'Seeded successfully', count: allQuestions.length }, { status: 200 });

  } catch (error: unknown) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed questions. Check server logs.' }, { status: 500 });
  }
}
