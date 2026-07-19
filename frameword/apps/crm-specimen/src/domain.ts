/**
 * App domain — two groups of Spaces:
 *  FRAMEWORK  — the self-documenting sections from the design prototype
 *               (Overview · The model · The laws · Improvements · Architecture ·
 *                Prompt pack · Components — the full shadcn/ui gallery)
 *  WORKSPACE  — the CRM specimen (account → contact → opportunity → activity)
 *
 * This file is application data. The panel router never imports it.
 */
import { BLOCKS, BLOCK_CATS } from "./BlockDemo";

export interface DocBlock {
  kind: "card" | "do" | "dont" | "code" | "diagram" | "ops" | "row";
  label?: string;
  text?: string;
  code?: string;
}

export interface FootAction {
  label: string;
  kind?: "primary" | "outline";
  /** open a Space root (auto-switches the dashboard) */
  space?: string;
  /** or drill a child from this panel */
  drill?: string;
}

export interface DomainNode {
  panelType: string;
  title: string;
  /** panel-bar eyebrow — sections carry their number, e.g. "The model · 02" */
  eyebrow?: string;
  subtitle?: string;
  meta?: string;
  body?: string;
  blocks?: DocBlock[];
  children?: string[];
  seeAlso?: string[];
  composer?: string;
  footActions?: FootAction[];
  kpis?: { v: string; l: string }[];
}

export interface SpaceDef { spaceId: string; rootKey: string; label: string }
export interface SpaceGroup { label: string; spaces: SpaceDef[] }
export interface Dashboard { id: string; label: string; glyph: string; groups: SpaceGroup[] }

/** Multiple dashboards — the topbar nav switches them; the sidebar shows the active one's groups. */
export const DASHBOARDS: Dashboard[] = [
  {
    id: "framework", label: "Framework", glyph: "",
    groups: [{
      label: "Framework",
      spaces: [
        { spaceId: "overview", rootKey: "sec:overview", label: "Overview" },
        { spaceId: "model", rootKey: "sec:model", label: "The model" },
        { spaceId: "laws", rootKey: "sec:laws", label: "The laws" },
        { spaceId: "improvements", rootKey: "sec:improvements", label: "Improvements" },
        { spaceId: "architecture", rootKey: "sec:architecture", label: "Architecture" },
        { spaceId: "prompts", rootKey: "sec:prompts", label: "Prompt pack" },
        { spaceId: "components", rootKey: "sec:components", label: "Components" },
        { spaceId: "blocks", rootKey: "sec:blocks", label: "Blocks" },
      ],
    }],
  },
  {
    id: "crm", label: "CRM", glyph: "◆",
    groups: [{
      label: "Workspace",
      spaces: [
        { spaceId: "crm", rootKey: "space:crm", label: "Comptes" },
        { spaceId: "reports", rootKey: "space:reports", label: "Rapports" },
      ],
    }],
  },
  {
    id: "analytics", label: "Analytics", glyph: "▲",
    groups: [{
      label: "Analytics",
      spaces: [
        { spaceId: "ana-overview", rootKey: "sec:ana-overview", label: "Vue d'ensemble" },
        { spaceId: "ana-revenue", rootKey: "sec:ana-revenue", label: "Revenus" },
      ],
    }],
  },
];
export const SPACES: SpaceDef[] = DASHBOARDS.flatMap((d) => d.groups).flatMap((g) => g.spaces);

export function dashboardOfSpace(spaceId: string | null): string | null {
  if (!spaceId) return null;
  return DASHBOARDS.find((d) => d.groups.some((g) => g.spaces.some((s) => s.spaceId === spaceId)))?.id ?? null;
}

