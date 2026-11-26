-- Meta Ads AI Analyzer — Supabase schema
-- Run in the Supabase SQL editor. The API connects with the service-role key,
-- so Row Level Security is enabled with no public policies (deny by default).

create extension if not exists "pgcrypto";

-- Users are authenticated with Firebase; we store the Firebase UID.
create table if not exists public.profiles (
  id text primary key,                     -- Firebase UID
  email text,
  display_name text,
  plan text not null default 'starter' check (plan in ('starter', 'pro', 'agency')),
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  owner_id text references public.profiles(id) on delete cascade,
  file_name text not null,
  currency text,
  total_spend numeric not null default 0,
  data jsonb not null,                     -- ReportData from @maa/core
  created_at timestamptz not null default now()
);
create index if not exists reports_owner_created_idx on public.reports (owner_id, created_at desc);

-- AI analysis results. One row per generated analysis; the latest complete one is shown.
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  model text not null,
  status text not null default 'pending' check (status in ('pending', 'complete', 'failed')),
  result jsonb,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists analyses_report_idx on public.analyses (report_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.reports enable row level security;
alter table public.analyses enable row level security;
