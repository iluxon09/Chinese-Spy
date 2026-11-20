-- TILT: persistent risk assessment and deterministic same-crash replay.
-- This migration is additive. It does not alter the existing demo scenario,
-- order RPCs, portfolio accounting, or market-advance implementation.

create table if not exists public.crash_replay_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id text not null references public.market_scenarios(id),
  risk_profile text not null check (risk_profile in ('CONSERVATIVE', 'BALANCED', 'AGGRESSIVE')),
  questionnaire jsonb not null check (jsonb_typeof(questionnaire) = 'object'),
  max_drawdown_bps integer not null check (max_drawdown_bps in (500, 1000, 1500, 2000)),
  max_position_bps integer not null check (max_position_bps in (1000, 1500, 2000, 2500)),
  baseline_session_id uuid not null unique references public.simulation_sessions(id) on delete cascade,
  reassessment_session_id uuid not null unique references public.simulation_sessions(id) on delete cascade,
  baseline_completed_at timestamptz,
  reassessment_completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (baseline_session_id <> reassessment_session_id)
);

create index if not exists idx_crash_replay_runs_user_created
  on public.crash_replay_runs(user_id, created_at desc);

alter table public.crash_replay_runs enable row level security;
drop policy if exists "users read own crash replay runs" on public.crash_replay_runs;
create policy "users read own crash replay runs" on public.crash_replay_runs
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.crash_replay_runs from anon, authenticated;
grant select on public.crash_replay_runs to authenticated;

-- A separate scenario ensures the replay never changes the existing TILT demo.
insert into public.market_scenarios (id, name, start_at, interval_ms, charge_rate_bps, minimum_charge_paise)
values (
  'tilt-crash-replay-v1',
  'TILT Deterministic Crash Replay v1',
  '2026-11-21T00:00:00Z',
  3600000,
  10,
  0
)
on conflict (id) do update set
  name = excluded.name,
  interval_ms = excluded.interval_ms,
  charge_rate_bps = excluded.charge_rate_bps,
  minimum_charge_paise = excluded.minimum_charge_paise;

-- Keep the replay's starting price snapshot aligned with the canonical active
-- company catalogue. The market-advance RPC materialises each later step once.
insert into public.price_points (scenario_id, market_step, symbol, price_paise, recorded_at)
select
  'tilt-crash-replay-v1',
  0,
  c.symbol,
  c.initial_price_paise,
  '2026-11-21T00:00:00Z'::timestamptz
from public.companies c
where c.is_active
on conflict (scenario_id, market_step, symbol) do nothing;

-- The crash is identical for every replay: three broad sell-off steps followed
-- by two partial-recovery steps. Each event is sector-wide, covering the eight
-- canonical companies without adding or modifying company records.
insert into public.market_events
  (id, scenario_id, market_step, title, description, effect_bps, symbol, sector)
