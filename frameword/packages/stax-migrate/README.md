# stax-migrate

**Take any legacy web app. Rebuild it on the Stax panels-inside-panels grammar —
down to the pixel, down to the last table and server function. Lose nothing —
provably — at the integration level YOU contracted.**

A zero-dependency Node CLI (plain ESM, node ≥ 18) that drives a complete
refonte to the [Stax](../../../README.md) grammar — no pages, no modals, no
tabs; a serializable stack of panels, styled to the letter of the
[design spec](templates/design-spec.md) — via Claude Code, Codex, or any
coding agent you paste a prompt into.

## The guarantee, mechanically

Most migrations lose features because coverage lives in someone's head, lose
the design because "restyled" is judged by eye — and end up "10% integrated"
because nobody wrote down what *integrated* was supposed to mean. Here all
three live in files:

- **`contract.json` — the integration level is a contract, not a mood.**
  `init` asks which level you are signing (`full` is the default and the
  recommendation), every gate enforces exactly that level, and LOWERING the
  level mid-migration requires `--force` and is written to the decision log.

  | level | meaning | the gates accept |
  |---|---|---|
  | **`full`** | 100% integrated — everything migrated, old UI purged | `migrated` only |
  | **`standard`** | everything terminal; legacy surfaces may be embedded | `migrated` · `wrapped`* · `deferred`* |
  | **`starter`** | chosen core spaces at 100%, rest explicitly excluded | `migrated` · `out-of-scope`* |
  | **`shell`** | the Stax shell wraps the app; every route panel-reachable | `migrated` · `wrapped`* |

  \* every non-migrated status **must cite its reason** in the `evidence`
  column — an uncited skip blocks the gate. An empty status blocks at every
  level. `migrated` itself needs cited evidence (file:line / runtime proof) —
  a bulk status-flip dies at the gate. A `starter` contract must **declare its
  in-scope areas** (`stax-migrate scope deals,contacts`): in-scope rows can
  never be marked out-of-scope. And the gates remember every row id they have
  ever seen — deleting a row without a decision-log entry naming it blocks.
  That is the whole anti-10% mechanism: nothing is ever skipped silently.

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
- **`data-matrix.csv` — the database and the functions are law too.** Phase 2
  reads the SCHEMA and the ROUTERS, not the UI: every table/collection/model
  and every API route/tRPC procedure/resolver/server action/cron/webhook is a
  `D-NNN` row carrying `ops` (c/r/u/d). Phase 4 binds each row to the panel
  that READS it (`panel_binding`) and — for anything writable — the foot
  action that WRITES it (`write_path`). Phase 7 marks a D row migrated only
  after one real read AND one real write observed at runtime; phase 8
  re-crawls the schema for drift and greps the new panels for lingering
  legacy-endpoint calls. A migrated writable table with no write path refuses
  the gate.
- **`design-spec.md` — the conversion contract.** Shipped with the package and
  written into every workspace: exact panel anatomy (body 18/18/16, bar h56,
  foot 11/14, card 14/16 r12…), the type/numbers laws, the accent ramp, the
  radius/shadow/motion scales, the icon spec, the old-element→Stax conversion
  table, the six mandatory states. Phase 5 maps every E row onto it; phase 7
  implements against it; phase 8 greps the new app for violations.
- **`stax-migrate done` is a hard gate.** It refuses to advance while any row
  of **any** matrix blocks the contracted level, and prints the offending F-,
  E- and D- ids with the exact breach. No agent can talk its way past it; the
  check reads the CSVs, not the summary. `stax-migrate contract` is the
  one-shot honesty check — contracted level vs live coverage, exit 1 on breach.

## Quickstart (no install needed)

```sh
# from anywhere — point it at the legacy project
node /path/to/frameword/packages/stax-migrate/index.mjs init /path/to/legacy-app
# → asks the integration level (full / standard / starter / shell) and writes contract.json
#   non-interactive? pass it: … init /path/to/legacy-app --level full

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
| 2 | **Feature + data matrices** | Every capability + sub-capability = one `F-NNN[.N]` row; every table + server function = one `D-NNN` row with its c/r/u/d ops | feature AND data matrices have > 0 rows |
| 3 | **UI inventory** | Pixel crawl: every icon (named + counted), button/card/badge/input/select/table/chart/nav variant, spacing histogram, color + type census, present/missing states → `E-NNN[.N]` rows | **element matrix has > 0 rows** |
| 4 | **Feature + data mapping** | Deterministic grammar rules fill `mapping`+`size` per F row; every D row gets `panel_binding` (+ `write_path` if writable); scope skips declared HERE with reasons | zero unmapped F rows, zero unbound D rows (reasoned skips aside) |
| 5 | **Design mapping** | Every E row gets `stax_target` (per design-spec §6), `tokens`, `spacing` (per §1) | **zero E rows with empty stax_target** |
| 6 | **Scaffold** | Panel shell beside the untouched old app: engine, spec tokens, registry from the matrix, Spaces, URL sync | none — human judgment on the evidence |
| 7 | **Migrate batches** | THE LOOP: ≤5 F rows **+ every E and D row they touch** → real panels at contract spacing, real reads AND writes observed, all matrices get `status` + `evidence`, commit. Repeat. | **every row of ALL matrices terminal at the contracted level** — else refuses with ids and breaches |
| 8 | **Coverage gate** | Adversarial re-crawl of the OLD app + design audit of the NEW app + **data re-crawl** (schema drift, exercised bindings, lingering legacy-endpoint calls) — every finding = a new row, back to 7 | all matrices still green after the pass |
| 9 | **Acceptance** | Golden-path sweep, laws audit, **six states verified on 10 random migrated elements**, redirects from every old URL, purge dead legacy views | `REPORT.md` written, opening with the **Integration contract** attestation |

## Commands

```
stax-migrate init   [dir] [--level full|standard|starter|shell] [--no-data]
                               create stax-migration/ (9 substituted phase briefs, design-spec.md,
                               three empty matrices, contract.json, decision log, state.json)
