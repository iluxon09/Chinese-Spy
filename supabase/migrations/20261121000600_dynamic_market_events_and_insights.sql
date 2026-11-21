-- TILT dynamic intraday catalyst events and real-market research quota.
-- Dynamic stock catalysts are deterministic per scenario/step/symbol: they look
-- unpredictable to participants while all users share identical committed prices.
-- Real-market research remains informational and separate from simulated prices.

begin;

-- Compatibility preflight:
-- Some existing TILT databases were created from the starter schema and have
-- not had migration 20261121000200 applied. Add its scenario/company settings
-- here as well so this migration can upgrade either schema state safely.
alter table public.market_scenarios
  add column if not exists market_drift_bps integer not null default 0
    check (market_drift_bps between -100 and 100),
  add column if not exists market_volatility_bps integer not null default 12
    check (market_volatility_bps between 0 and 500),
  add column if not exists sector_volatility_bps integer not null default 8
    check (sector_volatility_bps between 0 and 500),
  add column if not exists company_volatility_bps integer not null default 24
    check (company_volatility_bps between 0 and 1000),
  add column if not exists market_shock_probability_bps integer not null default 40
    check (market_shock_probability_bps between 0 and 10000),
  add column if not exists market_shock_max_bps integer not null default 110
    check (market_shock_max_bps between 0 and 2000),
  add column if not exists stock_event_probability_bps integer not null default 1400
    check (stock_event_probability_bps between 0 and 10000),
  add column if not exists stock_event_max_bps integer not null default 300
    check (stock_event_max_bps between 0 and 2000);

alter table public.companies
  add column if not exists volatility_multiplier_bps integer not null default 10000
    check (volatility_multiplier_bps between 3000 and 30000);

-- Required by the market-step RPC below. Defining it here makes this migration
-- safe even when the earlier intraday migration was not applied.
create or replace function public.market_hash_bucket(
  p_seed text,
  p_bucket_count integer
)
returns integer
language sql
immutable
strict
parallel safe
set search_path = pg_catalog
as $market_hash_bucket$
  select mod(
    get_byte(decode(md5(p_seed), 'hex'), 0)::bigint * 16777216
      + get_byte(decode(md5(p_seed), 'hex'), 1)::bigint * 65536
      + get_byte(decode(md5(p_seed), 'hex'), 2)::bigint * 256
      + get_byte(decode(md5(p_seed), 'hex'), 3)::bigint,
    p_bucket_count::bigint
  )::integer;
$market_hash_bucket$;

revoke all on function public.market_hash_bucket(text, integer)
  from public, anon, authenticated;

-- Preserve the intended five-minute candle interval and company sensitivities.
update public.market_scenarios
set interval_ms = 300000
where id = 'tilt-demo-v1';

update public.companies
set volatility_multiplier_bps = case symbol
  when 'ASTE' then 10500
  when 'NVMT' then 14000
  when 'BGTC' then 13500
  when 'HVFD' then 6500
  when 'ZNFC' then 12000
  when 'MEDX' then 8500
  when 'URBN' then 9000
  when 'LOGX' then 11000
  else volatility_multiplier_bps
end
where symbol in ('ASTE', 'NVMT', 'BGTC', 'HVFD', 'ZNFC', 'MEDX', 'URBN', 'LOGX');


-- Increase ordinary five-minute movement and introduce frequent, bounded,
-- stock-specific catalyst shocks for the active fictional demo scenario.
update public.market_scenarios
set market_drift_bps = 0,
    market_volatility_bps = 28,
    sector_volatility_bps = 18,
    company_volatility_bps = 45,
    market_shock_probability_bps = 150,
    market_shock_max_bps = 250,
    stock_event_probability_bps = 1400,
    stock_event_max_bps = 300
where id = 'tilt-demo-v1';

