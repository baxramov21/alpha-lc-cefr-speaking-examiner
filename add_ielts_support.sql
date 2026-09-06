-- Add programme column to questions table to support IELTS Speaking alongside CEFR
ALTER TABLE public.questions 
  ADD COLUMN IF NOT EXISTS programme TEXT NOT NULL DEFAULT 'CEFR'
  CHECK (programme IN ('CEFR', 'IELTS'));
