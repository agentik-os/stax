# Stax — the panels-inside-panels UI/UX framework

**Live demo → [stax-agentik-oss-projects.vercel.app](https://stax-agentik-oss-projects.vercel.app/)** — the full specimen, deployed.

**See it live** — deep links straight into the flagship showcases (the URL hash IS the workspace):

- [Platform console](https://stax-agentik-oss-projects.vercel.app/#%7B%22spaceId%22%3A%22pf-console%22%2C%22path%22%3A%5B%7B%22t%22%3A%22section%22%2C%22k%22%3A%22sec%3Apf-console%22%7D%5D%7D) — an org console rebuilt panel-first: API keys, billing, limits, live logs
- [API keys table](https://stax-agentik-oss-projects.vercel.app/#%7B%22spaceId%22%3A%22pf-console%22%2C%22path%22%3A%5B%7B%22t%22%3A%22section%22%2C%22k%22%3A%22sec%3Apf-console%22%7D%2C%7B%22t%22%3A%22pfkeys%22%2C%22k%22%3A%22pf%3Akeys%22%7D%5D%7D) — search, segment filters, masked reveal-once secrets, row → panel
- [The CRM chain](https://stax-agentik-oss-projects.vercel.app/#%7B%22spaceId%22%3A%22crm%22%2C%22path%22%3A%5B%7B%22t%22%3A%22space%22%2C%22k%22%3A%22space%3Acrm%22%7D%2C%7B%22t%22%3A%22account%22%2C%22k%22%3A%22acc%3Aacme%22%7D%2C%7B%22t%22%3A%22contact%22%2C%22k%22%3A%22con%3Ajo%22%7D%2C%7B%22t%22%3A%22opportunity%22%2C%22k%22%3A%22opp%3Arefonte%22%7D%5D%7D) — accounts → contact → opportunity, four panels deep in one URL
- [Canvas board](https://stax-agentik-oss-projects.vercel.app/#%7B%22spaceId%22%3A%22canvas%22%2C%22path%22%3A%5B%7B%22t%22%3A%22canvas%22%2C%22k%22%3A%22sec%3Acanvas%22%7D%5D%7D) — a Figma-class whiteboard as a panel; nodes drill to inspectors
- [Data tables](https://stax-agentik-oss-projects.vercel.app/#%7B%22spaceId%22%3A%22data%22%2C%22path%22%3A%5B%7B%22t%22%3A%22datahome%22%2C%22k%22%3A%22sec%3Adata%22%7D%5D%7D) — Notion/Airtable-class views; every row opens as a page panel
- [Build hub](https://stax-agentik-oss-projects.vercel.app/#%7B%22spaceId%22%3A%22pf-studio%22%2C%22path%22%3A%5B%7B%22t%22%3A%22section%22%2C%22k%22%3A%22sec%3Apf-studio%22%7D%2C%7B%22t%22%3A%22pfhub%22%2C%22k%22%3A%22pf%3Ahub%22%7D%5D%7D) — six paste-ready agent prompts, opening prefilled in the Studio composer


**One mechanic: click anything with depth and a panel opens to the right. The parent stays.**

Stax is as much a **design system** as a navigation model: a complete WhitePaper UI
language (serif display / mono data / one accent and its ramp, exact interior margins,
stroke icons, six mandatory states) shipped as tokens — change the accent or the type
scale in Settings and the entire system follows, from KPI cards to the canvas edges.
The pixel-level contract lives in [DESIGN-SPEC.md](DESIGN-SPEC.md).
No pages, no modals, no tabs — a serializable stack of panels (Miller columns, evolved), with
pinned references that survive navigation, URL-synced state, and a registry that sizes every panel.

## What's inside

| Path | What it is |
|---|---|
| `frameword/packages/panels-core` | The pure TypeScript engine — reducer, intent commands, laws (33 tests) |
| `frameword/packages/panels-react` | React bindings — provider, registry, URL sync, persistence |
| `frameword/apps/crm-specimen` | The full specimen app — WhitePaper design system, 65-component gallery ×3 structural versions, 43 dashboard blocks with full-width live demos, Figma/Miro-class canvas (multi-board, 4-way handles, movable links, right-click menus, AI board builder), notes + tasks (kanban, subtasks), **Data: Airtable-class tables where every row opens as a Notion-class page**, agent drawer, master-prompt kit |
| `frameword/packages/stax-migrate` | **The migration engine** — a zero-dependency CLI that drives a complete refonte of ANY legacy app to the panel grammar via Claude Code or Codex, with a mechanical no-feature-left-behind guarantee |
| `DESIGN-SPEC.md` | **The pixel contract** — panel anatomy and interior margins, type & number laws, the accent ramp, icon spec, and the old-element → Stax conversion table |
| `PANEL-LOGIC.md` · `CONCEPT-BRIEF.md` · `agents.md` / `llms.txt` | The concept, the laws, and the six generated master prompts for coding agents (source of truth: the in-app Prompt pack) |
| `demo/panel-logic-demo.html` | Standalone pedagogical demo — open in a browser, zero build |

## Install & run

```sh
git clone https://github.com/agentik-os/stax
cd stax/frameword
bun install                       # workspaces: panels-core, panels-react, crm-specimen, stax-migrate
bun test                          # the 25 engine-law tests
bun run dev                       # the specimen → http://127.0.0.1:5799
```

Production build of the specimen:

```sh
cd apps/crm-specimen
bunx vite build                   # → dist/ (static, deploy anywhere)
```

## Use the framework in your own app

The engine is two packages — a pure reducer and thin React bindings:

```tsx
import { WorkspaceProvider, useWorkspace } from "@frameword/panels-react";

// 1 · the registry maps every panelType to a width class (S 380 · M 480 · L 640 · XL 800)
const REGISTRY = { space: { size: "L" }, account: { size: "M" }, contact: { size: "M" } };

// 2 · wrap the app — URL sync + localStorage persistence are built in
<WorkspaceProvider registry={REGISTRY} urlSync storageKey="my-app">
  <Shell />
</WorkspaceProvider>;

// 3 · drive it with intents — the entire UI derives from WorkspaceState
function Row({ panelId, account }) {
  const ws = useWorkspace();
  return (
    <button onClick={() =>
      ws.openDetail(panelId, { panelType: "account", resourceKey: "acc:" + account.id })}>
      {account.name}                {/* opens the next panel to the right — the parent stays */}
    </button>
  );
}
```

Seven intents cover everything: `openSpace · openDetail · pinPanel/unpinPanel · closePanel ·
navigateTo · openPath`. Style with the WhitePaper tokens (`tokens.css`) and the exact
interior spacings from [DESIGN-SPEC.md](DESIGN-SPEC.md); the specimen app is the living
reference for every pattern (tables, canvas, notes, pickers, popovers).

## Adopt Stax in ANY legacy project — structure AND design

`stax-migrate` is a program, not a prompt. It rebuilds a legacy app on the panel grammar
**and** retransforms its entire UI at pixel granularity, via **Claude Code or Codex**, in
gated phases — at an **integration level you contract up front**, so a migration can
never end up "10% integrated and quietly done":

| level | you get | the gates accept |
|---|---|---|
| **`full`** *(default)* | 100% integrated — everything migrated, old UI purged | migrated only |
| **`standard`** | every row terminal; legacy surfaces may stay embedded | migrated · wrapped/deferred **with cited reasons** |
| **`starter`** | your chosen core spaces at 100% | migrated · out-of-scope **with cited reasons** |
| **`shell`** | the Stax shell wraps the app, every route panel-reachable | migrated · wrapped **with cited reasons** |

Three matrices are the law:

- **Feature matrix** — every feature and sub-feature gets an id (F-012, F-012.1…).
- **Element matrix** — every visual atom gets one too (E-041 = an icon, a card style,
  a badge, a spacing value, a select…). *An icon used once is a row.* Each row must land
  on the [DESIGN-SPEC.md](DESIGN-SPEC.md) contract: exact interior margins, tokens
  instead of hex, stroke icons, segmented buttons instead of status dropdowns, popover
  pickers instead of native inputs, all six states.
- **Data matrix** — **the database and the functions are law too.** Every
  table/collection and every API route/procedure/resolver/cron/webhook is a D-row read
  from the schema and routers, bound to the panel that reads it and the foot action that
  writes it — a writable table with no write path refuses the gate, and phase 8 greps
  the new panels for lingering legacy-endpoint calls.

The gate is mechanical: the pipeline **refuses to complete while a single row of any
matrix blocks the contracted level**, and every skipped row must carry its reason —
forgetting a feature, a 12px icon, or a table is structurally impossible.
`stax-migrate contract` answers "how integrated is it really?" at any moment (exit 1 on breach).

```sh
git clone https://github.com/agentik-os/stax && cd your-legacy-app
node ../stax/frameword/packages/stax-migrate/index.mjs init . --level full   # or standard | starter | shell

# then, phase by phase (the human stays in the loop between phases):
node ../stax/frameword/packages/stax-migrate/index.mjs run . --agent claude   # or codex
node ../stax/frameword/packages/stax-migrate/index.mjs status .               # three coverage bars
node ../stax/frameword/packages/stax-migrate/index.mjs contract .             # the honesty check
```

| Phase | What the agent does | Exit gate |
|---|---|---|
| 1 Recon | Forensic inventory: every route, modal, tab, wizard, form, table, filter, shortcut, permission, state | `inventory.md` exists |
| 2 Feature + data matrices | Inventory → `feature-matrix.csv` (sub-features included) + `data-matrix.csv` (every table & server function) | > 0 rows in both |
| 3 UI inventory | Every icon, button variant, card, badge, input, select, table, chart, color, font, spacing value, shadow → `element-matrix.csv` | > 0 element rows |
| 4 Feature + data mapping | Deterministic grammar rules (page→Space, modal→panel, tabs→sibling drills…) + every D row bound to its reading panel and writing foot action | zero empty mappings/bindings |
| 5 Design mapping | Every element row → its Stax target + tokens + exact spacing (spec §6 conversion table) | zero empty targets |
| 6 Scaffold | Panel shell + registry + Spaces + WhitePaper tokens; old app untouched | shell boots |
| 7 Migrate | Batches ≤5 features + every element AND data row they touch → real panels, real reads and writes observed | **every matrix terminal at the contracted level — or it refuses** |
| 8 Coverage gate | Adversarial re-crawl of the old app + design audit of the new one + data re-crawl (schema drift, exercised bindings, legacy-endpoint leaks) | zero gaps in a full pass |
| 9 Acceptance | Golden-path sweep, laws audit, six-states check, old-URL redirects, report | `REPORT.md` |

The same intelligence is browsable inside the app: **Prompt pack → M1-M6**.

## The laws (short form)

1. Opening a Space replaces the active thread; pinned references ride across pages.
2. One action zone per panel — the foot. Never floating buttons.
3. Parents stay visible; depth reads left → right; ⌘K goes anywhere.
4. State is a serializable list — everything (URL, breadcrumb, agent context) derives from it.
5. Tokens only — change the accent and the whole system follows.
