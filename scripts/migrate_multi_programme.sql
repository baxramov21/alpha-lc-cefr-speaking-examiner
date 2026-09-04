-- 1. Add programme to passcodes
ALTER TABLE public.passcodes ADD COLUMN IF NOT EXISTS programme TEXT NOT NULL DEFAULT 'CEFR' 
  CHECK (programme IN ('CEFR', 'IELTS', 'GRAMMAR'));
  
-- 2. Add grammar_level to passcodes for grammar students
ALTER TABLE public.passcodes ADD COLUMN IF NOT EXISTS grammar_level TEXT 
  CHECK (grammar_level IN ('elementary', 'pre-intermediate', 'intermediate'));

-- 3. Add programme to canonical_exams for IELTS/CEFR separation
ALTER TABLE public.canonical_exams ADD COLUMN IF NOT EXISTS programme TEXT NOT NULL DEFAULT 'CEFR'
  CHECK (programme IN ('CEFR', 'IELTS', 'GRAMMAR'));

-- 4. Add programme to submissions
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS programme TEXT NOT NULL DEFAULT 'CEFR';

-- 5. Create grammar_exams table
CREATE TABLE IF NOT EXISTS public.grammar_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('elementary', 'pre-intermediate', 'intermediate')),
    time_limit INTEGER NOT NULL DEFAULT 1800,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.grammar_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on grammar_exams"
    ON public.grammar_exams FOR SELECT USING (is_active = true);

-- 6. Create grammar_questions table
CREATE TABLE IF NOT EXISTS public.grammar_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.grammar_exams(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'MULTIPLE_CHOICE' CHECK (type IN ('MULTIPLE_CHOICE', 'FILL_IN')),
    options JSONB,
    correct_answer TEXT NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.grammar_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public select on grammar_questions"
    ON public.grammar_questions FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.grammar_exams WHERE id = grammar_questions.exam_id AND is_active = true
        )
    );

-- 7. Create grammar_submissions table
CREATE TABLE IF NOT EXISTS public.grammar_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.grammar_exams(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    passcode_used TEXT NOT NULL,
    grammar_level TEXT NOT NULL,
    total_score INTEGER NOT NULL,
    max_score INTEGER NOT NULL,
    percentage NUMERIC(5, 2) NOT NULL,
    question_results JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.grammar_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public insert on grammar_submissions"
    ON public.grammar_submissions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select on grammar_submissions"
    ON public.grammar_submissions FOR SELECT USING (true);
