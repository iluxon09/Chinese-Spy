# TILT — Revenue model and demo checkout

This is a **presentation-only, non-financial** preview of the pilot-first revenue
model in Section 9 of `TILT_Full_Plan.pdf`.

## Source-aligned commercial path

1. **Free student demo** — the entry point for learners.
2. **Facilitated class or club session** — validate the learning experience with a professor, programme organiser or club lead.
3. **Paid cohort pilot** — the first commercial conversion.
4. **Annual institutional site licence** — the intended scale-up for business schools, finance programmes, CFA-prep groups and trading clubs.

The plan identifies business schools and finance programmes as the most reachable initial buyers. Broker and fintech education is a later market (per-activated-user or annual licence); trading and prop-style firms are also later (per-assessment or per-seat). Extra scenario packs and deeper reports are secondary freemium options, not the primary revenue line.

## Pricing is deliberately not invented

The source plan explicitly makes no claim about Indian pricing, willingness to pay, market size or revenue. It says pricing will be validated through pilots. Accordingly, the page does **not** publish invented rupee amounts or a per-student rate. The cohort-size estimator collects only scope information for a demo request; it does not calculate a quote.

## Routes

- `/pricing`: the free entry point, initial institutional pilot/site-licence path, and later-stage segments.
- `/pricing/demo-checkout?plan=cohort-pilot`: class or club pilot walkthrough.
- `/pricing/demo-checkout?plan=site-licence`: annual institutional site-licence walkthrough.
- `/pricing/demo-checkout?plan=broker-fintech`: later-stage broker / fintech walkthrough.
- `/pricing/demo-checkout?plan=trading-firm`: later-stage trading / prop-firm walkthrough.

## Deliberate limitations

**No real payment infrastructure is implemented.** These screens do not call payment
gateways, request UPI IDs, card numbers, bank details or personal contact details,
create quotes or transactions, save payment data, change account roles, or unlock
paid features. The completion screen explicitly says no quote or commercial order was
created and ₹0 was charged.

No environment variables, database changes, Supabase policies, provider accounts or
trading/simulation changes are required to run this demo.

## Reviewer smoke test

1. Open `/pricing` on desktop and mobile; confirm the free demo → paid pilot → annual
   institutional licence sequence, with later-stage channels clearly separated.
2. Open each of the four demo-flow URLs above and select UPI, card and net banking.
   Confirm these are local UI states and no credential fields appear.
3. For the cohort pilot and site licence flows, test cohort counts 1, 5000, blank,
   decimal, zero and 5001. Only whole numbers from 1 to 5,000 should continue.
4. Complete each demo and confirm the result says ₹0 charged, no quote/order created,
   and no account access changed.
5. Open `/pricing/demo-checkout?plan=invalid`. It must not show a checkout.
6. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.

This feature is a business-model presentation, not a billing implementation. Any real
price points, paid benefits or payment provider integration require separate validation,
product scope, legal review and implementation.
