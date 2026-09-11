ALTER TABLE public.grammar_submissions
ADD COLUMN IF NOT EXISTS exam_id UUID REFERENCES public.grammar_exams(id) ON DELETE CASCADE;

NOTIFY pgrst, 'reload schema';
