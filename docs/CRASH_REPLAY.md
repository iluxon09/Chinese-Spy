# TILT Crash Replay

## Purpose

Crash Replay measures the gap between a participant's stated risk preferences and observable decisions during a fixed, educational market shock. It uses virtual money and is not a regulated investment suitability test.

## User flow

1. The participant completes the risk questionnaire.
2. The API derives a transparent Conservative, Balanced or Aggressive classification and stores the answers and selected limits.
3. The database RPC creates two separate simulation sessions for the same `tilt-crash-replay-v1` scenario.
4. The participant completes the five-step baseline attempt.
5. The participant starts reassessment with a fresh portfolio but the same shared scenario prices and events.
6. The comparison reports trade count, sales following an 8% or greater decline, charges and final portfolio value/return. It verifies that the two attempts received the same symbol/step/price series.

## Determinism and isolation

- The replay scenario has a dedicated scenario ID and does not modify `tilt-demo-v1`.
- Its initial price snapshot is seeded from the active company catalogue.
- The five-step event sequence is fixed in `market_events`.
- The existing `advance_market_step` RPC remains the only writer for later price steps. It locks the scenario and materialises each step once; later sessions reuse those exact rows.
- Baseline and reassessment each have their own `simulation_sessions`, holdings, cash balance and transactions.
- Replay-run ownership, attempt completion and session creation are enforced by authenticated database RPCs and row-level security. The client cannot write directly to the replay-run table.
- The completion RPC refuses to mark an attempt complete before market step five and refuses reassessment completion until the baseline has completed.

## Risk questionnaire

The questionnaire records horizon, drawdown comfort, stated response to a sharp fall, preferred number of holdings, investment objective and maximum single-company position. Its scoring is a transparent educational classification only; it is not a psychometric or regulated suitability instrument.

## Migration and deployment

Apply `supabase/migrations/20261121000100_crash_replay.sql` to the connected Supabase project after the existing TILT schema migration has been applied. The migration is additive and creates the replay scenario, event seed, run table, row-level security policies and two RPCs.

After applying it, sign in and open `/crash-replay`. If the migration is missing, the route will return a database error rather than silently creating a partial replay.

## Known boundaries in this first release

- The selected drawdown and position limits are displayed as the participant's declared guardrails; this release does not automatically block or enforce trades that exceed them.
- This version does not yet include rule-adherence scoring, the disposition-effect or post-loss trading-escalation detectors, the broader TILT Process Score, or just-in-time lesson nudges.
- Comparison outcomes describe only simulated behaviour. They do not establish real-money behaviour or predict future returns.
