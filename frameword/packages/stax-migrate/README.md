# stax-migrate

**Take any legacy web app. Rebuild it on the Stax panels-inside-panels grammar.
Lose nothing — provably.**

A zero-dependency Node CLI (plain ESM, node ≥ 18) that drives a complete
refonte to the [Stax](../../../README.md) grammar — no pages, no modals, no
tabs; a serializable stack of panels — via Claude Code, Codex, or any coding
agent you paste a prompt into.

## The guarantee, mechanically

Most migrations lose features because coverage lives in someone's head. Here it
lives in one file:

- **`stax-migration/feature-matrix.csv` is the single source of truth.** Phase 1
  inventories every surface of the old app; phase 2 turns every capability —
  and every *sub*-capability (column sort, CSV export, keyboard shortcut,
  empty state…) — into its own row. *A feature not in the matrix does not exist
  for the pipeline*, so the pipeline forces everything into the matrix.
- **Every phase reads and writes the matrix.** Mapping fills `mapping`+`size`
  per row. Migration flips rows to `status=migrated` only with `evidence=file:line`
  and running code. The adversarial gate (phase 6) re-crawls the **old** app —
  not the matrix — and every gap it finds becomes a new row, throwing the
  pipeline back into migration.
- **`stax-migrate done` is a hard gate.** It refuses to advance while any row is
  unmigrated, and prints the offending ids. No agent can talk its way past it;
  the check reads the CSV, not the summary.

## Quickstart (no install needed)

```sh
# from anywhere — point it at the legacy project
node /path/to/frameword/packages/stax-migrate/index.mjs init /path/to/legacy-app

cd /path/to/legacy-app
node /path/to/.../index.mjs next        # phase 1 brief + how to run it
node /path/to/.../index.mjs run . --agent claude   # drive one phase
node /path/to/.../index.mjs done        # gate check → advance (or refuse)
node /path/to/.../index.mjs status      # phase, coverage %, unmigrated ids
```

Or link it once and use the bare command:

```sh
cd frameword/packages/stax-migrate && bun link     # or: npm link
stax-migrate init /path/to/legacy-app
```

## The 7 phases

| # | Phase | What the agent does | Exit gate (`done` checks) |
|---|-------|---------------------|---------------------------|
| 1 | **Recon** | Forensic inventory of every route, modal, tab, wizard step, shortcut, gate, empty state → `inventory.md` | inventory.md exists, non-trivial |
| 2 | **Feature matrix** | Every capability + sub-capability = one CSV row (`F-012`, `F-012.1`…), `status=inventoried` | matrix has > 0 rows |
| 3 | **Mapping** | Deterministic grammar rules fill `mapping`+`size` per row; ambiguities logged in `decision-log.md` | zero rows with empty mapping |
| 4 | **Scaffold** | Panel shell beside the untouched old app: engine, tokens, registry from the matrix, Spaces, URL sync | none — human judgment on the evidence |
| 5 | **Migrate batches** | THE LOOP: ≤5 rows per run → real panels wired to the existing data layer, `status=migrated` + `evidence`, commit. Repeat. | **every row `migrated`** — else refuses, prints ids |
| 6 | **Coverage gate** | Adversarial re-crawl of the OLD app; gaps → new rows (back to 5); 20 random rows verified live; console sweep | every row still `migrated` after the pass |
| 7 | **Acceptance** | Golden-path browser sweep, laws audit, redirects from every old URL, purge dead legacy views | `REPORT.md` written |

## Commands

```
stax-migrate init   [dir]      create stax-migration/ (7 substituted phase briefs,
                               empty matrix, decision log, state.json) + print the plan
stax-migrate status [dir]      phase, rows, counts by status, coverage %, first 10 unmigrated
stax-migrate prompt [n] [dir]  print phase n's brief to stdout — pipe/paste into any agent
stax-migrate next   [dir]      current phase brief + exactly how to run it
stax-migrate done   [dir]      validate the phase's exit gate, advance or refuse with ids
stax-migrate run    [dir] --agent claude|codex [--phase n]
                               drive ONE phase (never more) via the agent CLI, re-check the gate
```

`{{TARGET}}` and `{{STACK}}` are substituted at `init` (stack sniffed from the
target's package.json: Next.js / Angular / Vue / Svelte / React / Express /
Rails-ish / unknown).

## Using agents

- **Claude Code** — `stax-migrate run . --agent claude` spawns
  `claude -p "<phase brief>" --permission-mode acceptEdits` with cwd = target.
- **Codex** — `--agent codex` spawns `codex exec "<phase brief>"`.
- **Anything else** — `stax-migrate prompt 3 . | pbcopy` and paste. The briefs
  are model-agnostic, self-contained missions.

One phase per invocation, always: the human stays in the loop between phases.
After a run the CLI re-checks the gate and tells you what's still missing —
advancement is only ever `stax-migrate done`.

## FAQ

**Partial adoption — can I migrate only one area?**
Yes, socially, not mechanically: scope phase 1 to that area (edit the brief in
`stax-migration/01-recon.md` — it's yours after init) and the matrix will only
ever contain that area's rows. The guarantee then covers exactly what you
inventoried. The gate never knows about things you deliberately kept out; what
enters the matrix, however, can never be dropped.

**Monorepos?**
Point `init` at the app package (`stax-migrate init apps/dashboard`), not the
repo root — the workspace, stack sniff, and briefs are per-app. Run one
migration per app; matrices don't merge.

**Does the old app keep working during the migration?**
Yes — by law. Phase 4 mounts the shell *beside* the legacy routes; phase 5 adds
panels without deleting anything; only phase 7, after the coverage gate is
green, redirects old URLs and purges dead views. At every intermediate commit
both worlds run.

**An agent marked rows migrated that don't work.**
Phase 6 exists because of exactly this: it verifies random migrated rows against
the running app and flips liars back to `mapped` — which re-arms the gate. You
can also flip a row yourself in the CSV; `done` will refuse until it's honestly
re-migrated.

**Where does the engine come from?**
Phase 4 installs `@frameword/panels-core` + `@frameword/panels-react` from
[github.com/agentik-os/stax](https://github.com/agentik-os/stax), or vendors the
two packages into your repo when a git dependency doesn't fit.
