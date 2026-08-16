-- Submissions: Allow public insert, but only admin can select/update/delete
DROP POLICY IF EXISTS "Allow public select on submissions" ON public.submissions;
CREATE POLICY "Allow service role select on submissions" ON public.submissions FOR SELECT USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
CREATE POLICY "Allow service role update on submissions" ON public.submissions FOR UPDATE USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
CREATE POLICY "Allow service role delete on submissions" ON public.submissions FOR DELETE USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Passcodes: Allow public read, but only admin can insert/update/delete
DROP POLICY IF EXISTS "Allow all access for admin on passcodes" ON public.passcodes;
CREATE POLICY "Allow service role insert on passcodes" ON public.passcodes FOR INSERT WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
CREATE POLICY "Allow service role update on passcodes" ON public.passcodes FOR UPDATE USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
CREATE POLICY "Allow service role delete on passcodes" ON public.passcodes FOR DELETE USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Questions: Allow public read, but only admin can insert/update/delete
DROP POLICY IF EXISTS "Allow all access for admin on questions" ON public.questions;
CREATE POLICY "Allow service role insert on questions" ON public.questions FOR INSERT WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
CREATE POLICY "Allow service role update on questions" ON public.questions FOR UPDATE USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
CREATE POLICY "Allow service role delete on questions" ON public.questions FOR DELETE USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
