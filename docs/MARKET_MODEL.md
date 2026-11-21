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
6. **Synthetic stock catalysts:** each active company has an independent 14% event roll per candle, with a maximum 3.00% price impact. With eight active companies, the probability that at least one stock-specific event appears on a candle is about 70%. A broad-market shock has a separate 1.5% per-candle probability and a maximum 2.50% move. The same logic runs at every playback speed; speed changes only wall-clock delay between candles.

All components are expressed in basis points. The ordinary factors are two-sided and have zero drift by default, so stocks can rise and fall rather than move only when a news event exists. Each company's volatility multiplier changes its idiosyncratic range.

## Reproducibility and concurrency

The SQL implementation hashes the scenario ID, market step, factor and symbol/sector into stable buckets. It does not call `random()` or depend on request timing. Synthetic catalysts use separate stable seeds for probability, direction, magnitude and event type. They look unpredictable to participants, but a given scenario, step and symbol always produces the same committed prices/events for every user's session and retry.

Generated catalyst headlines are explicitly fictional; they are not real stock news. Google Search-grounded real-market research is available on both Markets and Simulator pages. It reports Nifty 50 leaders/laggards and the ten-stock watchlist from the market-pulse prototype, with verified dates, quote cutoffs and source links. It never changes simulated prices. The retired crash-replay scenario is removed by the cleanup migration. Its historical migration remains only to preserve migration ordering.

The market-step RPC locks the user's own session and takes a transaction-scoped advisory lock for only the specific scenario/candle. It does not take a global lock on the scenario row, so different candles and scenarios can progress in parallel. Deterministic generation and the unique `(scenario_id, market_step, symbol)` key with `ON CONFLICT DO NOTHING` ensure concurrent users converge on the same price rows.

## History and limits

The market-history API and client cache retain the most recent 500 candles per symbol. This caps chart memory and response size during longer auto-play sessions; older transaction records and stored price rows are not deleted. A database trigger also caps each simulation session at 10,000 market steps. Because price rows are shared by scenario and step, this bounds new price-history growth even when many users advance concurrently.

## Migration

Apply migrations in timestamp order. For a database already migrated through `20261121000500`, apply `20261121000600_dynamic_market_events_and_insights.sql` once. It adds deterministic per-stock catalysts, increases the active demo market's five-minute volatility, and creates the separate real-market research quota. For a database migrated only through `20261121000300`, apply migrations `20261121000400`, `20261121000500` and `20261121000600` in order. Never re-run previously applied migrations.
