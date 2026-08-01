/**
 * boardStore: the canvas board's shared store + the agent's board builder.
 * Deliberately free of React Flow and Tiptap so the shell can import it
 * statically while CanvasBoard.tsx (the heavy renderer) loads lazily.
 */
import { useSyncExternalStore } from "react";

/* ── shared board store ──────────────────────────────────────────────── */
export interface CvSub { id: string; label: string; done?: boolean }
/**
 * A node's KIND is how it draws. Its SEM is what it means.
 *
 * Those were one field, so a diagram could say "this is a card" and never say
 * whether the card was a service, a datastore or a human. A reader then has to
 * hold the meaning in their head, which is exactly what a diagram exists to
 * stop, and a legend cannot be derived from a board that never declared what
 * its shapes stand for.
 *
 * Orthogonal on purpose: a service can be a card or a note, and a card can be
 * a service or an actor. Rendering and meaning move independently.
 */
export type CvSem = "system" | "service" | "store" | "actor" | "external" | "decision" | "artifact" | "queue";

export const SEM: Record<CvSem, { label: string; glyph: string; hint: string }> = {
  system:   { label: "System",    glyph: "\u25a3", hint: "a bounded product or app you own" },
  service:  { label: "Service",   glyph: "\u25c6", hint: "a running process that answers" },
  store:    { label: "Store",     glyph: "\u25ac", hint: "state at rest: a table, a bucket, a cache" },
  actor:    { label: "Actor",     glyph: "\u25cf", hint: "a human or an agent that acts" },
  external: { label: "External",  glyph: "\u25cb", hint: "a third party you do not control" },
  decision: { label: "Decision",  glyph: "\u25c7", hint: "a branch: the flow forks here" },
  artifact: { label: "Artifact",  glyph: "\u25b2", hint: "a document, a report, a build output" },
  queue:    { label: "Queue",     glyph: "\u25b8", hint: "work waiting to be picked up" },
};

export interface CvNode { id: string; kind: "card" | "note" | "shape" | "label" | "step"; sem?: CvSem; group?: string; x: number; y: number; label: string; sub?: string; color?: string; notes?: string; pinned?: boolean; subs?: CvSub[] }

/**
 * A GROUP is a named boundary, and it is DERIVED, never stored as a rectangle.
 * Its box is the bounding box of its members plus padding, so moving a node
 * moves the boundary and a boundary can never drift from what it contains. A
 * stored rectangle is a second source of truth for the same fact.
 */
export interface CvGroup { id: string; label: string; note?: string }
export interface CvEdge {
  id: string; source: string; target: string; label?: string;
  sourceHandle?: string; targetHandle?: string;
  dash?: boolean; animated?: boolean; arrow?: boolean;
  shape?: "smoothstep" | "default" | "straight" | "step";
  mx?: number; my?: number;
}
export interface BoardUi { snap: boolean; grid: number; locked: boolean; showNotes?: boolean; legend?: boolean; boundaries?: boolean }
export interface BoardState { nodes: CvNode[]; edges: CvEdge[]; groups?: CvGroup[]; seq: number; ui: BoardUi }

export const DEFAULT_UI: BoardUi = { snap: true, grid: 18, locked: false, legend: true, boundaries: true };

