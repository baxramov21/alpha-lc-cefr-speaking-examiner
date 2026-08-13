import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PARTIAL_SYSTEM_PROMPT, cleanJsonResponse } from '@/lib/gemini';

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 });
    }

    const formData = await req.formData();
    const questionsDataStr = formData.get('questionsData') as string;
    
    if (!questionsDataStr) {
      return NextResponse.json({ error: 'Missing questionsData.' }, { status: 400 });
    }

    const questionsData: { id: string; text: string }[] = JSON.parse(questionsDataStr);
    const generativeParts: any[] = [];

    // Build the prompt dynamically with all questions and their corresponding audio
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

    generativeParts.push(`\n\n${PARTIAL_SYSTEM_PROMPT}`);

    // Call Gemini Flash with all audio files and text prompts
    const result = await model.generateContent(generativeParts);
    const response = await result.response;
    const rawText = response.text();

    const evaluationJSON = cleanJsonResponse(rawText);

    return NextResponse.json(evaluationJSON, { status: 200 });
  } catch (error: any) {
    console.error('Error evaluating partial audio:', error);
    const isRateLimit = error?.message?.includes('429') || error?.message?.includes('Quota');
    return NextResponse.json(
      { error: 'Failed to evaluate partial audio.', details: error.message },
      { status: isRateLimit ? 429 : 500 }
    );
  }
}
