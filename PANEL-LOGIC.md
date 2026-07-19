# PANEL-LOGIC — the from-zero foundation

> ⚠️ **Évolution 2026-07-19** : le modèle d'état « pile plate » (§1–§3) est **remplacé**
> par l'ascendance sémantique de `CONCEPT-BRIEF.md` (arbre `parentInstanceId` +
> `ContextPath` dérivé + `ReferenceRail`) — voir `BRIEF-REVIEW.md` pour la carte de
> réconciliation. §1–§3 restent une pédagogie v1 valable pour *expliquer* le paradigme.
> **§5b (dimensionnement / épines) reste canonique** et complète le brief.

> Clean-room. **No LifeOS, no domain, no styling, no existing code.** This is the pure
> logic of the panel-navigation paradigm — the single spec the framework is built from.
> If it isn't in here, it's a rendering or branding choice, not the model.

---

## 0. Premise (why this model exists)

An app is navigation over a tree/graph of content. Classic navigation — pages, tabs,
modals — **destroys context**: it swaps the whole view and forces a single focus. The
panel model keeps the trail alive: the viewport is a **horizontal rail of columns**;
navigating **pushes a panel to the right**; you never leave, the parents stay visible.

One mechanic (open-right). One action zone (footer). One way back (close / breadcrumb).

---

## 1. State — the only thing that exists

```
StackState = { stack: PanelRef[] , graph?: GraphState }
PanelRef   = { id: string, type: string, params: object, pinned: boolean }
GraphState = { nodes: Node[], edges: Edge[] }   // only for panels of a graph type
```

- `type` names a **registered panel type** (a renderer). `params` addresses the content.
- `id` is derived from `type + params` (e.g. `node:42`) → identity for dedup & URL.
- **Everything derives from `stack`:** what's on screen, the breadcrumb, the URL, the
  agent's context. Nothing is stored twice. State is plain JSON — serializable end to end.

---

## 2. Algebra — the 7 pure transitions

Each is a pure function `(state, args) -> state`. No side effects, no React.

| Op | Effect |
|---|---|
| `openRoot(ref)` | Replace the entire stack with `[ref]`. Enter a section. |
| `openChild(i, ref)` | Keep `stack[0..i]` + any **pinned** panels right of `i`; drop the rest; append `ref`. Drill. |
| `append(ref)` | Add `ref` at the far right. A loose / tool panel. |
| `closeAt(i)` | Remove panel `i`. |
| `popTo(i)` | Truncate to `stack[0..i]`. (breadcrumb click) |
| `togglePin(i)` | Flip `pinned` on panel `i`. |
| `move(i, dir)` | Swap panel `i` with its neighbour; never cross the root. |

`close()` (breadcrumb home) = `openRoot`-to-empty = `stack = []`.

---

## 3. Invariants — the laws that constrain the algebra

These are **enforced in the reducer, never per screen.** They are the product.

1. **Single lineage.** `openRoot` replaces the whole stack. The stack is *one* train of
   thought; two lineages never coexist on screen.
2. **Root is anchored.** `stack[0]` is fixed-left — not movable, not pinnable. Closing it
   empties the stack (back to home).
3. **Drill keeps ancestors, prunes descendants** — except pinned ones. Opening a second
   child of the same parent **replaces** the first (it was a preview).
4. **Preview vs pin.** The rightmost **unpinned** panel is a transient *preview*: the next
   open replaces it. **Pin** it and it stays; the next opens to *its* right.
5. **Uniqueness.** An `id` appears at most once. Opening an `id` already present is a
   **no-op** (dedup) — panels never duplicate.
6. **Reorder within lineage only.** `move` never displaces or crosses the root.
7. **Serializable & derived.** The stack is plain data; breadcrumb, URL, and persistence
   all **derive** from it. `encode(state) <-> decode(string)` round-trips losslessly.

---

## 4. The shell — spatial contract (brand-agnostic)

```
┌────────┬──────────────────────────────────────────────┬ ─ ─ ─ ┐
│ SIDE   │ TOPBAR : breadcrumb(derived) · search · tools │ DRAWER│
│ BAR    ├──────────────────────────────────────────────┤ (over-│
│ (open  │ STAGE : the rail of panels (scrolls right)    │ lay,  │
│ Root   │ ┌──────┐┌──────┐┌──────┐                      │ NOT on│
│ trig-  │ │ root ││child ││child │  →                   │ the   │
│ gers)  │ └──────┘└──────┘└──────┘                      │ stack)│
└────────┴──────────────────────────────────────────────┴ ─ ─ ─ ┘
```

