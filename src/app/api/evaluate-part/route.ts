import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PART_EVALUATION_PROMPT, cleanJsonResponse, generateWithRetry } from '@/lib/gemini';
import { apiRateLimiter } from '@/lib/rateLimit';
import { verifyStudentSessionToken } from '@/lib/sessionToken';
import { getModelConfig } from '@/lib/modelHelper';

// Force dynamic evaluation and set maxDuration to 60s
export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const config = await getModelConfig();
    const model = genAI.getGenerativeModel({ model: config.part_model });
    
    console.log(`[AI Engine] Running Part Evaluator with model: ${config.part_model}`);

    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'anonymous';
    const { success } = await apiRateLimiter.limit(ip);
    
    if (!success) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    if (!API_KEY) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 });
    }

    const formData = await req.formData();

    const sessionToken = formData.get('sessionToken') as string | null;
    const session = await verifyStudentSessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Forbidden. Valid exam session required.' }, { status: 403 });
    }

    const partNumber = formData.get('part') as string;
    const questionsDataStr = formData.get('questionsData') as string;
    
    if (!partNumber || !questionsDataStr) {
      return NextResponse.json({ error: 'Missing part number or questions data.' }, { status: 400 });
    }

    const questionsData: { id: string; text: string }[] = JSON.parse(questionsDataStr);
    const generativeParts: any[] = [];
    
    generativeParts.push(`\n--- PART ${partNumber} ---\n`);

    for (const q of questionsData) {
      const audioFile = formData.get(`audio_${q.id}`) as Blob;
      
      generativeParts.push(`\n--- QUESTION ${q.id.toUpperCase()} ---\nQuestion text: "${q.text}"\nCandidate's Answer:`);
      
      if (audioFile && audioFile.size > 0) {
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');
        const mimeType = audioFile.type || 'audio/webm';
        
        generativeParts.push({
          inlineData: {
            data: base64Audio,
            mimeType: mimeType,
          },
        });
      } else {
        generativeParts.push("[No audible speech detected]");
      }
    }

    generativeParts.push(`\n\n${PART_EVALUATION_PROMPT}`);

    const result = await generateWithRetry(model, generativeParts);
    const response = await result.response;
    const rawText = response.text();

    const evaluationJSON = cleanJsonResponse(rawText);

    // Make sure 'part' is attached correctly
    evaluationJSON.part = parseInt(partNumber, 10);

    return NextResponse.json(evaluationJSON, { status: 200 });
  } catch (error: any) {
    console.error(`Error evaluating Part ${req.url}:`, error);
    const isRateLimit = error?.message?.includes('429') || error?.message?.includes('Quota');
    return NextResponse.json(
      { error: 'Failed to evaluate part. An internal error occurred.' },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
