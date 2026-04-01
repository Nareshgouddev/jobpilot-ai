-- Add applications, ATS scores, keyword mappings, and resume_text support

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS resume_text text;

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

CREATE TABLE IF NOT EXISTS public.applications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    job_id uuid NOT NULL REFERENCES public.jobs (id) ON DELETE CASCADE,
    status application_status NOT NULL DEFAULT 'not_applied',
    applied_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    notes text,
    UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_applications_user_id ON public.applications (user_id);

CREATE INDEX IF NOT EXISTS idx_applications_job_id ON public.applications (job_id);

CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications (status);

CREATE INDEX IF NOT EXISTS idx_applications_applied_at ON public.applications (applied_at DESC);

CREATE TABLE IF NOT EXISTS public.ats_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_ats_scores_user_id ON public.ats_scores (user_id);

CREATE INDEX IF NOT EXISTS idx_ats_scores_job_id ON public.ats_scores (job_id);

CREATE INDEX IF NOT EXISTS idx_ats_scores_computed_at ON public.ats_scores (computed_at DESC);

CREATE TABLE IF NOT EXISTS public.keyword_mappings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE,
    job_id uuid REFERENCES public.jobs (id) ON DELETE CASCADE,
    category text NOT NULL,
    keyword text NOT NULL,
    weight numeric(3, 2) DEFAULT 1.0,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_keyword_mappings_user_id ON public.keyword_mappings (user_id);

CREATE INDEX IF NOT EXISTS idx_keyword_mappings_job_id ON public.keyword_mappings (job_id);

CREATE INDEX IF NOT EXISTS idx_keyword_mappings_category ON public.keyword_mappings (category);