- **Sidebar** = the `openRoot` triggers (the app's sections). The only thing that changes lineage.
- **Topbar** = breadcrumb **derived from the stack** (each segment = `popTo`), search, tools.
- **Stage** = the horizontal rail. Overflow scrolls **horizontally**. Empty = home view.
- **Drawer** = an optional overlay for transversal tools. **Never part of the stack**, never resizes the stage.

### A panel's internal contract
```
┌───────────────────────────┐
│ HEADER (fixed height)     │ ← controls: move ‹ › · pin · close. Separators align across the rail.
├───────────────────────────┤
│ BODY (scrollable)         │ ← title/subtitle/tags + content. NEVER horizontal-scroll inside.
├───────────────────────────┤
│ FOOTER (optional, anchored)│ ← the ONE action zone. Read-only panels have none.
└───────────────────────────┘
```

---

## 5. Rendering is plural — one state, many hosts

The state in §1 is renderer-agnostic. The framework ships multiple **hosts** over the
same reducer:

- **ColumnHost** (wide viewport) → panels side by side, auto-scroll to the newest.
- **PushHost** (narrow viewport) → one column; the stack becomes an iOS-style **back-stack**
  (drill = push, back = pop, breadcrumb = the trail). *Same state, no change.*
- **A graph-type panel** → renders a **React Flow canvas** (`@xyflow/react`). Selecting or
  drilling a node calls `openChild(i, {type:'inspector', params:{nodeId}})` — the node
  detail opens as the next column. The canvas is **one panel type**, not a parallel system.
  Because `{nodes,edges}` is JSON too, the graph shares URL/persistence/agent-context with
  the stack.

---

## 5b. Sizing — the width grammar (iPhone → iPad → Mac)

> The projection layer's second half: not *which* host, but *how many panels fit and
> what happens to the rest*. All of this is presentation, never navigation state.

1. **Size classes, not devices.** Never branch on "iPhone/iPad/Mac" — branch on the
   *container's* width class: `compact` (<600px) / `medium` (600–1100) / `expanded`
   (>1100). An iPad in Split View correctly becomes `compact` for free.
2. **Slot budget.** `k = max(1, floor(containerWidth / minPanelWidth))` — how many
   panels render expanded. iPhone k=1, iPad k=2, Mac k=3–4. The reducer state never
   changes; only the projection does.
3. **Spines, not off-screen scroll.** Panels outside the slot window collapse into
   **vertical spines** (~34px, rotated title) that stay physically visible at the left
   — the trail never leaves the screen. Click a spine = re-expand (shifts the window;
   pure presentation, `anchor` is not navigation state). *(Reference: Andy Matuschak's
   notes, Obsidian sliding panes.)*
4. **Pin gains a second meaning: slot priority.** Under width pressure, unpinned
   ancestors fold first; a pinned panel resists folding. The focus (last) panel never
   folds. Same pin concept, zero new state.
5. **Navigation state ≠ presentation state.** The stack (URL-encoded, shareable) is
   universal; `{sizeClass, slots, anchor, userWidths, zoom}` is device-local. The same
   link opens as a push-stack on iPhone, 2 columns on iPad, a rail on Mac.
6. **The panel is the responsive unit.** Content adapts to its *panel's* width via
   container queries (`@container`), never viewport media queries: a KPI row goes
   3→1, a table becomes a list — per panel, not per screen.
7. **Width grammar: 3 gabarits + fill + flex.** Width is set by panel *type*
   (narrow ~280 / normal ~340 / wide ~520 / fill for canvas & kanban); visible panels
   flex to absorb leftover space. Optional drag-resize, clamped per gabarit, persisted
   as a per-type *preference* — never in the stack.
8. **Gesture map per class.** compact: edge-swipe = pop; medium: divider drag
   rebalances the two panes; expanded: ⌘←/→ moves focus across columns, double-click
   on a header bar = full-stage zoom (a projection, not a modal).

---

## 6. What the framework is (and isn't)

**Is:** a state machine (§1–§3) + a shell contract (§4) + a set of hosts/renderers (§5),
plus a way to **register panel types** (`type -> renderer + how to load its params`).

**Isn't:** a component library, a design system, or a domain app. Tokens, colours,
typography, and any specific screens are **downstream** and swappable. The logic above
never changes.

---

## 7. Build order (from 0)

1. The **pure reducer** + `encode/decode` + a **laws test-kit** asserting §3. No UI yet.
2. The **registry** (`registerPanel(type, {load, render, width})`) + `StackProvider` + `useStack`.
3. **ColumnHost**, then **PushHost** (responsive for free).
4. The **panel shell** (header/body/footer) + the **Drill** primitive.
5. **URL sync** (stack ⇄ router).
6. The **graph panel type** (React Flow) + node→inspector bridge.
7. Only then: a neutral **demo** app to exercise everything (no real domain).
