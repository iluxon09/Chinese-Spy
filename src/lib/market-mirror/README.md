# Market Mirror integration

Member 3's four detector modules are integrated into the TILT app under `src/lib/market-mirror`.

## Live data flow

The dashboard reads the authenticated user's existing TILT context:
- completed transactions from the session portfolio API,
- current holdings and current prices from the portfolio snapshot,
- company sectors from the session market API,
- persisted price history already loaded for each active company.

The adapter in `engine.ts` maps the backend contract into the detector contract. TILT stores monetary values in integer paise; Member 3's detector contract uses rupees, so execution prices, charges, current prices and historical prices are divided by 100 exactly once at the adapter boundary. Quantities and market-step values are unchanged.

## Recommendation contract

Market Mirror recommendations link to Member 4's stable Academy lesson IDs:

| Detector | Lesson ID |
|---|---|
| Panic selling | `volatility` |
| FOMO | `decision_discipline` |
| Overtrading | `transaction_costs` |
| Concentration | `diversification` |

## Interpretation and limitations

- These detectors are explicit heuristic rules; they do not infer intent or diagnose a trader.
- Panic selling checks a 3-step lookback and an 8% decline threshold.
- FOMO checks a 3-step lookback, a 10% rise threshold and repeated qualifying buys.
- Overtrading uses completed-trade frequency per elapsed market step, clustering in one step and fee drag relative to traded value.
- Concentration checks the largest single-stock and single-sector shares of invested holding market value. Uninvested cash is excluded from that denominator.
- The detector outputs `INSUFFICIENT_DATA` when there is not enough valid history; that status must not be presented as a clean result.
- A detected pattern may have a non-emotional explanation (such as a planned stop-loss or deliberate short-term strategy).

## Security / persistence

The dashboard is read-only. It uses existing authenticated, session-owned API data. No new database table, background scoring job, RPC, order write or user-profile field is created by this integration.

## Tests

Member 3's original detector suite is copied to `tests/market-mirror/mirror.test.ts`. Adapter tests cover paise-to-rupee conversion, sector mapping, history conversion and stable lesson mappings.
