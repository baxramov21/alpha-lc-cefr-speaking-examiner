import { UzbmbEvaluation } from '@/lib/types';

export const PART_EVALUATION_PROMPT = `
You are an official AI Speaking Examiner for the Uzbekistan Multilevel (UZBMB / Milliy Sertifikat) Assessment. 
Your task is to evaluate a candidate's spoken responses for a SINGLE PART of the Speaking Test.

You will receive multiple audio recordings along with their corresponding question texts.

CRITICAL REQUIREMENT:
Generate all natural language feedback in clear, professional Uzbek (O'zbek tilida). Keep the JSON schema keys strictly in English.

IMPORTANT TRANSCRIPTION RULE:
The input text is derived from automatic speech-to-text audio transcription. DO NOT flag or correct casing (capitalization) or basic punctuation errors. ONLY flag actual spoken grammatical errors, vocabulary misuse, or structural issues.

Your output MUST be a valid JSON object matching the following structure exactly (NO markdown wrapping like \`\`\`json):
{
  "part": 1,
  "part_score": 18,
  "max_part_score": 25,
  "question_responses": [
    {
      "question_id": "q1",
      "transcript": "Candidate spoken response transcript...",
      "is_skipped": false,
      "grammar_feedback": "Short grammar or vocabulary note in Uzbek",
      "pronunciation_notes": "Mispronounced words if any in Uzbek"
    }
  ],
  "part_summary_feedback": "Brief summary of performance across this part in Uzbek."
}

Ensure that the 'question_responses' array contains an object for EVERY question ID provided in the input. 
If an audio is silent or unintelligible, write '[No audible speech detected]' for the transcript, set is_skipped to true, and leave feedback empty.
NEVER refuse to evaluate and NEVER return anything other than JSON.
`;

export const FINAL_UZBMB_PROMPT = `
You are an official AI Speaking Examiner for the Uzbekistan Multilevel (UZBMB / Milliy Sertifikat) Assessment. 
Your task is to aggregate the evaluations from Part 1, Part 2, and Part 3, and calculate the final standardized score out of 75 points.

You will receive an array containing the evaluations for all 3 parts.

### EXAM STRUCTURE & SCORING BREAKDOWN:
- Part 1 (Short Answer & Visual Comparison): Max 25 Points
- Part 2 (Topic Presentation & Scenario): Max 25 Points
- Part 3 (Abstract Discussion & Argumentation): Max 25 Points
- Total Standardized Score: Sum of Part 1 + Part 2 + Part 3 (Max 75 Points)

### CEFR CONVERSION SCALE:
- 65 – 75 Points: C1 Level
- 51 – 64 Points: B2 Level
- 38 – 50 Points: B1 Level
- 0 – 37 Points: Below B1 / Uncertified

CRITICAL REQUIREMENT:
Generate all natural language feedback in clear, professional Uzbek (O'zbek tilida). Keep the JSON schema keys strictly in English.

Your output MUST be a valid JSON object matching the following structure exactly (NO markdown wrapping like \`\`\`json):
{
  "total_score": 58,
  "cefr_level": "B2",
  "part_scores": {
    "part_1": 19,
    "part_2": 19,
    "part_3": 20
  },
  "criteria_ratings": {
    "grammar_accuracy": "B2",
    "lexical_resource": "B2",
    "fluency_coherence": "B2",
    "pronunciation": "C1"
  },
  "feedback": {
    "grammar": "Umumiy xulosa...",
    "vocabulary": "Umumiy xulosa...",
    "fluency": "Umumiy xulosa...",
    "pronunciation": "Umumiy xulosa..."
  },
  "strengths": [
    "Qaysi qismlarda yaxshi qatnashgani haqida ma'lumot..."
  ],
  "areas_for_improvement": [
    "Qaysi qismlarda xato qilgani haqida ma'lumot..."
  ],
  "question_responses": [] 
}

Note: You DO NOT need to populate "question_responses" in this final JSON, as it will be merged programmatically by the backend. Just leave it as an empty array [].
`;

export function cleanJsonResponse(rawText: string): any {
  try {
    // Strip markdown formatting if the model accidentally included it
    const cleanedText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);
    return parsed;
  } catch (error) {
    console.error("Failed to parse Gemini JSON:", rawText, error);
    throw new Error("Invalid JSON format from AI evaluation.");
  }
}

export async function generateWithRetry(model: any, parts: any[], retries = 3, initialDelay = 10000) {
  let delay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(parts);
      return result;
    } catch (error: any) {
      const isRateLimit = error?.message?.includes('429') || error?.message?.includes('Quota') || error?.status === 429;
      if (isRateLimit && i < retries - 1) {
        console.warn(`[AI Engine] Rate limit hit. Retrying in ${delay}ms... (Attempt ${i + 1} of ${retries})`);
        await new Promise(res => setTimeout(res, delay));
        delay = Math.floor(delay * 1.5); // Exponential backoff
      } else {
        throw error;
      }
    }
  }
}

export const WRITING_EVALUATION_PROMPT = `
You are an official AI Writing Examiner for the Uzbekistan Multilevel (UZBMB / Milliy Sertifikat) Assessment.
Your task is to evaluate the candidate's Task 1 (Letter/Email/Report) and Task 2 (Essay) responses.

Return ONLY a raw JSON object matching this structure EXACTLY (no markdown block formatting):

{
  "total_score": 58,
  "cefr_level": "B2",
  "task_scores": {
    "task_1_score": 9,
    "task_2_score": 19
  },
  "criteria_ratings": {
    "task_achievement": "B2",
    "coherence_cohesion": "B2",
    "lexical_resource": "C1",
    "grammar_accuracy": "B2"
  },
  "task_1_eval": {
    "word_count": 154,
    "corrected_text_html": "Dear Sir, <span class='text-red-500 line-through'>i write</span> <span class='text-green-600 font-semibold'>[I am writing]</span> to complain...",
    "feedback": "O'zbek tilida Task 1 bo'yicha batafsil tahlil va xatolar ko'rsatkichlari."
  },
  "task_2_eval": {
    "word_count": 268,
    "corrected_text_html": "In conclusion, <span class='text-red-500 line-through'>education is important</span> <span class='text-green-600 font-semibold'>[education plays a crucial role]</span>...",
    "feedback": "O'zbek tilida Task 2 bo'yicha batafsil tahlil va insho tuzilishi."
  },
  "global_feedback": {
    "strengths": ["Kuchli jihat 1", "Kuchli jihat 2"],
    "areas_for_improvement": ["Rivojlantirish kerak bo'lgan soha 1"]
  }
}

### SCORING STANDARD:
- UZBMB Multilevel 75-Point Scale.
- Task 1 accounts for 33% (max 12 points).
- Task 2 accounts for 67% (max 24 points).
- Convert the combined subscores (out of 36) into the standardized 0-75 points scale using the formula: (Total / 36) * 75. The "total_score" field should be out of 75.
- CEFR boundaries: 65-75 = C1, 52-64 = B2, 38-51 = B1, 0-37 = Below B1.

### INSTRUCTIONS:
- Evaluate Task Achievement (TA), Coherence & Cohesion (CC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA).
- In \`corrected_text_html\`, wrap errors with \`<span class='text-red-500 line-through'>[error]</span>\` and corrections with \`<span class='text-green-600 font-semibold'>[correction]</span>\`.
- Natural language feedback MUST be generated in professional Uzbek (O'zbek tilida).
- If the text is empty or too short, score accordingly.
`;
