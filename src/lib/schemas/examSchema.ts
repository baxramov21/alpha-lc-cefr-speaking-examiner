import { z } from 'zod';

export const QuestionSchema = z.object({
  question_number: z.number(),
  type: z.enum(['MULTIPLE_CHOICE', 'MATCHING', 'FILL_IN']),
  question_text: z.string().min(1, 'Question text cannot be empty'),
  context_text: z.string().nullable().optional(), // Extract or subheading text
  image_url: z.string().nullable().optional(), // Added for map/diagram questions
  options: z.array(z.string()).nullable().optional(),
  correct_answer: z.string().nullable().optional(),
});

export const ExamCanonicalSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  exam_type: z.enum(['CEFR_READING', 'CEFR_LISTENING']),
  programme: z.enum(['CEFR', 'IELTS', 'GRAMMAR']).optional(),
  grammar_level: z.enum(['beginner', 'elementary', 'pre-intermediate', 'intermediate']).optional(),
  study_month: z.number().min(1).max(6).nullable().optional(),
  time_limit: z.number().int().positive().optional(),
  prep_time: z.number().int().nonnegative().optional(),
  parts: z.array(
    z.object({
      part_number: z.number(),
      title: z.string(),
      passage_html: z.string().optional(),
      pdf_url: z.string().nullable().optional(),
      audio_urls: z.array(z.string()).nullable().optional(),
      image_url: z.string().nullable().optional(), // Added for part-level images
      questions: z.array(QuestionSchema).min(1, 'At least one question is required'),
    })
  ).min(1, 'At least one part is required'),
});

export type ExamCanonicalPayload = z.infer<typeof ExamCanonicalSchema>;
export type QuestionPayload = z.infer<typeof QuestionSchema>;

export const GrammarQuestionSchema = z.object({
  question_number: z.number(),
  type: z.enum(['MULTIPLE_CHOICE', 'FILL_IN']),
  question_text: z.string().min(1, 'Question text cannot be empty'),
  options: z.array(z.string()).nullable().optional(),
  correct_answer: z.string().min(1, 'Correct answer cannot be empty'),
  explanation: z.string().nullable().optional(),
  points: z.number().optional().default(1),
});

export const GrammarExamSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  level: z.enum(['beginner', 'elementary', 'pre-intermediate', 'intermediate']),
  study_month: z.number().min(1).max(6).nullable().optional(),
  time_limit: z.number().int().positive().optional().default(1800),
  is_fill_in_only: z.boolean().optional().default(false),
  questions: z.array(GrammarQuestionSchema).min(1, 'At least one question is required'),
});

export type GrammarExamPayload = z.infer<typeof GrammarExamSchema>;
export type GrammarQuestionPayload = z.infer<typeof GrammarQuestionSchema>;

export const GrammarPdfExamSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty'),
  level: z.enum(['beginner', 'elementary', 'pre-intermediate', 'intermediate']),
  study_month: z.number().min(1).max(6).nullable().optional(),
  time_limit: z.number().int().positive().optional().default(1800),
  is_fill_in_only: z.boolean().optional().default(false),
  pdf_url: z.string().optional(),
  answers: z.record(
    z.string(), // question_number (e.g. "1")
    z.object({
      correct_answer: z.string().min(1, 'Answer cannot be empty'),
      type: z.enum(['MULTIPLE_CHOICE', 'FILL_IN']).optional().default('MULTIPLE_CHOICE')
    })
  )
});

export type GrammarPdfExamPayload = z.infer<typeof GrammarPdfExamSchema>;
