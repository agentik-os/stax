# PHASE 2/9 — FEATURE + DATA MATRICES — the source of truth for behavior AND data

ROLE: inventory formalizer. You convert the phase-1 inventory into the machine-
readable contracts that the whole migration is graded against.

TARGET: {{TARGET}}  (stack: {{STACK}})
CONTRACT: integration level {{LEVEL}} — {{LEVEL_DESC}}
READ:   {{TARGET}}/stax-migration/inventory.md
WRITE:  {{TARGET}}/stax-migration/feature-matrix.csv AND
        {{TARGET}}/stax-migration/data-matrix.csv — append rows under the
        existing headers. Do NOT touch app code or state.json.
        (data matrix gated: {{DATA_ON}})

## The law of this phase

> A feature not in the matrix does not exist for the rest of this pipeline.

Phases 4-9 read ONLY the matrices. Nothing may live outside it: if the inventory
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
  migration order (phase 7 consumes the matrix top-to-bottom).

## Columns (header already in the file)

| column     | what to put |
|------------|-------------|
| id         | F-NNN or F-NNN.N |
| area       | the app area (matches inventory's `## Area:` headings) |
| feature    | parent capability name (repeat on sub-feature rows) |
| subfeature | empty on parent rows; the sub-capability name otherwise |
| source     | citation carried from inventory (file:line or route) |
| ui_kind    | one of: route, nav, modal, drawer, popover, tab, wizard-step, form, table, list, chart, filter, search, sort, bulk, export, import, shortcut, menu, permission, setting, integration, notification, empty-state, error-state, loading-state |
| mapping    | LEAVE EMPTY — phase 4 fills it |
| size       | LEAVE EMPTY — phase 4 fills it |
| status     | `inventoried` — always, for every new row |
| evidence   | LEAVE EMPTY — phase 7 fills it |

CSV hygiene: this is real CSV — wrap any field containing a comma, quote, or
newline in double quotes, and double embedded quotes (`"a ""b"", c"`). One row
per line. Never reorder or delete existing rows.

## The DATA matrix — every table AND every server function is a row

The classic 10%-integration failure: the screens get rebuilt, the data layer
stays half-wired, and nobody can prove what still runs on the old paths. So the
data layer is a matrix too — data-matrix.csv, D-NNN rows. RUN THE SCANNER
FIRST — it fills the matrix programmatically from source with file:line
evidence (Convex, Supabase, Prisma, REST routes, tRPC):

    stax-migrate data scan {{TARGET}} --write

Only what the scanner flags as unprovable (dynamic table names, warnings) or
misses is yours to add by hand. D-NNN row grammar:

- ONE ROW PER PERSISTED MODEL: every table / collection / document type /
  external store. Sources: SQL migrations, `schema.prisma`, Convex `schema.ts`,
  Supabase dashboards, Mongoose models, ORM entities.
- ONE ROW PER SERVER FUNCTION: every API route, tRPC procedure, GraphQL
  resolver, server action, RPC, queue/cron job, and webhook — read the
  routers/handlers, not the docs.

| column        | what to put |
|---------------|-------------|
| id            | D-NNN (models first, then functions) |
| layer         | `db` or `function` |
| name          | table/collection name, or the function/endpoint name |
| kind          | table, collection, view, query, mutation, REST, tRPC, graphql, action, cron, webhook |
| source        | citation: file:line of the schema/handler |
| ops           | which of c/r/u/d this row supports (e.g. `crud`, `r`, `rw`) |
| panel_binding | LEAVE EMPTY — phase 4 fills it (the panel that reads it) |
| write_path    | LEAVE EMPTY — phase 4 fills it (the foot action/composer that writes it) |
| status        | `inventoried` |
| evidence      | LEAVE EMPTY — phase 7 fills it |

A function nobody can find in a router file does not get invented; a table you
found in the schema but no UI reads gets a row anyway — phase 4 will decide its
fate EXPLICITLY (bound, deferred, or out-of-scope — always with a reason).

## Exit criteria — self-check before you stop

1. Re-read inventory.md END TO END, line by line. For each capability line,
   point at its row id. ZERO capabilities without a row is the bar.
2. Every empty/error/loading state, shortcut, and permission gate from the
   inventory has a row — these are the classically lost features; they are why
   this tool exists.
3. Cross-check the DATA matrix against the schema: count the models in the
   schema file(s) and the handlers in the router file(s) — the D row count must
   match, and you state both counts with their file citations.
4. Run `node {{CLI}} status {{TARGET}}` and confirm the row counts are plausible
   against the inventory's SUMMARY counts (a 40-screen app is never 12 rows).
5. State in your final message: total F rows, total D rows (models vs
   functions), rows per area, and the sentence "I re-read inventory.md and the
   schema/routers and found zero capabilities, tables, or functions without a
   row" — only if it is literally true.

When you are done, stop. Do not start the UI inventory (phase 3).
