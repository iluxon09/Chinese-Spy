-- Atomic per-user Gemini usage limits for the TILT AI Risk Coach.
-- Limits: 6 requests per rolling minute and 50 requests per UTC calendar day.
-- The table has no client policies or direct grants; only the SECURITY DEFINER
-- function can read/update usage counters.

begin;

create table if not exists public.ai_coach_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  window_request_count integer not null default 0
    check (window_request_count >= 0),
  usage_date date not null,
  daily_request_count integer not null default 0
    check (daily_request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.ai_coach_rate_limits enable row level security;
revoke all on table public.ai_coach_rate_limits from public, anon, authenticated;

create or replace function public.consume_ai_coach_quota()
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
  v_today date := (v_now at time zone 'UTC')::date;
  v_window_count integer;
  v_daily_count integer;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  insert into public.ai_coach_rate_limits as usage (
    user_id,
    window_started_at,
    window_request_count,
    usage_date,
    daily_request_count,
    updated_at
  )
  values (
    v_user_id,
    v_now,
    1,
    v_today,
    1,
    v_now
  )
  on conflict (user_id) do update
  set
    window_started_at = case
      when usage.window_started_at <= v_now - interval '1 minute'
        then v_now
      else usage.window_started_at
    end,
    window_request_count = case
      when usage.window_started_at <= v_now - interval '1 minute'
        then 1
      else least(7, usage.window_request_count + 1)
    end,
    usage_date = case
      when usage.usage_date <> v_today then v_today
      else usage.usage_date
    end,
    daily_request_count = case
      when usage.usage_date <> v_today then 1
      else least(51, usage.daily_request_count + 1)
    end,
    updated_at = v_now
  returning window_request_count, daily_request_count
    into v_window_count, v_daily_count;

  return v_window_count <= 6 and v_daily_count <= 50;
end;
$$;

revoke all on function public.consume_ai_coach_quota() from public, anon;
grant execute on function public.consume_ai_coach_quota() to authenticated;

comment on table public.ai_coach_rate_limits is
  'Private per-user request counters for the Gemini-powered TILT AI Risk Coach.';
comment on function public.consume_ai_coach_quota() is
  'Atomically allows at most 6 AI coach requests per minute and 50 per UTC day per authenticated user.';

commit;
