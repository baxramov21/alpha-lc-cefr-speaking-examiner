import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getModelConfig } from '@/lib/modelHelper';

const API_KEY = process.env.GEMINI_API_KEY;

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'Missing GEMINI_API_KEY' }, { status: 500 });
    }

    const { imageBase64, questions } = await req.json();

    if (!imageBase64 || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: 'Missing imageBase64 or questions array' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(API_KEY);
    const config = await getModelConfig();
    const model = genAI.getGenerativeModel({ model: config.final_model });

    // Base64 string usually looks like "data:image/jpeg;base64,/9j/4AAQ..."
    const base64Data = imageBase64.split(',')[1] || imageBase64;

    const prompt = `
    You are an expert at visual layout analysis.
    I am providing you with an image of a page from an exam.
    I am also providing you with a list of questions that appear on this page.
    
    For each question, I need you to find the bounding box of the visual image/diagram that belongs to it. 
    Often, this is a row of images labeled A, B, C underneath the question.
    
    Questions to find:
    ${JSON.stringify(questions, null, 2)}
    
    Return a strictly formatted JSON array of objects, with NO markdown formatting, matching this schema exactly:
    [
      {
        "question_number": 6,
        "box_2d": [ymin, xmin, ymax, xmax] 
      }
    ]
    
    RULES for box_2d:
    - The coordinates MUST be normalized values between 0 and 1000 (where 0,0 is top-left and 1000,1000 is bottom-right).
    - [ymin, xmin, ymax, xmax] means: [top_y, left_x, bottom_y, right_x].
    - Make sure the bounding box tightly encompasses the image(s) for the question (e.g. the entire row of A,B,C pictures).
    - If a question does NOT have an image/diagram next to it, omit it from the array.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: 'image/jpeg'
        }
      }
    ]);

    let rawResult = result.response.text().trim();
    if (rawResult.startsWith('\`\`\`json')) {
      rawResult = rawResult.substring(7);
    }
    if (rawResult.startsWith('\`\`\`')) {
      rawResult = rawResult.substring(3);
    }
    if (rawResult.endsWith('\`\`\`')) {
      rawResult = rawResult.substring(0, rawResult.length - 3);
    }

    const parsed = JSON.parse(rawResult.trim());
    
    return NextResponse.json({ boundingBoxes: parsed });
  } catch (error: any) {
    console.error('Gemini crop error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
