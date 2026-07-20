# FRAMEWORK — The Prompt Kit (P0–P3)

> Codename **Stax** (placeholder). Paste-ready, self-contained prompts that explain
> the concept and drive each build. Read `BRAINSTORM.md` first for the rationale.
> Order: **P0** teaches the idea → **P1** builds the framework → **P2** adopts it in a
> new app → **P3** ships each improvement.

---

## P0 — Concept explainer (brand-agnostic, design-agnostic)

> Use this as the canonical "what is Stax." Give it to any human or any coding agent
> before they touch the code. It is behaviour only — no colours, no typography.

```
# Stax — the panels-inside-panels navigation paradigm

## One sentence
The entire interface is a horizontal stack of in-page panels (Miller columns).
Clicking anything with depth opens a panel to its right; that panel can open another
to its right, to infinity; you scroll horizontally to navigate. There are NO pages,
NO modals, NO tabs — one mechanic (open-right), one action zone (the footer), one way
back (close / breadcrumb).

## Why it wins
- Context is preserved — the parent stays visible while you explore the child.
- Infinite depth — any node can open a child, with no level limit.
- Predictable — one gesture, one action zone, one back.
- Composable — the same panel shell renders a dashboard, a form, a chat, a reader,
  a kanban, or a node-graph canvas.

## The screen
Sidebar (sections) · Topbar (breadcrumb derived from the stack + search + tools) ·
Column stage (where panels live; empty = dashboard) · optional right Drawer (a fixed
overlay for transversal tools — NOT part of the stack).

## A panel
Fixed-height header bar (context/eyebrow + move ‹ › + pin + close) — the separator
line sits at the SAME y on every panel. Scrollable body (title/subtitle/tags, then
content). Optional anchored footer = the single action zone.

## The 10 laws (non-negotiable, encoded in the engine — not per screen)
1. Modules never mix. Opening a section from the sidebar REPLACES the whole stack.
2. The root panel is fixed left — not movable/pinnable; its × closes the module.
3. Drilling keeps the parent. A child opens to the right; deeper open children are
   dropped — EXCEPT pinned ones. Opening another child of the same parent replaces the
   previous (preview).
4. Pin locks a slot (preview-tab model): an unpinned panel is a transient preview the
   next one replaces; pin it and the next opens to ITS right.
5. No double-open. Every panel has a unique id; opening an id already in the stack is
   a no-op.
6. Reorder via header ‹ ›; nothing displaces the root.
7. Fixed-height header (~56px) so separators align across the stack. Titles live in
   the body, never the bar.
8. Action-placement law. Every primary action / composer lives in the anchored footer,
   never floating in the body. Read-only panels have no footer.
9. Optical-centering law. Digits/labels in pills read ~1px high if naïvely flex-centred
   (cap-height sits above the line-box centre). Centre with line-height:1 + a hair more
   top padding.
10. Full-height chat. A conversation-first panel fills the whole panel height (input
    anchored at bottom), never a tiny dock.

## The two axes (Stax + Canvas)
- Depth/drill axis = the panel-stack (above). "What's inside this?"
- Breadth/topology axis = a node-graph CANVAS (React Flow). "How do these connect?"
- Bridge: a canvas is a panel type (wide). Selecting/drilling a node opens its inspector
  as a child panel to the right. The same data can be viewed as a drill-stack OR a graph.

## State is data
Stack = [{ id, type, params, pinned }]. Graph = { nodes, edges }. Both are
JSON-serializable → URL-encodable, persistable, undoable, and readable by the agent
(the agent's context is "what panels/nodes are open right now").

## Anti-patterns (forbidden)
Modals for content · page-nav that loses the stack · two modules side by side ·
floating primary buttons in the body · titles in the header bar · duplicating an open
panel · horizontal scroll INSIDE a panel (only the stage scrolls).
```

---

## P1 — Build the framework (for Claude Code / Codex)

> The big one. Scaffolds all four layers with the Tier-0 improvements baked in.
> Assumes `BRAINSTORM.md` + `P0` + the LifeOS reference (`panel-engine.jsx`,
> `PANEL-BEHAVIOR-SPEC.md`, `DESIGN-SYSTEM.md`) are in context.

