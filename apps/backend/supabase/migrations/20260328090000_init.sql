create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null,
  skills text[] not null default '{}',
  experience_summary text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  company text not null,
  location text not null,
  description text not null,
  employment_type text not null,
  source_url text,
  contact_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint jobs_user_source_unique unique (user_id, source_url)
);

create table if not exists public.generations (
    id uuid primary key default gen_random_uuid (),
    job_id uuid not null references public.jobs (id) on delete cascade,
    user_id uuid not null references public.profiles (id) on delete cascade,
    tone text not null check (
        tone in (
            'formal',
            'concise',
            'friendly'
        )
    ),
    prompt text not null,
    output_text text not null,
    provider text not null,
    model text not null,
    tokens_input integer,
    tokens_output integer,
    created_at timestamptz not null default now()
);

create index if not exists idx_jobs_user_id_created_at on public.jobs (user_id, created_at desc);

create index if not exists idx_generations_job_id_created_at on public.generations (job_id, created_at desc);

create index if not exists idx_generations_user_id_created_at on public.generations (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists trg_jobs_updated_at on public.jobs;

create trigger trg_jobs_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

alter table public.jobs enable row level security;

alter table public.generations enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;

create policy "profiles_select_own" on public.profiles for
select using (auth.uid () = id);

drop policy if exists "profiles_update_own" on public.profiles;

create policy "profiles_update_own" on public.profiles for
update using (auth.uid () = id)
with
    check (auth.uid () = id);

drop policy if exists "jobs_select_own" on public.jobs;

create policy "jobs_select_own" on public.jobs for
select using (auth.uid () = user_id);

drop policy if exists "jobs_modify_own" on public.jobs;

create policy "jobs_modify_own" on public.jobs for all using (auth.uid () = user_id)
with
    check (auth.uid () = user_id);

drop policy if exists "generations_select_own" on public.generations;

create policy "generations_select_own" on public.generations for
select using (auth.uid () = user_id);

drop policy if exists "generations_insert_own" on public.generations;

create policy "generations_insert_own" on public.generations for
insert
with
  check (auth.uid () = user_id);