values
  ('crash-v1-s1-energy', 'tilt-crash-replay-v1', 1, 'Broad market sell-off', 'Risk aversion spreads across the market after a sharp macroeconomic shock.', -400, null, 'Energy'),
  ('crash-v1-s1-auto', 'tilt-crash-replay-v1', 1, 'Broad market sell-off', 'Risk aversion spreads across the market after a sharp macroeconomic shock.', -400, null, 'Automobile'),
  ('crash-v1-s1-tech', 'tilt-crash-replay-v1', 1, 'Broad market sell-off', 'Risk aversion spreads across the market after a sharp macroeconomic shock.', -400, null, 'Technology'),
  ('crash-v1-s1-fmcg', 'tilt-crash-replay-v1', 1, 'Broad market sell-off', 'Risk aversion spreads across the market after a sharp macroeconomic shock.', -400, null, 'FMCG'),
  ('crash-v1-s1-finance', 'tilt-crash-replay-v1', 1, 'Broad market sell-off', 'Risk aversion spreads across the market after a sharp macroeconomic shock.', -400, null, 'Financial Services'),
  ('crash-v1-s1-health', 'tilt-crash-replay-v1', 1, 'Broad market sell-off', 'Risk aversion spreads across the market after a sharp macroeconomic shock.', -400, null, 'Healthcare'),
  ('crash-v1-s1-property', 'tilt-crash-replay-v1', 1, 'Broad market sell-off', 'Risk aversion spreads across the market after a sharp macroeconomic shock.', -400, null, 'Real Estate'),
  ('crash-v1-s1-industrials', 'tilt-crash-replay-v1', 1, 'Broad market sell-off', 'Risk aversion spreads across the market after a sharp macroeconomic shock.', -400, null, 'Industrials'),

  ('crash-v1-s2-energy', 'tilt-crash-replay-v1', 2, 'Selling pressure intensifies', 'A second wave of selling pushes the entire market further down.', -600, null, 'Energy'),
  ('crash-v1-s2-auto', 'tilt-crash-replay-v1', 2, 'Selling pressure intensifies', 'A second wave of selling pushes the entire market further down.', -600, null, 'Automobile'),
  ('crash-v1-s2-tech', 'tilt-crash-replay-v1', 2, 'Selling pressure intensifies', 'A second wave of selling pushes the entire market further down.', -600, null, 'Technology'),
  ('crash-v1-s2-fmcg', 'tilt-crash-replay-v1', 2, 'Selling pressure intensifies', 'A second wave of selling pushes the entire market further down.', -600, null, 'FMCG'),
  ('crash-v1-s2-finance', 'tilt-crash-replay-v1', 2, 'Selling pressure intensifies', 'A second wave of selling pushes the entire market further down.', -600, null, 'Financial Services'),
  ('crash-v1-s2-health', 'tilt-crash-replay-v1', 2, 'Selling pressure intensifies', 'A second wave of selling pushes the entire market further down.', -600, null, 'Healthcare'),
  ('crash-v1-s2-property', 'tilt-crash-replay-v1', 2, 'Selling pressure intensifies', 'A second wave of selling pushes the entire market further down.', -600, null, 'Real Estate'),
  ('crash-v1-s2-industrials', 'tilt-crash-replay-v1', 2, 'Selling pressure intensifies', 'A second wave of selling pushes the entire market further down.', -600, null, 'Industrials'),

  ('crash-v1-s3-energy', 'tilt-crash-replay-v1', 3, 'Market reaches its low', 'Volatility remains elevated as prices test a deeper short-term low.', -250, null, 'Energy'),
  ('crash-v1-s3-auto', 'tilt-crash-replay-v1', 3, 'Market reaches its low', 'Volatility remains elevated as prices test a deeper short-term low.', -250, null, 'Automobile'),
  ('crash-v1-s3-tech', 'tilt-crash-replay-v1', 3, 'Market reaches its low', 'Volatility remains elevated as prices test a deeper short-term low.', -250, null, 'Technology'),
  ('crash-v1-s3-fmcg', 'tilt-crash-replay-v1', 3, 'Market reaches its low', 'Volatility remains elevated as prices test a deeper short-term low.', -250, null, 'FMCG'),
  ('crash-v1-s3-finance', 'tilt-crash-replay-v1', 3, 'Market reaches its low', 'Volatility remains elevated as prices test a deeper short-term low.', -250, null, 'Financial Services'),
  ('crash-v1-s3-health', 'tilt-crash-replay-v1', 3, 'Market reaches its low', 'Volatility remains elevated as prices test a deeper short-term low.', -250, null, 'Healthcare'),
  ('crash-v1-s3-property', 'tilt-crash-replay-v1', 3, 'Market reaches its low', 'Volatility remains elevated as prices test a deeper short-term low.', -250, null, 'Real Estate'),
  ('crash-v1-s3-industrials', 'tilt-crash-replay-v1', 3, 'Market reaches its low', 'Volatility remains elevated as prices test a deeper short-term low.', -250, null, 'Industrials'),

  ('crash-v1-s4-energy', 'tilt-crash-replay-v1', 4, 'A tentative recovery begins', 'Buyers return cautiously, creating a partial recovery from the market low.', 250, null, 'Energy'),
  ('crash-v1-s4-auto', 'tilt-crash-replay-v1', 4, 'A tentative recovery begins', 'Buyers return cautiously, creating a partial recovery from the market low.', 250, null, 'Automobile'),
  ('crash-v1-s4-tech', 'tilt-crash-replay-v1', 4, 'A tentative recovery begins', 'Buyers return cautiously, creating a partial recovery from the market low.', 250, null, 'Technology'),
  ('crash-v1-s4-fmcg', 'tilt-crash-replay-v1', 4, 'A tentative recovery begins', 'Buyers return cautiously, creating a partial recovery from the market low.', 250, null, 'FMCG'),
  ('crash-v1-s4-finance', 'tilt-crash-replay-v1', 4, 'A tentative recovery begins', 'Buyers return cautiously, creating a partial recovery from the market low.', 250, null, 'Financial Services'),
  ('crash-v1-s4-health', 'tilt-crash-replay-v1', 4, 'A tentative recovery begins', 'Buyers return cautiously, creating a partial recovery from the market low.', 250, null, 'Healthcare'),
  ('crash-v1-s4-property', 'tilt-crash-replay-v1', 4, 'A tentative recovery begins', 'Buyers return cautiously, creating a partial recovery from the market low.', 250, null, 'Real Estate'),
  ('crash-v1-s4-industrials', 'tilt-crash-replay-v1', 4, 'A tentative recovery begins', 'Buyers return cautiously, creating a partial recovery from the market low.', 250, null, 'Industrials'),

  ('crash-v1-s5-energy', 'tilt-crash-replay-v1', 5, 'Recovery continues', 'Prices recover further, although the original shock has not fully reversed.', 350, null, 'Energy'),
  ('crash-v1-s5-auto', 'tilt-crash-replay-v1', 5, 'Recovery continues', 'Prices recover further, although the original shock has not fully reversed.', 350, null, 'Automobile'),
  ('crash-v1-s5-tech', 'tilt-crash-replay-v1', 5, 'Recovery continues', 'Prices recover further, although the original shock has not fully reversed.', 350, null, 'Technology'),
  ('crash-v1-s5-fmcg', 'tilt-crash-replay-v1', 5, 'Recovery continues', 'Prices recover further, although the original shock has not fully reversed.', 350, null, 'FMCG'),
  ('crash-v1-s5-finance', 'tilt-crash-replay-v1', 5, 'Recovery continues', 'Prices recover further, although the original shock has not fully reversed.', 350, null, 'Financial Services'),
  ('crash-v1-s5-health', 'tilt-crash-replay-v1', 5, 'Recovery continues', 'Prices recover further, although the original shock has not fully reversed.', 350, null, 'Healthcare'),
  ('crash-v1-s5-property', 'tilt-crash-replay-v1', 5, 'Recovery continues', 'Prices recover further, although the original shock has not fully reversed.', 350, null, 'Real Estate')
  ,('crash-v1-s5-industrials', 'tilt-crash-replay-v1', 5, 'Recovery continues', 'Prices recover further, although the original shock has not fully reversed.', 350, null, 'Industrials')
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  effect_bps = excluded.effect_bps,
  symbol = excluded.symbol,
  sector = excluded.sector;

