# TILT UI/UX audit and remediation log

**Audit date:** 21 November 2026  
**Scope:** all user-facing App Router pages and their primary feature components in `tilt-integration`.  
**Approach:** source-level review of routes, JSX structure, colour usage, interaction handlers, loading / error / empty states, data visualisation and responsive layout rules.

This is not a claim that every interaction has received a manual browser test. The repository has a unit-test and production-build pipeline, but no complete browser-driven journey suite was present in the reviewed project.

## Product assessment

TILT is an educational market simulator. Its visual language should feel closer to a compact market-learning terminal with an editorial teaching layer than to a trading broker or generic SaaS admin panel. The target users are learners and student groups; the pricing surface also describes institutional facilitators and finance programmes.

The earlier design system already had two font families, a light/dark theme and a structured sidebar. The principal weaknesses were not a lack of visual design, but a mismatch between the newly adopted orange / teal logo and the old chartreuse / evergreen action palette, hard-coded chart styling that bypassed theme tokens, uneven state presentation, and a portfolio chart that relied on a rainbow palette.

## Cross-cutting findings and changes

| Priority | Finding | Why it mattered | Remediation |
|---|---|---|---|
| High | Logo and interface accent were visually disconnected: logo orange / teal versus chartreuse / evergreen actions | The mark did not feel like the source of the product's colour identity | Reworked the semantic palette around ink, warm paper, signal orange, market teal, coral and restrained cobalt |
| High | Quote charts in Dashboard, Markets and Trading used fixed green lines and fixed tooltip / axis colours | A price series is not inherently a positive outcome, and fixed colours weakened dark / light consistency | Moved the neutral quote series, grid, axis labels and tooltips to shared theme variables |
| High | Loading and unauthenticated states varied between bare paragraphs and custom page layouts | First-time users received inconsistent feedback before reaching the actual tool | Added a shared page-state component to Dashboard, Markets, Trading, Simulator and Portfolio; Crash Replay now uses it for loading |
| High | Portfolio allocation used a multi-colour pie chart, even though exact per-company weights are more useful to compare | Rainbow slices made the view decorative and harder to compare, especially on mobile | Replaced the pie with sorted, labelled allocation bars and exact weight / market-value labels |
| Medium | Portfolio source markup was highly compressed and difficult to maintain | Small interface changes were unnecessarily risky | Rewrote the portfolio page component into readable, typed sections without changing its data contract |
| Medium | Crash Replay surfaced an error but did not expose a direct recovery action in the same message | A failed load or operation could leave the learner unsure how to continue | Added a retry / reload-attempt action using the existing initialisation routine |
| Medium | The pricing preview label used a generic sparkle icon | It implied a generic AI aesthetic unrelated to an institutional business-model explanation | Replaced it with a financial / institutional landmark icon |
| Medium | Authentication and sticky-header treatments carried multiple gradients / blur effects | The decorative treatment competed with the brand mark and data-oriented product identity | Simplified the authentication surfaces and removed unnecessary blur from the header / benefit surfaces |
| Medium | Repeated border radii, heading scale, form-control height and table padding drifted across screens | The same product felt like several independently styled prototypes | Added a shared component contract for type scale, radius tiers, controls, tables and page-state panels |

## Route-by-route review

