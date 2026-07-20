# PHASE 9/9 — ACCEPTANCE — laws audit, six states, redirects, purge, report

ROLE: closing auditor and demolition crew. BOTH matrices are 100% migrated and
the coverage gate is green — now prove the NEW app obeys the grammar's laws
and the pixel contract, route the old world into it, delete the dead legacy
views, and write the report.

TARGET: {{TARGET}}  (stack: {{STACK}})
READ:  feature-matrix.csv, element-matrix.csv, design-spec.md, decision-log.md,
       both apps
WRITE: app code (redirects + deletions), {{TARGET}}/stax-migration/REPORT.md.
       Never state.json.

## 1. Golden-path browser sweep

Identify the 3-5 golden paths (the workflows users run daily — derive them
from the biggest areas in the matrix). Drive each through the NEW panel app in
a real browser, end to end, including one real persisted write per path.
Evidence: step list + screenshot or DOM/text dump per path + zero console
errors during the sweep.

## 2. Laws audit — machine-checkable, evidence per law

For each law: PASS/FAIL + raw evidence (grep output, file:line, state dump,
screenshot). Prose without evidence = automatic FAIL. Adapt grep patterns to
{{STACK}} but always show the raw output.

- L1 NO MODALS — `grep -riE "modal|<Dialog|lightbox" src`: every hit must be
  the panel layer itself or dead code you are about to delete. Action-free
  toasts exempt.
- L2 NO TABS, NO PAGES — no tab bars; no route-push that swaps the workspace
  to show a detail. Grep for Tabs components and detail-route pushes.
- L3 PARENT STAYS — open the 3 deepest drill chains; parents remain visible
  and interactive. Screenshot each chain.
- L4 ONE ACTION ZONE — primary actions render only in the panel foot; scan
  panels for floating buttons or duplicate action bars.
- L5 REGISTRY-DRIVEN WIDTHS — grep panel roots for hardcoded widths; every
  width must trace to the registry size (S/M/L/XL).
- L6 TOKENS ONLY — grep panel components for hex literals and raw px values;
  list every hit and justify or fix.
- L7 SERIALIZABLE STATE — JSON round-trip the workspace state (or reload a
  deep URL) and show an identical workspace restores.

Any FAIL: fix it, then re-run that law's check until green. All seven green
before you continue.

## 3. Six-states audit — 10 random migrated elements

Pick 10 random `migrated` rows from element-matrix.csv (spread across kinds:
buttons, inputs, tables, badges…). For each, verify ALL SIX states from
design-spec.md §7 in the running app: default · hover · focus/active · empty ·
loading/skeleton · error. Empty states must be sentences with a next action,
not blank space. Evidence per element: how you triggered each state + what
rendered. A missing or broken state REOPENS the row (flip it to `mapped`,
log it) — which re-arms the gate and sends the pipeline back to phase 7.
Do not continue until 10/10 pass.

## 4. Route redirects — every old URL lives on

For EVERY legacy route in the matrix (`ui_kind=route` rows): add a redirect
from the old URL to the panel-app URL that deep-links the equivalent workspace
(Space + panel stack). Old bookmarks and shared links must land on the right
panels. Evidence: the redirect table (old → new) and 5 spot-checks driven in
the browser.

## 5. Purge dead legacy views

Only NOW delete the legacy view components, routes, styles, and modal/tab
machinery that the matrices show fully migrated and redirected. Keep the data
layer — it is shared. After deletion: full build + test run + re-run one
golden path. The app must be smaller and still green. Show the diff stat.

## 6. REPORT.md — {{TARGET}}/stax-migration/REPORT.md

Write the closing report: before/after (routes, modals, tabs → Spaces, panels,
drills — counts from the feature matrix; hex literals, px font-sizes, native
controls, icon census → tokens, `--fz-*`, stroke set — counts from the element
matrix), stats for BOTH matrices (rows, per-area, per-kind), every decision-log
entry summarized, laws-audit table, six-states audit results, redirect table,
purge diff stat, and the golden-path evidence. This document is what "no
feature — and no pixel — was lost" looks like when it is true — make it
auditable, not promotional.

Then stop. The operator runs `stax-migrate done {{TARGET}}` — REPORT.md is its
exit gate — and the migration is complete.
