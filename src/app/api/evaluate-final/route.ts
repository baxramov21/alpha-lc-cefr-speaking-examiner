import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FINAL_UZBMB_PROMPT, cleanJsonResponse, generateWithRetry } from '@/lib/gemini';
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
    
    console.log(`[AI Engine] Running Final Evaluator with model: ${config.final_model}`);
    
    const body = await req.json();
    const { sessionToken, part_evaluations } = body;

    const session = await verifyStudentSessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Forbidden. Valid exam session required.' }, { status: 403 });
    }

    if (!part_evaluations || !Array.isArray(part_evaluations) || part_evaluations.length !== 3) {
      return NextResponse.json({ error: 'Missing or invalid part_evaluations.' }, { status: 400 });
    }

    const generativeParts = [
      `Here are the part-by-part evaluations for the entire exam:\n\n${JSON.stringify(part_evaluations, null, 2)}`,
      `\n\n${FINAL_UZBMB_PROMPT}`
    ];

    const result = await generateWithRetry(model, generativeParts);
    const response = await result.response;
    const rawText = response.text();

    const evaluationJSON = cleanJsonResponse(rawText);
    
    // Merge question_responses from the part evaluations
    const allQuestionResponses = [];
    for (const part of part_evaluations) {
      if (part && part.question_responses) {
        allQuestionResponses.push(...part.question_responses);
      }
    }
    evaluationJSON.question_responses = allQuestionResponses;

    return NextResponse.json(evaluationJSON, { status: 200 });
  } catch (error: any) {
    console.error('Error evaluating final output:', error);
    const isRateLimit = error?.message?.includes('429') || error?.message?.includes('Quota');
    return NextResponse.json(
      { error: 'Failed to evaluate final output. An internal error occurred.' },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
