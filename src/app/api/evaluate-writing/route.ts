import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WRITING_EVALUATION_PROMPT, cleanJsonResponse, generateWithRetry } from '@/lib/gemini';
import { getModelConfig } from '@/lib/modelHelper';
import { apiRateLimiter } from '@/lib/rateLimit';
import { verifyStudentSessionToken } from '@/lib/sessionToken';

// Force dynamic evaluation and set maxDuration to 60s
export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');

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

    const config = await getModelConfig();
    const model = genAI.getGenerativeModel({ model: config.final_model });

    const body = await req.json();
    const { sessionToken, task1Text, task1_2Text, task2Text, task1Prompt, task1_2Prompt, task2Prompt } = body;

    const session = await verifyStudentSessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Forbidden. Valid exam session required.' }, { status: 403 });
    }

    if (!task1Text && !task1_2Text && !task2Text) {
      return NextResponse.json({ error: 'Missing writing responses.' }, { status: 400 });
    }

    const generativeParts = [
      `--- TASK 1 PROMPT ---\n${task1Prompt}\n\n--- CANDIDATE TASK 1 RESPONSE ---\n${task1Text || '[No response provided]'}`,
      `\n\n--- TASK 1.2 PROMPT ---\n${task1_2Prompt}\n\n--- CANDIDATE TASK 1.2 RESPONSE ---\n${task1_2Text || '[No response provided]'}`,
      `\n\n--- TASK 2 PROMPT ---\n${task2Prompt}\n\n--- CANDIDATE TASK 2 RESPONSE ---\n${task2Text || '[No response provided]'}`,
      `\n\n${WRITING_EVALUATION_PROMPT}`
    ];

    const result = await generateWithRetry(model, generativeParts);
    const response = await result.response;
    const rawText = response.text();

    const evaluationJSON = cleanJsonResponse(rawText);

    return NextResponse.json(evaluationJSON, { status: 200 });
  } catch (error: any) {
    console.error('Error evaluating writing output:', error);
    const isRateLimit = error?.message?.includes('429') || error?.message?.includes('Quota');
    return NextResponse.json(
      { error: 'Failed to evaluate writing output. An internal error occurred.' },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
