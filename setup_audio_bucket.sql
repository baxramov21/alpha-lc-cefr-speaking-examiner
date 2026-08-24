-- Create a public bucket for exam audio files
INSERT INTO storage.buckets (id, name, public)
VALUES ('exam-audio', 'exam-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access to the audio files
CREATE POLICY "Allow public read access to exam-audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'exam-audio');

-- Policy: Allow authenticated users to upload files to exam-audio
-- Since admins upload via service_role, this policy might not be strictly necessary for admin,
-- but good to have if you ever use a normal authenticated session to upload.
CREATE POLICY "Allow authenticated uploads to exam-audio"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'exam-audio');
