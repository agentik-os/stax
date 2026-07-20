# stax-migrate

**Take any legacy web app. Rebuild it on the Stax panels-inside-panels grammar —
down to the pixel. Lose nothing — provably.**

A zero-dependency Node CLI (plain ESM, node ≥ 18) that drives a complete
refonte to the [Stax](../../../README.md) grammar — no pages, no modals, no
tabs; a serializable stack of panels, styled to the letter of the
[design spec](templates/design-spec.md) — via Claude Code, Codex, or any
coding agent you paste a prompt into.

## The guarantee, mechanically

Most migrations lose features because coverage lives in someone's head — and
lose the design because "restyled" is judged by eye. Here both live in files:

- **`feature-matrix.csv` — behavior is law.** Phase 1 inventories every surface
  of the old app; phase 2 turns every capability — and every *sub*-capability
  (column sort, CSV export, keyboard shortcut, empty state…) — into its own
  `F-NNN[.N]` row. *A feature not in the matrix does not exist for the pipeline.*
- **`element-matrix.csv` — pixels are law too.** Phase 3 crawls the DESIGN:
  every icon (named, with use counts), button variant, card style, badge,
  input, select, table, chart, nav element, toast, the spacing histogram, every
  color literal, every font-size — each an `E-NNN[.N]` row. **The smallest icon
  is a gated row**: an icon used once must be mapped to its stroke equivalent
  (or dropped with a logged decision) before the gate ever turns green.
- **`design-spec.md` — the conversion contract.** Shipped with the package and
  written into every workspace: exact panel anatomy (body 18/18/16, bar h56,
  foot 11/14, card 14/16 r12…), the type/numbers laws, the accent ramp, the
  radius/shadow/motion scales, the icon spec, the old-element→Stax conversion
  table, the six mandatory states. Phase 5 maps every E row onto it; phase 7
  implements against it; phase 8 greps the new app for violations.
- **`stax-migrate done` is a hard gate.** It refuses to advance while any row
  of **either** matrix is unmigrated, and prints the offending F- and E- ids.
  No agent can talk its way past it; the check reads the CSVs, not the summary.

## Quickstart (no install needed)

```sh
# from anywhere — point it at the legacy project
node /path/to/frameword/packages/stax-migrate/index.mjs init /path/to/legacy-app

cd /path/to/legacy-app
node /path/to/.../index.mjs next        # current phase brief + how to run it
node /path/to/.../index.mjs run . --agent claude   # drive one phase
node /path/to/.../index.mjs done        # gate check → advance (or refuse)
node /path/to/.../index.mjs status      # phase + BOTH coverage bars
```

Or link it once and use the bare command:

```sh
cd frameword/packages/stax-migrate && bun link     # or: npm link
stax-migrate init /path/to/legacy-app
```

## The 9 phases

| # | Phase | What the agent does | Exit gate (`done` checks) |
|---|-------|---------------------|---------------------------|
| 1 | **Recon** | Forensic feature inventory: every route, modal, tab, wizard step, shortcut, gate, empty state → `inventory.md` | inventory.md exists, non-trivial |
| 2 | **Feature matrix** | Every capability + sub-capability = one `F-NNN[.N]` row, `status=inventoried` | feature matrix has > 0 rows |
| 3 | **UI inventory** | Pixel crawl: every icon (named + counted), button/card/badge/input/select/table/chart/nav variant, spacing histogram, color + type census, present/missing states → `E-NNN[.N]` rows | **element matrix has > 0 rows** |
| 4 | **Feature mapping** | Deterministic grammar rules fill `mapping`+`size` per F row; ambiguities logged | zero F rows with empty mapping |
| 5 | **Design mapping** | Every E row gets `stax_target` (per design-spec §6), `tokens`, `spacing` (per §1) | **zero E rows with empty stax_target** |
| 6 | **Scaffold** | Panel shell beside the untouched old app: engine, spec tokens, registry from the matrix, Spaces, URL sync | none — human judgment on the evidence |
| 7 | **Migrate batches** | THE LOOP: ≤5 F rows **+ every E row they touch** → real panels at contract spacing, both matrices get `status=migrated` + `evidence`, commit. Repeat. | **every row of BOTH matrices `migrated`** — else refuses, prints F- and E- ids |
| 8 | **Coverage gate** | Adversarial re-crawl of the OLD app (both protocols) + design audit of the NEW app (raw hex, px font-sizes, native selects/dates, modals/tabs, margin drift vs §1) — every finding = a new row, back to 7 | both matrices still 100% after the pass |
| 9 | **Acceptance** | Golden-path sweep, laws audit, **six states verified on 10 random migrated elements**, redirects from every old URL, purge dead legacy views | `REPORT.md` written |