export const DOMAIN: Record<string, DomainNode> = {
  /* ═══ FRAMEWORK · Overview ═══ */
  "sec:overview": {
    panelType: "section", title: "One mechanic, everywhere.", eyebrow: "Overview · 01",
    subtitle: "Click anything with depth and a panel opens to the right. The parent stays.",
    kpis: [{ v: "1", l: "mechanic" }, { v: "7", l: "laws" }, { v: "∞", l: "depth" }],
    blocks: [{ kind: "card", label: "01 — The pitch", text: "Click anything that has depth and a panel opens to the right. The parent stays. Depth is infinite. State is data — the same stack that paints the screen is the URL, the persisted workspace, and the agent's working memory. That is the framework; everything else is discipline around it." }],
    children: ["ov:why", "ov:vs", "depth:1", "ov:origin"],
    footActions: [{ label: "Open the model →", kind: "primary", space: "model" }],
  },
  "depth:1": {
    panelType: "doc", title: "Depth 1", subtitle: "Feel the mechanic before reading about it.",
    blocks: [{ kind: "card", label: "What to notice", text: "This panel opened beside its parent — nothing was replaced, nothing was covered. The drill below opens depth 2 the exact same way." }],
    body: "× closes. The root never moves. The foot below is the panel contract — actions live there, not up here.",
    children: ["depth:2"],
  },
  "depth:2": {
    panelType: "doc", title: "Depth 2", subtitle: "Same shell, one level deeper.",
    blocks: [{ kind: "card", label: "What to notice", text: "The preview badge: an unpinned panel is transient — opening a sibling from the parent replaces it. PIN it and it survives as a reference instead." }],
    children: ["depth:3"],
  },
  "depth:3": {
    panelType: "doc", title: "Depth 3", subtitle: "The stage scrolls; the thread holds.",
    blocks: [{ kind: "card", label: "What to notice", text: "The breadcrumb toolbar below grew with you — each segment navigates back. The URL is carrying this entire path right now." }],
    children: ["depth:4"],
  },
  "depth:4": {
    panelType: "doc", title: "Depth ∞", subtitle: "It never ends — that's the point.",
    body: "Any node can open a child, forever. Depth is a routing capability; the rendered stage stays bounded. Escape pops back one level at a time.",
  },
  "ov:why": {
    panelType: "doc", title: "Why it wins", subtitle: "Context, depth, predictability, composability.",
    blocks: [
      { kind: "card", label: "01 — Context is preserved", text: "The parent stays visible while you drill. You never wonder where you are — the path is the screen." },
      { kind: "card", label: "02 — Depth is infinite", text: "Any node can open a child, forever. Year → goal → project → task → activity without a single page load." },
      { kind: "card", label: "03 — One motion, learned once", text: "Open right. Actions in the foot. Back is ×. Every feature you ever add inherits the same grammar." },
      { kind: "card", label: "04 — Everything is a panel", text: "A dashboard, a form, a chat, a reader, a kanban, a graph — same shell. Composability is the business model." },
    ],
  },
  "ov:vs": {
    panelType: "doc", title: "Versus tabs, modals, pages", subtitle: "What every alternative loses.",
    blocks: [
      { kind: "card", label: "Tabs — siblings vanish", text: "Only one thing visible; state hides in memory. Panels keep every open sibling on stage." },
      { kind: "card", label: "Modals — context is stolen", text: "They dim the world to ask one question, and they cannot nest. A panel is a modal that respects its parent." },
      { kind: "card", label: "Page routes — everything resets", text: "Navigation forgets; back is a gamble. The stack keeps the whole journey — and still gives you a URL." },
      { kind: "card", label: "Accordions — vertical sprawl", text: "Depth becomes scroll distance and everything jumps. Panels give depth its own axis." },
    ],
  },
  "ov:origin": {
    panelType: "doc", title: "Where it came from", subtitle: "LifeOS → Panel System → this.",
    blocks: [
      { kind: "card", label: "2025 — LifeOS, the prototype", text: "A personal dashboard. The panels-inside-panels mechanic emerges and refuses to leave." },
      { kind: "card", label: "2026 — Panel System, the extraction", text: "The mechanic becomes laws, an engine and a stylesheet inside the Agentik design system." },
      { kind: "card", label: "Now — the clean-room rewrite", text: "Public: a pure reducer, a shadcn-style registry, a Convex adapter. Nothing here is theory — the mechanic shipped twice before it had a name." },
    ],
  },

  /* ═══ FRAMEWORK · The model ═══ */
  "sec:model": {
    panelType: "section", title: "Panels inside panels.", eyebrow: "The model · 02",
    subtitle: "The interface is a horizontal stack of columns. Clicking anything with depth opens a panel to the right — the parent stays. State is data; seven pure operations are the entire API.",
    blocks: [
      { kind: "diagram" },
      { kind: "ops" },
      { kind: "row", label: "BAR", text: "56px, always. Eyebrow + controls — the hairline under it runs unbroken across the stage." },
      { kind: "row", label: "BODY", text: "Title, content, drills. Scrolls alone — the bar and foot never move." },
      { kind: "row", label: "FOOT", text: "The single action zone. Add, publish, reply, decompose — always here, never floating." },
      { kind: "row", label: "PILLS", text: "Labels center with line-height:1 + a hair more top padding — cap-height sits high; naive centering reads 1px off." },
    ],
    children: ["md:contract", "md:sizes", "md:axes", "depth:1"],
    footActions: [
      { label: "Open the laws →", kind: "primary", space: "laws" },
      { label: "Try depth 1", kind: "outline", drill: "depth:1" },
    ],
  },
  "md:contract": {
    panelType: "doc", title: "The panel contract", subtitle: "A panel is a target — the host renders it.",
    blocks: [
      { kind: "code", code: "type PanelTarget = {\n  panelType: string    // a registered panel type\n  resourceKey: string  // addresses the content\n  params?: object\n}" },
      { kind: "card", label: "The single rule", text: "A panel never renders another panel — it calls openDetail with a new target. That is what makes the stack serializable, deduplicable, and drivable by an agent." },
    ],
  },
  "md:sizes": {
    panelType: "doc", title: "Sizing grammar — S · M · L · XL", subtitle: "Width belongs to the kind, not the user.",
    blocks: [
      { kind: "card", label: "S · 380", text: "Inspectors, confirmations, depth probes." },
      { kind: "card", label: "M · 480", text: "Lists, records, detail views — the workhorse." },
      { kind: "card", label: "L · 640", text: "Dashboards, editors, module roots." },
      { kind: "card", label: "XL · 800", text: "Boards, canvases, timelines — still never full-bleed." },
      { kind: "card", label: "Why fixed", text: "Four widths keep the stage rhythmic; a free resize handle would make every stack a ransom note. A per-panel override lives in the foot gear — device-local, never in the shared state." },
    ],
  },
  "md:axes": {
    panelType: "doc", title: "Two axes — stack + canvas", subtitle: "Containment and topology, one bridge.",
    blocks: [
      { kind: "card", label: "Depth — the stack", text: "\"What's inside this?\" — the horizontal rail of panels." },
      { kind: "card", label: "Breadth — the canvas", text: "\"How do these connect?\" — a wide panel type rendering a node graph (React Flow)." },
      { kind: "code", code: "openDetail(i, { panelType: 'node-inspector',\n                resourceKey: nodeId })" },
      { kind: "card", label: "The bridge", text: "Drilling a graph node opens its inspector as the next column, exactly like any drill. { nodes, edges } is JSON too — it shares URL sync, persistence and agent context with the stack." },
    ],
  },

  /* ═══ FRAMEWORK · The laws ═══ */
  "sec:laws": {
    panelType: "section", title: "Seven laws, one engine.", eyebrow: "The laws · 03",
    subtitle: "Encoded in the engine — not in each screen. Violations are validator errors, not review comments.",
    children: ["law:1", "law:2", "law:3", "law:4", "law:5", "law:6", "law:7"],
  },
  "law:1": {
    panelType: "law", title: "Spaces never mix", subtitle: "Law 1", meta: "engine",
    blocks: [
      { kind: "do", label: "Do", text: "Opening a Space replaces the ACTIVE thread — the ContextPath. Pinned references are yours: they ride across pages and survive closing the root." },
      { kind: "dont", label: "Don't", text: "Never show two Spaces' threads side by side; references are the only cross-Space citizens — detached, explicit, never pretending to belong." },
    ],
  },
  "law:2": {
    panelType: "law", title: "The root is fixed", subtitle: "Law 2", meta: "engine",
    blocks: [
      { kind: "do", label: "Do", text: "The RootPanel stays leftmost — not movable, not pinnable. Its × closes the Space." },
      { kind: "dont", label: "Don't", text: "Nothing may displace the root; there is no navigation without an anchor." },
    ],
  },
  "law:3": {
    panelType: "law", title: "Drilling keeps the parent", subtitle: "Law 3", meta: "engine",
    blocks: [
      { kind: "do", label: "Do", text: "A child opens beside its source. Opening a sibling from the same parent replaces the preview." },
      { kind: "dont", label: "Don't", text: "Never navigate away from the parent to show the child — context is the whole point." },
    ],
  },
  "law:4": {
    panelType: "law", title: "Pin detaches, never lies", subtitle: "Law 4", meta: "engine",
    blocks: [
      { kind: "do", label: "Do", text: "PIN sets retention:\"retained\". If a branch change would orphan it, it detaches into the reference rail — parentInstanceId becomes null, explicitly." },
      { kind: "dont", label: "Don't", text: "Never keep an orphaned panel in the rail as if it belonged to the new branch. Visual order is not parentage." },
    ],
  },
  "law:5": {
    panelType: "law", title: "Identity is context-scoped", subtitle: "Law 5", meta: "engine",
    blocks: [
      { kind: "do", label: "Do", text: "Same target + same parent reveals the existing instance. The same target under a different parent is a different thread — a distinct instance." },
      { kind: "dont", label: "Don't", text: "No global dedup by resource — and never two instances under one parent." },
    ],
  },
  "law:6": {
    panelType: "law", title: "Actions live in the foot", subtitle: "Law 6", meta: "anatomy",
    blocks: [
      { kind: "do", label: "Do", text: "Add, publish, reply, resume — always in the anchored foot. Body is content; the bar is chrome." },
      { kind: "dont", label: "Don't", text: "No floating primary buttons in the body. A read-only panel says so in the foot." },
    ],
  },
  "law:7": {
    panelType: "law", title: "Serializable & derived", subtitle: "Law 7", meta: "engine",
    blocks: [
      { kind: "do", label: "Do", text: "State is JSON. The ContextPath, the breadcrumb, the URL, the agent context — all derived from it. Reload restores everything." },
      { kind: "dont", label: "Don't", text: "No components, closures or fetched rows in navigation state. Ever." },
    ],
  },

  /* ═══ FRAMEWORK · Improvements ═══ */
  "sec:improvements": {
    panelType: "section", title: "Improvements", eyebrow: "Improvements · 04",
    subtitle: "Each one ships independently. Live ones are running in this very app.",
    children: ["imp:url", "imp:keys", "imp:persist", "imp:realtime", "imp:canvas", "imp:mobile", "imp:modules", "imp:agent", "imp:a11y", "imp:ideas"],
  },
  "imp:url": {
    panelType: "improvement", title: "URL-synced stacks", subtitle: "A link is a teleport.", meta: "live",
    blocks: [
      { kind: "card", label: "Live — this app", text: "Every open, pin and close runs through encode(state) ↔ decode(string) into the hash. Support sends you their exact screen; a bug report reproduces itself; a bookmark is a saved workspace." },
      { kind: "card", label: "Next.js", text: "The stack maps to a catch-all segment — the server can prefetch data for every panel in the link before first paint." },
    ],
  },
  "imp:keys": {
    panelType: "improvement", title: "Command palette + keys", subtitle: "Every destination is typeable.", meta: "live",
    blocks: [
      { kind: "card", label: "Live — try it now", text: "⌘K opens the palette — every panel, section and action. ↑↓ moves, ↵ opens (roots replace, records deep-link), esc closes." },
      { kind: "card", label: "Specced", text: "← → moves panel focus, p pins, w closes, 1–7 jumps to sections. The palette reads the panel registry — nothing is bolted on." },
    ],
  },
  "imp:persist": {
    panelType: "improvement", title: "Persistence", subtitle: "Reload and land exactly here.", meta: "live",
    blocks: [
      { kind: "card", label: "Live — this app", text: "URL wins; localStorage restores when there is no hash; written on every navigation, restored before first paint. Reload — pins included." },
      { kind: "card", label: "In production", text: "Signed in, the stack writes to a Convex stacks table — per user, per Space, last writer wins. Open your laptop where your phone left off." },
    ],
  },
  "imp:realtime": {
    panelType: "improvement", title: "Presence & realtime", subtitle: "A dot on the exact panel someone is reading.", meta: "specced",
    blocks: [
      { kind: "card", label: "One live query", text: "Presence keyed by stack URL and panel id. Share your stack link and you are in the same place — same panels, live cursors, edits streaming in." },
      { kind: "card", label: "Not core algebra", text: "The reducer doesn't know about presence. It rides alongside the stack, keyed by the same ids. Agents can appear as presence too." },
    ],
  },
  "imp:canvas": {
    panelType: "improvement", title: "The canvas bridge", subtitle: "Topology as a panel type.", meta: "specced",
    blocks: [
      { kind: "card", label: "Relational content", text: "A pipeline, an agent graph, a dependency map — a canvas panel renders it as a node graph; drilling a node opens its inspector as the next column." },
      { kind: "card", label: "Two views, one model", text: "\"Explode to canvas\" and \"collapse to stack\" are the same state rendered two ways. Ships as the canvas + node-inspector registry items." },
    ],
  },
  "imp:mobile": {
    panelType: "improvement", title: "PushHost — mobile", subtitle: "Same reducer, one card at a time.", meta: "live",
    blocks: [
      { kind: "card", label: "Live below 640px", text: "ColumnHost swaps for PushHost: one column visible, parents peeking at the left edge, a back chevron in the bar. An iOS-style back-stack over the exact same state." },
      { kind: "card", label: "Same everything", text: "Same ids, same URL, same laws — a stack link opened on a phone lands on the same stack." },
    ],
  },
  "imp:modules": {
    panelType: "improvement", title: "Panel modules", subtitle: "One folder registers everything.", meta: "specced",
    blocks: [
      { kind: "code", code: "definePanelModule({\n  id: 'inbox', label: 'Inbox', root: InboxRoot,\n  panels: {\n    thread:  { view: ThreadPanel,  size: 'M' },\n    message: { view: MessagePanel, size: 'S' },\n  },\n})" },
      { kind: "card", label: "✶ The endgame", text: "A registry of community modules — a CRM, an inbox, an analytics board — that install like shadcn components and snap into any shell." },
    ],
  },
  "imp:agent": {
    panelType: "improvement", title: "Stack-as-working-memory", subtitle: "The agent sees what you see.", meta: "live",
    blocks: [
      { kind: "code", code: "agent.ask({ stack, resolve: load })" },
      { kind: "card", label: "Live — the ✶ drawer", text: "One action resolves every open panel via its registered load(params) and answers from those records. Because navigation is an algebra, the agent can also answer BY navigating — answers become panels." },
    ],
  },
  "imp:a11y": {
    panelType: "improvement", title: "Accessibility", subtitle: "Shipped inside the registry items, not an add-on.", meta: "specced",
    blocks: [
      { kind: "card", label: "Landmark", text: "Every panel is a region with an aria-label; screen readers walk the stack like a list." },
      { kind: "card", label: "Focus", text: "Opening a panel moves focus into it; closing returns focus to the drill that opened it." },
      { kind: "card", label: "Keyboard", text: "Roving tabindex across columns; the palette makes every destination typeable." },
      { kind: "card", label: "Motion", text: "prefers-reduced-motion disables slide-ins; panels appear in place." },
    ],
  },
  "imp:ideas": {
    panelType: "improvement", title: "Further ideas", subtitle: "Not committed — worth arguing about.", meta: "✶",
    blocks: [
      { kind: "card", label: "✶ 1 — Stack minimap", text: "Hover the breadcrumb for panel thumbnails; click to jump the scroll." },
      { kind: "card", label: "✶ 2 — Saved stacks", text: "Name a stack and it becomes a workspace in the sidebar — a URL with a title." },
      { kind: "card", label: "✶ 3 — Panel promotion", text: "A child ejects into a new root when it outgrows preview life." },
      { kind: "card", label: "✶ 4 — Split stage", text: "Two stacks side by side for compare workflows — this deal against that one." },
      { kind: "card", label: "✶ 5 — Agent tours", text: "The agent drives the stack panel by panel — onboarding as navigation, not tooltips." },
      { kind: "card", label: "✶ 6 — Module marketplace", text: "Community modules on the registry — whole sections that install like components." },
    ],
  },

  /* ═══ FRAMEWORK · Architecture ═══ */
  "sec:architecture": {
    panelType: "section", title: "Architecture", eyebrow: "Architecture · 05",
    subtitle: "Packages for the algebra, copy-paste for the pixels.",
    blocks: [
      { kind: "card", label: "1 — @frameword/panels-core", text: "Pure reducer — zero React, zero DOM. Intent commands, invariants as a validator, encode/decode, a laws test-kit (23 tests green)." },
      { kind: "card", label: "2 — @frameword/panels-react", text: "WorkspaceProvider, useWorkspace, the panel-type registry, URL + storage sync, PushHost breakpoint — bindings, not styling." },
      { kind: "card", label: "3 — registry, shadcn-style", text: "npx stax add — the rendering layer, copy-paste into your repo, styled by your tokens. Fork freely." },
      { kind: "card", label: "4 — create-stax-app", text: "Next.js 15 + Convex + Clerk, a neutral demo board, the agent seam wired to the open stack." },
      { kind: "code", code: "npx stax@latest add shell drill panel breadcrumb \\\n  command-palette drawer canvas node-inspector" },
    ],
    children: ["arch:registry", "arch:convex"],
  },
  "arch:registry": {
    panelType: "doc", title: "Registry map", subtitle: "The eight installable items.",
    blocks: [
      { kind: "card", label: "shell", text: "Sidebar + topbar + stage — the app frame." },
      { kind: "card", label: "drill", text: "The row that opens a child — never a link, never a modal." },
      { kind: "card", label: "panel", text: "One column — fixed-height header, scrollable body, anchored footer." },
      { kind: "card", label: "breadcrumb", text: "Derived from the stack — each segment navigates." },
      { kind: "card", label: "command-palette", text: "⌘K — fuzzy-pick any registered panel type." },
      { kind: "card", label: "drawer", text: "A fixed overlay for transversal tools — never part of the stack." },
      { kind: "card", label: "canvas", text: "Wraps @xyflow/react as a wide, graph-typed panel." },
      { kind: "card", label: "node-inspector", text: "Schema-driven detail panel, opened by drilling a graph node." },
    ],
  },
  "arch:convex": {
    panelType: "doc", title: "Convex schema", subtitle: "Three tables, one adapter.",
    blocks: [
      { kind: "code", code: "stacks:   { userId, spaceId, state, updatedAt }\n           .index('by_user', ['userId','spaceId'])\npresence: { stackUrl, userId, panelId, ts }\n           .index('by_stack', ['stackUrl'])\nprefs:    { userId, theme, density }" },
      { kind: "card", label: "One mutation, one query", text: "The stack writes on every navigation; presence renders as dots on panel bars. Optimistic locally, last-writer-wins. Signed out, everything falls back to localStorage — this app does exactly that." },
    ],
  },

  /* ═══ FRAMEWORK · Prompt pack ═══ */
  "sec:prompts": {
    panelType: "section", title: "Prompt pack", eyebrow: "Prompt pack · 06",
    subtitle: "P0-P3 teach and build. M1-M6 are the MASTER KIT: paste-ready prompts that let any coding agent decompose an existing dashboard, map it to the panel grammar, and migrate or build on it.",
    children: ["pr:p0", "pr:p1", "pr:p2", "pr:p3", "pr:m-decompose", "pr:m-map", "pr:m-migrate", "pr:m-build", "pr:m-agent", "pr:m-laws"],
    blocks: [{ kind: "card", label: "How to use", text: "Paste the canonical context once at the start of a session, then the task prompt. Ask the model to cite code, screenshots or tests for material claims." }],
  },
  "pr:p0": {
    panelType: "prompt", title: "P0 — Concept explainer", subtitle: "Brand-agnostic. Teaches the paradigm.", meta: "concept",
    blocks: [{ kind: "code", code: "The interface is a stack of in-page panels.\nClicking anything with depth opens a panel to the\nright; the parent stays. No pages, no modals, no\ntabs — one mechanic, one action zone, one back.\nState is a serializable list; everything derives." }],
  },
  "pr:p1": {
    panelType: "prompt", title: "P1 — Build the framework", subtitle: "Clean-room, from the logic doc.", meta: "build",
    blocks: [{ kind: "code", code: "Build the panel framework from PANEL-LOGIC.md:\n1. packages/core — pure reducer + laws test-kit\n2. packages/react — provider, registry, two hosts\n3. registry — shell/drill/panel/palette/drawer\n4. starter — Next.js + Convex, agent seam wired" }],
  },
  "pr:p2": {
    panelType: "prompt", title: "P2 — Adopt in a new app", subtitle: "The paste-ready brief.", meta: "adopt",
    blocks: [{ kind: "code", code: "Build this app in panel format. Every section is\na root; every deep item is a drill; actions live\nin the foot; conversations are full-height chats.\nRespect the laws; never hardcode a token." }],
  },
  "pr:p3": {
    panelType: "prompt", title: "P3 — Ship one improvement", subtitle: "Five prompts, one per upgrade.", meta: "improve",
    blocks: [{ kind: "code", code: "P3.1 URL-synced stacks   P3.2 agent context\nP3.3 PushHost mobile     P3.4 canvas bridge\nP3.5 presence + palette + saved workspaces" }],
  },


  /* the MASTER KIT — prompts that teach any coding agent to adapt ANY app to the panel grammar */
  "pr:m-decompose": {
    panelType: "prompt", title: "M1 — Decompose the existing", subtitle: "Forensic inventory of every route, modal, tab, and flow before a single panel is drawn.", meta: "forensic · step 1",
    blocks: [
      { kind: "card", label: "WHEN", text: "Use FIRST on any existing app you want to migrate to the panel grammar. Run it before mapping, before any redesign talk — the mapping (M2) and migration plan (M3) both consume its feature matrix. Also use it when a migration stalls mid-way: re-run to find what the model silently skipped." },
      { kind: "code", label: "MASTER PROMPT — paste into any coding agent", code: "ROLE: Forensic UI auditor. Target: the app in this repo (or the URL/screens I provide). Goal: a complete FEATURE MATRIX before migrating to Stax, a panels-inside-panels (Miller columns) framework. Do NOT redesign, refactor, or propose panels yet — inventory only.\nPROTOCOL — inventory each layer. EVERY row carries a citation (file:line, router-config entry, or screenshot ref). Uncited rows are rejected.\n1. ROUTES: every route/page/layout — URL pattern, params, guards, lazy boundaries.\n2. NAVIGATION: every nav surface (sidebar, topbar, breadcrumbs, command palette, footer) and the exact target of each item.\n3. MODALS & OVERLAYS: every modal, dialog, popover, drawer, action-toast. Record trigger, content type (form | confirm | detail | picker | media), and content size (count fields/sections).\n4. TABS & SEGMENTS: every tab bar / segmented control; note whether tabs facet the SAME entity or switch BETWEEN entities.\n5. DETAIL VIEWS: every master->detail relation (list row -> what opens, and where it opens).\n6. CRUD FLOWS: per entity: create / read / update / delete path, including multi-step wizards (record step count).\n7. FILTERS / SEARCH / SORT: where each control lives and what scope it filters.\n8. CHARTS & DASHBOARDS: every visualization, its data source, and whether it drills down on click.\n9. CROSS-CUTTING: chat/assistant surfaces, settings, notifications, global search, onboarding.\nOUTPUT: write `feature-matrix.md` — one table, columns: id | layer | name | current pattern (route/modal/tab/wizard/drawer/...) | entity | has-depth? (does it open something deeper) | size hint S/M/L/XL by content density | citation.\nThen a SUMMARY: counts per pattern + the 5 hairiest items (nested modals, modal-inside-tab, wizard-inside-modal, etc.).\nDEFINITION OF DONE: every route and every overlay in the codebase appears in the matrix. Prove coverage: run `grep -riE \"modal|dialog|drawer|<Tabs\" src | wc -l` (adapt to the stack), show the output, and reconcile the count against your matrix rows. Unreconciled hits = the audit is not done." }
    ],
  },
  "pr:m-map": {
    panelType: "prompt", title: "M2 — Map features to the grammar", subtitle: "Deterministic legacy-pattern -> panel-grammar translation; zero judgment calls left implicit.", meta: "mapping · deterministic",
    blocks: [
      { kind: "card", label: "WHEN", text: "Use immediately after M1, with the feature matrix in hand (or paste it into the prompt). Also use it standalone whenever anyone asks 'how would X look in Stax?' — a single modal, a tab bar, a wizard. Every ambiguity gets resolved by rule, not by taste; if the model hesitates, this prompt decides for it." },
      { kind: "code", label: "MASTER PROMPT — paste into any coding agent", code: "ROLE: Translator from legacy UI patterns to the Stax panel grammar (Miller columns: anything with depth opens a panel to the RIGHT, the parent STAYS; one Space active at a time; pinned references survive navigation). Input: the feature matrix from M1 (if absent, build a minimal one first). Output: a MAPPING TABLE — one row per matrix item, no item skipped, no row marked TBD.\nAPPLY THESE RULES DETERMINISTICALLY — never invent a new pattern:\n- Top-level page / app section -> a SPACE. Max 7 spaces; merge cousins by workflow.\n- Nav-section landing view -> the ROOT PANEL of its space.\n- List row click / \"view details\" -> a DRILL: new panel to the RIGHT, parent list stays mounted.\n- Modal -> a PANEL, sized by content: confirm or 1-3 fields = S; standard form = M; rich detail/editor = L; full workbench = XL. Modals are FORBIDDEN in the output.\n- Tabs faceting the SAME entity -> in-panel sections inside one panel. Tabs switching ENTITIES -> sibling drills from the same parent.\n- Wizard / multi-step flow -> CHAINED DRILLS: step N opens step N+1 to the right; back = close the rightmost panel.\n- Settings / preferences -> a sys panel (panelType `sys:*`), drilled from the space root — never a separate page.\n- Chat / assistant -> full-height drawer panel, pinnable — never a floating bubble.\n- Anything the user must keep visible while working elsewhere -> a PINNED REFERENCE (survives navigation and space switches).\nAMBIGUITY RESOLUTION (apply in order): (1) a view that is both landing and detail = root panel, its detail parts become drills; (2) content overflowing XL = split into a drill chain, never scroll horizontally; (3) two rules match = the deeper-nesting rule wins (drill beats in-panel section); (4) still ambiguous = pick the mapping with the fewest simultaneous panels and log it in a DECISIONS section with one-line rationale.\nOUTPUT: write `mapping.md` — table: matrix id | legacy pattern | Stax mapping (space / root / drill / section / chained-drill / sys / drawer / reference) | panelType (kebab-case) | size S/M/L/XL | parent panelType | citation to the matrix row.\nEND with the derived REGISTRY draft as a paste-ready TypeScript object: `{ [panelType]: { size } }` covering every panelType you named. Every matrix row must be traceable into it." }
    ],
  },
  "pr:m-migrate": {
    panelType: "prompt", title: "M3 — Migration plan (refonte)", subtitle: "Seven gated phases from inventory to law-clean workspace, each with verifiable acceptance criteria.", meta: "refonte · phased",
    blocks: [
      { kind: "card", label: "WHEN", text: "Use when you commit to actually rebuilding an existing dashboard on the panel grammar. It turns M1+M2 outputs into an executable, gated plan — hand each phase to a coding agent and refuse to advance until that phase's acceptance evidence is green. Also use it to audit a half-done migration: grade the current state against the phase gates." },
      { kind: "code", label: "MASTER PROMPT — paste into any coding agent", code: "ROLE: Migration planner for a refonte of this app onto Stax (panels-inside-panels; no modals/tabs/pages; serializable WorkspaceState { panelsById, contextLeafId, referenceRailOrder }; registry maps panelType -> size S/M/L/XL). Produce `migration-plan.md` with EXACTLY these 7 phases. For each: scope, concrete tasks, ACCEPTANCE CRITERIA, and the evidence the implementing model must show. A phase without shown evidence is NOT passed.\nPHASE 1 — INVENTORY: run the M1 forensic audit -> feature-matrix.md. Accept only if every route AND every modal is cited file:line and grep counts reconcile.\nPHASE 2 — MAPPING: apply the M2 rules -> mapping.md + registry draft. Accept only if zero TBD rows and every modal maps to a panel with a size.\nPHASE 3 — REGISTRY: implement the panel registry (panelType -> component, size, title resolver). Accept: it compiles, and a demo/story per panelType renders — show build output + one screenshot grid.\nPHASE 4 — SPACES: implement WorkspaceState + space switching (one space active). Accept: state serializes to JSON and restores an identical workspace — show the round-trip test RUNNING and passing.\nPHASE 5 — DRILLS: wire every drill in mapping.md; parent stays mounted; closing a panel closes its descendants. Accept: the 5 deepest chains clicked through with screenshots or an e2e run log.\nPHASE 6 — REFERENCES: pin -> detached reference on the rail, surviving navigation AND space switches. Accept: pin an item, switch space twice, dump referenceRailOrder — unchanged, reference still live.\nPHASE 7 — POLISH & PURGE: widths from registry only, design tokens only, delete every leftover modal/tab/detail-route. Accept: `grep -riE \"modal|<Dialog|<Tabs\" src` returns zero app-level hits (show output) and the M6 laws report is all-PASS.\nSTANDING DEMANDS ON THE IMPLEMENTING MODEL: cite file:line for every claim; ship RUNNING code (build log, test output, or screenshot — never intent); no phase starts before the previous phase's evidence is shown green. Restate these demands inside each phase's brief." }
    ],
  },
  "pr:m-build": {
    panelType: "prompt", title: "M4 — Build a NEW app on the grammar", subtitle: "From a one-line idea to spaces, panel trees, and a compiling registry — questions first, code second.", meta: "greenfield",
    blocks: [
      { kind: "card", label: "WHEN", text: "Use for greenfield work: a new product, a new module, or a vibe-coding session that starts from 'I want an app that...'. It forces the model to interrogate the workflow BEFORE emitting panels, then blueprint spaces and drill trees natively in the grammar — so nothing has to be un-modaled later. Skip M1-M3 entirely; this replaces them for new builds." },
      { kind: "code", label: "MASTER PROMPT — paste into any coding agent", code: "ROLE: Product architect building a NEW app directly on the Stax panel grammar. Grammar facts you must obey: Miller columns — anything with depth opens a panel to the RIGHT and the parent STAYS; one Space active at a time; pin -> detached reference that survives navigation; state is a serializable WorkspaceState { panelsById, contextLeafId, referenceRailOrder }; a registry maps panelType -> size S/M/L/XL; modals, tabs, and route-per-page are FORBIDDEN.\nSTEP 0 — ASK ME THESE, THEN STOP AND WAIT: (a) who is the user and the ONE job they hire this app for; (b) the 3-6 core entities and which contains which; (c) the 2-3 workflows run daily vs the ones run rarely; (d) what must stay visible while working on something else (pin candidates); (e) required cross-cutting surfaces (AI chat, settings, billing, search).\nSTEP 1 — SPACES: derive 2-5 spaces from the workflow clusters (one active at a time). Name each and declare its root panel.\nSTEP 2 — PANEL TREES: per space, draw the drill tree from root: root -> list -> detail -> sub-detail. Every node = panelType (kebab-case) + size S/M/L/XL by content density. Wizards = chained drills; same-entity facets = in-panel sections; settings = sys panel; chat = full-height pinnable drawer.\nSTEP 3 — REGISTRY & STATE: emit `registry.ts` — `{ [panelType]: { component, size, title } }` for every node — and `state.ts` with the WorkspaceState types. Both must compile; show the tsc/build output.\nSTEP 4 — GOLDEN PATHS: script the 3 main flows as explicit panel sequences (space -> root -> drill -> drill), marking which panels get pinned as references and why.\nSTEP 5 — SELF-CHECK vs the laws: assert in writing: no modal, no tab bar, no detail route anywhere in the blueprint; every width traces to the registry; parent always visible on drill; state round-trips through JSON.\nOUTPUT: `app-blueprint.md` (spaces, trees, golden paths, law self-check) + compiling `registry.ts` + `state.ts`. Do NOT write feature code before I approve the blueprint." }
    ],
  },
  "pr:m-agent": {
    panelType: "prompt", title: "M5 — Wire an AI agent into the workspace", subtitle: "The panel stack becomes the agent's context; the reducer becomes its only steering wheel.", meta: "agentic layer",
    blocks: [
      { kind: "card", label: "WHEN", text: "Use once the workspace runs (post-M3 or post-M4) and you want an in-app AI copilot. The key insight it enforces: WorkspaceState is already a perfect context document — path = what the user is doing, references = what they care about. Use it also to retrofit guardrails onto an agent that currently mutates UI state directly." },
      { kind: "code", label: "MASTER PROMPT — paste into any coding agent", code: "ROLE: Integrate an AI agent into a Stax workspace. Principle: the WorkspaceState IS the agent's context, and the panel reducer IS its only navigation API. First locate and cite (file:line) the real WorkspaceState type and reducer actions in this repo — do not invent parallel ones.\nCONTEXT CONTRACT — on every agent turn, serialize and inject: (1) the active space id; (2) the PATH: panels from root to contextLeafId, in order, each as { panelType, entityId, title, key facts }; (3) the REFERENCE RAIL in referenceRailOrder, same shape, flagged pinned:true. Weighting: the path is what the user is doing NOW; references are what they deliberately keep — say so in the system prompt. NEVER inject panels from inactive spaces.\nNAVIGATION RULES — the agent drives the UI exclusively through the same actions a click dispatches: openPanel(parentId, panelType, entityId) = drill right; closePanel(id) = closes its descendants too; pinPanel(id) = promote to reference; switchSpace(id). Direct DOM or state mutation is forbidden.\nGUARDRAILS (implement, don't just document): (a) max 2 panel opens per agent turn, each justified in its visible reply; (b) never close a panel the user opened this session without asking; (c) never unpin a reference; (d) destructive actions (delete, send, pay) are PROPOSED as a panel showing the exact payload — never executed silently; (e) context needed from another space -> ask before switching.\nIMPLEMENT: (1) `serializeContext(state: WorkspaceState): AgentContext` — pure function, unit-tested against a fixture asserting the exact JSON; (2) the tool/function schema for the 4 nav actions; (3) a demo exchange where the user asks a question, the agent cites a pinned reference, and opens the correct drill.\nEVIDENCE REQUIRED: the fixture test passing (real run output, not prose) and one end-to-end trace: user message -> injected context JSON -> tool call -> WorkspaceState diff. Every wiring claim cited file:line." }
    ],
  },
  "pr:m-laws": {
    panelType: "prompt", title: "M6 — The non-negotiables contract", subtitle: "The laws as machine-checkable assertions — a model must prove compliance, not claim it.", meta: "laws · quality gate",
    blocks: [
      { kind: "card", label: "WHEN", text: "Use as the closing gate of every Stax mission — migration phase 7, greenfield pre-ship, or any PR review touching the workspace. Paste it verbatim whenever a model says 'done': it converts each law into a check command plus required evidence, so compliance becomes grep output and screenshots instead of assurances. Any FAIL blocks 'done'." },
      { kind: "code", label: "MASTER PROMPT — paste into any coding agent", code: "ROLE: Compliance auditor for the Stax panel grammar. Verify every LAW below against the RUNNING app AND the codebase. For each: PASS/FAIL + evidence (grep output, file:line, state dump, or screenshot). Prose without evidence = automatic FAIL. Adapt grep patterns to the stack, but always show the raw output.\nLAW 1 — NO MODALS: zero modal/dialog/lightbox at app level. Check: `grep -riE \"modal|<Dialog|overlay\" src`; every hit is a violation unless it is the framework's own panel layer. Action-free toasts are exempt.\nLAW 2 — NO TABS, NO PAGES: no tab bars; no route-push that replaces the workspace to show a detail. Check: grep for Tabs components and detail-route pushes; each hit must already map to sibling drills or in-panel sections — otherwise FAIL.\nLAW 3 — PARENT STAYS: opening a drill never unmounts or hides its parent. Check: open the 3 deepest drill chains; parents remain visible and interactive; screenshot each chain.\nLAW 4 — ONE ACTION ZONE: exactly one contextLeafId; primary actions render only in that leaf panel. Check: dump serialized state (single leaf) + scan panels for duplicate primary-action bars.\nLAW 5 — ONE SPACE ACTIVE: exactly one space mounted; switching swaps the whole panel tree. Check: state dump before/after a switch, diffed.\nLAW 6 — REFERENCES ARE THE ONLY CROSS-SPACE CITIZENS: pinned references survive navigation AND space switches; nothing else does. Check: pin one panel, switch space twice, dump referenceRailOrder — unchanged and live; unpinned panels gone.\nLAW 7 — REGISTRY-DRIVEN WIDTHS: every panel width derives from its registry size (S/M/L/XL). Check: grep for hardcoded width/w-[0-9] on panel roots; every hit must trace to the registry lookup or FAIL.\nLAW 8 — TOKENS ONLY: colors, spacing, typography come from design tokens. Check: grep panel components for hex literals and raw px values; list every hit.\nLAW 9 — SERIALIZABLE STATE: JSON.parse(JSON.stringify(state)) restores an identical workspace (panelsById, contextLeafId, referenceRailOrder). Check: execute the round-trip in the running app or a test; show the output.\nOUTPUT: `laws-report.md` — table: law | assertion | check command | evidence | PASS/FAIL. Any FAIL blocks shipping: fix, then re-run this entire audit until all nine are green." }
    ],
  },

  /* ═══ WORKSPACE · CRM ═══ */
  "space:crm": {
    panelType: "space", title: "Comptes", subtitle: "3 comptes actifs — clique une ligne pour ouvrir le détail.",
    children: ["acc:acme", "acc:globex", "acc:initech"], composer: "Nouveau compte…",
    kpis: [{ v: "3", l: "comptes" }, { v: "5", l: "opportunités" }, { v: "46k€", l: "pipeline" }],
  },
  "acc:acme": { panelType: "account", title: "Acme SARL", subtitle: "Industrie · Lyon", meta: "2 contacts", children: ["con:jo", "con:max"], composer: "Nouveau contact…" },
  "acc:globex": { panelType: "account", title: "Globex", subtitle: "Retail · Paris", meta: "1 contact", children: ["con:lea"], composer: "Nouveau contact…" },
  "acc:initech": { panelType: "account", title: "Initech", subtitle: "SaaS · Nantes", meta: "prospect", body: "Compte prospect — aucun contact enregistré. Le panneau feuille n'a pas de drill." },
  "con:jo": { panelType: "contact", title: "Jo Lambert", subtitle: "Directrice des opérations", meta: "2 opps", children: ["opp:refonte", "opp:maintenance"], composer: "Nouvelle opportunité…" },
  "con:max": { panelType: "contact", title: "Max Verne", subtitle: "Responsable achats", meta: "1 opp", children: ["opp:equipement"], composer: "Nouvelle opportunité…" },
  "con:lea": { panelType: "contact", title: "Léa Fontaine", subtitle: "CTO", meta: "1 opp", children: ["opp:migration"], composer: "Nouvelle opportunité…" },
  "opp:refonte": { panelType: "opportunity", title: "Refonte e-commerce", subtitle: "18 000 € · proposition envoyée", children: ["act:call1", "act:demo1"], seeAlso: ["con:max"], composer: "Nouvelle activité…" },
  "opp:maintenance": { panelType: "opportunity", title: "Maintenance 2026", subtitle: "8 000 € · négociation", children: ["act:relance1"], composer: "Nouvelle activité…" },
  "opp:equipement": { panelType: "opportunity", title: "Équipement atelier", subtitle: "6 500 € · qualification", children: ["act:visite1"], composer: "Nouvelle activité…" },
  "opp:migration": { panelType: "opportunity", title: "Migration cloud", subtitle: "13 500 € · découverte", children: ["act:kickoff"], composer: "Nouvelle activité…" },
  "act:call1": { panelType: "activity", title: "Appel de cadrage", subtitle: "12 juil. · 30 min", body: "Compte-rendu : périmètre validé, budget confirmé. Épingle ce panneau (PIN) puis redrille ailleurs : il deviendra une référence." },
  "act:demo1": { panelType: "activity", title: "Démo produit", subtitle: "17 juil. · 1 h", body: "Démo réalisée devant le comité. Objection prix levée par l'option maintenance." },
  "act:relance1": { panelType: "activity", title: "Relance devis", subtitle: "15 juil. · email", body: "Devis renvoyé avec remise 5 %. En attente de signature." },
  "act:visite1": { panelType: "activity", title: "Visite atelier", subtitle: "10 juil. · sur site", body: "Besoins mesurés sur place. Chiffrage en cours." },
  "act:kickoff": { panelType: "activity", title: "Kickoff technique", subtitle: "18 juil. · visio", body: "Architecture cible validée avec la CTO. POC planifié." },
  "space:reports": {
    panelType: "space", title: "Rapports", subtitle: "Vues transverses (lecture seule).",
    children: ["rep:pipeline", "rep:activite"],
    kpis: [{ v: "46k€", l: "pipeline" }, { v: "5", l: "activités / sem." }, { v: "37%", l: "taux de gain" }],
  },
  "rep:pipeline": { panelType: "report", title: "Pipeline par étape", subtitle: "Snapshot hebdomadaire", body: "Découverte 13,5k€ · Qualification 6,5k€ · Proposition 18k€ · Négociation 8k€." },
  "rep:activite": { panelType: "report", title: "Activité commerciale", subtitle: "30 derniers jours", body: "5 activités consignées. Un panneau lecture seule n'a pas de footer d'action." },

  /* ═══ ANALYTICS dashboard ═══ */
  "sec:ana-overview": {
    panelType: "space", title: "Vue d'ensemble", subtitle: "Le même moteur, un autre dashboard — la sidebar a changé avec lui.",
    kpis: [{ v: "46k€", l: "pipeline" }, { v: "12", l: "deals" }, { v: "37%", l: "win rate" }],
    children: ["ana:funnel", "ana:sources"],
  },
  "ana:funnel": { panelType: "report", title: "Funnel de conversion", subtitle: "Visite → lead → deal", body: "1 240 visites · 86 leads (6,9 %) · 12 deals (14 %). Chaque étape pourrait être un drill vers sa cohorte." },
  "ana:sources": { panelType: "report", title: "Sources", subtitle: "30 derniers jours", body: "Organique 44 % · Outbound 31 % · Referral 25 %. Un panneau canvas (React Flow) rendrait le graphe d'attribution." },
  "sec:ana-revenue": {
    panelType: "space", title: "Revenus", subtitle: "MRR et projection — lecture seule.",
    kpis: [{ v: "8,2k€", l: "MRR" }, { v: "+12%", l: "vs juin" }, { v: "98k€", l: "ARR proj." }],
    children: ["ana:mrr", "ana:forecast"],
  },
  "ana:mrr": { panelType: "report", title: "MRR par offre", subtitle: "Juillet 2026", body: "Starter 2,1k€ · Pro 4,6k€ · Enterprise 1,5k€. Les chiffres utilisent les numérales tabulaires du token map." },
  "ana:forecast": { panelType: "report", title: "Projection T4", subtitle: "Scénario médian", body: "11,4k€ MRR à fin décembre si le win rate tient à 37 %." },
};