```
You are building **Stax** — a UX framework that ships the "panels-inside-panels"
navigation paradigm as three layered products. Build it **clean-room, from zero**:
your single source of truth is `PANEL-LOGIC.md` (the state, the 7 ops, the 7 laws, the
shell contract). There is NO existing codebase to port and NO domain to carry over —
design the reducer from the logic. Do NOT invent behaviour — the laws are fixed.

Build a pnpm monorepo with four layers:

## 1. packages/core  (@stax/core) — pure TS, zero React, zero DOM
- A PURE reducer `reduce(state, action) -> state` implementing the stack ops:
  openRoot, openChild(from), append, closeAt, popTo, togglePin, move, closeAll.
- State shape: { stack: PanelRef[], graph?: GraphState } where
  PanelRef = { id, type, params, pinned }.
- Encode the 7 laws IN THE REDUCER (dedup-by-id, truncate-except-pinned,
  root-fixed-left, preview-vs-pin replace/append) exactly as defined in PANEL-LOGIC.md.
  Design each op (openRoot/openChild/append/closeAt/popTo/togglePin/move) as a pure
  function from the logic — not from any existing file.
- Serialization: `encode(state) <-> decode(string)` for URL/storage round-trips.
- Optional Zustand+Immer store wrapping the reducer (align with workflowbuilder).
- A LAWS TEST-KIT: property/unit tests asserting each of the 10 laws on any registry.

## 2. packages/react  (@stax/react) — bindings
- <StackProvider> (owns the store), useStack() hook exposing the ops + derived
  breadcrumb (breadcrumb is DERIVED from the stack, never separate state).
- Panel-type REGISTRY: registerPanel(type, { schema?, load?, render, width, actions? }).
  Panels are DATA ({type,params}), not render() closures — so a stack rehydrates from
  a URL/DB with no closures. This is the key architectural upgrade over the prototype.
- TWO hosts sharing one reducer:
    <ColumnHost> — desktop: side-by-side Miller columns, auto-scroll to newest.
    <PushHost>   — mobile: single-column iOS master/detail back-stack.
  Pick host by breakpoint; the reducer/state is identical.
- Panel shell (fixed-height header bar / scrollable body / optional anchored footer)
  + a Drill primitive (a row that opens a child) — designed fresh from PANEL-LOGIC.md §4,
  registry-driven.
- URL SYNC: bind encode/decode to the router (Next.js searchParams). Deep-linkable
  stacks, back-button pops, refresh restores. A11y: focus mgmt on open/close, roving
  tabindex across columns, Escape=pop, ⌘K, aria breadcrumb.

## 3. registry/  (shadcn-style, copy-paste via CLI)
- `npx stax add <component>`: shell, drill, panel, breadcrumb, command-palette,
  drawer, canvas, node-inspector.
- Tailwind + shadcn primitives (new-york). Define a fresh, neutral token system
  (surfaces, ink scale, single accent, density, optional skins) as the theme — invented
  for the framework, not inherited from any app. Users OWN and restyle these files.
- CANVAS: wrap @xyflow/react. NODE-INSPECTOR: a schema-driven SheetView (JSONForms).
  Wire the bridge: selecting/drilling a node calls openChild with {type:'node-inspector',
  params:{nodeId}}. Adopt workflowbuilder's opt-in plugins (ELK auto-layout, orthogonal
  edges, copy/paste, undo/redo, PDF export) as optional canvas plugins.

## 4. create-stax-app  (template)
- `npm create stax`: Next.js 15 (App Router) + Convex + Clerk, wired in Panel format.
- Preloads the panel-type registry, the agent seam, and the tokens.
- Ships a NEUTRAL demo board (generic sections + a sample drill hierarchy + one graph
  panel) that exercises the whole system: pin/replace/reorder, drill, URL sync, the
  push-host on mobile, and the canvas→inspector bridge. No real domain.
- Agent seam = a Convex action `agent.ask` whose context is assembled from the OPEN
  STACK + selected graph nodes (stack-as-working-memory), not a static buildContext.

## Rules
- The 10 laws live in @stax/core, never in a screen.
- Never hardcode a token; everything reads CSS custom properties.
- Stack + graph state stay JSON-serializable end to end.
- Stop for review after each layer (core → react → registry → template).
Start with packages/core and its laws test-kit — prove the state machine before any UI.
```

