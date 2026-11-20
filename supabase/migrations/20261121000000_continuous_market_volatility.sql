-- Give every simulated candle an ongoing, reproducible market move.
-- The hash-based generator looks random to users but is stable for a scenario/step,
-- so all sessions in the same scenario see the same price and retries stay safe.

create or replace function public.tilt_market_hash(p_seed text)
returns bigint
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  v_hash bigint := 2166136261;
  v_index integer;
begin
  -- 32-bit FNV-1a, expressed with bigint arithmetic to avoid overflow.
  for v_index in 1..char_length(p_seed) loop
    v_hash := ((v_hash # ascii(substr(p_seed, v_index, 1))::bigint) * 16777619) & 4294967295;
  end loop;
  return v_hash;
end;
$$;

-- The helper is called by the SECURITY DEFINER advancement function only.
revoke all on function public.tilt_market_hash(text) from public, anon, authenticated;

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
  v_market_bps integer;
  v_sector_bps integer;
  v_company_bps integer;
  v_total_bps integer;
  v_events jsonb;
  v_prices jsonb;
begin
  if v_user_id is null then raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED'; end if;
  select * into v_session from public.simulation_sessions
    where id = p_session_id and user_id = v_user_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'SESSION_NOT_FOUND'; end if;
  select * into v_scenario from public.market_scenarios where id = v_session.scenario_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'UNKNOWN_SCENARIO'; end if;

  v_next_step := v_session.market_step + 1;
  select count(*) into v_expected_count from public.companies where is_active;
  select count(*) into v_existing_count from public.price_points
    where scenario_id = v_session.scenario_id and market_step = v_next_step;

  if v_existing_count = 0 then
    -- A modest shared market pulse creates broad correlation across companies.
    -- Sector and company shocks add variation, so prices do not all move together.
    v_market_bps := (public.tilt_market_hash(
      'tilt-market-v1:' || v_session.scenario_id || ':market:' || v_next_step::text
    ) % 71)::integer - 35;

    for v_company in select * from public.companies where is_active order by symbol loop
      select price_paise into v_previous_price from public.price_points
        where scenario_id = v_session.scenario_id and market_step = v_session.market_step
          and symbol = v_company.symbol;
      if not found then raise exception using errcode = 'P0001', message = 'PREVIOUS_PRICE_STEP_INCOMPLETE'; end if;

      v_sector_bps := (public.tilt_market_hash(
        'tilt-market-v1:' || v_session.scenario_id || ':sector:' ||
        v_next_step::text || ':' || v_company.sector
      ) % 41)::integer - 20;
      v_company_bps := (public.tilt_market_hash(
        'tilt-market-v1:' || v_session.scenario_id || ':company:' ||
        v_next_step::text || ':' || v_company.symbol
      ) % 241)::integer - 120;
      v_total_bps := v_market_bps + v_sector_bps + v_company_bps;

      -- Apply the continuous baseline move first. The positive floor prevents
      -- a long-running random walk from ever producing a zero/negative share price.
      v_calculated_price := greatest(
        1::numeric,
        floor((v_previous_price::numeric * (10000 + v_total_bps)::numeric + 5000) / 10000)
      );
      if v_calculated_price > 9007199254740991 then
        raise exception using errcode = 'P0001', message = 'INVALID_MARKET_PRICE';
      end if;
      v_next_price := v_calculated_price::bigint;

      -- Scripted news remains an additional move on top of normal market volatility.
      for v_event in
        select * from public.market_events e
        where e.scenario_id = v_session.scenario_id and e.market_step = v_next_step
          and (e.symbol = v_company.symbol or e.sector = v_company.sector)
        order by e.id
      loop
        v_calculated_price := floor((v_next_price::numeric * (10000 + v_event.effect_bps)::numeric + 5000) / 10000);
        if v_calculated_price <= 0 or v_calculated_price > 9007199254740991 then
          raise exception using errcode = 'P0001', message = 'INVALID_MARKET_PRICE';
        end if;
        v_next_price := v_calculated_price::bigint;
      end loop;

      v_timestamp := v_scenario.start_at + make_interval(secs => (v_scenario.interval_ms::numeric * v_next_step::numeric / 1000)::double precision);
      insert into public.price_points (scenario_id, market_step, symbol, price_paise, recorded_at)
        values (v_session.scenario_id, v_next_step, v_company.symbol, v_next_price, v_timestamp);
    end loop;
  elsif v_existing_count <> v_expected_count then
    raise exception using errcode = 'P0001', message = 'PRICE_STEP_PARTIAL_DATA';
  end if;

  update public.simulation_sessions set market_step = v_next_step, updated_at = now()
    where id = p_session_id;

  select coalesce(jsonb_agg(to_jsonb(e) order by e.id), '[]'::jsonb) into v_events
  from public.market_events e
  where e.scenario_id = v_session.scenario_id and e.market_step = v_next_step
    and exists (
      select 1 from public.companies c where c.is_active
        and (e.symbol = c.symbol or e.sector = c.sector)
    );
  select coalesce(jsonb_agg(jsonb_build_object(
    'symbol', pp.symbol, 'marketStep', pp.market_step,
    'pricePaise', pp.price_paise, 'timestamp', pp.recorded_at
  ) order by pp.symbol), '[]'::jsonb) into v_prices
  from public.price_points pp
  where pp.scenario_id = v_session.scenario_id and pp.market_step = v_next_step;

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