export const SEED: BoardState = {
  seq: 9,
  ui: DEFAULT_UI,
  groups: [
    { id: "g-idea", label: "Where it came from", note: "the idea and the research behind it" },
    { id: "g-make", label: "How it gets made", note: "design, build, ship" },
  ],
  nodes: [
    { id: "n1", kind: "card", sem: "system", group: "g-idea", x: 40, y: 60, label: "Concept", sub: "One mechanic: open right", notes: "The founding idea: panels inside panels." },
    { id: "n2", kind: "card", sem: "actor", group: "g-idea", x: 300, y: 40, label: "Research", sub: "LifeOS → laws → brief" },
    { id: "n3", kind: "card", sem: "artifact", group: "g-make", x: 300, y: 170, label: "Design", sub: "WhitePaper tokens" },
    { id: "n4", kind: "card", x: 560, y: 100, label: "Build", sub: "panels-core · react · app" },
    { id: "n5", kind: "note", x: 90, y: 230, label: "Ship it loud ✶", color: "soft" },
    { id: "n6", kind: "shape", x: 800, y: 112, label: "Launch" },
    { id: "n7", kind: "label", x: 44, y: 6, label: "FRAMEWORK PIPELINE" },
  ],
  edges: [
    { id: "e1", source: "n1", target: "n2", label: "explore", sourceHandle: "r", targetHandle: "l" },
    { id: "e2", source: "n1", target: "n3", sourceHandle: "r", targetHandle: "l" },
    { id: "e3", source: "n2", target: "n4", sourceHandle: "r", targetHandle: "l" },
    { id: "e4", source: "n3", target: "n4", label: "tokens", sourceHandle: "r", targetHandle: "l" },
    { id: "e5", source: "n4", target: "n6", label: "v1", sourceHandle: "r", targetHandle: "l" },
  ],
};

interface BoardsFile { boards: Record<string, { name: string; state: BoardState }>; order: string[]; active: string }

const normalize = (raw: BoardState): BoardState => ({
  ...raw,
  ui: { ...DEFAULT_UI, ...(raw.ui ?? {}) },
  edges: (raw.edges ?? []).map((e: CvEdge) => ({ sourceHandle: "r", targetHandle: "l", ...e })),
});

function loadFile(): BoardsFile {
  try {
    const f = JSON.parse(localStorage.getItem("frameword-boards") ?? "null");
    if (f?.boards && f.order?.length) {
      for (const id of f.order) f.boards[id].state = normalize(f.boards[id].state);
      if (!f.boards[f.active]) f.active = f.order[0];
      return f as BoardsFile;
    }
  } catch { /* migrate */ }
  let first = SEED;
  try {
    const legacy = JSON.parse(localStorage.getItem("frameword-board") ?? "null");
    if (legacy?.nodes) first = normalize(legacy);
  } catch { /* seed */ }
  return { boards: { b1: { name: "Framework pipeline", state: first } }, order: ["b1"], active: "b1" };
}

let file: BoardsFile = loadFile();
let state: BoardState = file.boards[file.active].state;
let past: BoardState[] = [];
let future: BoardState[] = [];
const subs = new Set<() => void>();
const emit = () => {
  file = { ...file, boards: { ...file.boards, [file.active]: { ...file.boards[file.active], state } } };
  localStorage.setItem("frameword-boards", JSON.stringify(file));
  subs.forEach((f) => f());
};
export const board = {
  get: () => state,
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
  /** record=false for high-frequency updates (drag positions) and ui prefs */
  update: (fn: (s: BoardState) => BoardState, record = true) => {
    if (record) { past = [...past.slice(-49), state]; future = []; }
    state = fn(state);
    emit();
  },
  /** snapshot before a gesture (drag) whose per-frame updates don't record */
  checkpoint: () => { past = [...past.slice(-49), state]; future = []; },
  undo: () => { const p = past.pop(); if (p) { future.push(state); state = p; emit(); } },
  redo: () => { const f = future.pop(); if (f) { past.push(state); state = f; emit(); } },
  canUndo: () => past.length > 0,
  canRedo: () => future.length > 0,
  node: (id: string) => state.nodes.find((n) => n.id === id),
  edge: (id: string) => state.edges.find((e) => e.id === id),
  reset: () => board.update(() => SEED),
  /* ── multi-board ── */
  file: () => file,
  createBoard: (name: string) => {
    const id = "b" + Date.now().toString(36);
    file = { boards: { ...file.boards, [id]: { name, state: { seq: 1, ui: { ...DEFAULT_UI }, nodes: [], edges: [] } } }, order: [...file.order, id], active: id };
    past = []; future = [];
    state = file.boards[id].state;
    emit();
  },
  switchBoard: (id: string) => {
    if (!file.boards[id] || id === file.active) return;
    file = { ...file, active: id };
    past = []; future = [];
    state = file.boards[id].state;
    emit();
  },
  renameBoard: (id: string, name: string) => {
    if (!file.boards[id]) return;
    file = { ...file, boards: { ...file.boards, [id]: { ...file.boards[id], name } } };
    emit();
  },
  deleteBoard: (id: string) => {
    if (file.order.length <= 1) { board.reset(); return; }
    const order = file.order.filter((x) => x !== id);
    const boards = { ...file.boards };
    delete boards[id];
    const active = file.active === id ? order[0] : file.active;
    file = { boards, order, active };
    past = []; future = [];
    state = file.boards[active].state;
    emit();
  },
};
export const useBoard = () => useSyncExternalStore(board.subscribe, board.get);
export const useBoardsFile = () => useSyncExternalStore(board.subscribe, board.file);


