-- Add pdf_url column to grammar_exams table to support PDF-mode grammar tests
ALTER TABLE public.grammar_exams 
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;
