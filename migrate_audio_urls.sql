-- Migration script to convert single audio_url to audio_urls JSONB array

-- 1. Add the new audio_urls column
ALTER TABLE public.passages ADD COLUMN audio_urls JSONB;

-- 2. Migrate existing data if any exists (wrap the string in a JSON array)
UPDATE public.passages 
SET audio_urls = jsonb_build_array(audio_url)
WHERE audio_url IS NOT NULL;

-- 3. Drop the old column
ALTER TABLE public.passages DROP COLUMN audio_url;
