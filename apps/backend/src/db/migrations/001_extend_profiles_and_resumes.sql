-- Migration: Extend profiles table with full personal details + add resumebucket table
-- Run this SQL against your Supabase database (e.g., via Supabase SQL Editor or psql)

-- =============================================================================
-- 1. Extend profiles table with new columns
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS linkedin_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_storage_path text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_filename text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_mime_type text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_uploaded_at timestamptz;

-- =============================================================================
-- 2. Create resumebucket table for tracking uploaded resumes
-- =============================================================================
CREATE TABLE IF NOT EXISTS resumebucket (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  filename text NOT NULL,
  mime_type text NOT NULL,
  file_hash text NOT NULL,
  file_size_bytes bigint NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resumebucket_user_id ON resumebucket(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_resumebucket_user_hash ON resumebucket(user_id, file_hash);

-- =============================================================================
-- 3. Create Supabase Storage bucket for resume files
-- Run this via Supabase Dashboard > Storage > New bucket, or via the API:
--   POST /storage/v1/buckets
--   Body: { "id": "resumes", "name": "resumes", "public": false }
-- =============================================================================

-- =============================================================================
-- 4. RLS policies for resumebucket (restrict to file owner)
-- =============================================================================
ALTER TABLE resumebucket ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own resumebucket_insert"
  ON resumebucket FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE profiles.email = current_user::text));

CREATE POLICY "Users read own resumebucket"
  ON resumebucket FOR SELECT
  USING (user_id = (SELECT id FROM profiles WHERE profiles.email = current_user::text));

CREATE POLICY "Users delete own resumebucket"
  ON resumebucket FOR DELETE
  USING (user_id = (SELECT id FROM profiles WHERE profiles.email = current_user::text));

-- =============================================================================
-- 5. RLS policies for profiles (ensure users can only update own profile)
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own profile"
  ON profiles FOR SELECT
  USING (id = (SELECT id FROM profiles WHERE profiles.email = current_user::text));

CREATE POLICY "Users update own profile"
  ON profiles FOR UPDATE
  USING (id = (SELECT id FROM profiles WHERE profiles.email = current_user::text))
  WITH CHECK (id = (SELECT id FROM profiles WHERE profiles.email = current_user::text));