---

## P2 — Adopt Stax in a new project (paste-ready brief)

> The evolution of LifeOS's original "auto-adopt" brief — now backed by real packages
> instead of copy-pasted files.

```
Build this app in **Stax format** (panels-inside-panels). Use @stax/core + @stax/react;
`npx stax add shell drill panel breadcrumb command-palette canvas node-inspector`.

- The shell = fixed sidebar (sections) + topbar (breadcrumb DERIVED from the stack +
  search + drawer + theme) + <ColumnHost> desktop / <PushHost> mobile + optional right
  drawer overlay.
- Every section = a root panel opened via openRoot (replaces the stack).
- Every list item with depth = a <Drill> that opens a child panel to the right; register
  each panel type with a unique id via registerPanel.
- Every primary action / composer = in the panel FOOTER, never floating.
- Every conversation = a full-height ChatPanel (bodyFill).
- Anything relational/branching (pipelines, agent graphs, dependency maps) = a CANVAS
  panel; drilling a node opens its inspector panel to the right.
- Obey the 10 laws (P0) and the atomic-token rule. State stays serializable so stacks
  are deep-linkable and the agent can read what's open.

Domain for THIS app: <describe your sections, your drill hierarchy, your data>.
```

---

## P3 — Per-improvement prompts (ship independently)

### P3.1 — URL-synced, serializable stacks
```
Make Stax stacks deep-linkable. In @stax/core add encode(state)<->decode(string).
In @stax/react bind them to the Next.js router: the URL is the source of truth for the
stack; opening/closing/pinning updates searchParams; the browser back-button pops;
refresh restores the exact columns. Panels MUST be data ({type,params}) resolved through
the registry — no render() closures — so a cold URL rehydrates with no app state.
Add: shareable "copy stack link", and a guard that an unknown type in a URL degrades
gracefully (drop the panel, keep the rest).
```

### P3.2 — Stack-as-agent-working-memory
```
Upgrade the agent seam so its RAG context is assembled from WHAT IS ON SCREEN: the open
panel stack ({type,params} of each column) + any selected canvas nodes, resolved to the
underlying Convex records. Implement as a Convex action agent.ask that reads the
serialized stack, loads each panel's data via its registered `load(params)`, and builds
the prompt from those records (never hardcoded text). Result: the coach always answers
about exactly what the user is looking at.
```

### P3.3 — Responsive dual-host
```
Ship <PushHost> in @stax/react: renders the SAME reducer state as a single-column,
iOS-style master/detail back-stack for mobile (drill = push, back = pop, breadcrumb =
the back trail). Switch host by breakpoint with no state change. Verify: opening the
same deep link on desktop shows N columns; on mobile shows the deepest panel with a
working back-stack to the root.
```

### P3.4 — Canvas synthesis (Stax × React Flow)
```
Add the canvas layer. `npx stax add canvas node-inspector`. Canvas wraps @xyflow/react
as a wide panel type with JSON-serializable {nodes,edges} state living beside the stack
in @stax/core. Wire the bridge: selecting/drilling a node calls openChild with
{type:'node-inspector', params:{nodeId}} — a schema-driven SheetView (JSONForms) opens to
the right. Add "explode to canvas / collapse to stack" so a drill hierarchy and a graph
are two views of one data model. Adopt workflowbuilder's opt-in plugins (ELK auto-layout,
orthogonal edges, copy/paste, undo/redo, PDF export).
```

### P3.5 — Collaboration + command palette + workspaces
```
1. Command palette: ⌘K → fuzzy-pick any registered panel type → openChild/append.
2. Saved workspaces: name + persist a stack/canvas arrangement (Convex); restore by name.
3. Presence + shared stacks: because Convex queries are reactive, a shared stack link
   opens the same columns for two users and panels auto-update live; show who is viewing
   which panel. Keep everything driven by the serialized stack state.
```
