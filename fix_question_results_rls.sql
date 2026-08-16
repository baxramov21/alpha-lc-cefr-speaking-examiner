-- ====================================================
-- Finding #4 Fix: Restrict question_results SELECT policy
-- ====================================================
-- Problem: The original schema has USING (true) on the SELECT policy for
-- question_results, meaning anyone with the public anon key can read ALL
-- student transcripts and scores via the Supabase REST API.
--
-- Fix: Replace the public SELECT policy with a service_role-only policy,
-- so only admin API routes (using supabaseAdmin) can read this data.
--
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ====================================================

-- Step 1: Drop the over-permissive public SELECT policy
DROP POLICY IF EXISTS "Allow public select on question_results" ON public.question_results;
DROP POLICY IF EXISTS "Allow anon read on question_results" ON public.question_results;

-- Step 2: Create a restricted policy — service_role only
CREATE POLICY "Allow service role select on question_results"
  ON public.question_results
  FOR SELECT
  USING (
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Verify the policies are now correct:
-- SELECT schemaname, tablename, policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'question_results';
