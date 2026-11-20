# TILT — Revenue model and demo checkout

This is a **presentation-only, non-financial** preview of the pilot-first revenue
model in Section 9 of `TILT_Full_Plan.pdf`.

## Public access

- `/pricing` and all `/pricing/*` pages are public. Visitors do not need a Supabase account.
- Public pricing pages do not bootstrap a simulation session or trigger market auto-play.
- The sign-in link leads to the authenticated workspace. All other application routes
  continue to use the existing Supabase authentication boundary.

## Source-aligned commercial path

1. **Free student demo** — the entry point for learners.
2. **Facilitated class or club session** — validate the learning experience with a professor, programme organiser or club lead.
3. **Paid cohort pilot** — the first commercial conversion.
4. **Annual institutional site licence** — the intended scale-up for business schools, finance programmes, CFA-prep groups and trading clubs.

The plan identifies business schools and finance programmes as the most reachable initial buyers. Broker and fintech education is a later market (per-activated-user or annual licence); trading and prop-style firms are also later (per-assessment or per-seat). Extra scenario packs and deeper reports are secondary freemium options, not the primary revenue line.

## Pricing is deliberately not invented

The source plan explicitly makes no claim about Indian pricing, willingness to pay, market size or revenue. It says pricing will be validated through pilots. Accordingly, the page does **not** publish invented rupee amounts or a per-student rate. The cohort-size estimator collects only scope information for the UI preview; it does not calculate a quote or send an enquiry.

Institutional benefits such as facilitated pilots, instructor guides and cohort reports are labelled as proposed where they are not yet implemented in the application.

## Routes

- `/pricing`: the free entry point, initial institutional pilot/site-licence path, and later-stage segments.
- `/pricing/demo-checkout?plan=cohort-pilot`: class or club pilot walkthrough.
- `/pricing/demo-checkout?plan=site-licence`: annual institutional site-licence walkthrough.
- `/pricing/demo-checkout?plan=broker-fintech`: later-stage broker / fintech walkthrough.
- `/pricing/demo-checkout?plan=trading-firm`: later-stage trading / prop-firm walkthrough.

## Deliberate limitations

**No real payment or lead-capture infrastructure is implemented.** These screens do not call payment
gateways, request UPI IDs, card numbers, bank details or personal contact details,
create quotes, enquiries or transactions, save payment data, change account roles,
or unlock paid features. The completion screen explicitly says no enquiry, quote or
commercial order was created and ₹0 was charged.

No environment variables, database changes, Supabase policies, provider accounts or
trading/simulation changes are required to run this demo.

## Reviewer smoke test

1. Open `/pricing` in a signed-out/incognito session, with Supabase configured and
   with the public UI fallback; it should render without redirecting to `/login`.
2. Open all four demo-flow URLs above. Select UPI, card and net banking; confirm these
   are local UI states and no credential fields appear.
3. For the cohort pilot and site licence flows, test cohort counts 1, 5000, blank,
   decimal, zero, 5001 and exponent notation. Only whole numbers from 1 to 5,000
   should continue.
4. Complete each demo and confirm the result says ₹0 charged, no enquiry/quote/order
   created, and no account access changed.
5. Open `/pricing/demo-checkout?plan=invalid`. It must not show a checkout.
6. Sign in and verify the protected workspace still redirects/loads as before.
7. Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build`.

This feature is a business-model presentation, not a billing or sales-enquiry
implementation. Any real price points, lead capture, paid benefits or payment
provider integration require separate validation, product scope, privacy review
and implementation.
