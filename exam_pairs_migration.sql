-- Run this migration in the Supabase SQL editor
-- Creates the exam_pairs table for pairing one reading + one listening exam

CREATE TABLE IF NOT EXISTS exam_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  reading_exam_id UUID REFERENCES canonical_exams(id) ON DELETE SET NULL,
  listening_exam_id UUID REFERENCES canonical_exams(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one pair can be active at a time (students get assigned this pair)
CREATE UNIQUE INDEX IF NOT EXISTS exam_pairs_one_active ON exam_pairs (is_active) WHERE is_active = true;

-- Grant access to service role
ALTER TABLE exam_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on exam_pairs" ON exam_pairs FOR ALL USING (true) WITH CHECK (true);
