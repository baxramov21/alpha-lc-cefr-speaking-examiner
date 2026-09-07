import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { verifyStudentSessionToken } from '@/lib/sessionToken';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.headers.get('Authorization')?.replace('Bearer ', '');
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Missing session token' }, { status: 401 });
    }

    const session = await verifyStudentSessionToken(sessionToken);
    if (!session || session.programme !== 'GRAMMAR') {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 403 });
    }

    const { examId, translatedText } = await req.json();

    if (!examId || !translatedText) {
      return NextResponse.json({ error: 'Missing examId or translated text' }, { status: 400 });
    }

    // 1. Fetch source text from DB
    const { data: exam, error: examError } = await supabaseAdmin
      .from('grammar_writing_exams')
      .select('source_text, level')
      .eq('id', examId)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: 'Failed to fetch exam source text' }, { status: 500 });
    }

    // 2. Evaluate using Gemini
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });

    const prompt = `
Role: You are an expert CEFR English-Uzbek Language Evaluator.
Task: Evaluate the student's translation of the provided source text.

Level: ${exam.level}

Source Text:
"""
${exam.source_text}
"""

Student's Translation:
"""
${translatedText}
"""

Instructions:
1. Assess the translation for accuracy, grammatical correctness, and appropriate vocabulary choices.
2. Provide a score out of 100.
3. Provide detailed feedback IN UZBEK explaining any mistakes and suggesting better ways to translate challenging phrases.

CRITICAL: You MUST respond ONLY with a valid JSON object. No markdown.
{
  "score": 85,
  "ai_feedback": "Uzbek language feedback here..."
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    let evaluationData;

    try {
      evaluationData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', responseText);
      return NextResponse.json({ error: 'AI Evaluation failed format' }, { status: 500 });
    }

    // 3. Save to grammar_writing_submissions
    const { data: submission, error: subError } = await supabaseAdmin
      .from('grammar_writing_submissions')
      .insert({
        exam_id: examId,
        student_name: session.fullName,
        group_name: session.groupName,
        teacher_name: session.teacherName,
        passcode_used: session.passcode,
        grammar_level: session.grammarLevel || 'intermediate',
        translated_text: translatedText,
        score: evaluationData.score,
        ai_feedback: evaluationData.ai_feedback
      })
      .select('id')
      .single();

    if (subError) {
      console.error('Failed to save writing submission:', subError);
      return NextResponse.json({ error: 'Failed to save submission' }, { status: 500 });
    }

    // 4. Return results
    return NextResponse.json({
      success: true,
      submissionId: submission.id,
      score: evaluationData.score,
      ai_feedback: evaluationData.ai_feedback
    }, { status: 200 });

  } catch (error: any) {
    console.error('API /student/grammar-writing/submit error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
