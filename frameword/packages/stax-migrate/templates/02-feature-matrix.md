# PHASE 2/7 — FEATURE MATRIX — the single source of truth

ROLE: inventory formalizer. You convert the phase-1 inventory into the machine-
readable contract that the whole migration is graded against.

TARGET: {{TARGET}}  (stack: {{STACK}})
READ:   {{TARGET}}/stax-migration/inventory.md
WRITE:  {{TARGET}}/stax-migration/feature-matrix.csv — append rows under the
        existing header. Do NOT touch app code or state.json.

## The law of this phase

> A feature not in the matrix does not exist for the rest of this pipeline.

Phases 3-7 read ONLY the matrix. Nothing may live outside it: if the inventory
mentions it, it gets a row; if you notice something the inventory missed, it
gets a row too (and a line appended to inventory.md with a citation).

## Row rules

- EVERY interactive capability = one row. Viewing a list is a capability.
  Sorting it is another. Exporting it is a third.
- SUB-FEATURES GET THEIR OWN ROWS, parented by id:
  `F-012` "Deals table" · `F-012.1` "column sort" · `F-012.2` "CSV export"
  · `F-012.3` "bulk archive". A parent row NEVER covers its children.
- id format: `F-NNN` (zero-padded, e.g. F-001) for features, `F-NNN.N` for
  sub-features. Ids are assigned once and never renumbered.
- Order rows by area, then by inventory order. This order is the future
  migration order (phase 5 consumes the matrix top-to-bottom).

## Columns (header already in the file)

| column     | what to put |
|------------|-------------|
| id         | F-NNN or F-NNN.N |
| area       | the app area (matches inventory's `## Area:` headings) |
| feature    | parent capability name (repeat on sub-feature rows) |
| subfeature | empty on parent rows; the sub-capability name otherwise |
| source     | citation carried from inventory (file:line or route) |
| ui_kind    | one of: route, nav, modal, drawer, popover, tab, wizard-step, form, table, list, chart, filter, search, sort, bulk, export, import, shortcut, menu, permission, setting, integration, notification, empty-state, error-state, loading-state |
| mapping    | LEAVE EMPTY — phase 3 fills it |
| size       | LEAVE EMPTY — phase 3 fills it |
| status     | `inventoried` — always, for every new row |
| evidence   | LEAVE EMPTY — phase 5 fills it |

CSV hygiene: this is real CSV — wrap any field containing a comma, quote, or
newline in double quotes, and double embedded quotes (`"a ""b"", c"`). One row
per line. Never reorder or delete existing rows.

## Exit criteria — self-check before you stop

1. Re-read inventory.md END TO END, line by line. For each capability line,
   point at its row id. ZERO capabilities without a row is the bar.
2. Every empty/error/loading state, shortcut, and permission gate from the
   inventory has a row — these are the classically lost features; they are why
   this tool exists.
3. Run `node {{CLI}} status {{TARGET}}` and confirm the row count is plausible
   against the inventory's SUMMARY counts (a 40-screen app is never 12 rows).
4. State in your final message: total rows, rows per area, and the sentence
   "I re-read inventory.md and found zero capabilities without a row" — only
   if it is literally true.

When you are done, stop. Do not start mapping (phase 3).
