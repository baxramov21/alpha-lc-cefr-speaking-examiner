import { z } from 'zod';

const questionResponseSchema = z.object({
  question_id: z.string(),
  question_text: z.string().optional(),
  transcript: z.string().optional(),
  corrected_transcript_html: z.string().optional(),
  grammar_feedback: z.string().optional(),
  pronunciation_notes: z.string().optional(),
  part_score: z.number().min(0).max(25),
});

export const evaluationSchema = z.object({
  studentName: z.string().min(1).max(200),
  groupName: z.string().min(1).max(200),
  teacherName: z.string().min(1).max(200),
  sessionToken: z.string().min(1), // signed JWT — never the raw passcode
  overallScore: z.number().min(0).max(75), // UZBMB max is 75, not 9
  overallBand: z.enum(['Below B1', 'B1', 'B2', 'C1']),
  evaluation: z.object({
    total_score: z.number().min(0).max(75),
    cefr_level: z.enum(['Below B1', 'B1', 'B2', 'C1']),
    part_scores: z.object({
      part_1: z.number().min(0).max(25),
      part_2: z.number().min(0).max(25),
      part_3: z.number().min(0).max(25),
    }),
    criteria_ratings: z.object({
      grammar_accuracy: z.string(),
      lexical_resource: z.string(),
      fluency_coherence: z.string(),
      pronunciation: z.string(),
    }),
    feedback: z.object({
      grammar: z.string(),
      vocabulary: z.string(),
      fluency: z.string(),
      pronunciation: z.string(),
    }),
    strengths: z.array(z.string()),
    areas_for_improvement: z.array(z.string()),
    question_responses: z.array(questionResponseSchema).optional(),
    transcripts: z.record(z.string(), z.string()).optional(),
  }),
});

