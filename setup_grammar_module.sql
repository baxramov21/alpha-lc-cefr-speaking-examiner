-- 9. Grammar Exams
CREATE TABLE IF NOT EXISTS public.grammar_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    level TEXT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    time_limit INTEGER NOT NULL DEFAULT 2400,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. Grammar Questions
CREATE TABLE IF NOT EXISTS public.grammar_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES public.grammar_exams(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    question_text TEXT NOT NULL,
    type TEXT NOT NULL,
    correct_answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 11. Grammar Triples (For bundled Grammar tests)
CREATE TABLE IF NOT EXISTS public.grammar_triples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    level TEXT NOT NULL,
    reading_exam_id UUID REFERENCES public.canonical_exams(id) ON DELETE SET NULL,
    listening_exam_id UUID REFERENCES public.canonical_exams(id) ON DELETE SET NULL,
    grammar_exam_id UUID REFERENCES public.grammar_exams(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