/* ═══ FRAMEWORK · Components — the FULL shadcn/ui gallery, none missing ═══ */

export const SHADCN_NEW = ["Attachment", "Bubble", "Marker", "Message", "Message Scroller"];
export const SHADCN_ALL = [
  "Accordion", "Alert", "Alert Dialog", "Aspect Ratio", "Attachment", "Avatar", "Badge",
  "Breadcrumb", "Bubble", "Button", "Button Group", "Calendar", "Card", "Carousel", "Chart",
  "Checkbox", "Collapsible", "Combobox", "Command", "Context Menu", "Data Table", "Date Picker",
  "Dialog", "Direction", "Drawer", "Dropdown Menu", "Empty", "Field", "Form", "Hover Card", "Input",
  "Input Group", "Input OTP", "Item", "Kbd", "Label", "Marker", "Menubar", "Message",
  "Message Scroller", "Native Select", "Navigation Menu", "Pagination", "Popover", "Progress",
  "Radio Group", "Resizable", "Scroll Area", "Select", "Separator", "Sheet", "Sidebar",
  "Skeleton", "Slider", "Sonner", "Spinner", "Switch", "Table", "Tabs", "Textarea", "Toast",
  "Toggle", "Toggle Group", "Tooltip", "Typography",
];

export const compKey = (name: string) => "cmp:" + name.toLowerCase().replace(/\s+/g, "-");

