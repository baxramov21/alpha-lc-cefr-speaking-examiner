-- Create Reading Tasks Table
CREATE TABLE IF NOT EXISTS public.reading_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    part_label TEXT NOT NULL,
    pdf_url TEXT NOT NULL,
    passage_text TEXT NOT NULL,
    instructions TEXT NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.reading_tasks ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access (so students can fetch tasks during exam)
CREATE POLICY "Allow public select on reading_tasks"
    ON public.reading_tasks
    FOR SELECT
    USING (true);

-- Admin actions are handled via service_role key which bypasses RLS.