-- The shared price step and the synthetic catalyst rows are written in one
-- transaction under the existing scenario/candle advisory lock.
create or replace function public.advance_market_step(p_session_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.simulation_sessions%rowtype;
  v_scenario public.market_scenarios%rowtype;
  v_company public.companies%rowtype;
  v_event public.market_events%rowtype;
  v_previous_price bigint;
  v_next_price bigint;
  v_calculated_price numeric;
  v_next_step integer;
  v_timestamp timestamptz;
  v_expected_count integer;
  v_existing_count integer;
  v_market_move integer;
  v_sector_move integer;
  v_company_move integer;
  v_company_volatility_bps integer;
  v_shock_move integer := 0;
  v_shock_size integer;
  v_total_move_bps integer;
  v_stock_event_effect integer;
  v_stock_event_magnitude integer;
  v_stock_event_kind integer;
  v_stock_event_positive boolean;
  v_stock_event_title text;
  v_stock_event_description text;
  v_events jsonb;
  v_prices jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  select * into v_session
  from public.simulation_sessions
  where id = p_session_id and user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'SESSION_NOT_FOUND';
  end if;

  select * into v_scenario
  from public.market_scenarios
  where id = v_session.scenario_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'UNKNOWN_SCENARIO';
  end if;

  v_next_step := v_session.market_step + 1;

  perform pg_advisory_xact_lock(hashtext(v_scenario.id), v_next_step);

  select count(*) into v_expected_count
  from public.companies
  where is_active;

  select count(*) into v_existing_count
  from public.price_points
  where scenario_id = v_session.scenario_id
    and market_step = v_next_step;

  if v_existing_count = 0 then
    -- Correlated market-wide movement, generated from a stable per-candle seed.
    v_market_move := v_scenario.market_drift_bps;
    if v_scenario.market_volatility_bps > 0 then
      v_market_move := v_market_move
        + public.market_hash_bucket(
            v_scenario.id || ':' || v_next_step::text || ':market:all',
            (2 * v_scenario.market_volatility_bps) + 1
          )
        - v_scenario.market_volatility_bps;
    end if;

    -- Occasional broad-market shock. It is added once to every instrument and
    -- persisted as a Market-wide event for the simulator timeline.
    if v_scenario.market_shock_probability_bps > 0
       and v_scenario.market_shock_max_bps > 0
       and public.market_hash_bucket(
         v_scenario.id || ':' || v_next_step::text || ':market-shock-probability:all',
         10000
       ) < v_scenario.market_shock_probability_bps then
      v_shock_size := 1 + public.market_hash_bucket(
        v_scenario.id || ':' || v_next_step::text || ':market-shock-size:all',
        v_scenario.market_shock_max_bps
      );
      v_shock_move := case
        when public.market_hash_bucket(
          v_scenario.id || ':' || v_next_step::text || ':market-shock-direction:all',
          2
        ) = 0 then -v_shock_size
        else v_shock_size
      end;
    end if;

    for v_company in
      select * from public.companies
      where is_active
      order by symbol
    loop
      select price_paise into v_previous_price
      from public.price_points
      where scenario_id = v_session.scenario_id
        and market_step = v_session.market_step
        and symbol = v_company.symbol;

      if not found then
        raise exception using errcode = 'P0001', message = 'PREVIOUS_PRICE_STEP_INCOMPLETE';
      end if;

      -- Shared sector movement.
      v_sector_move := 0;
      if v_scenario.sector_volatility_bps > 0 then
        v_sector_move := public.market_hash_bucket(
          v_scenario.id || ':' || v_next_step::text || ':sector:' || v_company.sector,
          (2 * v_scenario.sector_volatility_bps) + 1
        ) - v_scenario.sector_volatility_bps;
      end if;

      -- Company-specific baseline movement.
      v_company_volatility_bps := round(
        v_scenario.company_volatility_bps::numeric
        * v_company.volatility_multiplier_bps::numeric
        / 10000
      )::integer;

      v_company_move := 0;
      if v_company_volatility_bps > 0 then
        v_company_move := public.market_hash_bucket(
          v_scenario.id || ':' || v_next_step::text || ':company:' || v_company.symbol,
          (2 * v_company_volatility_bps) + 1
        ) - v_company_volatility_bps;
      end if;

      v_total_move_bps := greatest(
        -2500,
        least(2500, v_market_move + v_sector_move + v_company_move + v_shock_move)
      );

      v_calculated_price := floor(
        (v_previous_price::numeric * (10000 + v_total_move_bps)::numeric + 5000) / 10000
      );

      if v_calculated_price <= 0 or v_calculated_price > 9007199254740991 then
        raise exception using errcode = 'P0001', message = 'INVALID_MARKET_PRICE';
      end if;

      v_next_price := v_calculated_price::bigint;

      -- Existing scheduled headlines remain part of the price path.
      for v_event in
        select * from public.market_events e
        where e.scenario_id = v_session.scenario_id
          and e.market_step = v_next_step
          and (e.symbol = v_company.symbol or e.sector = v_company.sector)
        order by e.id
      loop
        v_calculated_price := floor(
          (v_next_price::numeric * (10000 + v_event.effect_bps)::numeric + 5000) / 10000
        );

        if v_calculated_price <= 0 or v_calculated_price > 9007199254740991 then
          raise exception using errcode = 'P0001', message = 'INVALID_MARKET_PRICE';
        end if;

        v_next_price := v_calculated_price::bigint;
      end loop;

      -- A per-stock catalyst rolls independently for each symbol/candle.
      -- The result is stable for retries and identical across concurrent users.
      v_stock_event_effect := 0;
      if v_scenario.stock_event_probability_bps > 0
         and v_scenario.stock_event_max_bps > 0
         and public.market_hash_bucket(
           v_scenario.id || ':' || v_next_step::text || ':stock-event-probability:' || v_company.symbol,
           10000
         ) < v_scenario.stock_event_probability_bps then

        v_stock_event_magnitude := 1 + public.market_hash_bucket(
          v_scenario.id || ':' || v_next_step::text || ':stock-event-size:' || v_company.symbol,
          v_scenario.stock_event_max_bps
        );
        v_stock_event_positive := public.market_hash_bucket(
          v_scenario.id || ':' || v_next_step::text || ':stock-event-direction:' || v_company.symbol,
          2
        ) = 1;
        v_stock_event_effect := case
          when v_stock_event_positive then v_stock_event_magnitude
          else -v_stock_event_magnitude
        end;
        v_stock_event_kind := public.market_hash_bucket(
          v_scenario.id || ':' || v_next_step::text || ':stock-event-kind:' || v_company.symbol,
          6
        );

        if v_stock_event_positive then
          v_stock_event_title := case v_stock_event_kind
            when 0 then 'Simulated demand surge'
            when 1 then 'Positive earnings surprise'
            when 2 then 'Major contract win'
            when 3 then 'Analyst upgrade'
            when 4 then 'Institutional accumulation'
            else 'Supply outlook improves'
          end;
          v_stock_event_description := case v_stock_event_kind
            when 0 then 'A fictional demand shock triggers a sudden burst of buying interest.'
            when 1 then 'A simulated earnings update beats expectations and lifts sentiment.'
            when 2 then 'A fictional contract announcement improves the company outlook.'
            when 3 then 'A simulated analyst upgrade creates a quick positive repricing.'
            when 4 then 'Simulated large-ticket buying creates a sharp upward move.'
            else 'A fictional supply update eases near-term operating concerns.'
          end;
        else
          v_stock_event_title := case v_stock_event_kind
            when 0 then 'Sudden demand slowdown'
            when 1 then 'Negative earnings surprise'
            when 2 then 'Contract delay'
            when 3 then 'Analyst downgrade'
            when 4 then 'Institutional profit-taking'
            else 'Supply-chain disruption'
          end;
          v_stock_event_description := case v_stock_event_kind
            when 0 then 'A fictional demand slowdown triggers abrupt selling pressure.'
            when 1 then 'A simulated earnings update misses expectations and pressures sentiment.'
            when 2 then 'A fictional contract delay creates a sudden repricing lower.'
            when 3 then 'A simulated analyst downgrade weighs on near-term sentiment.'
            when 4 then 'Simulated large-ticket selling triggers a quick pullback.'
            else 'A fictional operational disruption raises near-term uncertainty.'
          end;
        end if;

        v_calculated_price := floor(
          (v_next_price::numeric * (10000 + v_stock_event_effect)::numeric + 5000) / 10000
        );

        if v_calculated_price <= 0 or v_calculated_price > 9007199254740991 then
          raise exception using errcode = 'P0001', message = 'INVALID_MARKET_PRICE';
        end if;

        v_next_price := v_calculated_price::bigint;

        insert into public.market_events (
          id, scenario_id, market_step, title, description, effect_bps, symbol, sector
        ) values (
          'sim:' || v_scenario.id || ':' || v_next_step::text || ':' || v_company.symbol,
          v_scenario.id,
          v_next_step,
          v_stock_event_title,
          v_stock_event_description,
          v_stock_event_effect,
          v_company.symbol,
          null
        )
        on conflict (id) do nothing;
      end if;

      v_timestamp := v_scenario.start_at + make_interval(
        secs => (
          v_scenario.interval_ms::numeric * v_next_step::numeric / 1000
        )::double precision
      );

      insert into public.price_points (
        scenario_id, market_step, symbol, price_paise, recorded_at
      ) values (
        v_session.scenario_id, v_next_step, v_company.symbol, v_next_price, v_timestamp
      )
      on conflict (scenario_id, market_step, symbol) do nothing;
    end loop;

    if v_shock_move <> 0 then
      insert into public.market_events (
        id, scenario_id, market_step, title, description, effect_bps, symbol, sector
      ) values (
        'sim:' || v_scenario.id || ':' || v_next_step::text || ':market',
        v_scenario.id,
        v_next_step,
        case when v_shock_move > 0
          then 'Market-wide risk-on shock'
          else 'Market-wide risk-off shock'
        end,
        'A fictional macro headline triggers an abrupt move across the simulated market.',
        v_shock_move,
        null,
        'Market-wide'
      )
      on conflict (id) do nothing;
    end if;

    select count(*) into v_existing_count
    from public.price_points
    where scenario_id = v_session.scenario_id
      and market_step = v_next_step;
  end if;

  if v_existing_count <> v_expected_count then
    raise exception using errcode = 'P0001', message = 'PRICE_STEP_PARTIAL_DATA';
  end if;

  update public.simulation_sessions
  set market_step = v_next_step, updated_at = now()
  where id = p_session_id;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.id), '[]'::jsonb)
    into v_events
  from public.market_events e
  where e.scenario_id = v_session.scenario_id
    and e.market_step = v_next_step
    and (
      e.sector = 'Market-wide'
      or exists (
        select 1 from public.companies c
        where c.is_active
          and (e.symbol = c.symbol or e.sector = c.sector)
      )
    );

  select coalesce(jsonb_agg(jsonb_build_object(
    'symbol', pp.symbol,
    'marketStep', pp.market_step,
    'pricePaise', pp.price_paise,
    'timestamp', pp.recorded_at
  ) order by pp.symbol), '[]'::jsonb)
    into v_prices
  from public.price_points pp
  where pp.scenario_id = v_session.scenario_id
    and pp.market_step = v_next_step;

  return jsonb_build_object(
    'scenarioId', v_session.scenario_id,
    'marketStep', v_next_step,
    'eventsApplied', v_events,
    'pricePoints', v_prices
  );
