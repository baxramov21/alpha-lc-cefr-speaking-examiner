-- add_subscores.sql
-- Run this in your Supabase SQL Editor to update the submissions table

ALTER TABLE public.submissions 
ADD COLUMN IF NOT EXISTS fluency_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS lexical_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS grammar_score NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pronunciation_score NUMERIC DEFAULT 0;
