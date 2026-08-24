import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-pro' }); // mock model

async function test() {
  try {
    const p1Prompt = `
    You are an expert English examiner for the UZBMB exam.
    Generate exactly 40 short, text-based questions for Part 1 (Short Answer).
    They should cover everyday topics (hobbies, hometown, studies, future plans, routines, sports, travel).
    Return ONLY a JSON array of objects with this schema:
    [
      { "text": "Question text here?", "prep_seconds": 10, "speak_seconds": 30, "topic": "Topic Name" }
    ]
    `;
    console.log('Fetching Gemini p1...');
    const p1Result = await model.generateContent(p1Prompt);
    const p1Raw = p1Result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const p1Questions = JSON.parse(p1Raw);
    console.log('P1 success, count:', p1Questions.length);

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
    console.log('Fetching Gemini p3...');
    const p3Result = await model.generateContent(p3Prompt);
    const p3Raw = p3Result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    const p3Questions = JSON.parse(p3Raw);
    console.log('P3 success, count:', p3Questions.length);

  } catch(e) {
    console.error('FAILED:', e.message);
  }
}
test();
