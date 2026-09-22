import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { WRITING_EVALUATION_PROMPT, cleanJsonResponse, generateWithRetry } from '@/lib/gemini';
import { getModelConfig } from '@/lib/modelHelper';
import { apiRateLimiter } from '@/lib/rateLimit';
import { verifyStudentSessionToken } from '@/lib/sessionToken';

// Force dynamic evaluation and set maxDuration to 60s
export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'anonymous';
    const { success } = await apiRateLimiter.limit(ip);
    
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const config = await getModelConfig();

    if (!config.gemini_api_keys?.length && !process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: 'Gemini API keys are not configured.' }, { status: 500 });
    }

    const body = await req.json();
    const { sessionToken, task1_1Text, task1_2Text, task2Text, task1_1Prompt, task1_2Prompt, task2Prompt } = body;

    const session = await verifyStudentSessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Forbidden. Valid exam session required.' }, { status: 403 });
    }

    if (!task1_1Text && !task1_2Text && !task2Text) {
      return NextResponse.json({ error: 'Missing writing responses.' }, { status: 400 });
    }

    const generativeParts = [
      `--- TASK 1.1 PROMPT ---\n${task1_1Prompt}\n\n--- CANDIDATE TASK 1.1 RESPONSE ---\n${task1_1Text || '[No response provided]'}`,
      `\n\n--- TASK 1.2 PROMPT ---\n${task1_2Prompt}\n\n--- CANDIDATE TASK 1.2 RESPONSE ---\n${task1_2Text || '[No response provided]'}`,
      `\n\n--- TASK 2 PROMPT ---\n${task2Prompt}\n\n--- CANDIDATE TASK 2 RESPONSE ---\n${task2Text || '[No response provided]'}`,
      `\n\n${WRITING_EVALUATION_PROMPT}`
    ];

    const result = await generateWithRetry(
      config.final_model || 'gemini-1.5-flash',
      generativeParts,
      config.gemini_api_keys || []
    );
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
