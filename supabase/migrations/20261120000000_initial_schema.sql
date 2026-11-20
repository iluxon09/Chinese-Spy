-- TILT Member 1 - production-shaped initial schema for the hackathon MVP.
-- All money is integer paise (₹1 = 100 paise).
-- Price movements are deterministic and shared per scenario/market step.
-- A user's marketStep is stored on that user's simulation session.

create table if not exists public.market_scenarios (
  id text primary key,
  name text not null,
  start_at timestamptz not null,
  interval_ms bigint not null check (interval_ms > 0),
  charge_rate_bps integer not null default 10 check (charge_rate_bps between 0 and 10000),
  minimum_charge_paise bigint not null default 0 check (minimum_charge_paise >= 0),
  created_at timestamptz not null default now()
);

-- Upgrade-safe defaults for the first starter schema version.
alter table public.market_scenarios add column if not exists charge_rate_bps integer not null default 10;
alter table public.market_scenarios add column if not exists minimum_charge_paise bigint not null default 0;

create table if not exists public.companies (
  symbol text primary key check (symbol ~ '^[A-Z0-9]{2,10}$'),
  name text not null,
  sector text not null,
  description text not null,
  initial_price_paise bigint not null check (initial_price_paise > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.market_events (
  id text primary key,
  scenario_id text not null references public.market_scenarios(id) on delete cascade,
  market_step integer not null check (market_step > 0),
  title text not null,
  description text not null,
  effect_bps integer not null check (effect_bps > -10000),
  symbol text references public.companies(symbol),
  sector text,
  check (num_nonnulls(symbol, sector) = 1)
);

create table if not exists public.simulation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scenario_id text not null references public.market_scenarios(id),
  starting_capital_paise bigint not null check (starting_capital_paise > 0),
  cash_balance_paise bigint not null check (cash_balance_paise >= 0),
  market_step integer not null default 0 check (market_step >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.holdings (
  session_id uuid not null references public.simulation_sessions(id) on delete cascade,
  symbol text not null references public.companies(symbol),
  quantity bigint not null check (quantity > 0),
  total_cost_paise bigint not null check (total_cost_paise >= 0),
  updated_at timestamptz not null default now(),
  primary key (session_id, symbol)
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.simulation_sessions(id) on delete cascade,
  client_order_id uuid not null,
  symbol text not null references public.companies(symbol),
  side text not null check (side in ('BUY', 'SELL')),
  quantity bigint not null check (quantity > 0),
  execution_price_paise bigint not null check (execution_price_paise > 0),
  gross_amount_paise bigint not null check (gross_amount_paise > 0),
  charges_paise bigint not null check (charges_paise >= 0),
  cash_delta_paise bigint not null,
  realised_pnl_paise bigint not null default 0,
  market_step integer not null check (market_step >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.price_points (
  scenario_id text not null references public.market_scenarios(id) on delete cascade,
  market_step integer not null check (market_step >= 0),
  symbol text not null references public.companies(symbol),
  price_paise bigint not null check (price_paise > 0),
  recorded_at timestamptz not null,
  primary key (scenario_id, market_step, symbol)
);

-- Upgrade-safe idempotency field for databases created from the earlier starter draft.
alter table public.transactions add column if not exists client_order_id uuid;
update public.transactions set client_order_id = gen_random_uuid() where client_order_id is null;
alter table public.transactions alter column client_order_id set not null;
create unique index if not exists idx_transactions_idempotency
  on public.transactions(session_id, client_order_id);

create index if not exists idx_simulation_sessions_user on public.simulation_sessions(user_id, created_at desc);
create index if not exists idx_transactions_session_created on public.transactions(session_id, created_at desc);
create index if not exists idx_price_points_symbol_step on public.price_points(scenario_id, symbol, market_step desc);
create index if not exists idx_market_events_scenario_step on public.market_events(scenario_id, market_step);

-- RLS: users can read the fictional market catalogue and only their own sessions.
-- No direct client INSERT/UPDATE/DELETE is granted on financial tables. Mutations
-- are performed only by the SECURITY DEFINER RPCs below, which verify auth.uid().
alter table public.market_scenarios enable row level security;
alter table public.companies enable row level security;
alter table public.market_events enable row level security;
alter table public.simulation_sessions enable row level security;
alter table public.holdings enable row level security;
alter table public.transactions enable row level security;
alter table public.price_points enable row level security;

drop policy if exists "authenticated can read scenarios" on public.market_scenarios;
create policy "authenticated can read scenarios" on public.market_scenarios
  for select to authenticated using (true);
drop policy if exists "authenticated can read companies" on public.companies;
create policy "authenticated can read companies" on public.companies
  for select to authenticated using (true);
drop policy if exists "authenticated can read market events" on public.market_events;
create policy "authenticated can read market events" on public.market_events
  for select to authenticated using (true);
drop policy if exists "authenticated can read price history" on public.price_points;
create policy "authenticated can read price history" on public.price_points
  for select to authenticated using (true);
drop policy if exists "users read own sessions" on public.simulation_sessions;
create policy "users read own sessions" on public.simulation_sessions
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists "users read own holdings" on public.holdings;
create policy "users read own holdings" on public.holdings
  for select to authenticated using (exists (
    select 1 from public.simulation_sessions s
    where s.id = holdings.session_id and s.user_id = (select auth.uid())
  ));
drop policy if exists "users read own transactions" on public.transactions;
create policy "users read own transactions" on public.transactions
  for select to authenticated using (exists (
    select 1 from public.simulation_sessions s
    where s.id = transactions.session_id and s.user_id = (select auth.uid())
  ));

-- Make the no-direct-write rule explicit even if project-wide default grants change.
revoke insert, update, delete, truncate, references, trigger on
  public.simulation_sessions, public.holdings, public.transactions,
  public.market_scenarios, public.companies, public.market_events, public.price_points
  from anon, authenticated;
grant select on public.market_scenarios, public.companies, public.market_events,
  public.price_points, public.simulation_sessions, public.holdings, public.transactions
  to authenticated;

-- Create a user's simulation. The user ID is taken from the verified JWT, never
-- from request JSON. Starting capital is fixed at ₹10,00,000 for this MVP.
create or replace function public.create_simulation_session(p_scenario_id text default 'tilt-demo-v1')
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.simulation_sessions%rowtype;
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  if not exists (select 1 from public.market_scenarios where id = p_scenario_id) then
    raise exception using errcode = 'P0001', message = 'UNKNOWN_SCENARIO';
  end if;

  insert into public.simulation_sessions (
    user_id, scenario_id, starting_capital_paise, cash_balance_paise, market_step
  ) values (v_user_id, p_scenario_id, 100000000, 100000000, 0)
  returning * into v_session;

  return jsonb_build_object(
    'id', v_session.id,
    'user_id', v_session.user_id,
    'scenario_id', v_session.scenario_id,
    'starting_capital_paise', v_session.starting_capital_paise,
    'cash_balance_paise', v_session.cash_balance_paise,
    'market_step', v_session.market_step,
    'created_at', v_session.created_at
  );
end;
$$;

-- Atomic, idempotent market order. The execution price is read from the database
-- for the session's saved market step; a client cannot submit its own price.
create or replace function public.place_market_order(
  p_session_id uuid,
  p_client_order_id uuid,
  p_symbol text,
  p_side text,
  p_quantity bigint
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.simulation_sessions%rowtype;
  v_existing_tx public.transactions%rowtype;
  v_holding public.holdings%rowtype;
  v_price bigint;
  v_charge_rate_bps integer;
  v_minimum_charge_paise bigint;
  v_gross numeric;
  v_charges numeric;
  v_cash_delta numeric;
  v_cash_next numeric;
  v_realised_pnl numeric := 0;
  v_cost_released numeric := 0;
  v_limit constant numeric := 9007199254740991;
begin
  if v_user_id is null then raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED'; end if;
  select * into v_session from public.simulation_sessions
    where id = p_session_id and user_id = v_user_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'SESSION_NOT_FOUND'; end if;

  if p_client_order_id is null then raise exception using errcode = 'P0001', message = 'CLIENT_ORDER_ID_REQUIRED'; end if;
  if p_symbol is null or p_symbol !~ '^[A-Z0-9]{2,10}$' then raise exception using errcode = 'P0001', message = 'INVALID_SYMBOL'; end if;
  if p_side is null or p_side not in ('BUY', 'SELL') then raise exception using errcode = 'P0001', message = 'INVALID_SIDE'; end if;
  if p_quantity is null or p_quantity <= 0 or p_quantity::numeric > v_limit then
    raise exception using errcode = 'P0001', message = 'INVALID_QUANTITY';
  end if;

  -- Idempotency: retrying the same order ID returns the original transaction.
  select * into v_existing_tx from public.transactions
    where session_id = p_session_id and client_order_id = p_client_order_id;
  if found then
    if v_existing_tx.symbol <> p_symbol or v_existing_tx.side <> p_side or v_existing_tx.quantity <> p_quantity then
      raise exception using errcode = 'P0001', message = 'IDEMPOTENCY_KEY_REUSED';
    end if;
    return jsonb_build_object(
      'duplicate', true,
      'transaction', to_jsonb(v_existing_tx),
      'cash_balance_paise', v_session.cash_balance_paise,
      'market_step', v_session.market_step
    );
  end if;

  select charge_rate_bps, minimum_charge_paise
    into v_charge_rate_bps, v_minimum_charge_paise
    from public.market_scenarios where id = v_session.scenario_id;
  if v_charge_rate_bps < 0 or v_charge_rate_bps > 10000 or v_minimum_charge_paise < 0 then
    raise exception using errcode = 'P0001', message = 'INVALID_CHARGE_POLICY';
  end if;
  if not exists (select 1 from public.companies where symbol = p_symbol and is_active) then
    raise exception using errcode = 'P0001', message = 'UNKNOWN_SYMBOL';
  end if;
  select price_paise into v_price from public.price_points
    where scenario_id = v_session.scenario_id and market_step = v_session.market_step and symbol = p_symbol;
  if not found or v_price <= 0 then raise exception using errcode = 'P0001', message = 'PRICE_NOT_AVAILABLE'; end if;

  v_gross := v_price::numeric * p_quantity::numeric;
  if v_gross <= 0 or v_gross > v_limit then raise exception using errcode = 'P0001', message = 'ORDER_VALUE_OUT_OF_RANGE'; end if;
  v_charges := greatest(ceil(v_gross * v_charge_rate_bps / 10000), v_minimum_charge_paise)::numeric;
  if v_charges > v_gross or v_charges > v_limit then raise exception using errcode = 'P0001', message = 'CHARGES_EXCEED_ORDER_VALUE'; end if;

  select * into v_holding from public.holdings
    where session_id = p_session_id and symbol = p_symbol for update;

  if p_side = 'BUY' then
    v_cash_delta := -(v_gross + v_charges);
    v_cash_next := v_session.cash_balance_paise::numeric + v_cash_delta;
    if v_cash_next < 0 then raise exception using errcode = 'P0001', message = 'INSUFFICIENT_CASH'; end if;
    if v_cash_next > v_limit then raise exception using errcode = 'P0001', message = 'CASH_OUT_OF_RANGE'; end if;

    if found then
      if v_holding.quantity::numeric + p_quantity::numeric > v_limit
         or v_holding.total_cost_paise::numeric + v_gross + v_charges > v_limit then
        raise exception using errcode = 'P0001', message = 'HOLDING_OUT_OF_RANGE';
      end if;
      update public.holdings set
        quantity = quantity + p_quantity,
        total_cost_paise = total_cost_paise + v_gross::bigint + v_charges::bigint,
        updated_at = now()
      where session_id = p_session_id and symbol = p_symbol;
    else
      if p_quantity::numeric > v_limit or v_gross + v_charges > v_limit then
        raise exception using errcode = 'P0001', message = 'HOLDING_OUT_OF_RANGE';
      end if;
      insert into public.holdings (session_id, symbol, quantity, total_cost_paise)
      values (p_session_id, p_symbol, p_quantity, (v_gross + v_charges)::bigint);
    end if;
    v_realised_pnl := 0;
  else
    if not found or v_holding.quantity < p_quantity then
      raise exception using errcode = 'P0001', message = 'INSUFFICIENT_HOLDINGS';
    end if;
    v_cost_released := case
      when p_quantity = v_holding.quantity then v_holding.total_cost_paise::numeric
      else floor(v_holding.total_cost_paise::numeric * p_quantity::numeric / v_holding.quantity::numeric)
    end;
    v_cash_delta := v_gross - v_charges;
    v_cash_next := v_session.cash_balance_paise::numeric + v_cash_delta;
    if v_cash_next > v_limit then raise exception using errcode = 'P0001', message = 'CASH_OUT_OF_RANGE'; end if;
    v_realised_pnl := v_cash_delta - v_cost_released;

    if p_quantity = v_holding.quantity then
      delete from public.holdings where session_id = p_session_id and symbol = p_symbol;
    else
      update public.holdings set
        quantity = quantity - p_quantity,
        total_cost_paise = total_cost_paise - v_cost_released::bigint,
        updated_at = now()
      where session_id = p_session_id and symbol = p_symbol;
    end if;
  end if;

  update public.simulation_sessions set cash_balance_paise = v_cash_next::bigint, updated_at = now()
    where id = p_session_id;

  insert into public.transactions (
    session_id, client_order_id, symbol, side, quantity, execution_price_paise,
    gross_amount_paise, charges_paise, cash_delta_paise, realised_pnl_paise, market_step
  ) values (
    p_session_id, p_client_order_id, p_symbol, p_side, p_quantity, v_price,
    v_gross::bigint, v_charges::bigint, v_cash_delta::bigint,
    v_realised_pnl::bigint, v_session.market_step
  ) returning * into v_existing_tx;

  return jsonb_build_object(
    'duplicate', false,
    'transaction', to_jsonb(v_existing_tx),
    'cash_balance_paise', v_cash_next::bigint,
    'market_step', v_session.market_step
  );
end;
$$;

-- Advance one user session by one step. A scenario row lock ensures only one
-- request materialises a given scenario/step; subsequent sessions reuse it.
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
    for v_company in select * from public.companies where is_active order by symbol loop
      select price_paise into v_previous_price from public.price_points
        where scenario_id = v_session.scenario_id and market_step = v_session.market_step
          and symbol = v_company.symbol;
      if not found then raise exception using errcode = 'P0001', message = 'PREVIOUS_PRICE_STEP_INCOMPLETE'; end if;
      v_next_price := v_previous_price;

      for v_event in
        select * from public.market_events e
        where e.scenario_id = v_session.scenario_id and e.market_step = v_next_step
          and (e.symbol = v_company.symbol or e.sector = v_company.sector)
        order by e.id
      loop
        v_calculated_price := floor((v_next_price::numeric * (10000 + v_event.effect_bps)::numeric + 5000) / 10000);
        -- Check while still NUMERIC so an extreme event cannot overflow during a BIGINT cast.
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

-- Prevent direct execution by anonymous roles and grant only authenticated RPC use.
revoke all on function public.create_simulation_session(text) from public, anon;
revoke all on function public.place_market_order(uuid, uuid, text, text, bigint) from public, anon;
revoke all on function public.advance_market_step(uuid) from public, anon;
grant execute on function public.create_simulation_session(text) to authenticated;
grant execute on function public.place_market_order(uuid, uuid, text, text, bigint) to authenticated;
grant execute on function public.advance_market_step(uuid) to authenticated;

-- Deterministic fictional market seed. These are invented educational securities.
insert into public.market_scenarios (id, name, start_at, interval_ms)
values ('tilt-demo-v1', 'TILT Demo Scenario v1', '2026-11-20T00:00:00Z', 3600000)
on conflict (id) do nothing;

insert into public.companies (symbol, name, sector, description, initial_price_paise) values
  ('ASTE', 'Aster Energy', 'Energy', 'Renewable power and grid storage developer.', 10000),
  ('NVMT', 'Nova Motors', 'Automobile', 'Electric two-wheeler and compact mobility manufacturer.', 20000),
  ('BGTC', 'BlueGrid Technologies', 'Technology', 'Cloud infrastructure and enterprise software provider.', 15000),
  ('HVFD', 'Harvest Foods', 'FMCG', 'Packaged foods and everyday consumer products company.', 8500),
  ('ZNFC', 'Zenith Finance', 'Financial Services', 'Digital lending and financial services company.', 12500),
  ('MEDX', 'MedAxis Life', 'Healthcare', 'Diagnostics and medical technology network.', 18000),
  ('URBN', 'UrbanNest Realty', 'Real Estate', 'Residential and commercial property developer.', 9000),
  ('LOGX', 'LogiX Networks', 'Industrials', 'Warehousing and supply-chain logistics operator.', 11000)
on conflict (symbol) do nothing;

insert into public.market_events (id, scenario_id, market_step, title, description, effect_bps, symbol, sector) values
  ('evt-001', 'tilt-demo-v1', 1, 'Strong quarterly results', 'Aster Energy reports better-than-expected quarterly performance.', 800, 'ASTE', null),
  ('evt-002', 'tilt-demo-v1', 2, 'Sector-wide funding pressure', 'A slowdown in new lending affects financial services companies.', -500, null, 'Financial Services'),
  ('evt-003', 'tilt-demo-v1', 3, 'Major supply contract', 'Nova Motors secures a large fleet supply contract.', 700, 'NVMT', null),
  ('evt-004', 'tilt-demo-v1', 4, 'Technology sector correction', 'A broad valuation reset affects technology shares.', -600, null, 'Technology'),
  ('evt-005', 'tilt-demo-v1', 5, 'Input-cost relief', 'Lower logistics and packaging costs support consumer companies.', 350, null, 'FMCG')
on conflict (id) do nothing;

insert into public.price_points (scenario_id, market_step, symbol, price_paise, recorded_at)
select 'tilt-demo-v1', 0, symbol, initial_price_paise, '2026-11-20T00:00:00Z'::timestamptz
from public.companies where is_active
on conflict (scenario_id, market_step, symbol) do nothing;
