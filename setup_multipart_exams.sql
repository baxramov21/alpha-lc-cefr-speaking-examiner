-- 1. Create canonical_exams table
CREATE TABLE IF NOT EXISTS public.canonical_exams (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title text NOT NULL,
    exam_type text NOT NULL,
    time_limit integer DEFAULT 3600,
    prep_time integer DEFAULT 300,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add exam_id and part_number to passages table
ALTER TABLE public.passages 
ADD COLUMN IF NOT EXISTS exam_id uuid REFERENCES public.canonical_exams(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS part_number integer DEFAULT 1;

-- 3. We should migrate existing passages if any exist to have a parent exam. 
-- For each existing passage without an exam_id, we can create a dummy exam and link it.
DO $$
DECLARE
    rec RECORD;
    new_exam_id uuid;
BEGIN
    FOR rec IN SELECT id, title, exam_type, time_limit, prep_time, created_at FROM public.passages WHERE exam_id IS NULL
    LOOP
        INSERT INTO public.canonical_exams (title, exam_type, time_limit, prep_time, created_at)
        VALUES (rec.title, rec.exam_type, rec.time_limit, rec.prep_time, rec.created_at)
        RETURNING id INTO new_exam_id;
        
        UPDATE public.passages
        SET exam_id = new_exam_id, part_number = 1
        WHERE id = rec.id;
    END LOOP;
END $$;

-- 4. Add is_active flag
ALTER TABLE public.canonical_exams ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT false;

-- 5. Migrate Part 1 image questions to Part 1.2
UPDATE public.questions SET part = 'part1_2' WHERE part = 'part1' AND question_type = 'image';

-- 6. Part Timings Configuration
CREATE TABLE IF NOT EXISTS public.part_timings (
    part text PRIMARY KEY,
    prep_seconds integer NOT NULL,
    speak_seconds integer NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.part_timings (part, prep_seconds, speak_seconds) VALUES
('part1', 30, 120),
('part1_2', 30, 120),
('part2', 60, 120),
('part3', 30, 120)
ON CONFLICT (part) DO NOTHING;
