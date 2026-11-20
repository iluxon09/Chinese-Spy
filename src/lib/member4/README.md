# Member 4 modules integrated into TILT

This directory contains Member 4's pure TypeScript modules, incorporated into the main Next.js application without introducing a nested npm package or replacing Member 1's backend domain contracts.

## Active application integrations

- **Finance Academy:** five stable lesson IDs, lesson content, practical examples, key takeaways and quizzes. The UI routes use the stable IDs so they can later be used by behavioural recommendations.
- **Investment Architect:** the UI calls the pure SIP and goal-based SIP functions from this module. Both calculators validate inputs and return assumptions and educational disclaimers.
- **CSV preview:** the browser upload page uses the validating parser. Valid and invalid rows are displayed separately. The parser does not write to Supabase or alter simulation cash, holdings or transactions.

## Preserved but not active in the current market

- `content/companies.ts` contains ten Member 4 fictional companies.
- `content/newsEvents.ts` contains Member 4 event definitions.
- `scenarios/demoScenarios.ts` contains four behavioural demo scenarios.

These are preserved verbatim as reference data, but are **not seeded into the live simulation**. The existing database's canonical market contains eight different symbols: ASTE, NVMT, BGTC, HVFD, ZNFC, MEDX, URBN and LOGX. Member 4's catalogue/scenarios refer to symbols including AQUA, GREEN, MEDIX, FINCORP, AGRO, STEELX, CLOUDY, PHARMA, RETAIL and INFRA, plus event IDs that are not in the current database. Activating them without an explicit symbol/event adapter would cause unknown-symbol or missing-price failures.

## Contract boundaries

- `types/shared.ts` is kept under the Member 4 namespace. It is not a replacement for Member 1's paise-denominated API/domain types.
- Member 4's calculator amounts and CSV prices/charges are rupee-denominated values.
- The current trading API accepts order intent and calculates execution price/charges server-side in integer paise. Do not directly replay imported CSV transactions into that API.
- Member 3's Market Mirror uses a separate behaviour-report shape. Map the Member 4 lesson IDs to Member 3 recommendations through an explicit adapter during the final Market Mirror integration.
- The static behaviour dashboard in Member 4's copied frontend is a mock insight screen. It is intentionally not wired into the app; Market Mirror remains deferred until its actual detector engine is adapted and tested.

## Tests

The Member 4 source tests are copied into `tests/member4/` and run through the root application's existing Vitest setup. No second package manager, Vitest installation or TypeScript configuration is introduced.
