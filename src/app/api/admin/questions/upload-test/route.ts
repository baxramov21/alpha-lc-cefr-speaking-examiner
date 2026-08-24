import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabaseAdmin } from '@/lib/supabase';
import { getModelConfig } from '@/lib/modelHelper';
const PDFParser = require('pdf2json');
import * as cheerio from 'cheerio';

const API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: Request) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    let textContent = '';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
      textContent = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser(null, 1);
        pdfParser.on("pdfParser_dataError", (errData: any) => reject(errData.parserError));
        pdfParser.on("pdfParser_dataReady", () => {
          resolve(pdfParser.getRawTextContent());
        });
        pdfParser.parseBuffer(buffer);
      });
    } else if (file.name.toLowerCase().endsWith('.html') || file.type === 'text/html') {
      const htmlText = buffer.toString('utf-8');
      const $ = cheerio.load(htmlText);
      textContent = $('body').text() || htmlText;
    } else {
      textContent = buffer.toString('utf-8');
    }

    if (!textContent.trim()) {
      return NextResponse.json({ error: 'Could not extract text from file' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const config = await getModelConfig();
    let model = genAI.getGenerativeModel({ model: config.final_model });

    const prompt = `
    You are an expert English examiner for the UZBMB (CEFR) exam.
    I will provide you with the text extracted from a speaking exam test file.
    Extract the questions and map them to Part 1, Part 2, and Part 3 format.

    REQUIREMENTS:
    - Return ONLY a valid JSON array of objects. No markdown blocks, no other text.
    - Each object must match exactly this schema:
      {
        "part": "part1" | "part2" | "part3",
        "question_type": "standard" | "debate",
        "text": "The actual question text",
        "prep_seconds": number,
        "speak_seconds": number,
        "topic": "A short 1-3 word topic"
      }
    - For Part 1 (Short Answer): Add multiple short questions (usually 3-5). prep_seconds=10, speak_seconds=30.
    - For Part 2 (Storytelling/Cue Card): Add 1 question. prep_seconds=60, speak_seconds=120.
    - For Part 3 (Debate/Abstract): Add 1 question. prep_seconds=60, speak_seconds=120. Set question_type to "debate". 
      For Part 3 ONLY, include a "table_data" object with "forPoints" (array of strings) and "againstPoints" (array of strings) if possible, or leave empty arrays.

    TEXT TO PARSE:
    ${textContent.substring(0, 15000)}
    `;

    let result;
    let retries = 3;
    while (retries > 0) {
      try {
        result = await model.generateContent(prompt);
        break; // success
      } catch (e: any) {
        console.warn('Gemini generateContent error:', e.message);
        if (retries > 1 && (e.message?.includes('503') || e.message?.includes('429') || e.message?.includes('fetch failed'))) {
          retries--;
          if (retries === 1) {
            console.log('Falling back to gemini-2.5-flash due to 503 errors');
            model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
          }
          await new Promise(r => setTimeout(r, 4000));
        } else {
          throw e;
        }
      }
    }
    
    if (!result) throw new Error('Failed to generate content');
    
    let rawResult = result.response.text().trim();
    
    // Clean up markdown json blocks if AI hallucinates them
    if (rawResult.startsWith('\`\`\`json')) {
      rawResult = rawResult.substring(7);
    }
    if (rawResult.startsWith('\`\`\`')) {
      rawResult = rawResult.substring(3);
    }
    if (rawResult.endsWith('\`\`\`')) {
      rawResult = rawResult.substring(0, rawResult.length - 3);
    }
    rawResult = rawResult.trim();

    const extractedQuestions = JSON.parse(rawResult);
    if (!Array.isArray(extractedQuestions)) {
      throw new Error('AI did not return an array');
    }

    const questionsToInsert = extractedQuestions.map((q: any) => ({
      part: q.part || 'part1',
      question_type: q.question_type || 'standard',
      text: q.text || 'Missing text',
      prep_seconds: q.prep_seconds || 30,
      speak_seconds: q.speak_seconds || 120,
      topic: q.topic || 'General',
      is_active: true,
      ...(q.part === 'part3' && { table_data: q.table_data || { forPoints: [], againstPoints: [] } })
    }));

    // Deduplication logic
    const { data: existingQuestions } = await supabaseAdmin.from('questions').select('text');
    const existingTexts = new Set((existingQuestions || []).map(q => q.text.trim().toLowerCase().replace(/\s+/g, ' ')));

    const uniqueQuestionsToInsert = questionsToInsert.filter((q: any) => {
      const normalized = q.text.trim().toLowerCase().replace(/\s+/g, ' ');
      if (existingTexts.has(normalized)) return false;
      existingTexts.add(normalized); // Prevent duplicates within the PDF itself
      q.text = q.text.trim(); // Save trimmed text
      return true;
    });

    if (uniqueQuestionsToInsert.length > 0) {
      const { error } = await supabaseAdmin.from('questions').insert(uniqueQuestionsToInsert);
      if (error) throw error;
    }

    return NextResponse.json({ 
      message: 'Success', 
      count: uniqueQuestionsToInsert.length,
      skipped: questionsToInsert.length - uniqueQuestionsToInsert.length
    });
  } catch (error: any) {
    console.error('Upload Test Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to parse and save test' }, { status: 500 });
  }
}
