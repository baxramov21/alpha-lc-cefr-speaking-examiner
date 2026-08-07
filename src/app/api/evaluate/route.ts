import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SYSTEM_PROMPT, cleanJsonResponse } from '@/lib/gemini';

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');
// The user specified gemini-2.5-flash or gemini-1.5-flash.
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key is not configured.' },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob;
    const questionText = formData.get('questionText') as string;

    if (!audioFile || !questionText) {
      return NextResponse.json(
        { error: 'Missing audio file or question text.' },
        { status: 400 }
      );
    }

    // Convert Blob to Base64 for the Gemini API
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Audio = buffer.toString('base64');
    
    // Default to webm if mimeType is not provided by the blob, but we should use the blob's type
    const mimeType = audioFile.type || 'audio/webm';

    const inlineData = {
      inlineData: {
        data: base64Audio,
        mimeType: mimeType,
      },
    };

    const prompt = `
Question the student is answering:
"${questionText}"

${SYSTEM_PROMPT}
`;

    // Call Gemini Flash with audio and text prompt
    const result = await model.generateContent([inlineData, prompt]);
    const response = await result.response;
    const rawText = response.text();

    const evaluationJSON = cleanJsonResponse(rawText);

    return NextResponse.json(evaluationJSON, { status: 200 });
  } catch (error: any) {
    console.error('Error evaluating audio:', error);
    return NextResponse.json(
      { error: 'Failed to evaluate audio.', details: error.message },
      { status: 500 }
    );
  }
}
