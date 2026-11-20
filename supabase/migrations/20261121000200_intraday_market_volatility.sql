-- TILT intraday market movement model.
-- This is an additive migration: it preserves existing holdings, orders, cash,
-- the deterministic crash-replay scenario and the transaction accounting RPCs.

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
    check (market_shock_max_bps between 0 and 2000);

alter table public.companies
  add column if not exists volatility_multiplier_bps integer not null default 10000
    check (volatility_multiplier_bps between 3000 and 30000);

-- Give the fictional companies different sensitivities to the same market move.
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
  else 10000
end
where symbol in ('ASTE', 'NVMT', 'BGTC', 'HVFD', 'ZNFC', 'MEDX', 'URBN', 'LOGX');

-- The regular market now advances in five-minute candles. Existing timestamps
-- are recalculated onto the new interval so an account's historical chart stays
-- internally consistent after the interval change.
update public.market_scenarios
set interval_ms = 300000,
    market_drift_bps = 0,
    market_volatility_bps = 12,
    sector_volatility_bps = 8,
    company_volatility_bps = 24,
    market_shock_probability_bps = 40,
    market_shock_max_bps = 110
where id = 'tilt-demo-v1';

update public.price_points as pp
set recorded_at = scenario.start_at
  + make_interval(secs => (
      scenario.interval_ms::numeric * pp.market_step::numeric / 1000
    )::double precision)
from public.market_scenarios as scenario
where pp.scenario_id = 'tilt-demo-v1'
  and scenario.id = pp.scenario_id;

-- The crash replay deliberately remains event-driven: it must preserve the
-- scripted five-step crash and recovery rather than introducing background noise.
update public.market_scenarios
set market_drift_bps = 0,
    market_volatility_bps = 0,
    sector_volatility_bps = 0,
    company_volatility_bps = 0,
    market_shock_probability_bps = 0,
    market_shock_max_bps = 0
where id = 'tilt-crash-replay-v1';

-- Stable hash buckets provide deterministic pseudo-random values. The same
-- scenario, step, factor and company always produce the same movement.
create or replace function public.market_hash_bucket(
  p_seed text,
  p_bucket_count integer
)
returns integer
language sql
immutable
strict
parallel safe
as $$
  select mod(
    get_byte(decode(md5(p_seed), 'hex'), 0)::bigint * 16777216
      + get_byte(decode(md5(p_seed), 'hex'), 1)::bigint * 65536
      + get_byte(decode(md5(p_seed), 'hex'), 2)::bigint * 256
      + get_byte(decode(md5(p_seed), 'hex'), 3)::bigint,
    p_bucket_count::bigint
  )::integer;
$$;

revoke all on function public.market_hash_bucket(text, integer) from public, anon, authenticated;

-- Rebuild only the market advancement RPC. Session ownership/locking, atomic
-- inserts, event processing, price bounds and output shape remain intact.
-- The scenario row is no longer globally locked: deterministic per-step values
-- plus the price_points primary key and ON CONFLICT make concurrent session
-- advances safe without serialising every user behind one scenario lock.
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

  -- Read the scenario without a cross-user row lock. The settings are scenario
  -- configuration; price-step uniqueness is enforced by the database primary key.
  select * into v_scenario
  from public.market_scenarios
  where id = v_session.scenario_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'UNKNOWN_SCENARIO';
  end if;

  v_next_step := v_session.market_step + 1;

  -- Serialize only this scenario/candle. Other steps and other scenarios can progress in parallel.
  perform pg_advisory_xact_lock(hashtext(v_scenario.id), v_next_step);

  select count(*) into v_expected_count
  from public.companies
  where is_active;

  select count(*) into v_existing_count
  from public.price_points
  where scenario_id = v_session.scenario_id
    and market_step = v_next_step;

  if v_existing_count = 0 then
    -- Correlated market-wide movement shared by every company for this candle.
    v_market_move := v_scenario.market_drift_bps;
    if v_scenario.market_volatility_bps > 0 then
      v_market_move := v_market_move
        + public.market_hash_bucket(
            v_scenario.id || ':' || v_next_step::text || ':market:all',
            (2 * v_scenario.market_volatility_bps) + 1
          )
        - v_scenario.market_volatility_bps;
    end if;

    -- A rare deterministic macro shock moves the broad market together.
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

      -- Sector moves are correlated for companies in the same industry.
      v_sector_move := 0;
      if v_scenario.sector_volatility_bps > 0 then
        v_sector_move := public.market_hash_bucket(
          v_scenario.id || ':' || v_next_step::text || ':sector:' || v_company.sector,
          (2 * v_scenario.sector_volatility_bps) + 1
        ) - v_scenario.sector_volatility_bps;
      end if;

      -- Idiosyncratic company movement is scaled by each company's volatility.
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

      -- Apply the organic five-minute movement first, then any scheduled news
      -- events below. Prices remain positive integers in paise.
      v_calculated_price := floor(
        (v_previous_price::numeric * (10000 + v_total_move_bps)::numeric + 5000) / 10000
      );

      if v_calculated_price <= 0 or v_calculated_price > 9007199254740991 then
        raise exception using errcode = 'P0001', message = 'INVALID_MARKET_PRICE';
      end if;

      v_next_price := v_calculated_price::bigint;

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

    -- Concurrent sessions may have generated this exact same step. The unique
    -- keys collapse duplicates; all expected company rows must be present.
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

  select coalesce(jsonb_agg(to_jsonb(e) order by e.id), '[]'::jsonb) into v_events
  from public.market_events e
  where e.scenario_id = v_session.scenario_id
    and e.market_step = v_next_step
    and exists (
      select 1 from public.companies c
      where c.is_active
        and (e.symbol = c.symbol or e.sector = c.sector)
    );

  select coalesce(jsonb_agg(jsonb_build_object(
    'symbol', pp.symbol,
    'marketStep', pp.market_step,
    'pricePaise', pp.price_paise,
    'timestamp', pp.recorded_at
  ) order by pp.symbol), '[]'::jsonb) into v_prices
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