/* ── the agent's board builder: parse a prompt into nodes + edges ───── */
const TEMPLATES: Record<string, string[]> = {
  sprint: ["Backlog -> Sprint -> In progress -> Review -> Done"],
  retro: ["Went well -> Actions", "To improve -> Actions", "Ideas -> Actions"],
  roadmap: ["Now -> Next -> Later -> Shipped"],
  funnel: ["Visitors -> Leads -> Demos -> Deals -> Won"],
  onboarding: ["Sign up -> Activate -> Invite team -> First value -> Upgrade"],
  launch: ["Idea -> Research -> Design -> Build -> QA -> Launch"],
};

/** Try to turn a chat prompt into a board. Returns a summary, or null if the
 *  prompt is not a canvas-building request. Chains: "A -> B -> C" (one per line). */
export function boardFromPrompt(q: string): string | null {
  const wantsCanvas = /canvas|board|whiteboard|pipeline|workflow|diagram|flow|roadmap|retro|sprint|funnel|mind ?map/i.test(q);
  const hasChain = /->|→/.test(q);
  if (!wantsCanvas && !hasChain) return null;

  let chains: string[] | null = null;
  if (hasChain) {
    chains = q.split(/\n+/).map((l) => l.trim()).filter((l) => /->|→/.test(l))
      // strip a command prefix ("build a canvas: Idea -> …" → "Idea -> …")
      .map((l) => { const c = l.indexOf(":"), a = l.search(/->|→/); return c > -1 && c < a ? l.slice(c + 1).trim() : l; });
  } else {
    const key = Object.keys(TEMPLATES).find((k) => new RegExp(k, "i").test(q));
    if (key) chains = TEMPLATES[key];
  }
  if (!chains || chains.length === 0) return null;

  const nodes: CvNode[] = [];
  const edges: CvEdge[] = [];
  const byLabel = new Map<string, CvNode>();
  let seq = 0;
  const depthOf = new Map<string, number>();
  for (const line of chains) {
    const parts = line.split(/->|→/).map((p) => p.trim().replace(/^[-*·]\s*/, "")).filter(Boolean);
    let prev: CvNode | null = null;
    parts.forEach((label, i) => {
      let node = byLabel.get(label.toLowerCase());
      if (!node) {
        seq += 1;
        node = { id: "n" + seq, kind: "card", x: 0, y: 0, label };
        byLabel.set(label.toLowerCase(), node);
        nodes.push(node);
      }
      const d = Math.max(depthOf.get(node.id) ?? 0, i);
      depthOf.set(node.id, d);
      if (prev) {
        seq += 1;
        edges.push({ id: "e" + seq, source: prev.id, target: node.id, sourceHandle: "r", targetHandle: "l" });
      }
      prev = node;
    });
  }
  const perDepth = new Map<number, number>();
  for (const n of nodes) {
    const d = depthOf.get(n.id) ?? 0;
    const row = perDepth.get(d) ?? 0;
    perDepth.set(d, row + 1);
    n.x = 60 + d * 252;
    n.y = 60 + row * 126;
  }
  board.update(() => ({ seq: seq + 1, ui: { ...DEFAULT_UI }, nodes, edges }));
  return `Built a board with ${nodes.length} cards and ${edges.length} links${chains.length > 1 ? ` across ${chains.length} branches` : ""}. It replaced the previous board (⌘Z on the canvas restores it). Click any card to open its inspector: notes support rich text.`;
}

