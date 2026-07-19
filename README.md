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
| `frameword/apps/crm-specimen` | The full specimen app — WhitePaper design system, 65-component gallery ×3 structural versions, 43 dashboard blocks with full-width live demos, Figma/Miro-class canvas (multi-board, 4-way handles, magnetic guides, AI board builder), notes + tasks manager, agent drawer, master-prompt kit |
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

## The laws (short form)

1. Opening a Space replaces the active thread; pinned references ride across pages.
2. One action zone per panel — the foot. Never floating buttons.
3. Parents stay visible; depth reads left → right; ⌘K goes anywhere.
4. State is a serializable list — everything (URL, breadcrumb, agent context) derives from it.
5. Tokens only — change the accent and the whole system follows.
