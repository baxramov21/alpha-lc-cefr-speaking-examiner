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
  overallScore: z.number().min(0).max(75), // UZBMB max is 75
  fluencyScore: z.number().min(0).max(75).optional(),
  lexicalScore: z.number().min(0).max(75).optional(),
  grammarScore: z.number().min(0).max(75).optional(),
  pronunciationScore: z.number().min(0).max(75).optional(),
  overallBand: z.enum(['Below B1', 'B1', 'B2', 'C1']),
  examType: z.enum(['speaking', 'writing']).optional().default('speaking'),
  evaluation: z.record(z.string(), z.any()), // Accommodate both speaking and writing schemas
});

