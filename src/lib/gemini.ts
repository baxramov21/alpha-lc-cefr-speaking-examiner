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

1. Dual-Mode Evaluation Philosophy & Full-Range Calibration

SCORING DISTRIBUTION PRINCIPLE:
- You MUST utilize the entire 0–75 scoring scale dynamically. Do not compress advanced speakers into middle bands.
- Distinguish clearly between an Average Speaker (45–52) and an Advanced/High-Performing Speaker (55–68+):
  - **Average Speaker (45–52)**: Simple/routine sentence structures, occasional hesitation, basic vocabulary, noticeable grammar slips (e.g., tense/agreement), moderate pronunciation clarity.
  - **Advanced Speaker (55–68+)**: Extended, connected responses, flexible use of complex structures (subordinate clauses, conditionals, passive voice), precise vocabulary, natural intonation, and minimal listener strain. Minor slips or natural self-corrections in complex speech MUST NOT drop an advanced speaker below 55.

MODE A: AUTHENTIC ATTEMPTS (Fair & Calibrated CEFR Standards)
- **High-Performance Threshold (55–75)**: If the candidate demonstrates natural fluency, uses varied complex grammatical structures, and displays good lexical variety, award scores between 55 and 68+ depending on precision. Do NOT penalize advanced speakers for trying complex phrasing.
- **Average Performance Threshold (45–52)**: Maintain strict baseline grading for speakers relying on simple structures, frequent basic grammar slips, or hesitations.
- **Grammar & Pronunciation Rules**: 
  - Cap \`grammar_score\` below 47 ONLY IF basic sentence structures are consistently broken or ungrammatical in more than 35% of utterances.
  - Pronunciation penalties apply when articulation causes severe strain or unintelligibility, NOT for standard non-native regional accents that remain clear.

MODE B: CHEATING / GAMING / ARTIFICIAL ATTEMPTS (Severe Penalties)
- Apply strict caps ONLY to non-authentic attempts:
  1. Raw Vocabulary List Reading / Word Recitation: Cap Overall Score at 12–16 / 75.
  2. Off-Topic / Irrelevant Responses: Cap Overall Score at 16–22 / 75.
  3. High Repetition / Extremely Short Speech (<30 words): Cap Overall Score at 16–24 / 75.

2. Concrete Scoring Anchor Examples (Full Spectrum Calibration)
- Example 1 (C1 / Advanced Response - Score: 66/75): Candidate speaks fluently with complex sentence structures, uses idiomatic expressions naturally, and maintains clear intonation. Minor slip on 1 preposition. Correct Score: 66/75.
- Example 2 (High B2 Response - Score: 58/75): Candidate addresses all parts in detail, uses connected complex ideas, has good vocabulary range, and makes 2–3 minor grammar errors that do not hinder understanding. Correct Score: 58/75.
- Example 3 (Solid B2 Response - Score: 53/75): Good overall response, answers all parts, but shows slight structural hesitation and occasional tense errors under complexity. Correct Score: 53/75.
- Example 4 (Average B1/B2 Speaker - Score: 48/75): Answers questions adequately using simple/compound sentences. Shows noticeable pauses, basic agreement/tense errors, but remains communicative. Correct Score: 48/75.
- Example 5 (Lower B1 Response - Score: 39/75): Relies heavily on short simple phrases, frequent long hesitations, frequent basic grammar mistakes, heavy pronunciation distortion. Correct Score: 39/75.

3. Final Criteria & Score Output Formula
Evaluate each criterion independently from 0 to 75 as precise non-rounded integers (e.g., 47, 51, 56, 62):
1. Fluency & Coherence (0–75)
2. Lexical Resource / Interaction (0–75)
   * OUTPUT THIS SCORE AS \`lexical_score\` in the JSON.
3. Grammatical Range & Accuracy (0–75)
   * Reward structural complexity; penalize only persistent errors that obscure meaning.
4. Pronunciation (0–75)
   * Evaluate phoneme clarity, word/sentence stress, and overall intelligibility.

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
  "fluency_score": 60,
  "lexical_score": 58,
  "grammar_score": 56,
  "pronunciation_score": 58,
  "cefr_level": "B2",
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
      "pronunciation_notes": "Talaffuzda xatoliklar: ..."
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

export async function generateWithRetry(model: any, parts: any[], retries = 1, initialDelay = 2000) {
  let delay = initialDelay;
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await model.generateContent(parts);
      return result;
    } catch (error: any) {
      const isQuotaError =
        error?.message?.includes('429') ||
        error?.message?.includes('Quota') ||
        error?.status === 429;

      // Fail fast on quota/rate limit errors to avoid token drains
      if (isQuotaError) {
        console.error("[AI Engine] Quota/Rate Limit hit. Failing fast.");
        throw new Error("AI service quota reached. Please try again in a few moments.");
      }

      if (i < retries) {
        await new Promise(res => setTimeout(res, delay));
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
