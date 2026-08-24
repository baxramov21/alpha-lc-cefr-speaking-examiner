-- Create Passages Table
CREATE TABLE IF NOT EXISTS public.passages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    exam_type TEXT NOT NULL CHECK (exam_type IN ('CEFR_READING', 'CEFR_LISTENING')),
    passage_html TEXT NOT NULL,
    audio_urls JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Questions Table
CREATE TABLE IF NOT EXISTS public.passage_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    passage_id UUID NOT NULL REFERENCES public.passages(id) ON DELETE CASCADE,
    question_number INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('MULTIPLE_CHOICE', 'MATCHING', 'FILL_IN')),
    question_text TEXT NOT NULL,
    options JSONB,
    correct_answer TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.passages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.passage_questions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (so students can fetch tasks during exam)
CREATE POLICY "Allow public select on passages"
    ON public.passages
    FOR SELECT
    USING (true);

CREATE POLICY "Allow public select on passage_questions"
    ON public.passage_questions
    FOR SELECT
    USING (true);

-- Admin actions are handled via service_role key which bypasses RLS.
