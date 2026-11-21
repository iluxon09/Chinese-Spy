# TILT UI/UX audit and remediation log

**Audit date:** 21 November 2026  
**Scope:** every user-facing App Router route and its primary feature component. This is a source-level inspection plus automated build/test review, not a complete manual browser walkthrough.

## Product assessment
TILT is an educational stock-market simulator for learners and student groups, with an institutional proposal surface for facilitators. The appropriate design language is a market-learning workspace: precise values and market context, strong legibility, restrained motion and explanatory feedback. It should not imitate a retail broker or use a generic SaaS dashboard template.

## Cross-cutting findings and remediation
| Priority | Finding | Impact | Change |
|---|---|---|---|
| High | Logo palette and UI accent palette were disconnected | Product mark did not inform the rest of the interface | Reworked semantic tokens around deep ink, warm paper, signal orange, market teal, coral and restrained cobalt |
| High | Dashboard, Markets and Trading quote charts used fixed green lines and hard-coded tooltip / axis colours | Quote direction looked like profit semantics and themes diverged | Introduced chart tokens for neutral quote series, grid, axes and tooltips |
| High | Data pages had inconsistent bare-text loading / sign-in / failure states | First-time and returning users received uneven feedback | Added shared accessible PageState panels to Dashboard, Markets, Trading, Simulator and Portfolio; Crash Replay shares the loading panel |
| High | Portfolio used a rainbow pie chart for exact per-company holdings weights | Difficult to compare values; colour decoration competed with numeric data | Replaced with sorted, labelled bars and exact market-value / weight figures |
| Medium | Portfolio component was minified and difficult to review | Increased maintenance risk | Rewrote it into readable, typed components without changing the portfolio snapshot API |
| Medium | Crash Replay error message lacked a direct recovery action | Failed load could strand a learner | Added a retry action using the existing initialise routine |
| Medium | Dashboard exposed a technical session ID after create | Internal identifier added noise without helping a learner | Confirmation now reports the new portfolio is ready; failures use an alert state |
| Medium | Pricing preview used a generic sparkle glyph and gradient emphasis | Generic AI styling was unrelated to a business-model proposal | Replaced icon with a finance / institutional glyph and removed the gradient highlight |
| Medium | Legacy dark-mode auth and dashboard rules overrode new palette tokens | A theme could retain stale chartreuse / green accents | Added explicit token-driven dark refinements and reduced auth / header blur |

## Route review
| Route | Purpose and review |
|---|---|
| / | Market / portfolio command centre. Existing KPIs, watchlist, price history and transactions are retained. Quote line becomes neutral orange; session-creation feedback and data states are improved. |
| /markets | Company discovery, search, sector filter, watchlist and quote history. Existing interactions are retained; access/loading/failure states and chart theme styling are standardised. |
| /trading | BUY / SELL virtual order entry. Existing server-authoritative execution, affordability checks and order response are untouched; page states and quote chart styling are standardised. |
| /portfolio | Holdings, allocation and returns. Pie chart replaced with ranked bars; snapshot and holdings contracts are unchanged; cash-only state points to Markets. |
| /simulator | Market playback and manual advancement. Existing playback controls retained; shared loading/auth/data-error feedback introduced. |
| /crash-replay | Risk questionnaire, baseline attempt and comparison. Existing stages and server endpoints retained; shared loading state and retry affordance added. |
| /behaviour | Explains detected / not-detected / insufficient-data activity signals. Existing caveat that signals describe activity, not intent, is preserved; thresholds were not changed. |
| /academy | Browse finance lessons. Existing lesson catalogue and navigation retained. |
| /academy/[lessonId] | Read a lesson and complete its knowledge check. Existing interaction retained; automated journey coverage remains outstanding. |
| /portfolio/architect | Rule-based illustrative allocation worksheet. Existing calculation and educational disclaimer retained. |
| /portfolio/architect/sip | SIP and goal calculator. Numeric input and calculation flow retained. |
| /pricing | Proposed institutional business model. Proposal-only / no active payment and entitlement disclosures retained. |
| /pricing/demo-checkout | No-charge checkout UI demonstration, not a real payment flow. Existing no-payment disclaimer retained. |
| /login | Supabase sign-in and account creation. Authentication flow unchanged; visual treatment simplified and brought onto the brand palette. |

## Functional integrity
- No API endpoint, request body, Supabase authentication contract, market model, database schema, pricing entitlement or server-side order logic was intentionally changed.
- Portfolio still renders server-calculated allocation, holdings and P&L fields.
- Allocation weights remain relative to total holdings value, as defined by the existing portfolio engine.
- Checkout remains explicitly no-charge and does not request real payment credentials.

## Remaining issues
1. Browser-driven regression coverage is still missing. A successful build cannot verify mobile viewport behaviour, browser-console cleanliness or complete user journeys. Add Playwright tests for sign-in, session creation, market filtering/watchlist, BUY/SELL, portfolio empty/populated state, Crash Replay and lesson knowledge checks.
2. Markets watchlist is component-local state and can reset on remount / reload. Persistence needs an explicit product decision about user scope and storage, so this pass does not invent a new backend.
3. Crash Replay remains a large feature component. Split presentation stages after adding tests around existing transitions and endpoints.
4. Legacy global CSS still has compatibility mappings for earlier utility classes and theme overrides. New component rules are separated in design-system.css; retire old mappings incrementally after screenshot/route coverage exists.
5. Behavioural-analysis thresholds remain heuristic and need validation against labelled simulation sessions.
6. Institutional pricing remains a proposal. Subscription and payment entitlements are not active.

## Validation
PR validation records clean dependency install, dependency audit, ESLint, TypeScript, unit tests and production build. Vercel preview will be checked before merge. Unless a browser walkthrough is completed, visual and interaction QA must not be inferred from builds alone.
