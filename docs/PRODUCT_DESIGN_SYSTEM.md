# TILT product design system

**Product:** educational market simulator for students, student groups and institutional facilitators.

## Design direction
TILT is a market-learning workspace, not a broker clone or generic SaaS admin panel. Its interface combines a deep-ink work surface, warm mineral paper in light mode, signal-orange actions, and market-teal / coral performance semantics. The design prioritises precise figures, market context and explanatory feedback over decoration.

## Semantic colour tokens
| Token | Light | Dark | Meaning |
|---|---|---|---|
| Canvas | #F4F1E9 | #081827 | Main page background |
| Surface | #FFFDF8 | #102333 | Panels and work areas |
| Soft surface | #F2EEE5 | #162C3D | Table headers, secondary surfaces |
| Text | #172D3B | #F1EEE6 | Primary text |
| Muted | #667780 | #A2B2BD | Secondary text |
| Border | #DED8CC | #2B4353 | Dividers and outlines |
| Brand action / neutral quote | #E97C24 | #FF9138 | Main actions and quote line |
| Positive | #177D6B | #5BC4A3 | Positive P&L / success |
| Negative | #B9504A | #F18D83 | Negative P&L / error |
| Information | #4267B2 | #8FA9E6 | Secondary information |

Orange does not mean profit. Teal and coral retain positive / negative semantics and signed numbers remain visible.

## Typography and layout
- Manrope is used for interface text; IBM Plex Mono is used for prices, balances, quantities and market steps.
- Spacing uses a 4px base scale (4, 8, 12, 16, 20, 24, 32, 40px).
- Radius tiers are 6px, 9px and 13px.
- Borders and whitespace take precedence over shadows.
- Data tables use consistent cell padding, row dividers and horizontal overflow on narrow screens.
- Form controls have a 42px minimum height and visible focus treatment.
- Both themes share semantic chart and component tokens. Dark remains the first-visit default and saved theme preference remains intact.

## Component rules
- Use shared page-state panels for loading, sign-in-required and unavailable-data states. Provide a next action only when a real action exists.
- Keep chart lines neutral unless the plotted value itself represents a signed outcome.
- Prefer ranked bars or tables over multi-colour pie charts when exact comparisons matter.
- Use positive / negative colours only for corresponding result semantics.
- Preserve the shared desktop rail and mobile navigation behaviour.

## Guardrails
1. Do not encode profit / success using brand orange.
2. Add chart series colours only when each series represents a distinct measure.
3. Keep API-owned values and server calculations authoritative.
4. Label simulations and previews as such; never imply demo flows are live payments or real trades.
5. Put new global component rules in src/app/design-system.css, not at the bottom of legacy CSS.