## Commands

```
stax-migrate init   [dir]      create stax-migration/ (9 substituted phase briefs, design-spec.md,
                               both empty matrices, decision log, state.json) + print the plan
stax-migrate status [dir]      phase + both matrices: counts by status, two coverage bars,
                               first 10 unmigrated ids of each
stax-migrate prompt [n] [dir]  print phase n's brief to stdout — pipe/paste into any agent
stax-migrate next   [dir]      current phase brief + exactly how to run it
stax-migrate done   [dir]      validate the phase's exit gate, advance or refuse with ids
stax-migrate run    [dir] --agent claude|codex [--phase n]
                               drive ONE phase (never more) via the agent CLI, re-check the gate
```

`{{TARGET}}` and `{{STACK}}` are substituted at `init` (stack sniffed from the
target's package.json: Next.js / Angular / Vue / Svelte / React / Express /
Rails-ish / unknown).

### The matrices

```
feature-matrix.csv  id,area,feature,subfeature,source,ui_kind,mapping,size,status,evidence
element-matrix.csv  id,area,element,kind,count,source,stax_target,tokens,spacing,status,evidence
```

`kind` ∈ icon · button · card · badge · input · select · table · chart · nav ·
modal · toast · spacing · color · type · state · other. `count` = occurrences
found in the crawl. Both matrices walk inventoried → mapped → migrated, and
sub-rows (`F-012.1`, `E-007.1`) are gated individually — a parent existing
never auto-migrates its children.

## Using agents

- **Claude Code** — `stax-migrate run . --agent claude` spawns
  `claude -p "<phase brief>" --permission-mode acceptEdits` with cwd = target.
- **Codex** — `--agent codex` spawns `codex exec "<phase brief>"`.
- **Anything else** — `stax-migrate prompt 5 . | pbcopy` and paste. The briefs
  are model-agnostic, self-contained missions.

One phase per invocation, always: the human stays in the loop between phases.
After a run the CLI re-checks the gate and tells you what's still missing —
advancement is only ever `stax-migrate done`.

## FAQ

**Partial adoption — can I migrate only one area?**
Yes, socially, not mechanically: scope phases 1 and 3 to that area (edit the
briefs in `stax-migration/` — they're yours after init) and the matrices will
only ever contain that area's rows. The guarantee then covers exactly what you
inventoried. What enters a matrix, however, can never be dropped.

**Monorepos?**
Point `init` at the app package (`stax-migrate init apps/dashboard`), not the
repo root — the workspace, stack sniff, and briefs are per-app. Run one
migration per app; matrices don't merge.

**Does the old app keep working during the migration?**
Yes — by law. Phase 6 mounts the shell *beside* the legacy routes; phase 7 adds
panels without deleting anything; only phase 9, after both gates are green,
redirects old URLs and purges dead views. At every intermediate commit both
worlds run.

**An agent marked rows migrated that don't work — or that drift from the spec.**
Phase 8 exists because of exactly this: it verifies random migrated rows of
both matrices against the running app, greps the new code for raw hex, pixel
font-sizes, and native controls, measures panel interiors against §1, and flips
liars back to `mapped` — which re-arms the gate. You can also flip a row
yourself in either CSV; `done` refuses until it's honestly re-migrated.

**Why is a margin a row?**
Because that's where migrations rot: features survive, but every card gets its
own padding and in a year the app is a junk drawer. The element matrix +
design-spec contract make "looks like Stax" a checkable claim — panel body
18/18/16, card 14/16 radius 12, numbers in mono, one accent ramp — instead of
an opinion.

**Where does the engine come from?**
Phase 6 installs `@frameword/panels-core` + `@frameword/panels-react` from
[github.com/agentik-os/stax](https://github.com/agentik-os/stax), or vendors the
two packages into your repo when a git dependency doesn't fit.