DOMAIN["sec:components"] = {
  panelType: "section", title: "Components", eyebrow: "Components · 07",
  subtitle: "The complete shadcn/ui catalog rendered with the WhitePaper tokens — every component is a drill; the demo opens beside the list.",
  kpis: [{ v: String(SHADCN_ALL.length), l: "components" }, { v: String(SHADCN_NEW.length), l: "new" }, { v: "1", l: "token map" }],
  children: SHADCN_ALL.map(compKey),
};
for (const name of SHADCN_ALL) {
  DOMAIN[compKey(name)] = {
    panelType: "component", title: name,
    subtitle: "shadcn/ui · rendered by the panel shell, styled by the tokens.",
    meta: SHADCN_NEW.includes(name) ? "new" : undefined,
  };
}

/* ═══ FRAMEWORK · Blocks — every dashboard element, 3 versions + grammar table ═══ */
const catSubs: Record<string, string> = {
  kpi: "Numbers that speak — every stat is a DrillTrigger to its detail.",
  charts: "Data, drawn — every shape drills into its cohort.",
  data: "Dense collections — a row opens the record beside it, never instead of it.",
  content: "Content surfaces — most already live in Components.",
  nav: "Filtering changes the query; navigating changes the stack. Never confused.",
  states: "Every panel can say loading, empty, error, permission…",
  ai: "The agent sees the stack — its actions are traceable and drillable.",
  native: "What exists nowhere else — the framework's own primitives.",
};
DOMAIN["sec:blocks"] = {
  panelType: "section", title: "Blocks", eyebrow: "Blocks · 08",
  subtitle: "Every dashboard element the framework ships — each in 3 versions, with its panel-grammar integration table.",
  kpis: [{ v: String(Object.keys(BLOCKS).length), l: "blocks" }, { v: "3", l: "versions each" }, { v: String(BLOCK_CATS.length), l: "families" }],
  children: BLOCK_CATS.map((c) => "blkcat:" + c.key),
};
for (const c of BLOCK_CATS) {
  DOMAIN["blkcat:" + c.key] = {
    panelType: "doc", title: c.label, subtitle: catSubs[c.key],
    children: [...c.blocks, ...c.done],
  };
}
for (const [k, m] of Object.entries(BLOCKS)) {
  DOMAIN[k] = { panelType: "block", title: m.title, subtitle: m.sub };
}