stax-migrate status [dir]      contract + phase + three matrices: counts, coverage bars, blocking ids
stax-migrate contract [dir]    the honesty check: contracted level vs live coverage (exit 1 on breach)
stax-migrate level  [name] [dir] [--force]
                               show or change the level — lowering mid-migration (or waiving data) needs --force, and is logged
stax-migrate upgrade [dir]    already-Stax project: applied/pending layout+design updates (U-001…)
stax-migrate upgrade plan [id] · run --agent claude|codex [--id U-00X] · done <id>
                               print a unit's brief · drive an agent to apply it · record it (operator-gated)
stax-migrate scope  [a,b,c] [dir] [--force]
                               declare the STARTER in-scope areas — in-scope rows must reach 100%; changes are logged
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
data-matrix.csv     id,layer,name,kind,source,ops,panel_binding,write_path,status,evidence
```

`kind` ∈ icon · button · card · badge · input · select · table · chart · nav ·
modal · toast · spacing · color · type · state · other. `count` = occurrences
found in the crawl. Both matrices walk inventoried → mapped → migrated, and
sub-rows (`F-012.1`, `E-007.1`) are gated individually — a parent existing
never auto-migrates its children. Data rows: `layer` ∈ db · function; `ops` is
the c/r/u/d set the row supports; a writable row is only ever migrated with a
named `write_path`. A project with genuinely no backend waives the data matrix
at init with `--no-data` (recorded in the contract). `stax-migrate data scan
--write` fills this matrix PROGRAMMATICALLY (see Backend continuity below);
the agent only fills `panel_binding` and `write_path`.

## Backend continuity — Convex · Supabase · Prisma · REST · tRPC (80% programmatic / 20% AI)

**Yes: Convex works. Supabase works.** So do Prisma, Next.js API routes and tRPC —
because Stax only replaces the FRONT-END GRAMMAR. Panels are a view layer: your
queries, mutations, RLS policies, RPCs, realtime channels and edge functions
survive the migration untouched. What changes is WHERE each read renders (a
panel body) and WHERE each write lives (a foot action). The data matrix is the
map between the two, and it is now extracted MECHANICALLY:

```sh
stax-migrate data scan .            # detect the backend, extract every surface (dry run)
stax-migrate data scan . --write    # merge into data-matrix.csv (ids + mappings preserved)
stax-migrate data check .           # the gate: exit 1 until 100% of the backend is bound
```

What the scanner proves from SOURCE, with file:line evidence, zero network:

| layer | extracted programmatically |
|---|---|
| **Convex** | every `defineTable`, every exported `query`/`mutation`/`action`/`httpAction` (internals listed, not gated), **custom function builders** (convex-helpers `authedQuery`-style: rows extracted, kind guessed, named in a warning), every `useQuery`/`useMutation`/`fetch*` call site in the app, table r/c/w ops from `ctx.db` usage, functions the app never calls (**UNUSED** flag) |
| **Supabase** | every `CREATE TABLE` in migrations (quoted/schema-prefixed, multi-line DDL and policies included), RLS + policy counts (**RLS-on with zero policies = lockout warning**), every `.from().select/insert/update/upsert/delete` site, `.rpc()`, `.channel()` realtime, `storage.from()` buckets (never confused with tables), edge functions, dynamic `.from(expr)` flagged for human eyes |
| **Prisma** | every `model`, r/c/u/d ops from `prisma.<model>.*` call sites |
| **REST / tRPC** | every `app/api/**/route.ts` method set, `pages/api` handler, **`fetch("/api/…")` sites bound to their routes** (`[param]` aware) with unmatched fetches flagged as **legacy-leak candidates**, every tRPC procedure classified query vs mutation |

The matcher is WHOLE-TEXT over comment-stripped source: Prettier-formatted
chains (`supabase⏎.from("x")⏎.select()`), multi-line `useQuery(⏎ api.mod.fn`,
and multi-line SQL policies all count; commented-out code never does. Both
commands take `--json` for CI and agent consumption, and the entire loop
(init → scan → red gate → map → green gate → drift → red gate) runs as a
committed test on every push.

**The 80/20 law.** The scanner extracts and the gate verifies — that is the 80%
programmatic. The AI's 20% is ONLY judgment: naming which panel reads each row
(`panel_binding`) and which foot action writes it (`write_path`). Then
`data check` closes the loop mechanically: an unbound row, a writable row with
no write path, a bare "skipped" with no reason, or code-vs-matrix drift (a table
in code the matrix doesn't know) each exit 1 and name themselves. Re-running
`scan --write` is always safe: existing ids and AI mappings are preserved,
facts are refreshed, manual rows are kept and flagged.

**Workspace state rides your backend too.** The panel workspace itself persists
through a two-method `StorageAdapter` — the root README shows a Convex adapter;
the Supabase twin is symmetrical:

```ts
const supabaseAdapter = (sb: SupabaseClient, userId: string): StorageAdapter => ({
  load: async () => (await sb.from("workspaces").select("state").eq("user_id", userId).single()).data?.state ?? null,
  save: (state) => void sb.from("workspaces").upsert({ user_id: userId, state }),
});
```

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
Yes — mechanically now: `stax-migrate init . --level starter` (or `standard` /
`shell`). Everything still gets inventoried — that part is never optional —
but the level defines which terminal statuses the gates accept, and every
skipped row must carry its reason. `stax-migrate contract` will tell you, at
any moment, exactly how integrated you really are. What enters a matrix can
still never be silently dropped.

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
