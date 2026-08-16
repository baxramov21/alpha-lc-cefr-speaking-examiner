import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { FINAL_SYSTEM_PROMPT, cleanJsonResponse } from '@/lib/gemini';
import { apiRateLimiter } from '@/lib/rateLimit';
import { verifyStudentSessionToken } from '@/lib/sessionToken';

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

    // Fix #3: Verify student session token before calling the paid Gemini API.
    const sessionToken = formData.get('sessionToken') as string | null;
    const session = await verifyStudentSessionToken(sessionToken);
    if (!session) {
      return NextResponse.json({ error: 'Forbidden. Valid exam session required.' }, { status: 403 });
    }

    const questionsDataStr = formData.get('questionsData') as string;
    const partialEvaluationStr = formData.get('partialEvaluation') as string;
    
    if (!questionsDataStr || !partialEvaluationStr) {
      return NextResponse.json({ error: 'Missing questionsData or partialEvaluation.' }, { status: 400 });
    }

    const questionsData: { id: string; text: string }[] = JSON.parse(questionsDataStr);
    const generativeParts: any[] = [];

    // Provide the partial evaluation JSON
    generativeParts.push(`\n--- PARTIAL EVALUATION (PARTS 1 & 2) ---\n\`\`\`json\n${partialEvaluationStr}\n\`\`\``);

    // Build the prompt dynamically with Part 3 questions and audio
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
        generativeParts.push("[No audio recorded for this question]");
      }
    }

    generativeParts.push(`\n\n${FINAL_SYSTEM_PROMPT}`);

    // Call Gemini Flash with audio files and text prompts
    const result = await model.generateContent(generativeParts);
    const response = await result.response;
    const rawText = response.text();

    const evaluationJSON = cleanJsonResponse(rawText);

    return NextResponse.json(evaluationJSON, { status: 200 });
  } catch (error: any) {
    console.error('Error evaluating final audio:', error);
    const isRateLimit = error?.message?.includes('429') || error?.message?.includes('Quota');
    return NextResponse.json(
      { error: 'Failed to evaluate final audio. An internal error occurred.' },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
