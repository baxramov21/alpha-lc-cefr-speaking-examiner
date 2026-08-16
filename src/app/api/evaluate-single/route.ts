import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SINGLE_QUESTION_PROMPT, cleanJsonResponse } from '@/lib/gemini';
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

    const formData = await req.formData();

    const sessionToken = formData.get('sessionToken') as string | null;
    const session = await verifyStudentSessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Forbidden. Valid exam session required.' }, { status: 403 });
    }

    const questionId = formData.get('questionId') as string;
    const questionText = formData.get('questionText') as string;
    const audioFile = formData.get('audio') as Blob;
    
    if (!questionId || !questionText) {
      return NextResponse.json({ error: 'Missing question metadata.' }, { status: 400 });
    }

    const generativeParts: any[] = [];
    generativeParts.push(`\n--- QUESTION ${questionId.toUpperCase()} ---\nQuestion text: "${questionText}"\nCandidate's Answer:`);
    
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
      generativeParts.push("[No audio recorded for this question]");
    }

    generativeParts.push(`\n\n${SINGLE_QUESTION_PROMPT}`);

    const result = await model.generateContent(generativeParts);
    const response = await result.response;
    const rawText = response.text();

    const evaluationJSON = cleanJsonResponse(rawText);

    return NextResponse.json({ question_response: evaluationJSON }, { status: 200 });
  } catch (error: any) {
    console.error('Error evaluating single audio:', error);
    const isRateLimit = error?.message?.includes('429') || error?.message?.includes('Quota');
    return NextResponse.json(
      { error: 'Failed to evaluate audio.' },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
