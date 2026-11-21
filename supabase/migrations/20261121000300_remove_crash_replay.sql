-- Retire the obsolete risk questionnaire and deterministic replay feature.
-- Keep historical migrations untouched to preserve existing migration checksums.
begin;
drop function if exists public.create_crash_replay_run(jsonb, text, integer, integer);
drop function if exists public.complete_crash_replay_attempt(uuid, text);
-- Replay sessions are isolated to this scenario; their related holdings and
-- transactions are removed by the simulation_sessions foreign-key cascades.
delete from public.simulation_sessions where scenario_id='tilt-crash-replay-v1';
delete from public.market_events where scenario_id='tilt-crash-replay-v1';
delete from public.price_points where scenario_id='tilt-crash-replay-v1';
drop table if exists public.crash_replay_runs;
delete from public.market_scenarios where id='tilt-crash-replay-v1';
commit;
