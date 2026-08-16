import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AGGREGATE_SYSTEM_PROMPT, cleanJsonResponse } from '@/lib/gemini';
import { apiRateLimiter } from '@/lib/rateLimit';
import { verifyStudentSessionToken } from '@/lib/sessionToken';

// Force dynamic evaluation and set maxDuration to 60s
export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'anonymous';
    const { success } = await apiRateLimiter.limit(ip);
    
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    if (!API_KEY) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 });
    }

    const body = await req.json();
    const { sessionToken, question_responses } = body;

    const session = await verifyStudentSessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Forbidden. Valid exam session required.' }, { status: 403 });
    }

    if (!question_responses || !Array.isArray(question_responses) || question_responses.length === 0) {
      return NextResponse.json({ error: 'Missing or invalid question_responses.' }, { status: 400 });
    }

    const generativeParts = [
      `Here are the partial evaluations for all questions in the exam:\n\n${JSON.stringify(question_responses, null, 2)}`,
      `\n\n${AGGREGATE_SYSTEM_PROMPT}`
    ];

    const result = await model.generateContent(generativeParts);
    const response = await result.response;
    const rawText = response.text();

    const evaluationJSON = cleanJsonResponse(rawText);
    
    // Add the question_responses back to the final JSON so the UI has them
    evaluationJSON.question_responses = question_responses;

    return NextResponse.json(evaluationJSON, { status: 200 });
  } catch (error: any) {
    console.error('Error in aggregate evaluation:', error);
    const isRateLimit = error?.message?.includes('429') || error?.message?.includes('Quota');
    return NextResponse.json(
      { error: 'Failed to aggregate evaluation.' },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
