# FRAMEWORK — Brainstorm (v0)

> Working codename: **Stax** (placeholder — see §8 for name options).
> Source of the paradigm: the *LifeOS* prototype (`lifeos-handoff.zip`) — a life-OS
> dashboard that promoted **Miller columns to be the whole app shell**.
> This doc turns that one-off prototype into a **reusable UX framework**.

---

## 1. The reframe — you invented a paradigm, not a dashboard

LifeOS isn't "a dashboard with nice panels." It's a **navigation model**:

> The entire interface is a horizontal stack of in-page panels (Miller columns).
> Clicking anything with depth opens a panel to its right, forever. **No pages,
> no modals, no tabs** — one mechanic (open-right), one action zone (the footer),
> one way back (close / breadcrumb).

Almost every "dashboard kit" ships *components*. Almost nobody ships an opinionated
*navigation paradigm*. **That is the wedge.** The panel-stack is to dashboards what
the accordion primitive is to shadcn.

**Positioning:** *"shadcn for dashboards"* — not a component library you install,
a navigation system you copy into your app and **own**.

---

## 2. The crown jewel — the stack state machine

`panel-engine.jsx` already contains the entire value: the ops
`openRoot / openChild / append / closeAt / popTo / togglePin / move` + the laws
(dedup-by-id, truncate-except-pinned, root-fixed-left, preview-tab). Today it's
trapped inside a React `useState` closure.

**The #1 framework move: lift it into a pure, framework-agnostic reducer.**
Once the stack is pure data + a pure transition function, you get *for free*:

- URL sync (deep-linkable stacks)
- SSR / session restore
- undo/redo of navigation
- deterministic tests for the 10 laws
- replay / time-travel devtools

Everything else in this doc hangs off that one refactor.

---

## 3. The synthesis — two spatial models, one framework

