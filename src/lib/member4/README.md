# Member 4 modules integrated into TILT

This directory contains Member 4's pure TypeScript modules, incorporated into the main Next.js application without introducing a nested npm package or replacing Member 1's backend domain contracts.

## Active application integrations

- **Finance Academy:** five stable lesson IDs, lesson content, practical examples, key takeaways and quizzes. Behavioral Analysis recommendations use these IDs to link observed patterns to relevant lessons.
- **Investment Architect:** the UI calls the pure SIP and goal-based SIP functions from this module. Both calculators validate inputs and return assumptions and educational disclaimers.

## Preserved but not active in the current market

- `content/companies.ts` contains ten Member 4 fictional companies.
- `content/newsEvents.ts` contains Member 4 event definitions.
- `scenarios/demoScenarios.ts` contains four behavioural demonstration scenarios.

These are preserved as reference data, but are **not seeded into the live simulation**. The database's canonical market contains eight different symbols: ASTE, NVMT, BGTC, HVFD, ZNFC, MEDX, URBN and LOGX. Member 4's catalogue and scenarios refer to different symbols and event IDs. Activating them without an explicit symbol/event adapter would cause unknown-symbol or missing-price failures.

## Contract boundaries

- `types/shared.ts` remains under the Member 4 namespace. It is not a replacement for Member 1's paise-denominated API/domain types.
- Member 4's calculator amounts are rupee-denominated values.
- The current trading API accepts order intent and calculates execution price and charges server-side in integer paise.
- Behavioral Analysis reports map their detector identifiers to these stable Member 4 Academy lesson IDs through the adapter in `src/lib/behavioral-analysis/engine.ts`.
- Member 4's static behaviour dashboard remains unused because it is a mock. The active `/behaviour` screen analyses the signed-in user's authenticated TILT simulation data.

## Tests

The Member 4 source tests are copied into `tests/member4/` and run through the root application's existing Vitest setup. No second package manager, Vitest installation or TypeScript configuration is introduced.
