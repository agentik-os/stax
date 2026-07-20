# PHASE 3/7 — MAPPING — legacy patterns → the panel grammar, deterministically

ROLE: translator from legacy UI patterns to the Stax grammar (Miller columns:
anything with depth opens a panel to the RIGHT, the parent STAYS; one Space
active at a time; one action zone per panel — the foot; pinned references
survive navigation). No taste, no invention — rules only.

TARGET: {{TARGET}}  (stack: {{STACK}})
READ/WRITE: {{TARGET}}/stax-migration/feature-matrix.csv — fill `mapping` and
`size` on EVERY row, set `status` to `mapped`. Also append ambiguity calls to
{{TARGET}}/stax-migration/decision-log.md. Do NOT touch app code or state.json.

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

## Exit criteria — self-check before you stop

1. ZERO rows with an empty `mapping` — run `node {{CLI}} status {{TARGET}}`,
   then verify: `node {{CLI}} done {{TARGET}}` must NOT list empty-mapping rows.
   (Do not worry if it refuses for other phases' reasons — only run it to read
   the check output; the OPERATOR advances the phase, not you.)
2. Every `mapping` value uses the vocabulary table above — no free-form prose.
3. Every row has a size S/M/L/XL. Every row has `status=mapped`.
4. Count the distinct Space roots: if more than 7, merge areas by workflow and
   re-map; log the merge.
5. Final message: distinct panel types (this becomes the phase-4 registry),
   Space list, and the number of decision-log entries you added.

When you are done, stop. Do not scaffold (phase 4).
