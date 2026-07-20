# Stax — panels-inside-panels UX framework

**Live demo → [stax-agentik-oss-projects.vercel.app](https://stax-agentik-oss-projects.vercel.app/)** — the full specimen, deployed.

**One mechanic: click anything with depth and a panel opens to the right. The parent stays.**
No pages, no modals, no tabs — a serializable stack of panels (Miller columns, evolved), with
pinned references that survive navigation, URL-synced state, and a registry that sizes every panel.

## What's inside

| Path | What it is |
|---|---|
| `frameword/packages/panels-core` | The pure TypeScript engine — reducer, intent commands, laws (25 tests) |
| `frameword/packages/panels-react` | React bindings — provider, registry, URL sync, persistence |
| `frameword/apps/crm-specimen` | The full specimen app — WhitePaper design system, 65-component gallery ×3 structural versions, 43 dashboard blocks with full-width live demos, Figma/Miro-class canvas (multi-board, 4-way handles, movable links, right-click menus, AI board builder), notes + tasks (kanban, subtasks), **Data: Airtable-class tables where every row opens as a Notion-class page**, agent drawer, master-prompt kit |
| `frameword/packages/stax-migrate` | **The migration engine** — a zero-dependency CLI that drives a complete refonte of ANY legacy app to the panel grammar via Claude Code or Codex, with a mechanical no-feature-left-behind guarantee |
| `PANEL-LOGIC.md` · `CONCEPT-BRIEF.md` · `PROMPT-KIT.md` | The concept, the laws, and paste-ready prompts to adapt ANY app to the panel grammar |
| `demo/panel-logic-demo.html` | Standalone pedagogical demo — open in a browser, zero build |

## Run it

```sh
cd frameword
bun install
bun test                 # the laws
cd apps/crm-specimen
bunx vite                # → http://127.0.0.1:5173
```

## Adopt Stax in ANY legacy project — the migration engine

`stax-migrate` is a program, not a prompt: it understands your existing app, builds an
exhaustive **feature matrix** (every feature AND sub-feature gets an id — F-012, F-012.1…),
maps each row to the panel grammar with deterministic rules, then drives the full refonte
through **Claude Code or Codex** in gated phases. The gate is mechanical: the pipeline
**refuses to complete while a single row is not migrated** — forgetting a feature is
structurally impossible.

```sh
git clone https://github.com/agentik-os/stax && cd your-legacy-app
node ../stax/frameword/packages/stax-migrate/index.mjs init .

# then, phase by phase (the human stays in the loop between phases):
node ../stax/frameword/packages/stax-migrate/index.mjs run . --agent claude   # or --agent codex
node ../stax/frameword/packages/stax-migrate/index.mjs status .               # coverage %, missing ids
```

| Phase | What the agent does | Exit gate |
|---|---|---|
| 1 Recon | Forensic inventory: every route, modal, tab, wizard, form, table, filter, shortcut, permission, state | `inventory.md` exists |
| 2 Matrix | Inventory → `feature-matrix.csv` — one row per capability, sub-features included | > 0 rows, nothing outside the matrix |
| 3 Mapping | Deterministic grammar rules (page→Space, modal→panel, tabs→sibling drills, wizard→chained drills…) | zero empty mappings |
| 4 Scaffold | Panel shell + registry + Spaces from the matrix; old app untouched | shell boots |
| 5 Migrate | Batches of ≤5 rows → real panels, `status=migrated` + `evidence=file:line` | **100% rows migrated — or it refuses** |
| 6 Coverage gate | Adversarial re-crawl of the OLD app hunting anything the matrix missed | zero gaps in a full pass |
| 7 Acceptance | Golden-path sweep, laws audit, old-URL redirects, final report | `REPORT.md` |

The same intelligence is browsable inside the app: **Prompt pack → M1-M6**, the paste-ready
master prompts the engine's phases are built from.

## The laws (short form)

1. Opening a Space replaces the active thread; pinned references ride across pages.
2. One action zone per panel — the foot. Never floating buttons.
3. Parents stay visible; depth reads left → right; ⌘K goes anywhere.
4. State is a serializable list — everything (URL, breadcrumb, agent context) derives from it.
5. Tokens only — change the accent and the whole system follows.
