import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { z } from 'zod';

const createQuestionSchema = z.object({
  part: z.enum(['part1', 'part1_2', 'part2', 'part3', 'task1', 'task1_2', 'task2']),
  question_type: z.enum(['standard', 'image', 'debate']).optional().default('standard'),
  text: z.string().min(1).max(2000),
  prep_seconds: z.number().int().min(0).max(300).optional(),
  speak_seconds: z.number().int().min(0).max(600).optional(),
  topic: z.string().max(200).optional().nullable(),
  image_url: z.string().max(500).optional().nullable(),
  table_data: z.record(z.string(), z.unknown()).optional().nullable(),
  is_active: z.boolean().optional().default(true),
});

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json();
    if (!Array.isArray(raw)) {
      return NextResponse.json({ error: 'Payload must be an array of questions' }, { status: 400 });
    }

    // Fetch global part timings to use as defaults
    const { data: partTimingsData } = await supabase.from('part_timings').select('*');
    const timingsMap: Record<string, { prep_seconds: number, speak_seconds: number }> = {};
    if (partTimingsData) {
      partTimingsData.forEach(pt => {
        timingsMap[pt.part] = { prep_seconds: pt.prep_seconds, speak_seconds: pt.speak_seconds };
      });
    }

    const validQuestions = [];
    const errors = [];
    for (let item of raw) {
      // Normalize camelCase to snake_case for flexibility
      if (item.questionType) { item.question_type = item.questionType; delete item.questionType; }
      if (item.prepSeconds) { item.prep_seconds = item.prepSeconds; delete item.prepSeconds; }
      if (item.speakSeconds) { item.speak_seconds = item.speakSeconds; delete item.speakSeconds; }
      if (item.imageUrl) { item.image_url = item.imageUrl; delete item.imageUrl; }
      if (item.tableData) { item.table_data = item.tableData; delete item.tableData; }

      const parsed = createQuestionSchema.safeParse(item);
      if (parsed.success) {
        const part = parsed.data.part;
        const defaultTimings = timingsMap[part] || { prep_seconds: 30, speak_seconds: 120 };

        validQuestions.push({
          ...parsed.data,
          text: parsed.data.text.trim(),
          prep_seconds: parsed.data.prep_seconds ?? defaultTimings.prep_seconds,
          speak_seconds: parsed.data.speak_seconds ?? defaultTimings.speak_seconds,
        });
      } else {
        errors.push(parsed.error.issues);
      }
    }

    if (validQuestions.length === 0) {
      const firstErrorMsg = errors.length > 0 ? JSON.stringify(errors[0]) : "Unknown validation error";
      return NextResponse.json({ error: `Validation failed for all items. Example error on item 1: ${firstErrorMsg}` }, { status: 400 });
    }

    // Deduplication logic
    const { data: existingQuestions } = await supabase.from('questions').select('text');
    const existingTexts = new Set((existingQuestions || []).map(q => q.text.trim().toLowerCase().replace(/\s+/g, ' ')));

    const uniqueQuestionsToInsert = validQuestions.filter((q: any) => {
      const normalized = q.text.trim().toLowerCase().replace(/\s+/g, ' ');
      if (existingTexts.has(normalized)) return false;
      existingTexts.add(normalized); // Prevent duplicates within the payload itself
      return true;
    });

    const stats: Record<string, number> = {};
    if (uniqueQuestionsToInsert.length > 0) {
      const { error } = await supabase.from('questions').insert(uniqueQuestionsToInsert);
      if (error) throw error;
      
      uniqueQuestionsToInsert.forEach((q: any) => {
        stats[q.part] = (stats[q.part] || 0) + 1;
      });
    }

    return NextResponse.json({ 
      success: true, 
      count: uniqueQuestionsToInsert.length,
      skipped: validQuestions.length - uniqueQuestionsToInsert.length,
      stats
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error in bulk insert:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