end;
$$;

revoke all on function public.advance_market_step(uuid) from public, anon;
grant execute on function public.advance_market_step(uuid) to authenticated;

-- Real-world market research is a separate, authenticated Gemini capability.
-- One request per 5-minute window and 20 per UTC day per user.
create table if not exists public.market_insights_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_started_at timestamptz not null,
  window_request_count integer not null default 0
    check (window_request_count >= 0),
  usage_date date not null,
  daily_request_count integer not null default 0
    check (daily_request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.market_insights_rate_limits enable row level security;
revoke all on table public.market_insights_rate_limits from public, anon, authenticated;

create or replace function public.consume_market_insights_quota()
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

  insert into public.market_insights_rate_limits as current_usage (
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
      when current_usage.window_started_at <= v_now - interval '5 minutes'
        then v_now
      else current_usage.window_started_at
    end,
    window_request_count = case
      when current_usage.window_started_at <= v_now - interval '5 minutes'
        then 1
      else least(2, current_usage.window_request_count + 1)
    end,
    usage_date = case
      when current_usage.usage_date <> v_today then v_today
      else current_usage.usage_date
    end,
    daily_request_count = case
      when current_usage.usage_date <> v_today then 1
      else least(21, current_usage.daily_request_count + 1)
    end,
    updated_at = v_now
  returning window_request_count, daily_request_count
    into v_window_count, v_daily_count;

  return v_window_count <= 1 and v_daily_count <= 20;
end;
$$;

revoke all on function public.consume_market_insights_quota() from public, anon;
grant execute on function public.consume_market_insights_quota() to authenticated;

comment on function public.advance_market_step(uuid) is
  'Advances the shared fictional market one step with deterministic, per-stock simulated catalyst events.';
comment on function public.consume_market_insights_quota() is
  'Allows one authenticated real-market insight request per five minutes and twenty per UTC day.';

commit;
