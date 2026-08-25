import { UzbmbEvaluation } from '@/lib/types';

export const GEMINI_MODEL = 'gemini-2.5-flash';

export function generateSpeakingPrompt(examMode: string): string {
  const modeContext = examMode === 'full'
    ? "ENTIRE speaking exam performance (Parts 1, 2, and 3)"
    : `performance for ONLY ${examMode.replace('part', 'Part ')}`;

  const missingPartsContext = examMode === 'full'
    ? ""
    : `\nNOTE: The candidate has deliberately chosen to take ONLY ${examMode.replace('part', 'Part ')}. DO NOT penalize them for missing other parts. Score their performance out of 75 based SOLELY on the recordings provided for this specific part. Extrapolate their overall CEFR level based on this part alone.\n`;

  return `
Role: You are an official human CEFR Speaking Examiner for UzBMB exams.
Your task is to evaluate a candidate's ${modeContext} based on all provided audio recordings with strict adherence to CEFR criteria.
${missingPartsContext}

1. Dual-Mode Evaluation Philosophy & Fine-Grained Precision

HIGH PRECISION SCORING MANDATE:
- DO NOT round component scores to clean numbers or multiples of 5 (e.g., avoid default rounding to 40, 45, 50, 55).
- Use exact, highly specific integer values across the entire 0–75 scale (e.g., 43, 47, 48, 51, 53, 58) to reflect subtle candidate level variations. 
- Treat 47 (B1) and 51 (B2) as distinctly different candidate performances:
  - 47/75: Noticeable grammatical hesitation, consistent minor errors, moderate pronunciation strain.
  - 51/75: Borderline B2 with clearer sentence flow, better control of basic tenses, and higher task fulfillment, despite occasional slips.

MODE A: AUTHENTIC ATTEMPTS (Strict CEFR Criterion Standards)
- Candidates must be penalized strictly for persistent grammatical inaccuracies and pronunciation distortions.
- Minor errors (e.g., missing third-person 's', article slips) are acceptable ONLY IF rare. If grammatical errors occur in more than 25% of sentences, cap \`grammar_score\` strictly below 47 (B1 level).
- Pronunciation issues causing listener strain, wrong word stress, or phoneme substitution must directly lower \`pronunciation_score\` to 37–46, regardless of how fluent or confident the candidate sounds.
- For genuine attempts that stay on-topic:
  - Standard B2 baseline range spans granularly across 48–54 / 75 (e.g., 48, 49, 51, 52, 53).
  - Reserve scores above 58 / 75 ONLY for candidates displaying exceptional grammatical precision, diverse complex structures, clear phonemes, and natural word stress.

MODE B: CHEATING / GAMING / ARTIFICIAL ATTEMPTS (Severe Penalties)
- If the candidate attempts to "cheat" or "game" the system, apply strict score caps immediately:
  1. Raw Vocabulary List Reading / Word Recitation:
     - If the candidate simply reads or recites isolated words or prompt instructions without forming natural, connected, grammatical sentences:
     - Cap Overall Score at 12–16 / 75.
  2. Off-Topic / Irrelevant Responses:
     - If the candidate speaks off-topic, recites memorized unrelated templates, or fails to address the specific prompt:
     - Cap Overall Score at 16–22 / 75.
  3. High Repetition / Extremely Short Speech:
     - If the response consists of fewer than 30 words or relies heavily on repetitive filler without answering the question:
     - Cap Overall Score at 16–24 / 75.

2. Concrete Scoring Anchor Examples (Granular Calibration)
- Example 1 (Strong B2 Response - Score: 56/75): Candidate addresses all parts directly with extended ideas, complex sentence structures, accurate tenses, and clear pronunciation. Correct Score: 56/75.
- Example 2 (Solid B2 Response - Score: 52/75): Good flow and clear vocabulary, but has 2–3 minor tense shifts and occasional stress errors. Correct Score: 52/75.
- Example 3 (Borderline B2 / High B1 Response - Score: 51/75): Answers all questions with reasonable flow, but demonstrates noticeable grammatical stiffness. Correct Score: 51/75.
- Example 4 (Moderate B1 Response - Score: 47/75): Stays on topic but makes frequent tense errors, agreement mistakes, and noticeable pronunciation distortions. Correct Score: 47/75.
- Example 5 (Lower B1 Response - Score: 39/75): Relies heavily on simple sentences with frequent long pauses and heavy accent interference. Correct Score: 39/75.

3. Final Criteria & Score Output Formula
Evaluate each criterion independently from 0 to 75 as precise non-rounded integers (Do NOT allow a high Fluency score to carry low Grammar or Pronunciation scores):
1. Fluency & Coherence (0–75)
2. Lexical Resource / Interaction (0–75)
   * OUTPUT THIS SCORE AS \`lexical_score\` in the JSON.
3. Grammatical Range & Accuracy (0–75)
   * Strictly evaluate tense accuracy, clause structure, agreement, and prepositions.
4. Pronunciation (0–75)
   * Strictly evaluate phoneme clarity, word/sentence stress, intonation, and articulation strain.

Calculate the overall score: Math.round((Fluency + Lexical + Grammar + Pronunciation) / 4).

### SCORE-TO-LEVEL MAPPING MATRIX
* 65 – 75 Points: Level C1 (Advanced)
* 51 – 64 Points: Level B2 (Upper-Intermediate)
* 38 – 50 Points: Level B1 (Intermediate)
* Below 38 Points: Level A2 or Below (Not Certified)

CRITICAL REQUIREMENT:
Generate all natural language feedback in clear, professional Uzbek (O'zbek tilida). Keep the JSON schema keys strictly in English.

Your output MUST be a valid JSON object matching the following structure exactly (NO markdown wrapping like \`\`\`json):
{
  "fluency_score": 53,
  "lexical_score": 51,
  "grammar_score": 47,
  "pronunciation_score": 48,
  "cefr_level": "B1",
  "feedback": {
    "grammar": "Gramatika va iboralar qo'llanilishi bo'yicha batafsil xulosa...",
    "interaction": "Muloqot va savolga javob berish darajasi...",
    "fluency": "Ravonlik va fikrlar bog'liqligi...",
    "pronunciation": "Talaffuz va urg'ularning to'g'riligi..."
  },
  "strengths": [
    "Qaysi qismlarda yaxshi qatnashgani haqida ma'lumot..."
  ],
  "areas_for_improvement": [
    "Grammatika va talaffuzdagi asosiy kamchiliklar..."
  ],
  "question_responses": [
    {
      "question_id": "9777c235-...",
      "question_text": "What do you spend your time with them?",
      "transcript": "Men do'stlarim bilan ...",
      "corrected_transcript_html": "Men do'stlarim bilan <b>vaqt o'tkazaman</b>...",
      "grammar_feedback": "Xato: ... To'g'ri: ...",
      "pronunciation_notes": "Talaffuzda xatoliklar: ...",
      "part_score": 11
    }
  ]
}

NEVER refuse to evaluate and NEVER return anything other than JSON.
`;
}

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

