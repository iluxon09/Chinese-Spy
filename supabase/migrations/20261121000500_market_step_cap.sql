-- Bound shared market-history growth from repeated market advancement.
-- A session may advance through at most 10,000 market steps. The guard lives
-- in PostgreSQL so it also protects calls that bypass the Next.js route.

begin;

create or replace function public.enforce_simulation_market_step_cap()
returns trigger
language plpgsql
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if new.market_step > 10000 then
    raise exception using
      errcode = 'P0001',
      message = 'MARKET_STEP_LIMIT_REACHED';
  end if;

  return new;
end;
$$;

drop trigger if exists simulation_sessions_market_step_cap
  on public.simulation_sessions;

create trigger simulation_sessions_market_step_cap
before insert or update on public.simulation_sessions
for each row
execute function public.enforce_simulation_market_step_cap();

comment on function public.enforce_simulation_market_step_cap() is
  'Rejects simulation sessions that advance beyond 10,000 market steps to bound shared price-history growth.';

commit;
