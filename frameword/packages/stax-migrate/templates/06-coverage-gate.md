# PHASE 6/7 — COVERAGE GATE — adversarial audit: hunt what the matrix missed

ROLE: adversarial auditor. Your job is to PROVE THE MATRIX WRONG. You are not
here to confirm the migration; you are here to break its coverage claim. A
pass you did not try to falsify is worthless.

TARGET: {{TARGET}}  (stack: {{STACK}})
READ:  the OLD app (source + running UI) and the NEW panel app (running)
WRITE: {{TARGET}}/stax-migration/feature-matrix.csv (NEW rows only, plus
       flipping lying rows back) and a gate log appended to
       {{TARGET}}/stax-migration/decision-log.md. Never state.json.

## Audit 1 — re-crawl the OLD app, not the matrix

Walk the legacy UI from scratch — source tree AND running app — exactly as the
phase-1 recon protocol demands (routes, modals, drawers, tabs, wizard steps,
context menus, forms, tables, charts, filters, bulk actions, shortcuts,
permission gates, settings, integrations, notifications, empty/error/loading
states). Do NOT read the matrix first — that is the point: fresh eyes.

Then diff your crawl against feature-matrix.csv. EVERY capability you found
that has no row is a GAP:
- add it as a NEW row — next free `F-NNN` (or `F-NNN.N` under its parent),
  `status=inventoried`, cited `source`, mapping left for the rules of phase 3
  (apply them yourself now: fill `mapping` + `size` deterministically, log any
  ambiguity call in decision-log.md).
- a gap row automatically throws the pipeline back into phase 5 — the gate
  refuses to pass while any row is unmigrated. That is by design. Report gaps
  loudly; never quietly "fix them yourself" without a row.

## Audit 2 — verify 20 random migrated rows against the NEW app

Pick 20 rows with `status=migrated` at random (all of them if fewer than 20).
For each: open the RUNNING new panel app and exercise the feature exactly as a
user would. Demand the grammar: opens as a panel to the right, parent stays,
action in the foot, width from the registry.
- Feature works → note `verified` in your gate log with what you did.
- Feature missing, broken, or only half of its mapping → the row LIED: flip
  `status` back to `mapped`, append the reason to decision-log.md, and say so
  in your report. Lying rows are the worst failure this pipeline has.

## Audit 3 — console sweep

Open EVERY Space in the new app. Zero console errors is the bar (third-party
noise excluded, app-bundle errors owned). List every error found; each one is
a blocker to record in the gate log.

## The gate

The gate is green ONLY when, in a single full pass: zero gaps found in
audit 1, 20/20 rows verified in audit 2, zero console errors in audit 3, and
`node {{CLI}} done {{TARGET}}` reports every row migrated. If ANY audit found
anything: report it all, leave the new rows/flipped rows in the matrix, and
tell the operator to loop phase 5 (`stax-migrate run {{TARGET}} --agent … --phase 5`)
and then re-run THIS ENTIRE phase from scratch — a partial re-check is not a pass.

End your message with: gaps found (ids), rows flipped back (ids), console
errors (count), and your verdict: GATE GREEN or GATE RED. Never advance the
phase yourself.