The user asked to fold in [synergycodes/workflowbuilder](https://github.com/synergycodes/workflowbuilder)
(React Flow / `@xyflow/react`, JSONForms inspectors, Zustand/Immer, JSON-serializable
graphs, plugin architecture). This isn't a bolt-on — the two share **the same DNA:
state-as-serializable-data.** That lets them *fuse*:

| Axis | Model | Question it answers | State shape |
|---|---|---|---|
| **Depth / drill** | **Stax panel-stack** (Miller columns) | "What's *inside* this?" | `[{type,params,pinned}]` |
| **Breadth / topology** | **React Flow canvas** | "How do these *connect*?" | `{nodes, edges}` |

**The bridge (nobody ships this):** a **canvas is just a panel type** (the `wide`
gabarit). Selecting or drilling a node **opens a child panel to its right** — the
node inspector — which is itself a schema-driven `SheetView`. Result:

```
┌──────────────┬───────────┬───────────┐
│  CANVAS      │ node      │ sub-field │
│  (graph of   │ inspector │ detail    │   ← drill a node → panel cascades right
│   nodes)  ●──┼─→ (panel) ├─→ (panel) │
│      \       │           │           │
│       ●──────┤           │           │
└──────────────┴───────────┴───────────┘
   breadth axis      depth axis  →
```

And because both halves are JSON-serializable, **both** get: URL/Convex persistence,
undo/redo, and agent-readability (the agent sees your open panels *and* your selected
graph nodes). One more move: **"explode to canvas"** — the same data (e.g. the LifeOS
goals `year→quarter→month→task` tree) is viewable as a *drill stack* OR as a *graph*.
Two renderers, one model.

This lifts the framework's scope from "dashboards" to **"any tool that mixes hierarchy
(drill) and topology (graph)"**: AI-agent builders, rule engines, data pipelines,
knowledge graphs, CRMs, and life-OS itself.

---

## 4. Architecture — 4 layers (shadcn "you own the code" model)

All three distribution channels, layered:

```
┌─ @stax/core ────────────────────────────────────────────────────┐
│  Pure TS. Stack reducer + the 10 laws. Zero deps, zero React.    │
│  Serializable: [{id,type,params,pinned}].                        │
│  → testable · SSR-safe · replayable · URL-encodable              │
│  (mirror workflowbuilder: Zustand+Immer store wrapping the pure  │
│   reducer; graph state {nodes,edges} lives beside stack state)   │
├─ @stax/react ───────────────────────────────────────────────────┤
│  Bindings: <StackProvider>, useStack(), + TWO hosts:             │
│    <ColumnHost>  desktop → side-by-side Miller columns           │
│    <PushHost>    mobile  → single-column iOS master/detail stack │
│  (same reducer, two renderers = responsive for free)             │
├─ registry  (shadcn-style, copy-paste via CLI) ──────────────────┤
│  npx stax add shell drill panel breadcrumb command-palette       │
│                canvas node-inspector                             │
│  Tailwind + shadcn primitives. You OWN & restyle the code.       │
│  Canvas components wrap @xyflow/react; inspectors use JSONForms. │
├─ create-stax-app  (template) ───────────────────────────────────┤
│  Next.js 15 + Convex + Clerk, wired in Panel format.             │
│  Panel-type registry + agent seam + tokens preloaded.            │
│  `npm create stax` → running app in Panel + Canvas format.       │
└──────────────────────────────────────────────────────────────────┘
```

**Distribution mapping:** engine → **npm package** (shouldn't be forked) · UI →
**shadcn registry** (should be owned/restyled) · starter → **create-stax-app template**.

---

## 5. Improvements — the full brainstorm (all + more)

### Tier 0 — architectural, decide now (hard to retrofit)
1. **Serializable panel-type registry.** `registerPanel('goal', {schema, query, render, width, actions})`. Panels become *data* `{type,params}`, not `render()` closures. Unlocks everything below. **← the foundational fix.**
2. **URL-synced stacks.** Stack ⇄ URL. Every arrangement is a shareable link; back-button pops; refresh restores. Should be the *headline* feature, not an aside.
3. **Responsive dual-host.** `ColumnHost` (desktop) vs `PushHost` (mobile iOS-style). Answers Miller columns' single biggest objection.
4. **Canvas-as-panel + node→child-panel.** The React Flow synthesis (§3) baked into the registry from day one.

### Tier 1 — high leverage
5. **Stack-as-agent-working-memory.** Convex action builds RAG context from *what panels/nodes are open on screen*. Free, high-signal context no other kit has.
6. **Live + collaborative panels.** Convex reactivity → a panel 4 levels deep auto-updates; presence → "share this stack link, we both see the same columns."
7. **Command palette opens panels.** ⌘K → fuzzy-pick a registered panel type → openChild/append.
8. **Saved workspaces.** Name + restore a column/canvas arrangement (like saved searches). Scales past the sidebar.
9. **Undo/redo of navigation** — free from the pure reducer; also covers the canvas (workflowbuilder already ships undo/redo).

### Tier 2 — paradigm polish
10. **Peek-on-hover.** Preview a drill target before committing (extends the preview-tab model).
11. **Split / compare mode.** Twin-pin → two panels get equal width for side-by-side compare.
12. **Auto-fit column count** to viewport width (density-adaptive gabarits).
13. **Breadcrumb-as-minimap.** Expand the breadcrumb into a small overview of the whole stack (+ the canvas has React Flow's minimap — unify them).
14. **Explode-to-canvas / collapse-to-stack.** Toggle any subtree between drill-stack and graph view (§3).

### Tier 3 — data / DX
15. **Panel content = declared Convex query** bound to params → reactive, optimistic drill (open instantly, stream data in).
16. **Panel-level permissions / role gating** for multi-user.
17. **Plugin architecture** (mirror workflowbuilder's plugin-first design): stack behaviors + canvas plugins (ELK auto-layout, orthogonal edges, copy/paste, flow-runner, PDF export) are opt-in.
18. **Motion tokens first-class.** The column slide-in / node transitions are brand, not incidental.
19. **A11y in core.** Focus mgmt on open/close, roving tabindex across columns, aria breadcrumb-as-stack, Escape-pop, ⌘K — shipped, not per-app.
20. **Stax devtools.** A stack/graph inspector: visualize reducer state, time-travel, replay a session. (Pure core makes this trivial.)
21. **Laws test-kit.** Because core is pure, ship a harness that asserts the 10 laws on any registry.

---

## 6. What carries over verbatim from LifeOS

Already-solved, keep as-is (just re-home into the framework):

- The **10 laws** (`PANEL-BEHAVIOR-SPEC.md`) → become `@stax/core`'s contract.
- The **atomic token system** (`--os-*`, `--ink-*`, `--ac*`, density, skins) → the shadcn theme.
- The **optical-centering law** → a documented CSS utility in the registry.
- The **agent seam** (`askClaude` ⇄ `agent.ask` Convex action + `buildContext`) → upgraded to stack-as-context (improvement #5).
- The **Convex schema thinking** (`HANDOFF.md`) → the template's example domain.

---

## 7. The prompt kit (delivered in `PROMPTS.md`)

Not one prompt — a **layered kit**, each with a job:

- **P0 — Concept explainer** (brand-agnostic): the paradigm + the 10 laws + the graph
  synthesis. The canonical "what is Stax."
- **P1 — Framework build prompt:** scaffold `@stax/core` → `@stax/react` (two hosts)
  → the shadcn registry (incl. canvas) → `create-stax-app`. Tier-0 improvements baked in.
- **P2 — Adopt-in-a-new-project prompt:** the paste-ready "build my app in Stax format,"
  backed by real packages.
- **P3 — Per-improvement prompts:** URL-sync, stack-as-agent-context, responsive host,
  canvas synthesis, collaboration — each shippable independently.

---

## 8. Open decision — the name

`Stax` is a placeholder. Shortlist by feel:

| Name | Angle |
|---|---|
| **Stax** | the stack of panels; short, ownable, `.dev` likely |
| **Cascade** | panels cascading right; matches the LifeOS "cascade" goals view |
| **Strata** | layered depth; premium feel |
| **Panes / Panel** | literal; generic, may collide |
| **Drift** | the horizontal scroll motion |
| **Miller** | honors the Miller-columns lineage; nerd-credible |

---

## 9. Suggested next steps (after this brainstorm)

1. Pick a name (§8) → find-and-replace the codename.
2. Run **P1** to actually extract `@stax/core` (pure reducer + laws test-kit) from
   `panel-engine.jsx` — the real, testable state machine.
3. Stand up `create-stax-app` with LifeOS as the reference board (fastest "wow").
4. Layer improvements Tier-0 → Tier-3 via the **P3** prompts.