| Route | Primary purpose | Audit result and remediation |
|---|---|---|
| `/` | Portfolio / market command centre | Preserved the existing KPI, price-history, watchlist and transaction hierarchy. Updated quote-chart colours to theme tokens. Removed technical session-ID text from the new-simulation confirmation and distinguished success from error feedback with appropriate live-region roles. Loading, sign-in and unavailable-data states now share the page-state component. |
| `/markets` | Company discovery, quote inspection, search, sector filter and watchlist | Preserved the actual filter, watchlist and market-playback interactions. Added consistent loading / sign-in / unavailable states and theme-aware quote axes, grid, tooltip and series. |
| `/trading` | BUY / SELL virtual order execution | Kept the existing server-authoritative order flow, charge estimate and affordability / holding guards. Standardised access and loading states; made the quote chart follow the active theme. No API route or order contract changed. |
| `/portfolio` | Holdings, allocation and performance | Replaced the rainbow pie and compressed JSX with ranked allocation bars, a signed return breakdown, a readable holdings table and a linked empty state. The existing server-calculated snapshot remains the source of truth. |
| `/simulator` | Market playback and manual advancement | Preserved the market advance and auto-play controls. Standardised the loading, sign-in and unavailable-market states. |
| `/crash-replay` | Risk questionnaire, baseline attempt, reassessment and comparison | Preserved the multi-stage assessment and server endpoints. Standardised loading feedback and added a retry / reload-attempt action to the existing error notice. |
| `/behaviour` | Explain observed trading patterns | The page already distinguishes detected, not-detected and insufficient-data signals and states that signals describe activity, not intent. No threshold or behavioural-analysis logic was changed in this design pass. |
| `/academy` | Browse finance lessons | The page is backed by the local lesson catalogue and has a distinct learning purpose. Its lesson list and navigation were retained; the shared theme and control rules apply globally. |
| `/academy/[lessonId]` | Read a lesson and complete its knowledge check | The route has a not-found state, lesson content, answer selection and submission flow. These interactions were retained. A future pass should add automated tests for the knowledge-check journey. |
| `/portfolio/architect` | Rule-based allocation worksheet | The page itself identifies its output as an illustrative framework rather than a personal recommendation. The local calculation flow and assumptions were left unchanged. |
| `/portfolio/architect/sip` | SIP and goal calculator | The page is a calculator rather than an account-data view. Its numeric inputs and result calculations were retained; it inherits the shared typography / control system. |
| `/pricing` | Proposed institutional business-model preview | The three-audience plan comparison is appropriate to the B2B model. Its warning that no paid plan or entitlement is active remains intact; the decorative icon was replaced. |
| `/pricing/demo-checkout` | No-charge checkout-flow demonstration | The page explicitly states that it is a UI simulation and requests no real payment credentials. It was not converted into a real payment flow or presented as one. |
| `/login` | Account creation and sign-in | Existing Supabase authentication flow was retained. The two-column layout remains, but the background and benefit surfaces are simplified so the product mark and authentication task lead the page. |

## Functional integrity

- No API endpoint, request payload, database schema, market model, pricing entitlement, order-execution rule or authentication contract was intentionally changed.
- BUY / SELL execution remains delegated to the existing server-authoritative order implementation.
- The portfolio redesign consumes the same `snapshot.allocation`, `snapshot.holdings` and P&L fields returned by the existing provider.
- The allocation weights remain based on total holdings value, matching the current portfolio engine; the denominator was not changed.
- The demo checkout remains explicitly non-payment and no-charge.
- All user-facing navigation and action controls reviewed in the changed components retain real links or handlers.

## Remaining issues and follow-up priorities

1. **Browser-driven regression coverage is still missing.** Unit tests and production builds do not prove mobile layout correctness, browser console cleanliness or completion of end-to-end flows. Add Playwright coverage for sign-in, create-session, market filtering, BUY / SELL, portfolio empty / populated states, Crash Replay progression and the academy knowledge check.
2. **The Markets watchlist is component-local state.** It currently resets when the page component is remounted or the browser reloads. The page should either persist it deliberately (with a documented user scope) or label its lifetime clearly; this pass did not silently move it into local storage or a new backend table.
3. **Crash Replay remains a large feature component.** Its stages are understandable in the UI but are still implemented in a single file. Split the presentation into stage components in a separate architecture pass, with existing API calls and state transitions protected by tests.
4. **The legacy global stylesheet still contains compatibility rules for earlier utility classes and theme overrides.** New design tokens and component rules are isolated in `design-system.css`, but the older CSS should be retired incrementally after screenshot / route coverage exists. A blind stylesheet rewrite would create a broad regression risk.
5. **Behavioural-analysis thresholds remain heuristic.** This is a product / model calibration issue, not a visual-design change; validate them against labelled simulation sessions before using them for stronger user claims.
6. **Institutional pricing remains a proposal.** No price points, subscription or payment entitlement are active. The current page communicates this limitation rather than pretending the feature is live.

## Validation record

The branch is intended to pass the repository's existing clean-install, dependency-audit, ESLint, TypeScript, unit-test and production-build workflow, followed by a Vercel preview and production rollout. Route HTTP checks and the workflow results will be recorded in the pull request and release summary. No manual visual walkthrough should be inferred from a successful build alone.
