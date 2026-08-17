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

-- Admin access is implicitly allowed via the service_role key which bypasses RLS.

-- 2. Create Submissions Table
CREATE TABLE IF NOT EXISTS public.submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    group_name TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    passcode_used TEXT NOT NULL,
    overall_score NUMERIC NOT NULL,
    overall_band TEXT NOT NULL,
    evaluation_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    admin_notes TEXT,
    is_saved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Migration command for existing databases:
-- ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS evaluation_data JSONB NOT NULL DEFAULT '{}'::jsonb;
-- ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS admin_notes TEXT;
-- ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS is_saved BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous insert for student submissions
CREATE POLICY "Allow public insert on submissions"
    ON public.submissions
    FOR INSERT
    WITH CHECK (true);

-- Admin read/update/delete is handled via service_role key which bypasses RLS.

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

-- 4. Create Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part TEXT NOT NULL, -- 'part1', 'part2', 'part3'
    question_type TEXT NOT NULL, -- 'standard', 'image', 'debate'
    text TEXT NOT NULL,
    prep_seconds INTEGER NOT NULL,
    speak_seconds INTEGER NOT NULL,
    topic TEXT,
    image_url TEXT,
    table_data JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read
CREATE POLICY "Allow public select on questions"
    ON public.questions
    FOR SELECT
    USING (is_active = true);

-- Admin actions are handled via service_role key which bypasses RLS.

-- 5. Seed initial mock passcodes (for testing)
INSERT INTO public.passcodes (code, group_name, teacher_name)
VALUES 
    ('ALPHA-2024-X1', 'IELTS Morning 9AM', 'Mr. Jenkins'),
    ('ALPHA-2024-X2', 'B2 Upper-Int', 'Ms. Sarah'),
    ('ALPHA-2024-X3', 'C1 Advanced', 'Mr. Jenkins')
ON CONFLICT (code) DO NOTHING;

-- 5. Create App Settings Table
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default model config
INSERT INTO public.app_settings (key, value) 
VALUES ('model_config', '{"part_model": "gemini-2.5-flash-lite", "final_model": "gemini-2.5-flash"}'::jsonb) 
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access
CREATE POLICY "Allow public read access on app_settings"
    ON public.app_settings
    FOR SELECT
    USING (true);

