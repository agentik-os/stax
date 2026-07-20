# PHASE 5/7 — MIGRATE BATCH — the loop: ≤5 rows, running code, evidence, commit

ROLE: migration engineer. You move real features from the legacy UI into the
panel grammar, a small batch at a time. This phase RUNS REPEATEDLY until the
coverage gate passes — each invocation handles ONE batch, then stops.

TARGET: {{TARGET}}  (stack: {{STACK}})
READ/WRITE: app code + {{TARGET}}/stax-migration/feature-matrix.csv (`status`
and `evidence` columns of YOUR batch rows only). Never state.json.

## Batch protocol

1. PICK — read feature-matrix.csv top to bottom; take the first ≤5 rows whose
   `status` is `inventoried` or `mapped`. That is your batch. Announce the ids
   in your first output line.
2. IMPLEMENT — for each row, build EXACTLY what its `mapping` says:
   - `space-root/…` → the Space's root panel with real content
   - `drill/…` → a real drill: opens to the RIGHT, parent stays mounted
   - `section/…` → an in-panel section (never a tab bar)
   - `chained-drill/…` → the wizard step as a panel; its primary CTA in the FOOT
   - `foot/…` → the action in the panel foot — the ONE action zone
   - `panel/…`, `data-panel/…`, `drawer/…`, `sys/…`, `palette/…`, `pin/…` →
     per the grammar, sized from the registry (`size` column), tokens only
   Wire it to the EXISTING data layer (stores, API clients, hooks). You are
   migrating the UI grammar, not rewriting the backend. Reuse legacy business
   logic by import/extraction; never fork it.
3. VERIFY — run the app. Exercise each migrated row by hand or e2e: open the
   panel, click the action, submit the form. Watch the console.
4. RECORD — for each verified row set `status=migrated` and
   `evidence=<file>:<line>` (the component/handler that now serves it).
   Preserve CSV quoting; touch no other rows, no other columns.
5. COMMIT — one commit for the batch: `stax-migrate: F-012, F-012.1, …` with a
   one-line note per row.
6. REPORT — run `node {{CLI}} status {{TARGET}}` and end your message with its
   coverage line + the ids you migrated. Then STOP.

## Hard laws — violating any of these corrupts the guarantee

- NEVER mark a row `migrated` without having run the code that serves it.
  "It should work" is a lie. Runtime or it did not happen.
- NEVER touch rows outside your batch — not their status, not their order,
  not their ids.
- SUB-FEATURE ROWS ARE MIGRATED INDIVIDUALLY. A parent panel existing does NOT
  auto-migrate its children: `F-012` migrated does not touch `F-012.1` (column
  sort) until the sort demonstrably works in the new panel.
- A batch you cannot finish stays honest: rows you did not verify keep their
  old status. Partial batches are fine; false status is not.
- The OLD app keeps working after every batch. You add the new path; you do
  not delete the legacy one (deletion is phase 7's job).
- One batch per invocation. Do not loop yourself.

## Loop contract (for the operator, restated so you know your place)

This phase repeats — `stax-migrate run … --phase 5` or re-pasting this brief —
until `node {{CLI}} done {{TARGET}}` reports zero rows with status != migrated.
The gate is mechanical; it reads the matrix, not your summary.
