import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabase';
import { ExamCanonicalSchema } from '@/lib/schemas/examSchema';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    // 1. Zod Validation
    const validationResult = ExamCanonicalSchema.safeParse(payload);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation Failed', details: validationResult.error.issues },
        { status: 400 }
      );
    }

    const data = validationResult.data;

    // 2. Persist Canonical Exam (Parent)
    const { data: examData, error: examError } = await supabase
      .from('canonical_exams')
      .insert({
        title: data.title,
        exam_type: data.exam_type,
        time_limit: data.time_limit || (data.exam_type === 'CEFR_READING' ? 3600 : 2400),
        prep_time: data.prep_time || (data.exam_type === 'CEFR_LISTENING' ? 300 : 0),
      })
      .select()
      .single();

    if (examError) {
      throw new Error(`Failed to insert canonical exam: ${examError.message}`);
    }

    const examId = examData.id;

    // 3. Loop through parts and persist
    for (const part of data.parts) {
      // Move context_text from questions to passage_html so it appears on the static left side
      let finalPassageHtml = part.passage_html || '';
      let currentContextText: string | null = null;
      
      for (const q of part.questions) {
        if (q.context_text) {
          currentContextText = q.context_text;
          finalPassageHtml += `\n<div class="bg-slate-50 border-l-4 border-indigo-500 rounded-r-2xl p-6 mt-8 mb-4 text-xl text-slate-800 shadow-sm leading-relaxed font-medium">\n  <div class="text-sm font-bold text-indigo-500 uppercase tracking-wider mb-2">Options / Context</div>\n  ${q.context_text.replace(/\n/g, '<br/>')}\n</div>`;
        }
      }

      const { data: passageData, error: passageError } = await supabase
        .from('passages')
        .insert({
          exam_id: examId,
          part_number: part.part_number,
          title: part.title,
          exam_type: data.exam_type,
          passage_html: finalPassageHtml,
          audio_urls: part.audio_urls ? JSON.stringify(part.audio_urls) : null,
        })
        .select()
        .single();

      if (passageError) {
        // We probably should rollback or cleanup but for now just throw
        throw new Error(`Failed to insert passage for part ${part.part_number}: ${passageError.message}`);
      }

      const passageId = passageData.id;

      // 4. Persist Questions for this part
      // Reset currentContextText for the actual question mapping
      currentContextText = null;
      
      const questionsToInsert = part.questions.map((q) => {
        if (q.context_text) {
          currentContextText = q.context_text;
        }

        let finalQuestionText = q.question_text;
        if (currentContextText) {
          finalQuestionText = `<div class="bg-slate-100 border border-slate-200 rounded-xl p-4 mb-4 text-sm text-slate-700 shadow-sm leading-relaxed">${currentContextText.replace(/\n/g, '<br/>')}</div><div class="font-semibold text-slate-800">${q.question_text}</div>`;
        }

        return {
          passage_id: passageId,
          question_number: q.question_number,
          type: q.type,
          question_text: finalQuestionText,
          options: q.options ? JSON.stringify(q.options) : null,
          correct_answer: q.correct_answer || "",
        };
      });

      const { error: questionsError } = await supabase
        .from('passage_questions')
        .insert(questionsToInsert);

      if (questionsError) {
        throw new Error(`Failed to insert questions for part ${part.part_number}: ${questionsError.message}`);
      }
    }

    return NextResponse.json({ success: true, examId }, { status: 200 });
  } catch (error: any) {
    console.error('Canonical Upload Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
