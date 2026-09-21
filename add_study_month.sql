-- Migration script to add 'study_month' to grammar tables

-- 1. Grammar Exams (JSON based exams)
ALTER TABLE IF EXISTS grammar_exams ADD COLUMN IF NOT EXISTS study_month INTEGER;

-- 2. Canonical Exams (Reading and Listening for Grammar)
ALTER TABLE IF EXISTS canonical_exams ADD COLUMN IF NOT EXISTS study_month INTEGER;

-- 3. Grammar Writing Exams
ALTER TABLE IF EXISTS grammar_writing_exams ADD COLUMN IF NOT EXISTS study_month INTEGER;

-- 4. Grammar Triples (Exam pairs/bundles)
ALTER TABLE IF EXISTS grammar_triples ADD COLUMN IF NOT EXISTS study_month INTEGER;
