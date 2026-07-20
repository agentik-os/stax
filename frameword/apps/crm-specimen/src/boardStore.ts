/**
 * boardStore — the canvas board's shared store + the agent's board builder.
 * Deliberately free of React Flow and Tiptap so the shell can import it
 * statically while CanvasBoard.tsx (the heavy renderer) loads lazily.
 */
import { useSyncExternalStore } from "react";

/* ── shared board store ──────────────────────────────────────────────── */
export interface CvSub { id: string; label: string; done?: boolean }
export interface CvNode { id: string; kind: "card" | "note" | "shape" | "label" | "step"; x: number; y: number; label: string; sub?: string; color?: string; notes?: string; pinned?: boolean; subs?: CvSub[] }
export interface CvEdge {
  id: string; source: string; target: string; label?: string;
  sourceHandle?: string; targetHandle?: string;
  dash?: boolean; animated?: boolean; arrow?: boolean;
  shape?: "smoothstep" | "default" | "straight" | "step";
  mx?: number; my?: number;
}
export interface BoardUi { snap: boolean; grid: number; locked: boolean; showNotes?: boolean }
export interface BoardState { nodes: CvNode[]; edges: CvEdge[]; seq: number; ui: BoardUi }

export const DEFAULT_UI: BoardUi = { snap: true, grid: 18, locked: false };

export const SEED: BoardState = {
  seq: 9,
  ui: DEFAULT_UI,
  nodes: [
    { id: "n1", kind: "card", x: 40, y: 60, label: "Concept", sub: "One mechanic — open right", notes: "The founding idea: panels inside panels." },
    { id: "n2", kind: "card", x: 300, y: 40, label: "Research", sub: "LifeOS → laws → brief" },
    { id: "n3", kind: "card", x: 300, y: 170, label: "Design", sub: "WhitePaper tokens" },
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


/* ── the agent's board builder — parse a prompt into nodes + edges ───── */
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
  return `Built a board with ${nodes.length} cards and ${edges.length} links${chains.length > 1 ? ` across ${chains.length} branches` : ""}. It replaced the previous board (⌘Z on the canvas restores it). Click any card to open its inspector — notes support rich text.`;
}