create or replace function public.create_crash_replay_run(
  p_questionnaire jsonb,
  p_risk_profile text,
  p_max_drawdown_bps integer,
  p_max_position_bps integer
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_baseline jsonb;
  v_reassessment jsonb;
  v_run public.crash_replay_runs%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  if p_questionnaire is null or jsonb_typeof(p_questionnaire) <> 'object' then
    raise exception using errcode = 'P0001', message = 'INVALID_CRASH_REPLAY_QUESTIONNAIRE';
  end if;
  if p_risk_profile is null or p_risk_profile not in ('CONSERVATIVE', 'BALANCED', 'AGGRESSIVE') then
    raise exception using errcode = 'P0001', message = 'INVALID_CRASH_REPLAY_PROFILE';
  end if;
  if p_max_drawdown_bps not in (500, 1000, 1500, 2000)
     or p_max_position_bps not in (1000, 1500, 2000, 2500) then
    raise exception using errcode = 'P0001', message = 'INVALID_CRASH_REPLAY_LIMIT';
  end if;

  v_baseline := public.create_simulation_session('tilt-crash-replay-v1');
  v_reassessment := public.create_simulation_session('tilt-crash-replay-v1');

  insert into public.crash_replay_runs (
    user_id,
    scenario_id,
    risk_profile,
    questionnaire,
    max_drawdown_bps,
    max_position_bps,
    baseline_session_id,
    reassessment_session_id
  ) values (
    v_user_id,
    'tilt-crash-replay-v1',
    p_risk_profile,
    p_questionnaire,
    p_max_drawdown_bps,
    p_max_position_bps,
    (v_baseline->>'id')::uuid,
    (v_reassessment->>'id')::uuid
  )
  returning * into v_run;

  return to_jsonb(v_run);
end;
$$;

create or replace function public.complete_crash_replay_attempt(
  p_run_id uuid,
  p_attempt text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_run public.crash_replay_runs%rowtype;
  v_session_step integer;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  select * into v_run
  from public.crash_replay_runs
  where id = p_run_id and user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'CRASH_REPLAY_NOT_FOUND';
  end if;
  if p_attempt is null or p_attempt not in ('baseline', 'reassessment') then
    raise exception using errcode = 'P0001', message = 'CRASH_REPLAY_ATTEMPT_INVALID';
  end if;
  if p_attempt = 'reassessment' and v_run.baseline_completed_at is null then
    raise exception using errcode = 'P0001', message = 'CRASH_REPLAY_BASELINE_INCOMPLETE';
  end if;

  if p_attempt = 'baseline' then
    select market_step into v_session_step
    from public.simulation_sessions
    where id = v_run.baseline_session_id and user_id = v_user_id;
    if v_session_step is null or v_session_step < 5 then
      raise exception using errcode = 'P0001', message = 'CRASH_REPLAY_STEP_INCOMPLETE';
    end if;
    update public.crash_replay_runs
      set baseline_completed_at = coalesce(baseline_completed_at, now())
      where id = p_run_id
      returning * into v_run;
  else
    select market_step into v_session_step
    from public.simulation_sessions
    where id = v_run.reassessment_session_id and user_id = v_user_id;
    if v_session_step is null or v_session_step < 5 then
      raise exception using errcode = 'P0001', message = 'CRASH_REPLAY_STEP_INCOMPLETE';
    end if;
    update public.crash_replay_runs
      set reassessment_completed_at = coalesce(reassessment_completed_at, now())
      where id = p_run_id
      returning * into v_run;
  end if;

  return to_jsonb(v_run);
end;
$$;

revoke all on function public.create_crash_replay_run(jsonb, text, integer, integer) from public, anon;
revoke all on function public.complete_crash_replay_attempt(uuid, text) from public, anon;
grant execute on function public.create_crash_replay_run(jsonb, text, integer, integer) to authenticated;
grant execute on function public.complete_crash_replay_attempt(uuid, text) to authenticated;

comment on table public.crash_replay_runs is
  'Stores a user-declared educational risk profile and links two independent portfolios to the same deterministic crash scenario.';
