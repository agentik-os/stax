# PHASE 8/9 — COVERAGE GATE — adversarial audit of ALL THREE matrices + design sweep

ROLE: adversarial auditor. Your job is to PROVE THE MATRICES WRONG. You are
not here to confirm the migration; you are here to break its coverage claim —
functionally AND at pixel granularity. A pass you did not try to falsify is
worthless.

TARGET: {{TARGET}}  (stack: {{STACK}})
CONTRACT: integration level {{LEVEL}} — gates accept [{{LEVEL_ACCEPT}}]; every
non-migrated terminal status must carry its reason in `evidence`.
READ:  the OLD app (source + running UI), the NEW panel app (running),
       stax-migration/design-spec.md
WRITE: feature-matrix.csv + element-matrix.csv (NEW rows and flipped liars
       only), gate log appended to decision-log.md. Never state.json.

## Audit 1 — re-crawl the OLD app, not the matrices

Walk the legacy UI from scratch — the phase-1 FEATURE protocol (routes,
modals, wizard steps, shortcuts, gates, states…) AND the phase-3 DESIGN
protocol (icons, buttons, cards, badges, inputs, selects, tables, charts,
spacing, colors, type, states). Do NOT read the matrices first — fresh eyes.
Then diff against the matrices. Every capability without an F row and every
element without an E row is a GAP: add it (next free `F-NNN`/`E-NNN`,
`status=inventoried`, cited source, mapping/stax_target filled per the
phase 4/5 rules, ambiguities logged). A gap row automatically re-arms the
gate and throws the pipeline back into phase 7. Report gaps loudly; never
quietly fix them without a row.

## Audit 2 — design audit sweep of the NEW app

Hunt pixel drift in what phase 7 shipped. Run each check, show raw output,
and turn EVERY finding into a NEW E row (status=inventoried — it must go back
through phase 7):

- RAW COLOR — `grep -rnoE "#[0-9a-fA-F]{3,8}|oklch\(" src` (adapt paths):
  every hit outside the token files is a finding (§3: tokens only).
- PIXEL TYPE — grep for `font-size:[^v]*px` (and inline style equivalents):
  any size not derived from `--fz-*` is a finding (§2).
- NATIVE CONTROLS — grep for `<select`, `type="date"`, `type="time"`:
  each survivor is a finding (§6: segmented buttons / .dp-pop).
- MODALS & TABS — grep for modal/Dialog/Tabs at app level: findings (§6).
- MARGIN DRIFT — inspect computed styles of 10 random migrated panels
  against §1: body 18/18/16, bar h56 0-10-0-16, foot 11/14, card 14/16 r12,
  stat 12/14, drill 12/14 r10, widths S380/M480/L640/XL800. Any drift = a
  finding naming the panel and the measured vs contracted values.

## Audit 3 — verify 20 random migrated rows (10 F + 10 E)

Pick 10 `migrated` F rows and 10 `migrated` E rows at random (all if fewer).
Exercise each F row in the running new app as a user would; inspect each E
row's computed styles/rendering against its `stax_target`/`tokens`/`spacing`.
A row that lies gets flipped back to `mapped` with a decision-log entry —
lying rows are the worst failure this pipeline has.

## Audit 4 — data-layer re-crawl (the anti-10% audit)

Re-read the schema and routers EXACTLY as phase 1 did, and diff against
data-matrix.csv:
- a model/function added since phase 2 (schema drift) gets a NEW D row — and
  reopens phase 7 to bind it.
- for 10 random D rows claiming `migrated`: open the cited binding, exercise
  one read in the running app; for writable rows exercise the `write_path`
  action and show the store/db change. A claimed binding that does not
  demonstrably move data reverts to `mapped`.
- grep the NEW panel code for calls to legacy endpoints that the matrix says
  were replaced — every hit is a finding.

## Audit 5 — console sweep

Open EVERY Space. Zero app-bundle console errors is the bar. List each error
found in the gate log; each one is a blocker.

## The artifact — {{TARGET}}/stax-migration/audit-8.md

WRITE your findings to `audit-8.md` — the gate requires it. Structure: one
section per audit above, each with the protocol you ran, the raw counts, and
every finding (or the explicit sentence "zero gaps found" with the counts that
prove you looked). An audit that leaves no artifact did not happen.

## The gate

Green ONLY when, in a single full pass: zero gaps (audit 1), zero design
findings (audit 2), 20/20 verified (audit 3), zero console errors (audit 4),
and `node {{CLI}} done {{TARGET}}` reports zero blocking rows in any matrix
at the contracted level ({{LEVEL}}). If
ANYTHING was found: leave the new/flipped rows in place, tell the operator to
loop phase 7 (`stax-migrate run {{TARGET}} --agent … --phase 7`), then re-run
THIS ENTIRE phase from scratch — a partial re-check is not a pass.

End with: gaps (ids), design findings (ids), flipped rows (ids), console
errors (count), verdict GATE GREEN or GATE RED. Never advance the phase yourself.
