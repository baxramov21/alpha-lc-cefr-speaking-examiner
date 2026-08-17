import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase';
import { getModelConfig } from '@/lib/modelHelper';
import { cleanJsonResponse } from '@/lib/gemini';

const API_KEY = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');

const PDF_PARSER_PROMPT = `
You are an expert at extracting and formatting questions from UZBMB CEFR Mock Exam Listening PDFs.
I am providing you with the raw text extracted from a PDF.
Your task is to parse this text and return a JSON array of questions that perfectly match our database schema.

Return a JSON object strictly matching this format:
{
  "partLabel": "Part 1",
  "instructions": "Listen to the audio and answer the questions.",
  "questions": [
    {
      "id": "l1_q1",
      "number": 1,
      "text": "What is the main purpose of the visit?",
      "type": "multiple_choice",
      "options": ["To book a flight", "To complain", "To inquire", "To cancel"],
      "correctAnswer": "To inquire"
    },
    {
      "id": "l1_q2",
      "number": 2,
      "text": "The budget is primarily for...",
      "type": "fill_in_blank",
      "correctAnswer": "trees"
    }
  ]
}
`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get('audio') as Blob;
    const pdfFile = formData.get('pdf') as Blob;
    
    if (!audioFile || !pdfFile) {
      return NextResponse.json({ error: 'Missing audio or PDF file.' }, { status: 400 });
    }

    // 1. Ensure bucket exists
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (!buckets?.find(b => b.name === 'listening-assets')) {
      await supabaseAdmin.storage.createBucket('listening-assets', { public: true });
    }

    // 2. Upload Audio File
    const arrayBufferAudio = await audioFile.arrayBuffer();
    const bufferAudio = Buffer.from(arrayBufferAudio);
    
    // Original extension (mp3, wav)
    const originalName = (audioFile as any).name || 'audio.mp3';
    const ext = originalName.split('.').pop() || 'mp3';
    const fileName = `task_${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('listening-assets')
      .upload(fileName, bufferAudio, {
        contentType: audioFile.type || 'audio/mpeg',
        upsert: false
      });

    if (uploadError) {
      throw new Error(`Failed to upload audio: ${uploadError.message}`);
    }

    const { data: publicUrlData } = supabaseAdmin.storage
      .from('listening-assets')
      .getPublicUrl(fileName);
      
    const audioUrl = publicUrlData.publicUrl;

    // 3. Parse PDF with pdf-parse and Gemini
    const arrayBufferPdf = await pdfFile.arrayBuffer();
    const bufferPdf = Buffer.from(arrayBufferPdf);
    
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

    // 4. Save to listening_tasks table
    const taskRecord = {
      part_label: parsedJSON.partLabel || 'Listening Part',
      audio_url: audioUrl,
      instructions: parsedJSON.instructions || 'Listen to the audio and answer the questions.',
      questions: parsedJSON.questions || []
    };

    const { data: insertData, error: dbError } = await supabaseAdmin
      .from('listening_tasks')
      .insert([taskRecord])
      .select()
      .single();

    if (dbError) {
      throw new Error(`Failed to save into database: ${dbError.message}`);
    }

    return NextResponse.json({ success: true, task: insertData }, { status: 200 });
  } catch (error: any) {
    console.error('Error in listening upload:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process listening task upload.' },
      { status: 500 }
    );
  }
}
