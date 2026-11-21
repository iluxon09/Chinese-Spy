-- TILT real-market Nifty 500 snapshot store and worker RPCs.
-- This is separate from the fictional simulator market tables and pricing engine.
begin;
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create schema if not exists vault;
create extension if not exists supabase_vault with schema vault;

create table if not exists public.market_pulse_state (
  universe_key text primary key check (universe_key = 'NIFTY_500'),
  snapshot jsonb,
  last_success_at timestamptz,
  last_attempt_at timestamptz,
  last_status text not null default 'never'
    check (last_status in ('never', 'running', 'ok', 'partial', 'failed')),
  last_error text,
  refresh_lock_token uuid,
  refresh_lock_expires_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.market_pulse_state (universe_key)
values ('NIFTY_500')
on conflict (universe_key) do nothing;

alter table public.market_pulse_state enable row level security;
revoke all on table public.market_pulse_state from public, anon, authenticated;
grant select on table public.market_pulse_state to authenticated;

drop policy if exists market_pulse_state_read_authenticated on public.market_pulse_state;
create policy market_pulse_state_read_authenticated
  on public.market_pulse_state for select to authenticated using (true);

create or replace function public.claim_market_pulse_refresh(
  p_worker_secret text,
  p_lock_seconds integer default 180
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public, vault, pg_temp
as $market_pulse_claim$
declare
  v_expected_secret text;
  v_lock_token uuid;
  v_lock_expires_at timestamptz;
  v_now timestamptz := clock_timestamp();
begin
  select decrypted_secret into v_expected_secret
  from vault.decrypted_secrets
  where name = 'tilt_market_refresh_secret'
  limit 1;

  if v_expected_secret is null or p_worker_secret is null
     or length(p_worker_secret) < 32 or p_worker_secret <> v_expected_secret then
    raise exception using errcode = '42501', message = 'WORKER_AUTH_FAILED';
  end if;
  if p_lock_seconds < 60 or p_lock_seconds > 300 then
    raise exception using errcode = '22023', message = 'INVALID_LOCK_DURATION';
  end if;

  insert into public.market_pulse_state (universe_key)
  values ('NIFTY_500') on conflict (universe_key) do nothing;

  select refresh_lock_token, refresh_lock_expires_at
    into v_lock_token, v_lock_expires_at
  from public.market_pulse_state
  where universe_key = 'NIFTY_500'
  for update;

  if v_lock_token is not null and v_lock_expires_at > v_now then
    return null;
  end if;

  v_lock_token := gen_random_uuid();
  update public.market_pulse_state
  set refresh_lock_token = v_lock_token,
      refresh_lock_expires_at = v_now + make_interval(secs => p_lock_seconds),
      last_attempt_at = v_now,
      last_status = 'running',
      last_error = null,
      updated_at = v_now
  where universe_key = 'NIFTY_500';
  return v_lock_token;
end;
$market_pulse_claim$;

create or replace function public.get_market_pulse_universe(p_worker_secret text)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, vault, pg_temp
as $market_pulse_universe$
declare
  v_expected_secret text;
  v_result jsonb;
begin
  select decrypted_secret into v_expected_secret
  from vault.decrypted_secrets
  where name = 'tilt_market_refresh_secret'
  limit 1;
  if v_expected_secret is null or p_worker_secret is null
     or length(p_worker_secret) < 32 or p_worker_secret <> v_expected_secret then
    raise exception using errcode = '42501', message = 'WORKER_AUTH_FAILED';
  end if;

  select jsonb_build_object(
    'members', snapshot #> '{universe,members}',
    'source_url', snapshot #>> '{universe,source_url}',
    'retrieved_at', snapshot #>> '{universe,retrieved_at}'
  )
  into v_result
  from public.market_pulse_state
  where universe_key = 'NIFTY_500' and snapshot is not null;
  return v_result;
end;
$market_pulse_universe$;

create or replace function public.publish_market_pulse_snapshot(
  p_worker_secret text,
  p_lock_token uuid,
  p_snapshot jsonb
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, vault, pg_temp
as $market_pulse_publish$
declare
  v_expected_secret text;
  v_now timestamptz := clock_timestamp();
  v_status text;
  v_requested integer;
  v_available integer;
  v_member_count integer;
  v_stock_count integer;
  v_gainer_count integer;
  v_loser_count integer;
begin
  select decrypted_secret into v_expected_secret
  from vault.decrypted_secrets
  where name = 'tilt_market_refresh_secret' limit 1;
  if v_expected_secret is null or p_worker_secret is null
     or length(p_worker_secret) < 32 or p_worker_secret <> v_expected_secret then
    raise exception using errcode = '42501', message = 'WORKER_AUTH_FAILED';
  end if;
  if p_snapshot is null or jsonb_typeof(p_snapshot) <> 'object' then
    raise exception using errcode = '22023', message = 'INVALID_MARKET_SNAPSHOT';
  end if;

  v_status := p_snapshot ->> 'status';
  v_requested := (p_snapshot #>> '{coverage,requested}')::integer;
  v_available := (p_snapshot #>> '{coverage,available}')::integer;
  v_member_count := jsonb_array_length(p_snapshot #> '{universe,members}');
  v_stock_count := jsonb_array_length(p_snapshot -> 'stocks');
  v_gainer_count := jsonb_array_length(p_snapshot -> 'gainers');
  v_loser_count := jsonb_array_length(p_snapshot -> 'losers');

  if v_status is null or v_status not in ('ok', 'partial')
     or p_snapshot ->> 'source' is null
     or v_requested is distinct from 500
     or v_available is null or v_available < 450 or v_available > 500
     or v_member_count is distinct from 500
     or v_stock_count is null or v_stock_count is distinct from v_available
     or v_gainer_count is null or v_gainer_count > 5
     or v_loser_count is null or v_loser_count > 5 then
    raise exception using errcode = '22023', message = 'MARKET_SNAPSHOT_FAILED_VALIDATION';
  end if;

  update public.market_pulse_state
  set snapshot = p_snapshot,
      last_success_at = v_now,
      last_status = v_status,
      last_error = null,
      refresh_lock_token = null,
      refresh_lock_expires_at = null,
      updated_at = v_now
  where universe_key = 'NIFTY_500'
    and refresh_lock_token = p_lock_token
    and refresh_lock_expires_at > v_now;
  return found;
end;
$market_pulse_publish$;

create or replace function public.record_market_pulse_failure(
  p_worker_secret text, p_lock_token uuid, p_error text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public, vault, pg_temp
as $market_pulse_failure$
declare
  v_expected_secret text;
  v_now timestamptz := clock_timestamp();
begin
  select decrypted_secret into v_expected_secret
  from vault.decrypted_secrets
  where name = 'tilt_market_refresh_secret'
  limit 1;
  if v_expected_secret is null or p_worker_secret is null
     or length(p_worker_secret) < 32 or p_worker_secret <> v_expected_secret then
    raise exception using errcode = '42501', message = 'WORKER_AUTH_FAILED';
  end if;

  update public.market_pulse_state
  set last_status = 'failed',
      last_error = left(coalesce(p_error, 'Unknown market-data error.'), 500),
      refresh_lock_token = null,
      refresh_lock_expires_at = null,
      updated_at = v_now
  where universe_key = 'NIFTY_500' and refresh_lock_token = p_lock_token;
  return found;
end;
$market_pulse_failure$;

revoke all on function public.claim_market_pulse_refresh(text, integer) from public;
revoke all on function public.get_market_pulse_universe(text) from public;
revoke all on function public.publish_market_pulse_snapshot(text, uuid, jsonb) from public;
revoke all on function public.record_market_pulse_failure(text, uuid, text) from public;
grant execute on function public.claim_market_pulse_refresh(text, integer) to anon;
grant execute on function public.get_market_pulse_universe(text) to anon;
grant execute on function public.publish_market_pulse_snapshot(text, uuid, jsonb) to anon;
grant execute on function public.record_market_pulse_failure(text, uuid, text) to anon;

comment on table public.market_pulse_state is
  'Last successful Nifty 500 real-market snapshot; isolated from fictional TILT simulator prices.';
comment on function public.claim_market_pulse_refresh(text, integer) is
  'Claims a short-lived refresh lock for the authenticated-by-secret Nifty 500 worker.';
comment on function public.publish_market_pulse_snapshot(text, uuid, jsonb) is
  'Validates and atomically publishes a Nifty 500 snapshot if the worker still owns the refresh lock.';

notify pgrst, 'reload schema';
commit;