export async function generateWithRetry(model: any, parts: any[], retries = 4, initialDelay = 8000) {
  let delay = initialDelay;
  for (let i = 0; i < retries; i++) {
    try {
      const result = await model.generateContent(parts);
      return result;
    } catch (error: any) {
      const isRetryableError =
        error?.message?.includes('429') ||
        error?.message?.includes('Quota') ||
        error?.status === 429 ||
        error?.message?.includes('500') ||
        error?.message?.includes('503') ||
        error?.status === 500 ||
        error?.status === 503;

      if (isRetryableError && i < retries - 1) {
        console.warn(`[AI Engine] Gemini API error (${error?.status || 'unknown'}). Retrying in ${delay}ms... (Attempt ${i + 1} of ${retries})`);
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
Your task is to evaluate the candidate's Task 1 (Letter/Email/Report), Task 1.2 (Additional Short Prompt), and Task 2 (Essay) responses.

Return ONLY a raw JSON object matching this structure EXACTLY (no markdown block formatting):

{
  "total_score": 58,
  "cefr_level": "B2",
  "task_scores": {
    "task_1_score": 9,
    "task_1_2_score": 9,
    "task_2_score": 18
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
  "task_1_2_eval": {
    "word_count": 150,
    "corrected_text_html": "Furthermore, <span class='text-red-500 line-through'>i like</span> <span class='text-green-600 font-semibold'>[I would appreciate]</span>...",
    "feedback": "O'zbek tilida Task 1.2 bo'yicha batafsil tahlil va xatolar ko'rsatkichlari."
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
- Task 1 accounts for 25% (max 9 points).
- Task 1.2 accounts for 25% (max 9 points).
- Task 2 accounts for 50% (max 18 points).
- Convert the combined subscores (out of 36) into the standardized 0-75 points scale using the formula: (Total / 36) * 75. The "total_score" field should be out of 75.
- CEFR boundaries: 65-75 = C1, 52-64 = B2, 38-51 = B1, 0-37 = Below B1.

### INSTRUCTIONS:
- Evaluate Task Achievement (TA), Coherence & Cohesion (CC), Lexical Resource (LR), Grammatical Range & Accuracy (GRA).
- In \`corrected_text_html\`, wrap errors with \`<span class='text-red-500 line-through'>[error]</span>\` and corrections with \`<span class='text-green-600 font-semibold'>[correction]</span>\`.
- Natural language feedback MUST be generated in professional Uzbek (O'zbek tilida).
- If the text is empty or too short, score accordingly.
`;
