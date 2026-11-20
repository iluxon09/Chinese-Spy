# TILT — Member 4 Package

**Finance Academy • Investment Architect • CSV Import • Demo Scenarios**

Team CHINESE SPY · Hack N Pitch 2026

This package contains every deliverable owned by Member 4. All calculation logic is pure TypeScript, fully unit-tested, and free of side-effects so Member 2 can wire UI screens without depending on a live backend.

---

## What’s included

| Module | Path | Status |
|--------|------|--------|
| Shared types | `src/types/shared.ts` | Ready for team alignment |
| Finance Academy (5 lessons) | `src/academy/` | Complete + quizzes |
| SIP calculator | `src/calculators/sip.ts` | Pure + tested |
| Goal calculator | `src/calculators/goal.ts` | Pure + tested |
| CSV transaction import | `src/import/csvParser.ts` | Validating parser + template |
| Fictional companies | `src/content/companies.ts` | 10 companies |
| Scripted market events | `src/content/newsEvents.ts` | 8 events |
| Demo scenarios | `src/scenarios/demoScenarios.ts` | 4 indicator demos |

---

## Lesson ↔ Indicator mapping (coordinate with Member 3)

| Indicator | Primary Lesson ID |
|-----------|-------------------|
| `fomo` | `decision_discipline` |
| `overtrading` | `transaction_costs` |
| `concentration` | `diversification` |
| `panic_selling` | `volatility` |

---

## Quick start

```bash
cd tilt-member4
npm install
npm test          # all unit tests
npm run typecheck # strict TypeScript
npm run build     # emit dist/
```

---

## Usage examples

### SIP calculator

```ts
import { calculateSip } from 'tilt-member4';

const result = calculateSip({
  monthlyContribution: 10_000,
  annualReturnRate: 0.12, // 12 %
  years: 10,
});
// result.estimatedValue, result.totalInvested, result.disclaimer, …
```

### Goal calculator

```ts
import { calculateGoalSip } from 'tilt-member4';

const result = calculateGoalSip({
  targetAmount: 2_000_000,
  years: 12,
  annualReturnRate: 0.10,
  existingCorpus: 150_000,
});
// result.requiredMonthlySip, …
```

### CSV import

```ts
import { parseTransactionCsv, getCsvTemplate } from 'tilt-member4';

const { valid, invalid } = parseTransactionCsv(csvString);
// valid → Transaction[] with isImported: true
// invalid → never silently imported
```

### Academy & scenarios

```ts
import {
  getAllLessons,
  getPrimaryLessonId,
  DEMO_SCENARIOS,
} from 'tilt-member4';
```

---

## CSV template (minimum columns)

```
date,symbol,side,quantity,price,charges,note
2026-03-01,AQUA,BUY,50,120.50,15.00,First purchase
```

Supported aliases for headers are documented inside `csvParser.ts`.

---

## Notes for the rest of the team

- **Member 1** — use `FICTIONAL_COMPANIES` and `MARKET_EVENTS` as seed data; price multipliers are deterministic.
- **Member 2** — import pure calculator functions and lesson objects; build UI around them. Charts should consume real portfolio data, not these modules.
- **Member 3** — use `INDICATOR_TO_PRIMARY_LESSON` / `getPrimaryLessonId` so recommendation.lessonId values stay consistent.
- All monetary results are rounded to 2 decimal places. Invalid inputs throw descriptive errors or return validation arrays (never silent NaNs).
