-- Add time configuration columns to passages table
ALTER TABLE public.passages 
ADD COLUMN IF NOT EXISTS time_limit integer DEFAULT 3600,
ADD COLUMN IF NOT EXISTS prep_time integer DEFAULT 300;

-- Optionally comment on them
COMMENT ON COLUMN public.passages.time_limit IS 'Time limit for the exam in seconds (e.g. 3600 for 1 hour)';
COMMENT ON COLUMN public.passages.prep_time IS 'Preparation time for the exam in seconds, typically used for listening parts';
