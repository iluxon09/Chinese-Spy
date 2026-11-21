# TILT product design system

**Status:** applied in `product-design/audit-refinement`  
**Product:** educational stock-market and portfolio simulator for students, clubs and institutional facilitators.

## Design direction

TILT should read as a **market-learning workspace**, not a broker clone and not a generic SaaS dashboard. Its distinctive cues are a deep-ink work surface, warm mineral paper in light mode, a signal-orange action colour, and market-teal performance semantics.

The application serves two related audiences: learners who need understandable feedback while exploring markets, and facilitators / institutions who need a credible teaching environment. The interface therefore favours precise figures, clear market context, explanatory microcopy and visible simulation disclaimers over decoration.

## Colour tokens

| Token | Light theme | Dark theme | Use |
|---|---|---|---|
| Canvas | `#F4F1E9` | `#081827` | Main page background |
| Surface | `#FFFDF8` | `#102333` | Panels and work areas |
| Soft surface | `#F2EEE5` | `#162C3D` | Table heads, input surfaces |
| Ink / text | `#172D3B` | `#F1EEE6` | Primary text |
| Muted text | `#667780` | `#A2B2BD` | Captions and secondary labels |
| Border | `#DED8CC` | `#2B4353` | Dividers and control outlines |
| Brand action | `#E97C24` | `#FF9138` | Primary actions and neutral quote-series identity |
| Positive | `#177D6B` | `#5BC4A3` | Positive P&L and successful outcomes |
| Negative | `#B9504A` | `#F18D83` | Negative P&L and errors |
| Information | `#4267B2` | `#8FA9E6` | Information and secondary actions |
| Sidebar | `#0B1C2B` | `#06121E` | Persistent navigation rail |

Orange is deliberately not used to mean “profit”. It identifies TILT actions and the neutral price series. Positive / negative financial outcomes remain teal / coral and retain signed numeric labels.

## Typography

- **Manrope** is the interface family for headings, body copy, controls and navigation.
- **IBM Plex Mono** is reserved for prices, balances, quantities, market steps and other tabular data.
- The product uses no additional type families.
- Page titles are constrained to a consistent responsive range; section headings and captions step down from that hierarchy.
- Financial values use tabular numerals so changing values do not cause distracting width shifts.

## Layout and component rules

- Spacing follows a 4px base scale: 4, 8, 12, 16, 20, 24, 32 and 40px.
- Radius tiers are 6px, 9px and 13px. Containers are grouped by content rather than wrapping every item in a card.
- Borders and whitespace take precedence over shadows. Shadows are reserved for subtle separation.
- The persistent desktop rail and mobile navigation remain part of the shared application shell.
- Data tables use consistent header treatment, cell padding, row dividers and horizontal overflow on narrow screens.
- Inputs have a consistent 42px minimum control height and visible focus treatment.
- Shared page-state panels cover loading, access-required and unavailable-data states. Actions are rendered only when there is a real next step.
- The portfolio uses ranked allocation bars because they compare exact weights more directly than a multi-colour pie chart, especially on mobile.
- Quote charts use a single brand series colour. P&L direction is represented separately by positive / negative semantic colours.
- The only animation in the new shared state system is the loading indicator; it is disabled under reduced-motion preferences.

## Theme behaviour

Dark remains the first-visit default; light mode is still user-selectable and persisted. Both themes use the same semantic tokens, including chart grid, tooltip and focus colours. New components must consume tokens rather than add page-specific hex values.

## Guardrails for future work

1. Do not encode success or profit using the brand-orange action colour.
2. Do not add extra accent colours to make charts look “richer”; start with one series and add a second only when it represents a distinct measure.
3. Prefer comparison tables, ranked lists and bars to decorative charts when they answer the question more clearly.
4. Keep API-owned values and server calculations authoritative. UI copy may explain an estimate but must not imply that a preview is an actual trade or payment.
5. Keep new global styling in `src/app/design-system.css`; avoid extending the legacy stylesheet's compatibility overrides without a documented reason.
