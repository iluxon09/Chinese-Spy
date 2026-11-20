# TILT Intraday Market Model

## Candle interval and playback

The regular `tilt-demo-v1` scenario advances in five-minute simulated candles. Shared play/pause controls are available on both the Markets and Simulator pages. Playback can run at 5 seconds, 2.5 seconds or 1 second per candle, or the user can advance manually. The playback state lives in the shared provider, so it continues across Markets, Trading and Portfolio routes. The next tick is scheduled only after the previous API write and portfolio refresh have completed; it does not overlap requests.

## How each candle moves

Every company receives a reproducible return made from five components:

1. **Market factor:** one shared movement for the whole market at that scenario step.
2. **Sector factor:** one shared movement for each sector at that step.
3. **Company factor:** a symbol-specific movement scaled by its volatility multiplier.
4. **Macro shock:** a low-probability, market-wide positive or negative jump.
5. **Scheduled news:** existing scenario events are applied after the background movement.

All components are expressed in basis points. The ordinary factors are two-sided and have zero drift by default, so stocks can rise and fall rather than move only when a news event exists. Each company's volatility multiplier changes its idiosyncratic range.

## Reproducibility and concurrency

The SQL implementation hashes the scenario ID, market step, factor and symbol/sector into stable buckets. It does not call `random()` or depend on request timing. Thus, a given scenario and step always produces the same price path for every user's session.

The crash-replay scenario has all background volatility and shock parameters set to zero. Its five-step sell-off and recovery remain controlled by the existing scripted market events.

The market-step RPC locks the user's own session and takes a transaction-scoped advisory lock for only the specific scenario/candle. It does not take a global lock on the scenario row, so different candles and scenarios can progress in parallel. Deterministic generation and the unique `(scenario_id, market_step, symbol)` key with `ON CONFLICT DO NOTHING` ensure concurrent users converge on the same price rows.

## History and limits

The market-history API and client cache retain the most recent 500 candles per symbol. This caps chart memory and response size during longer auto-play sessions; older transaction records and stored price rows are not deleted.

## Migration

Apply `supabase/migrations/20261121000200_intraday_market_volatility.sql` in Supabase SQL Editor after the original TILT schema and Crash Replay migrations. It adds model settings and company volatility multipliers, updates regular-market timestamps to five-minute intervals, replaces only the market-advance RPC, and preserves holdings, transactions, cash balances and order calculations. Apply migrations in timestamp order.
