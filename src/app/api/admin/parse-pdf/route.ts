import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getModelConfig } from '@/lib/modelHelper';

// Dynamic import used later
import { cleanJsonResponse } from '@/lib/gemini';

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');

const PDF_PARSER_PROMPT = `
You are an expert at extracting and formatting questions from UZBMB CEFR Mock Exam PDFs.
I am providing you with the raw text extracted from a PDF.
Your task is to parse this text and return a JSON array of questions that perfectly match our database schema.

For each question found, determine its 'part':
- "part1": Personal questions or visual comparisons.
- "part2": Cue card (describe something).
- "part3": Abstract discussion or debate.

Determine realistic timing:
- Part 1: Prep 30s, Speak 120s
- Part 2: Prep 60s, Speak 120s
- Part 3: Prep 60s, Speak 120s

Return a JSON object strictly matching this format (no markdown formatting like \`\`\`json):
{
  "questions": [
    {
      "part": "part1",
      "partLabel": "Part 1 - Personal Questions",
      "text": "Extracted question text...",
      "prepSeconds": 30,
      "speakSeconds": 120
    }
  ]
}
`;

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'Gemini API key is not configured.' }, { status: 500 });
    }

    const config = await getModelConfig();
    const model = genAI.getGenerativeModel({ model: config.final_model });
    
    const formData = await req.formData();
    const file = formData.get('file') as Blob;
    
    if (!file) {
      return NextResponse.json({ error: 'Missing PDF file.' }, { status: 400 });
    }

    // Convert Blob to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const { GoogleAIFileManager } = require('@google/generative-ai/server');
    const fileManager = new GoogleAIFileManager(API_KEY || '');
    
    const os = require('os');
    const path = require('path');
    const fs = require('fs');
    
    const originalPdfName = (file as any).name || 'speaking.pdf';
    const pdfExt = originalPdfName.split('.').pop() || 'pdf';
    const pdfFileName = `task_${Date.now()}_${Math.random().toString(36).substring(7)}.${pdfExt}`;
    
    const tmpFilePath = path.join(os.tmpdir(), pdfFileName);
    fs.writeFileSync(tmpFilePath, buffer);
    
    const uploadResponse = await fileManager.uploadFile(tmpFilePath, {
      mimeType: file.type || 'application/pdf',
      displayName: pdfFileName,
    });

    // Send to Gemini
    const result = await model.generateContent([
      PDF_PARSER_PROMPT,
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri
        }
      }
    ]);
    
    fs.unlinkSync(tmpFilePath);
    try {
      await fileManager.deleteFile(uploadResponse.file.name);
    } catch (cleanupError) {
      console.error('Failed to clean up Gemini file:', cleanupError);
    }
    
    const response = await result.response;
    const rawText = response.text();
    
    const parsedJSON = cleanJsonResponse(rawText);

    return NextResponse.json(parsedJSON, { status: 200 });
  } catch (error: unknown) {
    console.error('Error parsing PDF:', error);
    return NextResponse.json(
      { error: 'Failed to parse PDF.' },
      { status: 500 }
    );
  }
}
