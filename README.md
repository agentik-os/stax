# Stax — the panels-inside-panels UI/UX framework

**Live demo → [stax-agentik-oss-projects.vercel.app](https://stax-agentik-oss-projects.vercel.app/)** — the full specimen, deployed.

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
| `frameword/packages/panels-core` | The pure TypeScript engine — reducer, intent commands, laws (25 tests) |
| `frameword/packages/panels-react` | React bindings — provider, registry, URL sync, persistence |
| `frameword/apps/crm-specimen` | The full specimen app — WhitePaper design system, 65-component gallery ×3 structural versions, 43 dashboard blocks with full-width live demos, Figma/Miro-class canvas (multi-board, 4-way handles, movable links, right-click menus, AI board builder), notes + tasks (kanban, subtasks), **Data: Airtable-class tables where every row opens as a Notion-class page**, agent drawer, master-prompt kit |
| `frameword/packages/stax-migrate` | **The migration engine** — a zero-dependency CLI that drives a complete refonte of ANY legacy app to the panel grammar via Claude Code or Codex, with a mechanical no-feature-left-behind guarantee |
| `DESIGN-SPEC.md` | **The pixel contract** — panel anatomy and interior margins, type & number laws, the accent ramp, icon spec, and the old-element → Stax conversion table |
| `PANEL-LOGIC.md` · `CONCEPT-BRIEF.md` · `PROMPT-KIT.md` | The concept, the laws, and paste-ready prompts to adapt ANY app to the panel grammar |
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
gated phases. Two matrices are the law:

- **Feature matrix** — every feature and sub-feature gets an id (F-012, F-012.1…).
- **Element matrix** — every visual atom gets one too (E-041 = an icon, a card style,
  a badge, a spacing value, a select…). *An icon used once is a row.* Each row must land
  on the [DESIGN-SPEC.md](DESIGN-SPEC.md) contract: exact interior margins, tokens
  instead of hex, stroke icons, segmented buttons instead of status dropdowns, popover
  pickers instead of native inputs, all six states.

The gate is mechanical: the pipeline **refuses to complete while a single row of either
matrix is unmigrated** — forgetting a feature, or a 12px icon, is structurally impossible.

```sh
git clone https://github.com/agentik-os/stax && cd your-legacy-app
node ../stax/frameword/packages/stax-migrate/index.mjs init .

# then, phase by phase (the human stays in the loop between phases):
node ../stax/frameword/packages/stax-migrate/index.mjs run . --agent claude   # or codex
node ../stax/frameword/packages/stax-migrate/index.mjs status .               # both coverage bars
```

| Phase | What the agent does | Exit gate |
|---|---|---|
| 1 Recon | Forensic inventory: every route, modal, tab, wizard, form, table, filter, shortcut, permission, state | `inventory.md` exists |
| 2 Feature matrix | Inventory → `feature-matrix.csv`, sub-features included | > 0 rows |
| 3 UI inventory | Every icon, button variant, card, badge, input, select, table, chart, color, font, spacing value, shadow → `element-matrix.csv` | > 0 element rows |
| 4 Feature mapping | Deterministic grammar rules (page→Space, modal→panel, tabs→sibling drills…) | zero empty mappings |
| 5 Design mapping | Every element row → its Stax target + tokens + exact spacing (spec §6 conversion table) | zero empty targets |
| 6 Scaffold | Panel shell + registry + Spaces + WhitePaper tokens; old app untouched | shell boots |
| 7 Migrate | Batches ≤5 features + every element they touch → real panels with spec-true interiors | **100% of BOTH matrices — or it refuses** |
| 8 Coverage gate | Adversarial re-crawl of the old app + design audit of the new one (hex leaks, px font-sizes, native inputs, margin drift) | zero gaps in a full pass |
| 9 Acceptance | Golden-path sweep, laws audit, six-states check, old-URL redirects, report | `REPORT.md` |

The same intelligence is browsable inside the app: **Prompt pack → M1-M6**.

## The laws (short form)

1. Opening a Space replaces the active thread; pinned references ride across pages.
2. One action zone per panel — the foot. Never floating buttons.
3. Parents stay visible; depth reads left → right; ⌘K goes anywhere.
4. State is a serializable list — everything (URL, breadcrumb, agent context) derives from it.
5. Tokens only — change the accent and the whole system follows.
