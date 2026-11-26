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

-- ---------------------------------------------------------------------------
-- Plans and daily usage (free users get a few audits per day).
-- Safe to run again on an existing database.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists plan_status text;          -- payment provider status: active, on_trial, cancelled, expired, …
alter table public.profiles add column if not exists plan_renews_at timestamptz;
alter table public.profiles add column if not exists plan_ends_at timestamptz;   -- set when a subscription is cancelled
alter table public.profiles add column if not exists billing_customer_id text;
alter table public.profiles add column if not exists billing_subscription_id text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create table if not exists public.usage_daily (
  user_id text not null references public.profiles(id) on delete cascade,
  day date not null,                       -- UTC day
  audits int not null default 0,
  analyses int not null default 0,
  chats int not null default 0,
  primary key (user_id, day)
);
alter table public.usage_daily enable row level security;

-- Atomically add 1 to a usage counter unless it would go over p_limit.
-- Returns the new count, or -1 when the limit is already reached. p_limit < 0 means no limit.
create or replace function public.consume_usage(p_user text, p_day date, p_kind text, p_limit int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count int;
begin
  if p_kind not in ('audits', 'analyses', 'chats') then
    raise exception 'unknown usage kind %', p_kind;
  end if;
  insert into usage_daily (user_id, day) values (p_user, p_day) on conflict do nothing;
  execute format('select %I from usage_daily where user_id = $1 and day = $2 for update', p_kind)
    into current_count using p_user, p_day;
  if p_limit >= 0 and current_count >= p_limit then
    return -1;
  end if;
  execute format('update usage_daily set %I = %I + 1 where user_id = $1 and day = $2', p_kind, p_kind)
    using p_user, p_day;
  return current_count + 1;
end;
$$;
revoke all on function public.consume_usage(text, date, text, int) from public, anon, authenticated;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.consume_usage(text, date, text, int) to service_role;
  end if;
end;
$$;
