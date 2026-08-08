-- Supabase SQL Schema for Alpha LC CEFR Speaking Examiner

-- 1. Create Passcodes Table
CREATE TABLE IF NOT EXISTS public.passcodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    group_name TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.passcodes ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access for login verification
CREATE POLICY "Allow public read access on passcodes"
    ON public.passcodes
    FOR SELECT
    USING (true);

-- Allow admin full access (Placeholder for future admin auth)
CREATE POLICY "Allow all access for admin on passcodes"
    ON public.passcodes
    FOR ALL
    USING (true);

-- 2. Create Submissions Table
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    passcode_used TEXT NOT NULL,
    overall_score NUMERIC NOT NULL,
    overall_band TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert for student submissions
CREATE POLICY "Allow public insert on submissions"
    ON public.submissions
    FOR INSERT
    WITH CHECK (true);

-- Allow public read (for admin dashboard, assuming public for now since no admin auth is set up yet)
CREATE POLICY "Allow public select on submissions"
    ON public.submissions
    FOR SELECT
    USING (true);

-- 3. Create Question Results Table
CREATE TABLE IF NOT EXISTS public.question_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES public.submissions(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    transcript TEXT NOT NULL,
    overall_score NUMERIC NOT NULL,
    cefr_band TEXT NOT NULL,
    ai_feedback TEXT NOT NULL,
    rubric_scores JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.question_results ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert
CREATE POLICY "Allow public insert on question_results"
    ON public.question_results
    FOR INSERT
    WITH CHECK (true);

-- Allow public read
CREATE POLICY "Allow public select on question_results"
    ON public.question_results
    FOR SELECT
    USING (true);

-- 4. Seed initial mock passcodes (for testing)
INSERT INTO public.passcodes (code, group_name, teacher_name)
VALUES 
    ('ALPHA-2024-X1', 'IELTS Morning 9AM', 'Mr. Jenkins'),
    ('ALPHA-2024-X2', 'B2 Upper-Int', 'Ms. Sarah'),
    ('ALPHA-2024-X3', 'C1 Advanced', 'Mr. Jenkins')
ON CONFLICT (code) DO NOTHING;
