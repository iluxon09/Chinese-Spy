# TILT — Pricing and demo checkout

This feature implements a **presentation-only, non-financial** revenue-model preview:

- `/pricing`: proposed plans and pricing, matching the team's TILT Revenue Model PDF.
- `/pricing/demo-checkout?plan=plus`: TILT Plus (₹999/year).
- `/pricing/demo-checkout?plan=report`: proposed one-off Market Mirror report (₹199).
- `/pricing/demo-checkout?plan=college`: college licence estimate (₹150/student/year).
- Partner pricing is indicative ₹5–6 lakh/year; there is no partnership checkout.
- Free access remains available through the regular simulator.

## Deliberate limitations

**No real payment infrastructure is implemented.** These screens do not call payment
gateways, request UPI IDs, card numbers, bank details or personal contact details,
create transactions, save payment data, change account roles, or unlock paid features.
The completion screen explicitly says a simulated checkout occurred and ₹0 was charged.

The prices and revenue projections in the supplied PDF are assumptions, not existing
commercial terms. Proposed paid benefits (including broker-statement analysis,
instructor dashboards and progress tracking) must not be represented as already live.

No environment variables, database changes, Supabase policies, or payment-provider
accounts are required to run this demo.

## Reviewer smoke test

1. Open `/pricing` using desktop and mobile layouts. Confirm the free card and four
   proposed revenue streams and that the sidebar navigation works.
2. Visit the three demo checkout links. Confirm totals are ₹999, ₹199, and
   400 × ₹150 = ₹60,000 respectively.
3. Change the college seat count; invalid values must disable simulation.
4. Switch the mock payment-method display, then click **Simulate checkout — no charge**.
   Confirm the result states there was no transaction or entitlement change.
5. Open `/pricing/demo-checkout?plan=invalid`. It must not display a fake order.
6. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

This PR should be reviewed and merged by Member 1. Deployment to Vercel happens
only when the integration branch/deployment configuration is updated.
