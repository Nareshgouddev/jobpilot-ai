-- Migration: Applications, ATS scores, keyword mappings, and resume text extraction
-- Run this SQL against your Supabase database

-- =============================================================================
-- 1. Add resume_text column to profiles table for PDF text extraction
-- =============================================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_text text;

-- =============================================================================
-- 2. Create application_status enum type
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE application_status AS ENUM (
    'not_applied',
    'applied',
    'phone_screen',
    'technical',
    'final_round',
    'offer',
    'rejected',
    'withdrawn'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- =============================================================================
-- 3. Create applications table (one record per user-job pair)
-- =============================================================================
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'not_applied',
  applied_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  UNIQUE(user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON applications(applied_at DESC);

-- =============================================================================
-- 4. Create ats_scores table (audit trail of all score computations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS ats_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  profile_snapshot jsonb NOT NULL,
  overall_score numeric(5,2) NOT NULL,
  required_skills_score numeric(5,2) NOT NULL,
  preferred_skills_score numeric(5,2) NOT NULL,
  soft_skills_score numeric(5,2) NOT NULL,
  domain_terms_score numeric(5,2) NOT NULL,
  matched_required_skills text[] NOT NULL DEFAULT '{}',
  unmatched_required_skills text[] NOT NULL DEFAULT '{}',
  matched_preferred_skills text[] NOT NULL DEFAULT '{}',
  unmatched_preferred_skills text[] NOT NULL DEFAULT '{}',
  matched_soft_skills text[] NOT NULL DEFAULT '{}',
  matched_domain_terms text[] NOT NULL DEFAULT '{}',
  computed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ats_scores_user_id ON ats_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_ats_scores_job_id ON ats_scores(job_id);
CREATE INDEX IF NOT EXISTS idx_ats_scores_computed_at ON ats_scores(computed_at DESC);

-- =============================================================================
-- 5. Create keyword_mappings table (reusable templates per job)
-- =============================================================================
CREATE TABLE IF NOT EXISTS keyword_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE,
  category text NOT NULL,
  keyword text NOT NULL,
  weight numeric(3,2) DEFAULT 1.0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_keyword_mappings_user_id ON keyword_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_keyword_mappings_job_id ON keyword_mappings(job_id);
CREATE INDEX IF NOT EXISTS idx_keyword_mappings_category ON keyword_mappings(category);

-- =============================================================================
-- 6. RLS policies for applications
-- =============================================================================
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own applications"
  ON applications FOR ALL
  USING (user_id = (SELECT id FROM profiles WHERE profiles.email = current_user::text))
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE profiles.email = current_user::text));

-- =============================================================================
-- 7. RLS policies for ats_scores
-- =============================================================================
ALTER TABLE ats_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own ats_scores"
  ON ats_scores FOR SELECT
  USING (user_id = (SELECT id FROM profiles WHERE profiles.email = current_user::text));

CREATE POLICY "Users insert own ats_scores"
  ON ats_scores FOR INSERT
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE profiles.email = current_user::text));

-- =============================================================================
-- 8. RLS policies for keyword_mappings
-- =============================================================================
ALTER TABLE keyword_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own keyword_mappings"
  ON keyword_mappings FOR ALL
  USING (user_id = (SELECT id FROM profiles WHERE profiles.email = current_user::text))
  WITH CHECK (user_id = (SELECT id FROM profiles WHERE profiles.email = current_user::text));
