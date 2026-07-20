# PHASE 4/9 — FEATURE MAPPING — legacy patterns → the panel grammar, deterministically

ROLE: translator from legacy UI patterns to the Stax grammar (Miller columns:
anything with depth opens a panel to the RIGHT, the parent STAYS; one Space
active at a time; one action zone per panel — the foot; pinned references
survive navigation). No taste, no invention — rules only.

TARGET: {{TARGET}}  (stack: {{STACK}})
CONTRACT: integration level {{LEVEL}} — {{LEVEL_DESC}}
READ/WRITE: {{TARGET}}/stax-migration/feature-matrix.csv — fill `mapping` and
`size` on EVERY row, set `status` to `mapped` — AND
{{TARGET}}/stax-migration/data-matrix.csv — fill `panel_binding` (and
`write_path` for writable rows) on EVERY data row. Also append ambiguity calls
to {{TARGET}}/stax-migration/decision-log.md. Do NOT touch app code or state.json.

## Scope calls happen HERE — explicitly, never by omission

The contract level is {{LEVEL}}: gates accept [{{LEVEL_ACCEPT}}]. If this level
allows skipping a row (deferred / out-of-scope / wrapped), the skip is DECLARED
NOW: set that status on the row AND write the reason in `evidence`
(e.g. `out-of-scope: admin-only surface, 3 users, revisit Q4`). A row left
empty "because we won't do it" is a gate violation, not a scope call.
STARTER contracts additionally require the in-scope areas to be DECLARED
(`node {{CLI}} scope <area1,area2> {{TARGET}}`) before this phase's gate
passes — an in-scope row can never be marked out-of-scope.

## Mapping vocabulary — write `kind/panel-type` (kebab-case), e.g. `drill/deal-detail`

Apply these rules DETERMINISTICALLY — never invent a new pattern:

| legacy pattern | maps to |
|---|---|
| top-level page / nav section | `space-root/<area>` — the root panel of a Space (max 7 Spaces; merge cousins by workflow) |
| list row click / "view details" | `drill/<entity>-detail` — new panel to the RIGHT, parent list stays mounted |
| modal / dialog / detail overlay | `panel/<name>` — a real panel, sized by content (see size grammar); modals are FORBIDDEN in the output |
| tabs faceting the SAME entity | `section/<name>` — in-panel sections inside one panel |
| tabs switching BETWEEN entities | `drill/<entity>` — sibling drills from the same parent |
| wizard / multi-step flow | `chained-drill/<flow>-step-N` — step N opens step N+1 to the right; the step's primary CTA lives in the panel FOOT; back = close the rightmost panel |
| global search | `palette/global-search` — the ⌘K palette |
| bulk action / primary action | `foot/<action>` — the panel foot, the ONE action zone; never floating buttons |
| cross-cutting reference (kept visible while working elsewhere) | `pin/<panel-type>` — pinned reference, survives navigation and Space switches |
| chat / AI assistant | `drawer/<name>` — full-height drawer, pinnable, never a floating bubble |
| settings / preferences | `sys/<section>` — a sys panel drilled from the Space root, never a separate page |
| table / data view | `data-panel/<entity>-table` — an XL data panel with a filter toolbar |

## Size grammar (the `size` column: S, M, L, XL)

- S  — confirm, or a 1-3 field form
- M  — a standard form or compact detail
- L  — rich detail / editor, multi-section content
- XL — a full workbench: data table, board, canvas, dashboard

Sub-feature rows inherit context but are mapped in their OWN right: `F-012.1
column sort` on a `data-panel` maps to `section/sort-controls` or `foot/sort`
per the rules — never "covered by parent".

## Ambiguity resolution — apply IN ORDER, then log

1. A view that is both landing and detail = the Space root; its detail parts
   become drills.
2. Content overflowing XL = split into a drill chain; never scroll horizontally
   inside a panel.
3. Two rules match = the deeper-nesting rule wins (drill beats section).
4. Still ambiguous = pick the mapping with the FEWEST simultaneous panels, and
   record the call in decision-log.md:
   `YYYY-MM-DD · F-NNN · chose X over Y · rule 4 (fewest panels)`

Every rule-4 (and any contested rule-1/2/3) call goes in the log. An
undocumented judgment call is a bug.

## Data binding — every D row names its panels

For every data-matrix row (unless it carries a reasoned skip status):

- `panel_binding` — the panel surface that READS it, in mapping vocabulary:
  `space-root/deals`, `drill/deal-detail`, `data-panel/customers-table`. A
  table read by three panels lists all three, comma-separated (quoted CSV).
- `write_path` — for rows whose `ops` include create/update/delete: the foot
  action or composer that WRITES it: `foot/new-deal`, `foot/save-settings`,
  `composer/new-comment`. A writable model with no write path is either bound
  now or explicitly deferred with a reason — never silently read-only.
- A table no UI touches: decide its fate NOW — bind it to a new panel, or set
  a reasoned skip status. The gate refuses unexplained orphans.

## Exit criteria — self-check before you stop

1. ZERO F rows with an empty `mapping` and ZERO D rows with an empty
   `panel_binding` — except rows carrying a reasoned skip status. Run
   `node {{CLI}} done {{TARGET}}` and read the check output.
   (The OPERATOR advances the phase, not you.)
2. Every `mapping`/`panel_binding` value uses the vocabulary table above — no
   free-form prose.
3. Every mapped F row has a size S/M/L/XL and `status=mapped`. Every writable
   bound D row has a `write_path`.
4. Count the distinct Space roots: if more than 7, merge areas by workflow and
   re-map; log the merge.
5. Final message: distinct panel types (this becomes the phase-6 registry),
   Space list, the count of declared skips WITH their reasons, and the number
   of decision-log entries you added.

When you are done, stop. Do not design-map or scaffold (phases 5-6).