/* ── derived: the boundary, and the legend ───────────────────────────── */

/** A group's box comes from its members, so it cannot disagree with them.
 *  Returns null for an empty group rather than a zero-size rectangle, which
 *  would draw as a dot nobody can explain. */
export function groupBox(nodes: CvNode[], groupId: string, pad = 26) {
  const mine = nodes.filter((n) => n.group === groupId);
  if (!mine.length) return null;
  const W = 190, H = 62; // a node's nominal box; the exact size is the renderer's
  const x1 = Math.min(...mine.map((n) => n.x)) - pad;
  const y1 = Math.min(...mine.map((n) => n.y)) - pad;
  const x2 = Math.max(...mine.map((n) => n.x + W)) + pad;
  const y2 = Math.max(...mine.map((n) => n.y + H)) + pad;
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1, count: mine.length };
}

/** The legend lists what is ON the board, in board order, never the whole
 *  vocabulary. A legend showing entries nothing uses teaches the reader that
 *  the legend is decoration. */
export function legendFor(nodes: CvNode[]): { sem: CvSem; n: number }[] {
  const seen = new Map<CvSem, number>();
  for (const n of nodes) if (n.sem) seen.set(n.sem, (seen.get(n.sem) ?? 0) + 1);
  return [...seen.entries()].map(([sem, n]) => ({ sem, n })).sort((a, b) => b.n - a.n);
}

/* ── declarative: a diagram you write rather than draw ───────────────── */

export interface CvDecl {
  groups?: { id: string; label: string; note?: string }[];
  /** "id: Label | sub" with an optional `sem` and `group` */
  nodes: { id: string; label: string; sub?: string; sem?: CvSem; group?: string; kind?: CvNode["kind"] }[];
  /** "a -> b" or "a -> b : label" */
  edges: string[];
}

/**
 * Build a board from a DECLARATION. Hand-placing nodes means the layout is the
 * source of truth and the meaning is a comment; declaring them means the
 * meaning is the source and the layout is derived, so a renamed service moves
 * its box for free.
 *
 * Layout: nodes are laid out by GROUP in columns, in declaration order. It is
 * deliberately simple and deliberately deterministic: the same declaration
 * always produces the same board, so a diagram can be diffed.
 */
export function fromDecl(d: CvDecl): BoardState {
  const COL = 260, ROW = 108, PAD_X = 60, PAD_Y = 80, GAP = 70;
  const groups = d.groups ?? [];
  const order = [...new Set([...groups.map((g) => g.id), ...d.nodes.map((n) => n.group ?? "")])];
  const nodes: CvNode[] = [];
  let x = PAD_X;
  for (const g of order) {
    const mine = d.nodes.filter((n) => (n.group ?? "") === g);
    if (!mine.length) continue;
    mine.forEach((n, i) => {
      nodes.push({
        id: n.id, kind: n.kind ?? "card", sem: n.sem, group: g || undefined,
        x, y: PAD_Y + i * ROW, label: n.label, sub: n.sub,
      });
    });
    x += COL + GAP;
  }
  const edges: CvEdge[] = d.edges.map((e, i) => {
    const [pair, label] = e.split(":").map((p) => p.trim());
    const [source, target] = pair.split("->").map((p) => p.trim());
    return { id: `e${i + 1}`, source, target, label: label || undefined, arrow: true, shape: "smoothstep" };
  });
  return { nodes, edges, groups, seq: nodes.length + 1, ui: DEFAULT_UI };
}
