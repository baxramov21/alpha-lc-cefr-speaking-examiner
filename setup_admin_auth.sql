-- SQL Script: Admin Password Support
-- Please run this script in your Supabase SQL Editor to create the admin_users table

CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS (Default Deny)
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write to admin_users. No public access.
CREATE POLICY "Service Role Full Access on admin_users"
    ON public.admin_users
    FOR ALL
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
    WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
