-- Migration to add Grammar Writing (Translation)

-- 1. Create Grammar Writing Exams Table
CREATE TABLE IF NOT EXISTS public.grammar_writing_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    level TEXT NOT NULL,
    source_text TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    time_limit INTEGER NOT NULL DEFAULT 1200, -- 20 minutes default
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Grammar Writing Submissions Table
CREATE TABLE IF NOT EXISTS public.grammar_writing_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.grammar_writing_exams(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    passcode_used TEXT NOT NULL,
    grammar_level TEXT,
    translated_text TEXT NOT NULL,
    score NUMERIC NOT NULL,
    ai_feedback TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Modify Grammar Triples Table to include Writing
ALTER TABLE public.grammar_triples ADD COLUMN IF NOT EXISTS writing_exam_id UUID REFERENCES public.grammar_writing_exams(id) ON DELETE SET NULL;
