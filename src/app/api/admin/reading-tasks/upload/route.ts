import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase';
import { getModelConfig } from '@/lib/modelHelper';
import { cleanJsonResponse } from '@/lib/gemini';

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');

const PDF_PARSER_PROMPT = `
You are an expert at extracting and formatting questions from CEFR Mock Exam Reading PDFs.
I am providing you with the raw text extracted from a PDF.
The text contains a reading passage and several questions related to it.

Your task:
1. Extract the main reading passage (the text the students must read). Clean it up and format it well (paragraphs).
2. Extract the questions and options.
3. Return a JSON object perfectly matching this format:

{
  "partLabel": "Reading Part 1",
  "instructions": "Read the passage and answer the questions.",
  "passage_text": "The full extracted reading passage goes here...",
  "questions": [
    {
      "id": "r1_q1",
      "number": 1,
      "text": "What is the main idea of the first paragraph?",
      "type": "multiple_choice",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B"
    },
    {
      "id": "r1_q2",
      "number": 2,
      "text": "According to the author, the primary reason for...",
      "type": "fill_in_blank",
      "correctAnswer": "economic growth"
    }
  ]
}
`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const pdfFile = formData.get('pdf') as Blob;
    
    if (!pdfFile) {
      return NextResponse.json({ error: 'Missing PDF file.' }, { status: 400 });
    }

    // 1. Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.find(b => b.name === 'reading-assets')) {
      await supabaseAdmin.storage.createBucket('reading-assets', { public: true });
    }

    // 2. Upload PDF File
    const arrayBufferPdf = await pdfFile.arrayBuffer();
    const bufferPdf = Buffer.from(arrayBufferPdf);
    
    const originalName = (pdfFile as any).name || 'reading.pdf';
    const ext = originalName.split('.').pop() || 'pdf';
    const fileName = `task_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('reading-assets')
      .upload(fileName, bufferPdf, {
        contentType: pdfFile.type || 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('reading-assets')
      .getPublicUrl(fileName);
      
    const pdfUrl = publicUrlData.publicUrl;

    // 3. Parse PDF with pdf-parse and Gemini
    const pdf = require('pdf-parse');
    const pdfData = await pdf(bufferPdf);
    const textContent = pdfData.text;

    const config = await getModelConfig();
    const model = genAI.getGenerativeModel({ model: config.final_model });
    
    const result = await model.generateContent([
      PDF_PARSER_PROMPT,
      `--- RAW PDF TEXT ---\n${textContent}`
    ]);
    
    const rawText = await result.response.text();
    const parsedJSON = cleanJsonResponse(rawText);

    // 4. Save to reading_tasks table
    const taskRecord = {
      part_label: parsedJSON.partLabel || 'Reading Part',
      pdf_url: pdfUrl,
      passage_text: parsedJSON.passage_text || '',
      instructions: parsedJSON.instructions || 'Read the passage and answer the questions.',
      questions: parsedJSON.questions || []
    };

    const { data: insertData, error: dbError } = await supabaseAdmin
      .from('reading_tasks')
      .insert([taskRecord])
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to save into database: ${dbError.message}`);
    }

    return NextResponse.json({ success: true, task: insertData }, { status: 200 });
  } catch (error: any) {
    console.error('Error in reading upload:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process reading task upload.' },
      { status: 500 }
    );
  }
}
