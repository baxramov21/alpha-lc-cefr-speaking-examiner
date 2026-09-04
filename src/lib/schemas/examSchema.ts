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
  time_limit: z.number().int().positive().optional(),
  prep_time: z.number().int().nonnegative().optional(),
  parts: z.array(
    z.object({
      part_number: z.number(),
      title: z.string(),
      passage_html: z.string(),
      audio_urls: z.array(z.string()).nullable().optional(),
      image_url: z.string().nullable().optional(), // Added for part-level images
      questions: z.array(QuestionSchema).min(1, 'At least one question is required'),
    })
  ).min(1, 'At least one part is required'),
});

export type ExamCanonicalPayload = z.infer<typeof ExamCanonicalSchema>;
export type QuestionPayload = z.infer<typeof QuestionSchema>;
