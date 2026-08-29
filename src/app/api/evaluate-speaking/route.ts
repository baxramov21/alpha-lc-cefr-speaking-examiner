import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateSpeakingPrompt, cleanJsonResponse, generateWithRetry } from '@/lib/gemini';
import { apiRateLimiter } from '@/lib/rateLimit';
import { verifyStudentSessionToken } from '@/lib/sessionToken';
import { getModelConfig } from '@/lib/modelHelper';
import { sendFinalSpeakingEvaluationToTelegram } from '@/lib/telegram';

// Force dynamic evaluation and set maxDuration to 60s
export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');

export async function POST(req: NextRequest) {
  try {
    const config = await getModelConfig();
    const model = genAI.getGenerativeModel({ 
      model: config.final_model || 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.4
      }
    });
    
    console.log(`[AI Engine] Running Final Speaking Evaluator with model: ${config.final_model}`);

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

    const questionsDataStr = formData.get('questionsData') as string;
    const examMode = (formData.get('examMode') as string) || 'full';
    
    if (!questionsDataStr) {
      return NextResponse.json({ error: 'Missing questions data.' }, { status: 400 });
    }

    const questionsData: { id: string; text: string; imageUrl?: string; part?: string }[] = JSON.parse(questionsDataStr);
    const generativeParts: any[] = [];
    const audioFilesForTelegram: { buffer: Buffer; mimeType: string; groupId: string }[] = [];
    
    generativeParts.push(`\n--- SPEAKING EXAM ---\n`);

    const getGroupId = (q: any) => `${q.part}_${q.imageUrl ? 'withImage' : 'noImage'}`;
    const groupedQuestions: Record<string, typeof questionsData> = {};
    for (const q of questionsData) {
      const groupId = getGroupId(q);
      if (!groupedQuestions[groupId]) groupedQuestions[groupId] = [];
      groupedQuestions[groupId].push(q);
    }

    for (const [groupId, qs] of Object.entries(groupedQuestions)) {
      const audioField = formData.get(`audioGroup_${groupId}`);
      let buffer: Buffer | null = null;
      let mimeType = 'audio/webm';

      if (typeof audioField === 'string' && audioField.startsWith('http')) {
        const resp = await fetch(audioField);
        if (resp.ok) {
          buffer = Buffer.from(await resp.arrayBuffer());
          mimeType = resp.headers.get('content-type') || 'audio/webm';
        } else {
          console.error(`Failed to fetch audio from URL: ${audioField}`);
        }
      } else if (audioField instanceof Blob && audioField.size > 0) {
        buffer = Buffer.from(await audioField.arrayBuffer());
        mimeType = audioField.type || 'audio/webm';
      }

      // Sanitize mimeType for Gemini to prevent "invalid argument" 400 errors
      if (mimeType.includes(';')) {
        mimeType = mimeType.split(';')[0].trim();
      }
      if (!mimeType.startsWith('audio/') && !mimeType.startsWith('video/')) {
        mimeType = 'audio/webm';
      }
      
      generativeParts.push(`\n--- ${groupId.toUpperCase()} ---\n`);
      for (const q of qs) {
        generativeParts.push(`Question: "${q.text}"\n`);
      }
      generativeParts.push(`Candidate's Answer for these questions:`);
      
      if (buffer) {
        const base64Audio = buffer.toString('base64');
        
        // Collect for background dispatch later
        audioFilesForTelegram.push({
          buffer,
          mimeType,
          groupId
        });

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

    generativeParts.push(`\n\n${generateSpeakingPrompt(examMode)}`);

    const result = await generateWithRetry(model, generativeParts);
    const response = await result.response;
    const rawText = response.text();

    const evaluationJSON = cleanJsonResponse(rawText);

    // Calculate total score based on the 4 criteria
    const totalScore = Math.round(
      ((evaluationJSON.fluency_score || 0) +
       (evaluationJSON.lexical_score || 0) +
       (evaluationJSON.grammar_score || 0) +
       (evaluationJSON.pronunciation_score || 0)) / 4
    );
    evaluationJSON.total_score = totalScore;

    // Dispatch to Telegram (await to ensure it finishes before Vercel freezes the function)
    const studentName = formData.get('studentName') as string || 'Unknown Student';
    await sendFinalSpeakingEvaluationToTelegram(
      studentName,
      evaluationJSON,
      questionsData,
      audioFilesForTelegram
    ).catch(err => {
      console.error('Telegram dispatch error:', err);
      evaluationJSON.telegram_failed = true;
      evaluationJSON.telegram_error_message = err.message || 'Unknown Telegram error';
    });

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
