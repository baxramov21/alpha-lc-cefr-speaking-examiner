import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || '');

export async function POST(req: NextRequest) {
  try {
    const { text, part } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is missing' }, { status: 500 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    let prompt = '';
    let isDual = part === 'part1';

    if (isDual) {
      prompt = `Analyze the following text and extract TWO contrasting or complementary visual concepts that represent the choices or sides presented in the question. Return a valid JSON array of exactly two strings, where each string is a 1-3 word search query for a stock image site like Unsplash.\n\nText: "${text}"\n\nExample Output: ["bustling city", "peaceful countryside"]`;
    } else {
      prompt = `Extract 1 to 3 main visual keywords from the following text to be used as a search query for a stock image site like Unsplash. Return ONLY the keywords separated by spaces. Do not use quotes or any other text.\n\nText: "${text}"`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const rawOutput = response.text().trim();

    if (isDual) {
      try {
        const jsonMatch = rawOutput.match(/\[[\s\S]*\]/);
        const keywordsArray = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(rawOutput);
        return NextResponse.json({ keywordsArray }, { status: 200 });
      } catch (e) {
        console.error("Failed to parse JSON from Gemini:", rawOutput);
        // Fallback to splitting if JSON parsing fails
        return NextResponse.json({ keywordsArray: [rawOutput.substring(0, 15), rawOutput.substring(15, 30)] }, { status: 200 });
      }
    } else {
      return NextResponse.json({ keywords: rawOutput }, { status: 200 });
    }

  } catch (error: any) {
    console.error('Error extracting keywords:', error);
    return NextResponse.json({ error: 'Failed to extract keywords' }, { status: 500 });
  }
}
