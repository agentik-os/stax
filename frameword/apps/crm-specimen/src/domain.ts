/**
 * App domain — the content of every panel, as data. Three dashboards:
 *  FRAMEWORK  — the self-documenting sections (Overview · The model · The laws ·
 *               Improvements · Architecture · Prompt pack · Components · Blocks):
 *               the framework, documented inside the framework.
 *  CRM        — a small CRM specimen (account → contact → opportunity → activity)
 *               proving the grammar on real-shaped records.
 *  ANALYTICS  — a second demo dashboard proving the shell swaps sidebars.
 *
 * This file is application data. The panel engine never imports it — panels
 * address content by { panelType, resourceKey } and the app resolves keys here.
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
        { spaceId: "crm-tour", rootKey: "sec:crm-tour", label: "How it works" },
        { spaceId: "crm", rootKey: "space:crm", label: "Accounts" },
        { spaceId: "reports", rootKey: "space:reports", label: "Reports" },
      ],
    }],
  },
  {
    id: "analytics", label: "Analytics", glyph: "▲",
    groups: [{
      label: "Analytics",
      spaces: [
        { spaceId: "ana-overview", rootKey: "sec:ana-overview", label: "Overview" },
        { spaceId: "ana-revenue", rootKey: "sec:ana-revenue", label: "Revenue" },
        { spaceId: "ana-poss", rootKey: "sec:ana-poss", label: "Possibilities" },
      ],
    }],
  },
  {
    id: "platform", label: "Platform", glyph: "▣",
    groups: [{
      label: "Platform",
      spaces: [
        { spaceId: "pf-tour", rootKey: "sec:pf-tour", label: "How it maps" },
        { spaceId: "pf-console", rootKey: "sec:pf-console", label: "Console" },
        { spaceId: "pf-studio", rootKey: "sec:pf-studio", label: "Studio" },
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
    subtitle: "Click anything with depth and a panel opens to the right. The parent stays. That is the entire navigation model.",
    kpis: [{ v: "1", l: "mechanic" }, { v: "7", l: "laws" }, { v: "∞", l: "depth" }],
    blocks: [{ kind: "card", label: "01 — The pitch", text: "Stax replaces pages, modals and tabs with one move: anything with depth opens as a new panel to the RIGHT of its source, and the source stays on stage. The open panels form one serializable JSON object (WorkspaceState) — the same data that paints the screen is the URL hash, the persisted workspace, and an agent's working memory. Everything else in this app — the seven laws, the WhitePaper tokens, the registry, the migration engine — is discipline around that one mechanic." }],
    children: ["ov:why", "ov:vs", "depth:1", "ov:origin"],
    footActions: [{ label: "Open the model →", kind: "primary", space: "model" }],
  },
  "depth:1": {
    panelType: "doc", title: "Depth 1", subtitle: "Feel the mechanic before reading about it.",
    blocks: [{ kind: "card", label: "What to notice", text: "This panel opened beside its parent — nothing was replaced, nothing was covered (Law 3). The drill below opens depth 2 the exact same way, and the breadcrumb bar at the bottom grew a segment." }],
    body: "× closes this panel. The root never moves (Law 2). Actions live in the foot below — never floating in the body (Law 6).",
    children: ["depth:2"],
  },
  "depth:2": {
    panelType: "doc", title: "Depth 2", subtitle: "Same shell, one level deeper.",
    blocks: [{ kind: "card", label: "What to notice", text: "An unpinned panel is a PREVIEW — transient. Opening a sibling from the same parent replaces it (the branch policy). Press P, or click PIN in the bar: retention becomes \"retained\" and the panel survives branch changes by detaching into the reference rail instead (Law 4)." }],
    children: ["depth:3"],
  },
  "depth:3": {
    panelType: "doc", title: "Depth 3", subtitle: "The stage scrolls; the thread holds.",
    blocks: [{ kind: "card", label: "What to notice", text: "The breadcrumb grew with you — each segment calls navigateTo, which rewinds the branch below it under the subtree policy. The URL hash carries this exact path right now: copy it into a new tab and land here." }],
    children: ["depth:4"],
  },
  "depth:4": {
    panelType: "doc", title: "Depth ∞", subtitle: "It never ends — that's the point.",
    body: "Any node can open a child, forever. Depth is a routing capability; the rendered stage stays bounded and scrolls horizontally. Escape closes the leaf panel, one level at a time.",
  },
  "ov:why": {
    panelType: "doc", title: "Why it wins", subtitle: "Context, depth, predictability, composability.",
    blocks: [
      { kind: "card", label: "01 — Context is preserved", text: "The parent stays visible while you drill (Law 3). You never wonder where you are — the path IS the screen, and the breadcrumb is derived from it, not maintained beside it." },
      { kind: "card", label: "02 — Depth is infinite", text: "Any node can open a child, forever. Account → contact → opportunity → activity without a single page load, and the whole chain fits in one URL." },
      { kind: "card", label: "03 — One motion, learned once", text: "Open right. Actions in the foot. Back is ×. Every feature ever added — canvas, tables, notes — inherits the same grammar for free." },
      { kind: "card", label: "04 — Everything is a panel", text: "A dashboard, a form, a whiteboard, a data grid, a kanban, a settings page — same shell, different panelType. Composability is the business model." },
    ],
  },
  "ov:vs": {
    panelType: "doc", title: "Versus tabs, modals, pages", subtitle: "What every alternative loses.",
    blocks: [
      { kind: "card", label: "Tabs — siblings vanish", text: "Only one thing visible; the rest hides in memory. Panels keep every open sibling on stage, and pinned ones survive navigation." },
      { kind: "card", label: "Modals — context is stolen", text: "A modal dims the world to ask one question, and it cannot nest. A panel is a modal that respects its parent — it opens beside its source and keeps the thread on stage." },
      { kind: "card", label: "Page routes — everything resets", text: "Navigation forgets; back is a gamble. The stack keeps the whole journey — and still gives you a URL, because the ContextPath encodes into the hash." },
      { kind: "card", label: "Accordions — vertical sprawl", text: "Depth becomes scroll distance and everything below jumps. Panels give depth its own axis: left to right." },
    ],
  },
  "ov:origin": {
    panelType: "doc", title: "Where it came from", subtitle: "LifeOS → Panel System → Stax.",
    blocks: [
      { kind: "card", label: "2025 — LifeOS, the prototype", text: "A personal dashboard. The panels-inside-panels mechanic emerges and refuses to leave." },
      { kind: "card", label: "2026 — Panel System, the extraction", text: "The mechanic becomes laws, an engine and a stylesheet inside the Agentik design system." },
      { kind: "card", label: "Now — Stax, the clean-room rewrite", text: "Public: a pure reducer (@frameword/panels-core, 25 laws tests), React bindings, this specimen app, and stax-migrate — an engine that rebuilds legacy apps on the grammar. Nothing here is theory; the mechanic shipped twice before it had a name." },
    ],
  },

  /* ═══ FRAMEWORK · The model ═══ */
  "sec:model": {
    panelType: "section", title: "Panels inside panels.", eyebrow: "The model · 02",
    subtitle: "The interface is a horizontal stack of panels. State is one JSON object; seven intent commands are the only way to change it. Everything on screen derives from that state.",
    blocks: [
      { kind: "diagram" },
      { kind: "ops" },
      { kind: "row", label: "BAR", text: "56px tall, always. Mono eyebrow (uppercase, wide tracking) + pin and close controls. The hairline under it runs unbroken across the stage." },
      { kind: "row", label: "BODY", text: "Padding 18/18/16. Serif title, subtitle, cards, drills. The body scrolls alone — the bar and foot never move." },
      { kind: "row", label: "FOOT", text: "Padding 11/14. THE single action zone — primary CTA on the accent, destructive in red text. Never floating buttons, never metadata lines." },
      { kind: "row", label: "WIDTH", text: "From the registry only: S 380 · M 480 · L 640 · XL 800. A device-local override lives in the foot gear; shared state never stores a width." },
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
      { kind: "code", code: "type PanelTarget = {\n  panelType: string    // a registered panel type\n  resourceKey: string  // addresses the content\n  params?: object      // JSON only\n}" },
      { kind: "card", label: "The single rule", text: "A panel never renders another panel — it calls openDetail(parentInstanceId, target) and the reducer decides what exists. Same target + same parent REVEALS the existing instance instead of duplicating (Law 5). That is what makes the stack serializable, deduplicable, and drivable by an agent." },
      { kind: "card", label: "The state, in full", text: "WorkspaceState = { schemaVersion, spaceId, rootInstanceId, contextLeafId, focusedPanelId, panelsById, referenceRailOrder, nextId }. Each PanelInstance = { instanceId, target, spaceId, parentInstanceId, role: root|detail, retention: preview|retained, placement: context|reference }. Ancestry is parent links, never visual order; the ContextPath (root → leaf) is DERIVED from them, never stored." },
      { kind: "card", label: "The branch policy", text: "Every branch change below a parent — opening a sibling, clicking a crumb, closing a panel, switching Space — applies one rule to the orphaned subtree: preview panels CLOSE; retained panels DETACH into the reference rail (parentInstanceId becomes null, explicitly). If a reference for the same target already sits on the rail, the existing one wins and the newcomer is dropped." },
    ],
  },
  "md:sizes": {
    panelType: "doc", title: "Sizing grammar — S · M · L · XL", subtitle: "Width belongs to the kind, not the user.",
    blocks: [
      { kind: "card", label: "S · 380", text: "Inspectors and leaves: law, activity, task, canvas node and link inspectors." },
      { kind: "card", label: "M · 480", text: "The workhorse: docs, accounts, contacts, opportunities, reports, prompts, components, notes, settings." },
      { kind: "card", label: "L · 640", text: "Roots and pages: space, section, the data row page." },
      { kind: "card", label: "XL · 800", text: "Work surfaces: canvas (flexes wider), data tables, the tasks kanban, full-width block demos — still never full-bleed; the right gutter stays." },
      { kind: "card", label: "Why fixed", text: "Four widths keep the stage rhythmic; a free resize handle would make every stack a ransom note. The per-panel override in the foot gear is device-local presentation — it never enters the shared, serialized state." },
    ],
  },
  "md:axes": {
    panelType: "doc", title: "Two axes — stack + canvas", subtitle: "Containment and topology, one bridge.",
    blocks: [
      { kind: "card", label: "Depth — the stack", text: "\"What's inside this?\" — the horizontal rail of panels, ancestry as parent links." },
      { kind: "card", label: "Breadth — the canvas", text: "\"How do these connect?\" — a wide panel type rendering a node graph. Shipped in this app on @xyflow/react: open the whiteboard from the topbar." },
      { kind: "code", code: "// clicking a canvas node drills its inspector\nopenDetail(canvasPanelId, {\n  panelType: 'canvasnode',\n  resourceKey: 'cvn:' + node.id,\n})" },
      { kind: "card", label: "The bridge", text: "Drilling a graph node opens its inspector as the next column, exactly like any drill — a link opens the link inspector the same way. { nodes, edges } is JSON too: the board store persists, undoes and redoes, and every open inspector stays in sync through it." },
    ],
  },

  /* ═══ FRAMEWORK · The laws ═══ */
  "sec:laws": {
    panelType: "section", title: "Seven laws, one engine.", eyebrow: "The laws · 03",
    subtitle: "Encoded in the reducer and checked by validate() — violations are engine errors, not review comments. 25 tests keep them true.",
    children: ["law:1", "law:2", "law:3", "law:4", "law:5", "law:6", "law:7"],
  },
  "law:1": {
    panelType: "law", title: "Spaces never mix", subtitle: "Law 1", meta: "engine",
    blocks: [
      { kind: "do", label: "Do", text: "Opening a Space replaces the ACTIVE thread — the ContextPath. Pinned references are yours: they ride across Spaces and survive closing the root." },
      { kind: "dont", label: "Don't", text: "Never show two Spaces' threads side by side. References are the only cross-Space citizens — detached, explicit, never pretending to belong to the new branch." },
    ],
  },
  "law:2": {
    panelType: "law", title: "The root is fixed", subtitle: "Law 2", meta: "engine",
    blocks: [
      { kind: "do", label: "Do", text: "The root panel stays leftmost — not movable, not pinnable, always retained. Its × closes the whole Space." },
      { kind: "dont", label: "Don't", text: "Nothing may displace the root; there is no navigation without an anchor." },
    ],
  },
  "law:3": {
    panelType: "law", title: "Drilling keeps the parent", subtitle: "Law 3", meta: "engine",
    blocks: [
      { kind: "do", label: "Do", text: "A child opens beside its source; the source stays mounted and interactive. Opening a sibling from the same parent replaces the preview." },
      { kind: "dont", label: "Don't", text: "Never navigate away from the parent to show the child — context is the whole point." },
    ],
  },
  "law:4": {
    panelType: "law", title: "Pin detaches, never lies", subtitle: "Law 4", meta: "engine",
    blocks: [
      { kind: "do", label: "Do", text: "PIN sets retention:\"retained\". If a branch change would orphan the panel, it detaches into the reference rail — parentInstanceId becomes null, explicitly." },
      { kind: "dont", label: "Don't", text: "Never keep an orphaned panel on stage as if it belonged to the new branch. Visual order is not parentage." },
    ],
  },
  "law:5": {
    panelType: "law", title: "Identity is context-scoped", subtitle: "Law 5", meta: "engine",
    blocks: [
      { kind: "do", label: "Do", text: "Same target + same parent reveals and focuses the existing instance. The same target under a different parent is a different thread — a distinct instance." },
      { kind: "dont", label: "Don't", text: "No global dedup by resource — and never two instances of one target under one parent." },
    ],
  },
  "law:6": {
    panelType: "law", title: "Actions live in the foot", subtitle: "Law 6", meta: "anatomy",
    blocks: [
      { kind: "do", label: "Do", text: "Add, publish, reply, delete — always in the anchored foot. The body is content; the bar is chrome." },
      { kind: "dont", label: "Don't", text: "No floating primary buttons in the body, no object-state toggles in the foot. A read-only panel says \"Read-only\" in the foot." },
    ],
  },
  "law:7": {
    panelType: "law", title: "Serializable & derived", subtitle: "Law 7", meta: "engine",
    blocks: [
      { kind: "do", label: "Do", text: "State is JSON. The ContextPath, the breadcrumb, the URL hash, the agent context — all derived from it. Reload restores everything, pins included." },
      { kind: "dont", label: "Don't", text: "No components, closures or fetched rows in navigation state. Ever." },
    ],
  },

  /* ═══ FRAMEWORK · Improvements — the shipped evolution log ═══ */
  "sec:improvements": {
    panelType: "section", title: "The evolution log.", eyebrow: "Improvements · 04",
    subtitle: "What shipped beyond the core engine. Every entry marked live is running in this very build; specced entries are designed but not in this bundle.",
    blocks: [{ kind: "card", label: "Shipped in this specimen", text: "Canvas boards with an AI builder · Data tables with views and calcs · Notes + tasks with kanban · a notification center · the agent drawer · PushHost mobile · URL sync and persistence — plus the stax-migrate engine for legacy apps (see Architecture · 05)." }],
    children: ["imp:url", "imp:keys", "imp:persist", "imp:realtime", "imp:canvas", "imp:mobile", "imp:modules", "imp:agent", "imp:a11y", "imp:ideas"],
  },
  "imp:url": {
    panelType: "improvement", title: "URL-synced stacks", subtitle: "A link is a teleport.", meta: "live",
    blocks: [
      { kind: "card", label: "Live — this app", text: "Every open, pin, close and crumb click re-encodes the ContextPath into location.hash (encodeLocation). Paste the URL into a new tab: reconcileLocation rebuilds the exact stack, revealing existing panels instead of duplicating. On boot, the URL wins over the localStorage snapshot." },
      { kind: "card", label: "In a Next.js host", text: "The encoded path maps to a catch-all segment, so the server can prefetch data for every panel in the link before first paint." },
    ],
  },
  "imp:keys": {
    panelType: "improvement", title: "Command palette + keyboard map", subtitle: "Every destination is typeable.", meta: "live",
    blocks: [
      { kind: "card", label: "Live — the real map", text: "⌘K palette (every space, panel and action; ↑↓ moves, ↵ opens, esc closes) · ⌘B toggles the sidebar · ⌘J toggles the agent drawer · ⌘1-3 switches organization · P pins/unpins the focused panel · esc closes in precedence order: palette → drawer → menus → leaf panel. On the canvas: ⌘Z / ⇧⌘Z undo-redo, ⌘D duplicates, ⌘A selects all, arrow keys nudge, ⌫ deletes the selection." },
      { kind: "card", label: "Why it is cheap", text: "The palette reads DOMAIN and the registry — navigation is data, so every destination is enumerable and typeable. Nothing is bolted on." },
    ],
  },
  "imp:persist": {
    panelType: "improvement", title: "Persistence", subtitle: "Reload and land exactly here.", meta: "live",
    blocks: [
      { kind: "card", label: "Live — this app", text: "The workspace persists to localStorage (key frameword-crm) on every navigation and restores before first paint when there is no hash — URL always wins. Module stores persist separately: boards, notes/tasks, data tables, notifications, agent conversations, appearance prefs." },
      { kind: "card", label: "In production", text: "Signed in, the stack writes to a Convex stacks table — per user, per Space, last-writer-wins. Open your laptop where your phone left off. See Architecture → Convex schema." },
    ],
  },
  "imp:realtime": {
    panelType: "improvement", title: "Notifications & presence", subtitle: "The bell is live; presence is specced.", meta: "live",
    blocks: [
      { kind: "card", label: "Live — notification center", text: "The topbar bell: unread dot, four kinds (mention, task, agent, system), search, kind filters, mark-read and mark-all-read. One module store keeps the badge and the open list in sync, persisted to localStorage." },
      { kind: "card", label: "Specced — presence", text: "One live query keyed by stack URL and panel id puts a dot on the exact panel a teammate is reading. Not core algebra: presence rides beside the stack, keyed by the same ids — agents can appear as presence too." },
    ],
  },
  "imp:canvas": {
    panelType: "improvement", title: "Canvas boards + AI builder", subtitle: "Topology as a panel type — shipped.", meta: "live",
    blocks: [
      { kind: "card", label: "Live — a Figma/Miro-class board", text: "Multiple named boards on React Flow: card, note, shape, label and step nodes; 4-way connection handles; movable link midpoints; inline edge labels; dashed, animated and arrowed links; right-click menus; snap grid; minimap; 50-step undo/redo. Clicking a node or a link opens its inspector as the NEXT panel — the bridge is an ordinary drill." },
      { kind: "card", label: "Live — build a board by prompt", text: "Ask the agent (⌘J): \"canvas: Idea -> Prototype -> Ship\". boardFromPrompt parses arrow chains (one per line for branches) and named templates — sprint, retro, roadmap, funnel, onboarding, launch — then lays out and opens the board." },
    ],
  },
  "imp:mobile": {
    panelType: "improvement", title: "PushHost — mobile", subtitle: "Same reducer, one card at a time.", meta: "live",
    blocks: [
      { kind: "card", label: "Live below 640px", text: "useIsCompact(640) swaps ColumnHost for PushHost: one panel visible, the parent peeking at the left edge, a back chevron in the bar, references as a chip tray. An iOS-style back-stack over the exact same state." },
      { kind: "card", label: "Same everything", text: "Same instance ids, same URL codec, same laws — a stack link opened on a phone lands on the same stack." },
    ],
  },
  "imp:modules": {
    panelType: "improvement", title: "Panel modules", subtitle: "One folder registers everything.", meta: "live pattern",
    blocks: [
      { kind: "code", code: "definePanelModule({\n  id: 'inbox', label: 'Inbox', root: InboxRoot,\n  panels: {\n    thread:  { view: ThreadPanel,  size: 'M' },\n    message: { view: MessagePanel, size: 'S' },\n  },\n})" },
      { kind: "card", label: "✶ Proven three times here", text: "NotesApp, DataApp and CanvasBoard each ship as one file: a tiny store (useSyncExternalStore + localStorage) plus panel components registered in the app REGISTRY. definePanelModule is the specced packaging of that pattern; the endgame is a registry of community modules that install like shadcn components and snap into any shell." },
    ],
  },
  "imp:agent": {
    panelType: "improvement", title: "Stack-as-working-memory", subtitle: "The agent sees what you see.", meta: "live",
    blocks: [
      { kind: "code", code: "agent.ask({ stack, resolve: load })" },
      { kind: "card", label: "Live — the ✶ drawer (⌘J)", text: "Every answer starts from the serialized stack: the path is what you are doing, pinned references are what you keep. Because navigation is an algebra, the agent also answers BY navigating — ask for a board and it opens the canvas and builds it. Three drawer sizes, persisted conversation history, file and voice-note attachments." },
    ],
  },
  "imp:a11y": {
    panelType: "improvement", title: "Accessibility", subtitle: "Shipped inside the registry items, not an add-on.", meta: "specced",
    blocks: [
      { kind: "card", label: "Landmark", text: "Every panel is a region with an aria-label; screen readers walk the stack like a list." },
      { kind: "card", label: "Focus", text: "Opening a panel moves focus into it; closing returns focus to the drill that opened it." },
      { kind: "card", label: "Keyboard", text: "Roving tabindex across columns; the ⌘K palette already makes every destination typeable." },
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
      { kind: "card", label: "✶ 6 — Module marketplace", text: "Community modules on a registry — whole sections that install like components." },
    ],
  },

  /* ═══ FRAMEWORK · Architecture ═══ */
  "sec:architecture": {
    panelType: "section", title: "Architecture", eyebrow: "Architecture · 05",
    subtitle: "Two packages for the algebra, one specimen for the pixels, one engine for migrations.",
    blocks: [
      { kind: "card", label: "1 — @frameword/panels-core", text: "packages/panels-core — the pure reducer. Zero React, zero DOM, zero dependencies. WorkspaceState + the intent commands, the branch policy, validate() (the engine invariants), and the URL codec (encodeLocation / decodeLocation / reconcileLocation). 25 laws tests green in test/laws.test.ts." },
      { kind: "card", label: "2 — @frameword/panels-react", text: "packages/panels-react — bindings only, zero styling. WorkspaceProvider (urlSync + storageKey), useWorkspace(), the PanelRegistry mapping panelType → size (PANEL_WIDTHS: S 380 · M 480 · L 640 · XL 800), panelWidth() with a device-local override, useIsCompact(640) for the mobile PushHost." },
      { kind: "card", label: "3 — apps/crm-specimen", text: "This app — the rendering layer and the design language. App.tsx (shell, registry, ⌘K palette, agent drawer, settings), domain.ts (every panel's content — the file you are reading), CanvasBoard.tsx, DataApp.tsx, NotesApp.tsx, Notifications.tsx, and styles.css + tokens.css carrying the WhitePaper values from DESIGN-SPEC.md." },
      { kind: "card", label: "4 — stax-migrate", text: "packages/stax-migrate — a zero-dependency Node CLI that rebuilds ANY legacy app on this grammar in 9 gated phases via Claude Code or Codex. Two CSV matrices are the law — every feature (F-NNN) and every visual element (E-NNN) — and the done gate refuses to advance below 100% of both." },
      { kind: "code", code: "cd frameword && bun install && bun test    # 25 laws\ncd apps/crm-specimen && bunx vite          # run this app\nnode packages/stax-migrate/index.mjs \\\n  init /path/to/legacy-app                 # start a migration" },
    ],
    children: ["arch:registry", "arch:convex"],
  },
  "arch:registry": {
    panelType: "doc", title: "Registry map", subtitle: "Every panel type this app registers, with its width class.",
    blocks: [
      { kind: "card", label: "How it works", text: "REGISTRY: Record<panelType, { size }> lives in App.tsx. panelWidth() resolves instance → user override → kind default → M. Width belongs to the KIND; the user override in the foot gear is device-local only." },
      { kind: "card", label: "Docs", text: "section L · doc M · law S · improvement M · prompt M · component M · block M · blocklive XL (full-width live demo)." },
      { kind: "card", label: "CRM", text: "space L · account M · contact M · opportunity M · activity S · report M." },
      { kind: "card", label: "Canvas", text: "canvas XL (flexes to fill the stage, min 520) · canvasnode S · canvasedge S — the inspectors opened by clicking a node or a link." },
      { kind: "card", label: "Data", text: "datahome M · datatable XL · datarow L — a row opens as a page, the next panel." },
      { kind: "card", label: "Notes & tasks", text: "notes M · notefolder M · note M · tasks XL (kanban) · task S." },
      { kind: "card", label: "System", text: "settings M · profile M — opened from the account menu or ⌘K; they belong to no dashboard." },
      { kind: "card", label: "Key resolution", text: "resourceKey prefixes route to their stores: sec:/ov:/md:/law:/imp:/pr:/cmp:/blk: resolve in DOMAIN; cvn:/cve: in the board store; nte:/nfd:/tsk: in the notes store; dtc:/dtr: in the data store." },
    ],
  },
  "arch:convex": {
    panelType: "doc", title: "Convex schema", subtitle: "The specced production adapter — three tables, one mutation.",
    blocks: [
      { kind: "code", code: "stacks:   { userId, spaceId, state, updatedAt }\n           .index('by_user', ['userId','spaceId'])\npresence: { stackUrl, userId, panelId, ts }\n           .index('by_stack', ['stackUrl'])\nprefs:    { userId, theme, density }" },
      { kind: "card", label: "One mutation, one query", text: "Signed in, the stack writes on every navigation — optimistic locally, last-writer-wins — and presence renders as dots on panel bars. Signed out (and in this demo build) everything falls back to localStorage plus the URL hash. The reducer never knows which backend sits under it." },
    ],
  },

  /* ═══ FRAMEWORK · Prompt pack ═══ */
  "sec:prompts": {
    panelType: "section", title: "Prompt pack", eyebrow: "Prompt pack · 06",
    subtitle: "P0-P3 teach and build. M1-M6 are the MASTER KIT: paste-ready prompts that let any coding agent decompose an existing app, map it to the panel grammar, migrate it, build new on it, wire an agent, and audit against the laws.",
    children: ["pr:p0", "pr:p1", "pr:p2", "pr:p3", "pr:m-decompose", "pr:m-map", "pr:m-migrate", "pr:m-build", "pr:m-agent", "pr:m-laws"],
    blocks: [{ kind: "card", label: "How to use", text: "Paste one prompt into any coding agent as-is. For a full migration, prefer the stax-migrate CLI (Architecture · 05) — it drives the same protocols as 9 gated phases with mechanical exit gates. Always demand citations — file:line, screenshots, or test output — for every material claim." }],
  },
  "pr:p0": {
    panelType: "prompt", title: "P0 — Concept explainer", subtitle: "Brand-agnostic. Teaches the paradigm in five lines.", meta: "concept",
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
      { kind: "card", label: "WHEN", text: "Use FIRST on any existing app you want to migrate to the panel grammar. Run it before mapping, before any redesign talk — the mapping (M2) and migration plan (M3) both consume its feature matrix. Also use it when a migration stalls mid-way: re-run to find what the model silently skipped. (stax-migrate phase 1 runs this protocol automatically.)" },
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
      { kind: "card", label: "WHEN", text: "Use when you commit to actually rebuilding an existing dashboard on the panel grammar. It turns M1+M2 outputs into an executable, gated plan — hand each phase to a coding agent and refuse to advance until that phase's acceptance evidence is green. Also use it to audit a half-done migration: grade the current state against the phase gates. (The stax-migrate CLI is the productized version: 9 phases, dual matrices, mechanical gates.)" },
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
      { kind: "card", label: "WHEN", text: "Use once the workspace runs (post-M3 or post-M4) and you want an in-app AI copilot. The key insight it enforces: WorkspaceState is already a perfect context document — path = what the user is doing, references = what they care about. Use it also to retrofit guardrails onto an agent that currently mutates UI state directly. This app's ✶ drawer implements the pattern." },
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

  /* ═══ WORKSPACE · CRM — the guided tour ═══ */
  "sec:crm-tour": {
    panelType: "section", title: "A living specimen.", eyebrow: "How it works · CRM",
    subtitle: "This CRM is not a screenshot — every panel in it demonstrates the grammar it is built from. Read a tour stop, then use its foot button to try the real thing.",
    kpis: [{ v: "4", l: "levels deep" }, { v: "1", l: "reference demo" }, { v: "7", l: "intents" }],
    blocks: [{ kind: "card", label: "The demo dataset", text: "3 accounts → 3 contacts → 4 opportunities → 5 activities, plus a read-only Reports Space. Every node is data in domain.ts; the shell renders it through the registry — nothing in the CRM is hand-built." }],
    children: ["tour:root", "tour:chain", "tour:reference", "tour:foot", "tour:build"],
  },
  "tour:root": {
    panelType: "doc", title: "The Space root", subtitle: "What the Accounts panel demonstrates.",
    blocks: [
      { kind: "row", label: "TYPE", text: "space · registry size L 640 — roots are wide because the lists live here." },
      { kind: "row", label: "ANATOMY", text: "Bar 56 with the SPACE eyebrow · KPI stat row (mono, tabular) · numbered drill rows · composer CTA in the foot." },
      { kind: "card", label: "What to try", text: "Open Accounts and click row 01. The list does not navigate away — Acme opens beside it (Law 3). The root's × closes the whole Space, and nothing can displace it (Law 2). The foot button below REPLACES this tour thread with the Accounts thread — that swap is Law 1. Pin this stop first (P) if you want it to ride along." },
    ],
    footActions: [{ label: "Open Accounts", kind: "primary", space: "crm" }],
  },
  "tour:chain": {
    panelType: "doc", title: "Four panels deep", subtitle: "Accounts → Acme Industries → Jo Lambert → E-commerce replatform.",
    blocks: [
      { kind: "card", label: "The demo chain", text: "Space root (L) → account (M) → contact (M) → opportunity (M): four levels, one URL. Drill an activity for a fifth. Parents stay mounted the whole way; the crumb bar grows one segment per level, and the ‹ › buttons in each bar move focus between columns." },
      { kind: "card", label: "Why the foot lands you mid-chain", text: "The button below calls openDetail from THIS panel — so the opportunity opens beside the tour, without its ancestors. Identity is context-scoped (Law 5): same target, different parent, distinct instance. For the real four-level thread, open Accounts and click through — or use the sidebar sub-items." },
    ],
    footActions: [{ label: "Open the full chain", kind: "primary", drill: "opp:refonte" }],
  },
  "tour:reference": {
    panelType: "doc", title: "Pin & cross-dashboard", subtitle: "References survive everything.",
    blocks: [
      { kind: "do", label: "Do", text: "Open the activity below and press P (or click PIN in its bar). Now switch Space — even switch dashboard: the panel detaches into the reference rail on the right and stays until you unpin it. Click its title to resume it as a fresh thread." },
      { kind: "dont", label: "Don't", text: "Never fake persistence by leaving an orphan on stage as if it belonged to the new branch — visual order is not parentage (Law 4). Detachment is explicit: parentInstanceId becomes null and the panel wears a Ref badge." },
    ],
    footActions: [{ label: "Open a pinnable panel", kind: "primary", drill: "act:call1" }],
  },
  "tour:foot": {
    panelType: "doc", title: "One action zone", subtitle: "Law 6, demonstrated by every panel here.",
    blocks: [
      { kind: "row", label: "PATTERN", text: "composer: \"New contact…\" in the node data becomes the foot CTA — content stays data, the shell renders the button." },
      { kind: "do", label: "Do", text: "Every CRM panel keeps its verbs in the anchored foot: New account, New contact, New opportunity, New activity — one accent CTA per panel, destructive verbs in red text." },
      { kind: "dont", label: "Don't", text: "No floating buttons in the body, no actions in the bar, no metadata in the foot. Read-only panels (Reports) say \"Read-only\" in the foot instead of hiding it." },
    ],
  },
  "tour:build": {
    panelType: "doc", title: "Build this CRM yourself", subtitle: "From feature matrix to law-clean panels.",
    blocks: [
      { kind: "card", label: "The prompt path", text: "M1 decomposes your legacy CRM into a cited feature matrix. M2 maps every row to this grammar deterministically — modal → panel, tabs → sibling drills, wizard → chained drills. M3 phases the rebuild behind evidence gates; M6 audits the result against the laws." },
      { kind: "card", label: "Or run the engine", text: "stax-migrate (packages/stax-migrate) drives the same protocols as 9 gated phases with TWO CSV matrices — every feature and every visual element — and refuses to finish below 100% of both." },
    ],
    footActions: [{ label: "Open the Prompt pack", kind: "primary", space: "prompts" }],
  },

  /* ═══ WORKSPACE · CRM ═══ */
  "space:crm": {
    panelType: "space", title: "Accounts", subtitle: "3 active accounts — click a row to open its detail beside this list.",
    children: ["acc:acme", "acc:globex", "acc:initech"], composer: "New account…",
    kpis: [{ v: "3", l: "accounts" }, { v: "5", l: "opportunities" }, { v: "€46k", l: "pipeline" }],
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "Space root · L 640. KPI stats in tabular mono, numbered drills, composer in the foot. Its × closes the Space — nothing displaces the root (Law 2)." }],
  },
  "acc:acme": { panelType: "account", title: "Acme Industries", subtitle: "Manufacturing · Lyon", meta: "2 contacts", children: ["con:jo", "con:max"], composer: "New contact…",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "account · M 480 · depth 1. Opened by openDetail — the Accounts list stays mounted beside it (Law 3)." }] },
  "acc:globex": { panelType: "account", title: "Globex", subtitle: "Retail · Paris", meta: "1 contact", children: ["con:lea"], composer: "New contact…",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "account · M 480 · depth 1. Opening this while Acme sits unpinned REPLACES Acme — the branch policy on previews." }] },
  "acc:initech": { panelType: "account", title: "Initech", subtitle: "SaaS · Nantes", meta: "prospect", body: "Prospect account — no contacts on record yet. A leaf panel has no drills.",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "account · M 480 · a leaf: no children, so no drills — the body note takes their place. It still previews and pins like any detail panel." }] },
  "con:jo": { panelType: "contact", title: "Jo Lambert", subtitle: "Operations director", meta: "2 opps", children: ["opp:refonte", "opp:maintenance"], composer: "New opportunity…",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "contact · M 480 · depth 2. Two opportunity drills below — the tour's four-level chain runs through this panel." }] },
  "con:max": { panelType: "contact", title: "Max Verne", subtitle: "Head of procurement", meta: "1 opp", children: ["opp:equipement"], composer: "New opportunity…",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "contact · M 480 · depth 2. Also reachable via the see-also row on E-commerce replatform — same target, different parent, distinct instance (Law 5)." }] },
  "con:lea": { panelType: "contact", title: "Lea Fontaine", subtitle: "CTO", meta: "1 opp", children: ["opp:migration"], composer: "New opportunity…",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "contact · M 480 · depth 2 under Globex — a parallel thread to the Acme chain." }] },
  "opp:refonte": { panelType: "opportunity", title: "E-commerce replatform", subtitle: "€18,000 · proposal sent", children: ["act:call1", "act:demo1"], seeAlso: ["con:max"], composer: "New activity…",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "opportunity · M 480 · depth 3. Two activity drills plus a see-also: it opens Max Verne under THIS panel — a new context-scoped instance (Law 5)." }] },
  "opp:maintenance": { panelType: "opportunity", title: "Maintenance 2026", subtitle: "€8,000 · negotiation", children: ["act:relance1"], composer: "New activity…",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "opportunity · M 480 · depth 3. A preview by default — drilling its sibling from Jo Lambert replaces it unless pinned." }] },
  "opp:equipement": { panelType: "opportunity", title: "Workshop equipment", subtitle: "€6,500 · qualification", children: ["act:visite1"], composer: "New activity…",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "opportunity · M 480 · depth 3 on the Max Verne thread." }] },
  "opp:migration": { panelType: "opportunity", title: "Cloud migration", subtitle: "€13,500 · discovery", children: ["act:kickoff"], composer: "New activity…",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "opportunity · M 480 · depth 3 on the Globex thread." }] },
  "act:call1": { panelType: "activity", title: "Scoping call", subtitle: "Jul 12 · 30 min", body: "Notes: scope validated, budget confirmed. PIN this panel, then drill elsewhere — it becomes a reference and survives the branch change.",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "activity · S 380 · depth 4, the leaf of the demo chain. Pin it (P) and it survives every branch change as a reference (Law 4)." }] },
  "act:demo1": { panelType: "activity", title: "Product demo", subtitle: "Jul 17 · 1 h", body: "Demo delivered to the committee. Price objection cleared by the maintenance option.",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "activity · S 380 · leaf. S is the inspector class: one fact, no list, no composer." }] },
  "act:relance1": { panelType: "activity", title: "Quote follow-up", subtitle: "Jul 15 · email", body: "Quote re-sent with a 5% discount. Awaiting signature.",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "activity · S 380 · leaf on the Maintenance thread." }] },
  "act:visite1": { panelType: "activity", title: "Site visit", subtitle: "Jul 10 · on site", body: "Requirements measured on site. Estimate in progress.",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "activity · S 380 · leaf: root → account → contact → opportunity → activity, five panels in one URL." }] },
  "act:kickoff": { panelType: "activity", title: "Technical kickoff", subtitle: "Jul 18 · video call", body: "Target architecture validated with the CTO. POC scheduled.",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "activity · S 380 · leaf of the Globex thread — the deepest panel of that branch." }] },
  "space:reports": {
    panelType: "space", title: "Reports", subtitle: "Cross-cutting views (read-only).",
    children: ["rep:pipeline", "rep:activite"],
    kpis: [{ v: "€46k", l: "pipeline" }, { v: "5", l: "activities / wk" }, { v: "37%", l: "win rate" }],
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "Space root · L 640 · a read-only Space: its reports declare no composer, so each foot says Read-only (Law 6)." }],
  },
  "rep:pipeline": { panelType: "report", title: "Pipeline by stage", subtitle: "Weekly snapshot", body: "Discovery €13.5k · Qualification €6.5k · Proposal €18k · Negotiation €8k.",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "report · M 480 · leaf. Numbers stay mono and tabular — the type law; the only foot content is the Read-only note." }] },
  "rep:activite": { panelType: "report", title: "Sales activity", subtitle: "Last 30 days", body: "5 activities logged. A read-only panel has no action foot.",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "report · M 480 · leaf. Empty of verbs by design — read-only is stated in the foot, never implied." }] },

  /* ═══ ANALYTICS dashboard ═══ */
  "sec:ana-overview": {
    panelType: "space", title: "Overview", subtitle: "The same engine, another dashboard — the sidebar switched with it.",
    kpis: [{ v: "€46k", l: "pipeline" }, { v: "12", l: "deals" }, { v: "37%", l: "win rate" }],
    children: ["ana:funnel", "ana:sources"],
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "Space root · L 640. Opening this dashboard replaced the previous thread (Law 1) — pinned references rode across, and the sidebar swapped with it." }],
    footActions: [{ label: "See every block live", kind: "primary", space: "ana-poss" }],
  },
  "ana:funnel": { panelType: "report", title: "Conversion funnel", subtitle: "Visit → lead → deal", body: "1,240 visits · 86 leads (6.9%) · 12 deals (14%). Each stage could drill into its cohort.",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "report · M 480 · leaf. In production each stage is a DrillTrigger to its cohort — see the funnel block live in Possibilities." }] },
  "ana:sources": { panelType: "report", title: "Sources", subtitle: "Last 30 days", body: "Organic 44% · Outbound 31% · Referral 25%. A canvas panel (React Flow) would render the attribution graph.",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "report · M 480 · leaf. Relational data wants the canvas panel (XL, flexes): drilling a graph node opens its inspector as the next column." }] },
  "sec:ana-revenue": {
    panelType: "space", title: "Revenue", subtitle: "MRR and projection — read-only.",
    kpis: [{ v: "€8.2k", l: "MRR" }, { v: "+12%", l: "vs June" }, { v: "€98k", l: "proj. ARR" }],
    children: ["ana:mrr", "ana:forecast"],
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "Space root · L 640. Every KPI value renders in tabular mono — numbers are never serif." }],
  },
  "ana:mrr": { panelType: "report", title: "MRR by plan", subtitle: "July 2026", body: "Starter €2.1k · Pro €4.6k · Enterprise €1.5k. Numbers render in the token map's tabular mono — never serif.",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "report · M 480 · leaf. A block-built version of this panel is one drill away in Possibilities (big number, stat card)." }] },
  "ana:forecast": { panelType: "report", title: "Q4 projection", subtitle: "Median scenario", body: "€11.4k MRR by end of December if the win rate holds at 37%.",
    blocks: [{ kind: "row", label: "IN THE GRAMMAR", text: "report · M 480 · leaf. A projection could chain one drill per scenario — depth is always available, never required." }] },

  /* ═══ ANALYTICS · Possibilities — the live block gallery ═══ */
  "sec:ana-poss": {
    panelType: "section", title: "Possibilities.", eyebrow: "Possibilities · Analytics",
    subtitle: "Every dashboard element, live — click any row to open the real interactive demo beside this list.",
    kpis: [{ v: "43", l: "blocks" }, { v: "3", l: "versions each" }, { v: "43", l: "live demos" }],
    children: ["poss:how", "blk:stat-card", "blk:big-number", "blk:funnel", "blk:line", "blk:heatmap", "blk:kanban", "blk:gantt", "blk:timeline", "blk:tree-table", "blk:gauge", "blk:rich-editor", "blk:voice-input"],
  },
  "poss:how": {
    panelType: "doc", title: "How to read these panels", subtitle: "Each block is a specimen: three versions, one grammar table, one live demo.",
    blocks: [
      { kind: "card", label: "Anatomy of a block panel", text: "Every drill below opens a block panel (M 480): three structural versions of the element rendered with the live tokens, plus its panel-grammar integration table — what drills, what filters, where actions go." },
      { kind: "card", label: "Full width, live", text: "The block panel's foot button — Live demo, full width — opens a blocklive panel (XL 800) running the real interactive component. Change the accent or fonts in Settings and watch every version follow: tokens only, no hex." },
      { kind: "card", label: "Where they come from", text: "All 43 blocks ship in the Framework dashboard under Blocks · 08, grouped in 8 families. This list is a curated cut for analytics work — KPI, charts, data and AI surfaces." },
    ],
  },

  /* ═══ PLATFORM dashboard — platform-class console & studio, in the grammar ═══ */
  "sec:pf-tour": {
    panelType: "section", title: "Platform-class UI, one grammar.", eyebrow: "How it maps · Platform",
    subtitle: "Take a real developer console — settings pages, tabbed sections, master-detail lists, floating composers — and re-express every one of its patterns as panels. This dashboard is that exercise, live.",
    kpis: [{ v: "13", l: "surfaces" }, { v: "5", l: "mappings" }, { v: "0", l: "pages" }],
    blocks: [{ kind: "card", label: "The source material", text: "The Console and Studio Spaces beside this one rebuild the recurring surfaces of a modern API platform: key management, people & permissions, projects, billing, spend limits, usage analytics, service health, data-control forms, security empty-states, a prompt composer, a realtime creator, an image grid and a prompt-card hub. Every one is functional — and every one is a panel." }],
    children: ["map:nav", "map:tabs", "map:detail", "map:composer", "map:states"],
    footActions: [{ label: "Open the Console", kind: "primary", space: "pf-console" }],
  },
  "map:nav": {
    panelType: "doc", title: "A settings sidebar is a Space", subtitle: "Thirteen nav items, zero page swaps.",
    blocks: [
      { kind: "card", label: "The original", text: "A console's settings area is a second sidebar with a dozen page routes — General, API keys, People, Projects, Billing, Limits, Usage, Service health… Each click replaces the whole screen and your place in it." },
      { kind: "card", label: "The mapping", text: "That sidebar becomes ONE Space root whose drill list is the nav. Opening API keys opens a panel BESIDE the root; opening a key opens a third. The root never moves (Law 2), so 'Back to project' disappears — the project is still on screen." },
    ],
    footActions: [{ label: "See it — the Console root", kind: "primary", space: "pf-console" }],
  },
  "map:tabs": {
    panelType: "doc", title: "Tabs become segments or siblings", subtitle: "Two different jobs hid behind one widget.",
    blocks: [
      { kind: "do", label: "Do", text: "When tabs FILTER one collection (Members / Invitations, Active / Revoked), use a segmented control — same panel, different view. When tabs hold DIFFERENT content (Visibility / Hosted tools / Data retention), make them sibling drills — different panels." },
      { kind: "dont", label: "Don't", text: "Never keep a tab bar that swaps the page under the user. The People panel and the Security panel beside this one show both mappings running." },
    ],
    footActions: [{ label: "People — segment filter", kind: "primary", drill: "pf:people" }, { label: "Security — segments", kind: "outline", drill: "pf:security" }],
  },
  "map:detail": {
    panelType: "doc", title: "Master-detail is panel → panel", subtitle: "'Select a member to view details' does not exist here.",
    blocks: [
      { kind: "card", label: "The original", text: "Console lists reserve half the screen for an empty detail pane with a placeholder sentence, or navigate to a detail route and lose the list." },
      { kind: "card", label: "The mapping", text: "The list is a panel; clicking a row calls openDetail and the record IS the next panel. The list stays mounted (Law 3), the detail is context-scoped (Law 5), and the empty placeholder pane simply never exists." },
    ],
    footActions: [{ label: "API keys — row → panel", kind: "primary", drill: "pf:keys" }],
  },
  "map:composer": {
    panelType: "doc", title: "Floating composers anchor in the foot", subtitle: "'Ask anything', grounded.",
    blocks: [
      { kind: "card", label: "The original", text: "Playgrounds float a rounded composer over the canvas — 'Ask anything', 'Describe what you want to see' — plus a config column with native selects and a Save button lost at the end of long forms." },
      { kind: "card", label: "The mapping", text: "The foot is the one action zone (Law 6): the composer input lives there, next to its primary verb. Config columns become stacked sections with segmented choices; Save becomes the foot CTA that lights up only when the draft is dirty." },
    ],
    footActions: [{ label: "Prompt composer", kind: "primary", drill: "pf:prompt" }, { label: "Images grid", kind: "outline", drill: "pf:images" }],
  },
  "map:states": {
    panelType: "doc", title: "Empty states & masked secrets", subtitle: "The platform patterns that survive as-is.",
    blocks: [
      { kind: "row", label: "EMPTY", text: "Icon, one sentence, at most one CTA — centered in the panel body. Filter a table to nothing and the same pattern appears inline." },
      { kind: "row", label: "SECRETS", text: "Mono, masked (sk-stax-…4Kx2), revealed exactly once at creation — inside the detail panel, never a modal." },
      { kind: "row", label: "STATUS", text: "One pill vocabulary: green = live (active, resolved, verified), neutral = off (revoked, archived). Numbers beside them stay tabular mono." },
      { kind: "row", label: "BANNERS", text: "Success and warning banners render inside the panel that caused them, dismissible, above the content — never as toasts stacked over the whole app." },
    ],
    footActions: [{ label: "Security — the empty state", kind: "primary", drill: "pf:security" }],
  },

  "sec:pf-console": {
    panelType: "section", title: "The Console.", eyebrow: "Console · Platform",
    subtitle: "An organization console rebuilt panel-first — every row below is a live, functional surface; every 'page' of the original is a sibling panel here.",
    kpis: [{ v: "9", l: "surfaces" }, { v: "4", l: "live tables" }, { v: "100%", l: "functional" }],
    children: ["pf:keys", "pf:people", "pf:projects", "pf:billing", "pf:limits", "pf:usage", "pf:health", "pf:controls", "pf:security"],
  },
  "pf:keys": {
    panelType: "pfkeys", title: "API keys", eyebrow: "console · keys",
    subtitle: "Search, filter, roll and revoke — a row opens its key beside the table, and a fresh secret is visible exactly once.",
    meta: "table",
  },
  "pf:people": {
    panelType: "pfpeople", title: "People & permissions", eyebrow: "console · people",
    subtitle: "Members and invitations as one segmented collection — a member opens as the next panel.",
    meta: "list",
  },
  "pf:projects": {
    panelType: "pfprojects", title: "Projects", eyebrow: "console · projects",
    subtitle: "Geography, retention and spend per project; create in the foot, archive from the detail.",
    meta: "table",
  },
  "pf:billing": {
    panelType: "pfbilling", title: "Billing", eyebrow: "console · billing",
    subtitle: "Credit balance, auto-recharge and the sub-pages as drills — the hub pattern.",
    meta: "hub",
  },
  "pf:limits": {
    panelType: "pflimits", title: "Spend limits", eyebrow: "console · limits",
    subtitle: "The cap, its progress, alert thresholds and the usage-tier rail.",
  },
  "pf:usage": {
    panelType: "pfusage", title: "Usage", eyebrow: "console · usage",
    subtitle: "Daily spend chart, KPI stats and the by-model breakdown — Export downloads a real CSV.",
    meta: "chart",
  },
  "pf:health": {
    panelType: "pfhealth", title: "Service health", eyebrow: "console · health",
    subtitle: "Per-service uptime with inline disclosure; every incident drills to its write-up.",
  },
  "pf:controls": {
    panelType: "pfcontrols", title: "Data controls", eyebrow: "console · controls",
    subtitle: "Visibility radio groups with a drafts-then-Save flow — Save is the foot's primary.",
    meta: "form",
  },
  "pf:security": {
    panelType: "pfsecurity", title: "Security", eyebrow: "console · security",
    subtitle: "Identity provider, IP allowlist and domains — three segments, honest empty states.",
  },
  "pf:payments": {
    panelType: "doc", title: "Payment methods", eyebrow: "console · billing",
    blocks: [
      { kind: "row", label: "DEFAULT", text: "Visa •••• 4242 — exp 08/29 · billing address on file" },
      { kind: "row", label: "BACKUP", text: "Mastercard •••• 8010 — exp 11/27" },
    ],
    body: "Cards are charged in order; the backup is used only if the default fails. Managed by your payment provider — this panel is the read model.",
  },
  "pf:history": {
    panelType: "doc", title: "Billing history", eyebrow: "console · billing",
    blocks: [
      { kind: "row", label: "JUL 2026", text: "$25.00 — credit purchase · receipt #1284" },
      { kind: "row", label: "JUN 2026", text: "$50.00 — credit purchase · receipt #1201" },
      { kind: "row", label: "MAY 2026", text: "$25.00 — credit purchase · receipt #1146" },
    ],
    body: "Every receipt is a row; in production each would drill to its PDF panel.",
  },

  "sec:pf-studio": {
    panelType: "section", title: "The Studio.", eyebrow: "Studio · Platform",
    subtitle: "The creative surfaces — a prompt composer, a realtime voice creator, an image grid and the prompt-card hub — each with its composer anchored where the grammar puts verbs: the foot.",
    kpis: [{ v: "4", l: "surfaces" }, { v: "2", l: "foot composers" }, { v: "6", l: "ready prompts" }],
    children: ["pf:prompt", "pf:realtime", "pf:images", "pf:hub"],
  },
  "pf:prompt": {
    panelType: "pfprompt", title: "Prompt composer", eyebrow: "studio · prompts",
    subtitle: "Model, reasoning and verbosity as segments; variables as chips; 'Ask anything' anchored in the foot.",
    meta: "composer",
  },
  "pf:realtime": {
    panelType: "pfrealtime", title: "Realtime creator", eyebrow: "studio · voice",
    subtitle: "The centered creator: suggestion chips fill the draft, Create lives in the foot.",
  },
  "pf:images": {
    panelType: "pfimages", title: "Images", eyebrow: "studio · images",
    subtitle: "A generation grid with the describe-composer in the foot — every tile token-painted.",
    meta: "grid",
  },
  "pf:hub": {
    panelType: "pfhub", title: "Build hub", eyebrow: "studio · hub",
    subtitle: "Six ready-to-paste agent missions — copy a prompt, or open it prefilled in the composer beside this panel.",
    meta: "prompts",
  },
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
  subtitle: "The complete shadcn/ui catalog rendered with the WhitePaper tokens — every component is a drill; its demo opens beside the list.",
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
  subtitle: "Every dashboard element the framework ships — each in 3 versions, with its panel-grammar integration table and a full-width live demo.",
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
  subtitle: "Your whiteboard — cards, notes, shapes, steps and connections. Multiple boards; right-click for menus; ask the agent (⌘J) to build one.",
};

/* system panels — reachable from the account menu & the palette, in no dashboard */
DOMAIN["sec:data"] = {
  panelType: "datahome", title: "Data", eyebrow: "Personal",
  subtitle: "Tables and pages — Airtable-class grids with views, filters and calcs; every row opens as a document panel.",
};
DOMAIN["sec:notes"] = {
  panelType: "notes", title: "Notes", eyebrow: "Personal",
  subtitle: "Your notes — folders, pins, rich text; each note opens as the next panel.",
};
DOMAIN["sec:tasks"] = {
  panelType: "tasks", title: "Tasks", eyebrow: "Personal",
  subtitle: "Your task board — list or kanban, priorities, due dates, subtasks; drill a task for detail.",
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
