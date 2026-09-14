INSERT INTO public.part_timings (part, prep_seconds, speak_seconds, updated_at)
VALUES ('part1_2_rest', 5, 30, now())
ON CONFLICT (part) DO UPDATE
SET prep_seconds = 5, speak_seconds = 30, updated_at = now();

INSERT INTO public.part_timings (part, prep_seconds, speak_seconds, updated_at)
VALUES ('part1_2_first', 30, 45, now())
ON CONFLICT (part) DO UPDATE
SET prep_seconds = 30, speak_seconds = 45, updated_at = now();
