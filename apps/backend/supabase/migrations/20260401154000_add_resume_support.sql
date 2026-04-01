-- Add profile resume metadata columns and resumebucket table used by resume upload routes

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS state text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS postal_code text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS linkedin_url text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS portfolio_url text;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS education jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS certifications jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS resume_storage_path text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS resume_filename text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS resume_mime_type text;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS resume_uploaded_at timestamptz;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS resume_text text;

CREATE TABLE IF NOT EXISTS public.resumebucket (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
    storage_path text NOT NULL,
    filename text NOT NULL,
    mime_type text NOT NULL,
    file_hash text NOT NULL,
    file_size_bytes bigint NOT NULL,
    uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resumebucket_user_id ON public.resumebucket (user_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resumebucket_user_hash ON public.resumebucket (user_id, file_hash);