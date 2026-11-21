-- Versioned, account-scoped TILT acknowledgement and optional Gemini processing choice.
-- The browser can read only its own record; writes go through an authenticated RPC.

begin;

create table if not exists public.user_consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_version text not null,
  core_data_acknowledged boolean not null default true
    check (core_data_acknowledged = true),
  ai_processing_consent boolean not null default false,
  accepted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, consent_version)
);

alter table public.user_consents enable row level security;
revoke all on table public.user_consents from public, anon, authenticated;
grant select on table public.user_consents to authenticated;

drop policy if exists user_consents_select_own on public.user_consents;
create policy user_consents_select_own
  on public.user_consents
  for select
  to authenticated
  using (auth.uid() = user_id);

create or replace function public.record_tilt_consent(
  p_consent_version text,
  p_ai_processing_consent boolean
)
returns table (
  consent_version text,
  core_data_acknowledged boolean,
  ai_processing_consent boolean,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $tilt_consent$
declare
  v_user_id uuid := auth.uid();
  v_now timestamptz := clock_timestamp();
begin
  if v_user_id is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if p_consent_version is distinct from '2026-11-21-v1'
     or p_ai_processing_consent is null then
    raise exception using errcode = '22023', message = 'INVALID_CONSENT';
  end if;

  return query
  insert into public.user_consents as stored (
    user_id, consent_version, core_data_acknowledged,
    ai_processing_consent, accepted_at, updated_at
  )
  values (
    v_user_id, p_consent_version, true,
    p_ai_processing_consent, v_now, v_now
  )
  on conflict (user_id, consent_version) do update
  set
    core_data_acknowledged = true,
    ai_processing_consent = excluded.ai_processing_consent,
    accepted_at = v_now,
    updated_at = v_now
  returning
    stored.consent_version,
    stored.core_data_acknowledged,
    stored.ai_processing_consent,
    stored.accepted_at;
end;
$tilt_consent$;

revoke all on function public.record_tilt_consent(text, boolean) from public, anon;
grant execute on function public.record_tilt_consent(text, boolean) to authenticated;

comment on table public.user_consents is
  'Versioned, account-scoped acknowledgement of TILT core data use and optional AI processing.';
comment on function public.record_tilt_consent(text, boolean) is
  'Records the signed-in user’s TILT consent choices using a database-generated timestamp.';

commit;