/* the Canvas board — opened from the topbar whiteboard button, in no dashboard */
DOMAIN["sec:canvas"] = {
  panelType: "canvas", title: "Canvas", eyebrow: "Canvas board",
  subtitle: "Your whiteboard — cards, notes, shapes and connections.",
};

/* system panels — reachable from the account menu & the palette, in no dashboard */
DOMAIN["sec:notes"] = {
  panelType: "notes", title: "Notes & Tasks", eyebrow: "Personal",
  subtitle: "Your notes and your task list — every item opens as the next panel.",
};
DOMAIN["sys:profile"] = {
  panelType: "profile", title: "Profile", eyebrow: "Account",
  subtitle: "Who you are across the workspace — picture, identity, bio.",
};

DOMAIN["sys:settings"] = {
  panelType: "settings", title: "Settings", eyebrow: "Settings",
  subtitle: "Appearance, layout and navigation — device-local preferences, never navigation state.",
};

/* parent map + deep-link helpers (route adapter side) */
export const PARENT: Record<string, string> = {};
for (const [k, v] of Object.entries(DOMAIN)) for (const c of v.children ?? []) PARENT[c] = k;

export function chainOf(resourceKey: string): string[] {
  const chain = [resourceKey];
  let p = PARENT[resourceKey];
  while (p) { chain.unshift(p); p = PARENT[p]; }
  return chain;
}

export function spaceOf(resourceKey: string): { spaceId: string; rootKey: string } | null {
  const rootKey = chainOf(resourceKey)[0];
  const s = SPACES.find((x) => x.rootKey === rootKey);
  return s ? { spaceId: s.spaceId, rootKey: s.rootKey } : null;
}
