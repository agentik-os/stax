# PHASE 7/9 — MIGRATE BATCH — ≤5 feature rows + every element they touch

ROLE: migration engineer. You move real features into the panel grammar AND
land every visual element they contain on the design-spec contract, a small
batch at a time. This phase RUNS REPEATEDLY until both matrices are 100%
migrated — each invocation handles ONE batch, then stops.

TARGET: {{TARGET}}  (stack: {{STACK}})
READ:  stax-migration/design-spec.md (the pixel contract — re-read §1 before
       every batch), both matrices, decision-log.md
WRITE: app code + feature-matrix.csv + element-matrix.csv (`status` and
       `evidence` of YOUR batch rows only). Never state.json.

## Batch protocol

1. PICK — read feature-matrix.csv top to bottom; take the first ≤5 rows with
   `status` in {inventoried, mapped}. Then collect from element-matrix.csv
   EVERY element row those features touch (the icons, buttons, cards, badges,
   inputs, selects, tables, states inside the panels you are about to build).
   Batch = those F rows + their E rows. Announce all ids in your first line.
2. IMPLEMENT — build each F row exactly per its `mapping` (drills open right,
   parent stays, actions in the foot, sizes from the registry) and each E row
   exactly per its `stax_target` + `tokens` + `spacing` columns. No value by
   eye: interior margins, radii, fonts, and colors come from design-spec.md
   (§1 anatomy, §2 type — numbers always mono/tabular, §3 accent ramp,
   §4 radius/shadow/motion, §5 stroke icons, §6 conversions, §7 six states).
   Wire to the EXISTING data layer — migrate the UI, never rewrite the backend.
3. VERIFY — run the app. Exercise every F row; inspect every E row (computed
   styles or screenshot) against its `spacing`/`tokens` values. Watch the console.
4. RECORD — set `status=migrated` + `evidence=<file>:<line>` on each VERIFIED
   row, in BOTH matrices. Preserve CSV quoting; touch no other rows.
5. COMMIT — one commit: `stax-migrate: F-012, F-012.1 + E-004, E-007…`.
6. REPORT — run `node {{CLI}} status {{TARGET}}`, end with both coverage
   lines + the ids you migrated. Then STOP.

## Hard laws — violating any of these corrupts the guarantee

- A PANEL COUNTS AS MIGRATED ONLY WHEN its interior spacing matches
  design-spec.md §1 (body 18/18/16, bar h56, foot 11/14, card 14/16 r12…)
  AND every element inside it has its E row migrated. A pixel-drifted panel
  with pretty features is NOT migrated — leave the F row open.
- NEVER mark any row `migrated` without having run/rendered the code that
  serves it. "It should work" is a lie. Runtime or it did not happen.
- NEVER touch rows outside your batch — in either matrix.
- SUB-ROWS ARE GATED INDIVIDUALLY: `F-012` migrated does not release
  `F-012.1`; `E-007` (button) migrated does not release `E-007.1` (its hover
  state) until that state demonstrably renders per §7.
- Element rows of kind `state` are real work: build the empty/loading/error
  state (§7 — empty states are sentences with a next action), then migrate them.
- No raw hex, no pixel font-sizes bypassing `--fz-*`, no native
  `<select>`/`<input type=date|time>` in anything you ship — the phase-8
  design audit greps for exactly these and will reopen rows.
- A batch you cannot finish stays honest: unverified rows keep their status.
- The OLD app keeps working after every batch (deletion is phase 9's job).
- One batch per invocation. Do not loop yourself.

## Loop contract (for the operator, restated so you know your place)

This phase repeats — `stax-migrate run … --phase 7` or re-pasting this brief —
until `node {{CLI}} done {{TARGET}}` reports zero unmigrated rows in BOTH
matrices. The gate reads the CSVs, not your summary.
