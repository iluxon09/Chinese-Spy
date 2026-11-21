# Behavioral Analysis

The Behavioral Analysis module evaluates observable patterns in the authenticated user's active TILT simulation. It is read-only and uses completed transactions, price history, current holdings and company sectors already loaded by the application.

## Data flow

The adapter in `engine.ts` maps the live TILT API/domain contract into the detector contract. TILT stores monetary values in integer paise; the analysis layer converts execution prices, charges, current prices and historical prices to rupees exactly once at the adapter boundary. Quantities and market-step values are unchanged.

## Patterns assessed

| Pattern | What is measured |
|---|---|
| Panic-selling-like exits | Sells executed after a sharp short-term price decline |
| FOMO-like entries | Repeated buys following sharp short-term price rises |
| Trading frequency | Trades per market step, clustered trades and transaction-cost drag |
| Portfolio concentration | Largest single-stock and single-sector shares of invested holdings |

## Educational recommendations

Reports map to Member 4's stable Finance Academy lesson IDs:

| Pattern | Lesson ID |
|---|---|
| Panic selling | `volatility` |
| FOMO-like buying | `decision_discipline` |
| Trading frequency | `transaction_costs` |
| Concentration | `diversification` |

## Interpretation and limitations

- Results are deterministic heuristics over the user's own simulation data, not psychological diagnoses or claims about personality or intent.
- Panic-selling-like exits use a 3-step lookback and an 8% decline threshold.
- FOMO-like entries use a 3-step lookback, a 10% rise threshold and repeated qualifying buys.
- Trading frequency uses completed-trade frequency per elapsed market step, clustering in one step and fee drag relative to traded value.
- Concentration checks the largest single-stock and single-sector shares of invested holding market value. Uninvested cash is excluded from that denominator.
- `INSUFFICIENT_DATA` means the available history cannot support a reliable result; it must not be displayed as a negative finding.
- A detected pattern can have non-emotional explanations, such as a planned stop-loss, a deliberate momentum strategy, liquidity needs or a response to new information.
- Thresholds are configurable educational heuristics, not empirically validated predictors. A detected pattern is a prompt for reflection, not proof of a behavioural trait or a recommendation to trade.

## Security and persistence

The dashboard is read-only. It uses existing authenticated, session-owned API data. It creates no database table, background scoring job, RPC, order write or user-profile field.
