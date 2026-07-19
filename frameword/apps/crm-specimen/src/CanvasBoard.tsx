/**
 * The Canvas board — a Figma/Miro-class whiteboard on React Flow, speaking the
 * WhitePaper design language and the panel grammar: clicking a node opens its
 * inspector as the NEXT PANEL; clicking a link opens the link inspector;
 * following a connection drills node to node. Board state lives in a tiny
 * shared store (undo/redo history, localStorage persistence) so the canvas
 * panel and every inspector panel stay in sync.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  MiniMap,
  Handle,
  Position,
  ConnectionMode,
  SelectionMode,
  MarkerType,
  ViewportPortal,
  applyNodeChanges,
  useReactFlow,
  ReactFlowProvider,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type FinalConnectionState,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkspace } from "@frameword/panels-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";

/* ── shared board store ──────────────────────────────────────────────── */
export interface CvSub { id: string; label: string; done?: boolean }
export interface CvNode { id: string; kind: "card" | "note" | "shape" | "label" | "step"; x: number; y: number; label: string; sub?: string; color?: string; notes?: string; pinned?: boolean; subs?: CvSub[] }
export interface CvEdge {
  id: string; source: string; target: string; label?: string;
  sourceHandle?: string; targetHandle?: string;
  dash?: boolean; animated?: boolean; arrow?: boolean;
  shape?: "smoothstep" | "default" | "straight" | "step";
}
interface BoardUi { snap: boolean; grid: number; locked: boolean; showNotes?: boolean }
interface BoardState { nodes: CvNode[]; edges: CvEdge[]; seq: number; ui: BoardUi }

const DEFAULT_UI: BoardUi = { snap: true, grid: 18, locked: false };

const SEED: BoardState = {
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

/* element colors — the accent ramp only; they follow the Settings accent */
const RAMP: Record<string, string> = {
  soft: "var(--accent-soft)",
  tint: "var(--accent-4)",
  paper: "var(--secondary)",
  plain: "var(--card)",
};

/* ── custom nodes (WhitePaper-styled, 4-way handles) ─────────────────── */
function Handles() {
  return (<>
    <Handle id="l" type="source" position={Position.Left} className="cv-handle" />
    <Handle id="r" type="source" position={Position.Right} className="cv-handle" />
    <Handle id="t" type="source" position={Position.Top} className="cv-handle" />
    <Handle id="b" type="source" position={Position.Bottom} className="cv-handle" />
  </>);
}
const stripNotes = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
function CardNode({ data, selected }: NodeProps) {
  const d = data as unknown as CvNode;
  const show = !!useBoard().ui.showNotes;
  return (
    <div className={"cv-card" + (selected ? " sel" : "")}
      style={d.color && d.color !== "plain" ? { borderTop: `3px solid color-mix(in oklab, var(--accent) ${d.color === "soft" ? 100 : d.color === "tint" ? 55 : 30}%, var(--border))` } : undefined}>
      <Handles />
      {d.pinned && (
        <span className="cv-pin" title="Position locked">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        </span>
      )}
      <div className="cv-eyebrow"><span className="sig">§</span> CARD</div>
      <div className="cv-title">{d.label}</div>
      {d.sub && <div className="cv-sub">{d.sub}</div>}
      {(d.subs?.length ?? 0) > 0 && (
        <div className="cv-subs">
          {d.subs!.map((f) => (
            <div key={f.id} className={"cv-subrow" + (f.done ? " done" : "")}>
              <span className="cv-subdot" />{f.label}
              <Handle id={"s:" + f.id} type="source" position={Position.Right} className="cv-handle cv-subhandle" />
            </div>
          ))}
        </div>
      )}
      {show && d.notes && stripNotes(d.notes) && (
        <div className="cv-notesprev">{stripNotes(d.notes).slice(0, 220)}</div>
      )}
    </div>
  );
}
function NoteNode({ data, selected }: NodeProps) {
  const d = data as unknown as CvNode;
  return (
    <div className={"cv-note" + (selected ? " sel" : "")} style={{ background: RAMP[d.color ?? "soft"] ?? RAMP.soft }}>
      <Handles />
      {d.label}
    </div>
  );
}
function ShapeNode({ data, selected }: NodeProps) {
  const d = data as unknown as CvNode;
  return (
    <div className={"cv-shape" + (selected ? " sel" : "")}>
      <Handles />
      {d.label}
    </div>
  );
}
function StepNode({ data, selected }: NodeProps) {
  const d = data as unknown as CvNode;
  const s = useBoard();
  const no = s.nodes.filter((n) => n.kind === "step").findIndex((n) => n.id === d.id) + 1;
  return (
    <div className={"cv-step" + (selected ? " sel" : "")}>
      <Handles />
      <span className="cv-stepno">{no}</span>
      <span className="cv-steplabel">{d.label}</span>
    </div>
  );
}
function LabelNode({ data, selected }: NodeProps) {
  const d = data as unknown as CvNode;
  return <div className={"cv-label" + (selected ? " sel" : "")}><Handles />{d.label}</div>;
}
const NODE_TYPES = { card: CardNode, note: NoteNode, shape: ShapeNode, label: LabelNode, step: StepNode };

/* ── alignment guides ────────────────────────────────────────────────── */
interface Guides { v: number[]; h: number[] }
const NODE_FALLBACK = { w: 190, h: 60 };
function computeGuides(dragged: RFNode, others: RFNode[]): Guides {
  const T = 5;
  const dw = dragged.measured?.width ?? NODE_FALLBACK.w;
  const dh = dragged.measured?.height ?? NODE_FALLBACK.h;
  const dxs = [dragged.position.x, dragged.position.x + dw / 2, dragged.position.x + dw];
  const dys = [dragged.position.y, dragged.position.y + dh / 2, dragged.position.y + dh];
  const v = new Set<number>(); const h = new Set<number>();
  for (const o of others) {
    if (o.id === dragged.id) continue;
    const ow = o.measured?.width ?? NODE_FALLBACK.w;
    const oh = o.measured?.height ?? NODE_FALLBACK.h;
    for (const ox of [o.position.x, o.position.x + ow / 2, o.position.x + ow])
      if (dxs.some((dx) => Math.abs(dx - ox) < T)) v.add(Math.round(ox));
    for (const oy of [o.position.y, o.position.y + oh / 2, o.position.y + oh])
      if (dys.some((dy) => Math.abs(dy - oy) < T)) h.add(Math.round(oy));
  }
  return { v: [...v].slice(0, 3), h: [...h].slice(0, 3) };
}

/* ── the board ───────────────────────────────────────────────────────── */
const GRID_STEPS = [12, 18, 24, 36];

function BoardInner({ panelId }: { panelId: string }) {
  const ws = useWorkspace();
  const s = useBoard();
  const rf = useReactFlow();
  const hostRef = useRef<HTMLDivElement>(null);
  const [guides, setGuides] = useState<Guides>({ v: [], h: [] });
  const [edgeSel, setEdgeSel] = useState<ReadonlySet<string>>(new Set());
  const [menu, setMenu] = useState<null | "add" | "grid" | "more" | "boards">(null);
  const [ren, setRen] = useState<{ id: string; v: string } | null>(null);
  const bf = useBoardsFile();

  /* React Flow owns node runtime state (measured sizes, selection, drag) —
     losing `measured` keeps nodes invisible and edges unrendered. The store
     is the source of truth for identity/position/data; RF state is merged. */
  const toRF = (n: CvNode): RFNode => ({ id: n.id, type: n.kind, position: { x: n.x, y: n.y }, data: { ...n } as unknown as Record<string, unknown> });
  const [rfNodes, setRfNodes] = useState<RFNode[]>(() => board.get().nodes.map(toRF));
  useEffect(() => {
    setRfNodes((cur) => s.nodes.map((n) => {
      const prev = cur.find((c) => c.id === n.id);
      const next = prev ? { ...prev, position: { x: n.x, y: n.y }, data: { ...n } as unknown as Record<string, unknown> } : toRF(n);
      return { ...next, draggable: !n.pinned };
    }));
  }, [s.nodes]);

  const rfEdges: RFEdge[] = s.edges.map((e) => ({
    id: e.id, source: e.source, target: e.target, label: e.label,
    sourceHandle: e.sourceHandle, targetHandle: e.targetHandle,
    selected: edgeSel.has(e.id), interactionWidth: 24,
    type: e.shape ?? "smoothstep", animated: !!e.animated,
    markerEnd: e.arrow === false ? undefined : { type: MarkerType.ArrowClosed, width: 14, height: 14, color: "color-mix(in oklab, var(--accent) 55%, var(--border))" },
    style: {
      stroke: "color-mix(in oklab, var(--accent) 55%, var(--border))", strokeWidth: 1.5,
      strokeDasharray: e.dash ? "5 4" : undefined,
    },
    labelStyle: { fontFamily: "var(--font-mono)", fontSize: "calc(var(--fz-mono, 10px) * 0.9)", letterSpacing: "0.06em", textTransform: "uppercase", fill: "var(--muted-foreground)" },
    labelBgStyle: { fill: "var(--background)", fillOpacity: 0.9 },
  }));

  /* magnetic alignment — a dragged node snaps to other nodes' edges/centers */
  const snapToGuides = (changes: NodeChange[]) => {
    const T = 6;
    if (board.get().ui.snap) return changes; // grid already aligns; the two snaps fight and the drag jitters
    for (const c of changes) {
      if (c.type !== "position" || !("position" in c) || !c.position || !(c as { dragging?: boolean }).dragging) continue;
      const all = rfNodesRef.current;
      const me = all.find((n) => n.id === (c as { id: string }).id);
      if (!me) continue;
      const w = me.measured?.width ?? NODE_FALLBACK.w;
      const h = me.measured?.height ?? NODE_FALLBACK.h;
      let { x, y } = c.position;
      let bestX: number | null = null, bestY: number | null = null, dxBest = T, dyBest = T;
      for (const o of all) {
        if (o.id === me.id) continue;
        const ow = o.measured?.width ?? NODE_FALLBACK.w;
        const oh = o.measured?.height ?? NODE_FALLBACK.h;
        for (const ox of [o.position.x, o.position.x + ow / 2, o.position.x + ow])
          for (const mine of [0, w / 2, w]) {
            const d = Math.abs(x + mine - ox);
            if (d < dxBest) { dxBest = d; bestX = ox - mine; }
          }
        for (const oy of [o.position.y, o.position.y + oh / 2, o.position.y + oh])
          for (const mine of [0, h / 2, h]) {
            const d = Math.abs(y + mine - oy);
            if (d < dyBest) { dyBest = d; bestY = oy - mine; }
          }
      }
      if (bestX !== null) x = bestX;
      if (bestY !== null) y = bestY;
      c.position = { x, y };
    }
    return changes;
  };

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    changes = snapToGuides(changes);
    setRfNodes((cur) => applyNodeChanges(changes, cur));
    const moved = changes.filter((c) => c.type === "position" && "position" in c && c.position) as Array<{ id: string; position: { x: number; y: number } }>;
    const removed = changes.filter((c) => c.type === "remove").map((c) => (c as { id: string }).id);
    if (!moved.length && !removed.length) return;
    if (removed.length) board.checkpoint();
    board.update((st) => ({
      ...st,
      nodes: st.nodes
        .filter((n) => !removed.includes(n.id))
        .map((n) => { const m = moved.find((r) => r.id === n.id); return m ? { ...n, x: m.position.x, y: m.position.y } : n; }),
      edges: st.edges.filter((e) => !removed.includes(e.source) && !removed.includes(e.target)),
    }), false);
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    const sels = changes.filter((c) => c.type === "select") as Array<{ id: string; selected: boolean }>;
    if (sels.length) {
      setEdgeSel((cur) => {
        const next = new Set(cur);
        sels.forEach((c) => { if (c.selected) next.add(c.id); else next.delete(c.id); });
        return next;
      });
    }
    const removed = changes.filter((c) => c.type === "remove").map((c) => (c as { id: string }).id);
    if (!removed.length) return;
    setEdgeSel((cur) => { const next = new Set(cur); removed.forEach((id) => next.delete(id)); return next; });
    board.update((st) => ({ ...st, edges: st.edges.filter((e) => !removed.includes(e.id)) }));
  }, []);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target) return;
    board.update((st) => ({
      ...st, seq: st.seq + 1,
      edges: [...st.edges, {
        id: "e" + st.seq, source: c.source!, target: c.target!,
        sourceHandle: c.sourceHandle ?? "r", targetHandle: c.targetHandle ?? "l",
      }],
    }));
  }, []);

  const onReconnect = useCallback((oldEdge: RFEdge, c: Connection) => {
    if (!c.source || !c.target) return;
    board.update((st) => ({
      ...st,
      edges: st.edges.map((e) => e.id === oldEdge.id
        ? { ...e, source: c.source!, target: c.target!, sourceHandle: c.sourceHandle ?? e.sourceHandle, targetHandle: c.targetHandle ?? e.targetHandle }
        : e),
    }));
  }, []);

  /* release a connection over empty canvas → spawn a connected card there */
  const onConnectEnd = useCallback((_evt: MouseEvent | TouchEvent, cs: FinalConnectionState) => {
    if (cs.isValid || !cs.fromNode || !cs.to) return;
    board.update((st) => {
      const nid = "n" + (st.seq + 1);
      return {
        ...st, seq: st.seq + 2,
        nodes: [...st.nodes, { id: nid, kind: "card", x: Math.round(cs.to!.x - 20), y: Math.round(cs.to!.y - 20), label: "New card", sub: "Click to inspect" } as CvNode],
        edges: [...st.edges, { id: "e" + (st.seq + 1), source: cs.fromNode!.id, target: nid, sourceHandle: cs.fromHandle?.id ?? "r", targetHandle: "l" }],
      };
    });
  }, []);

  const inspect = useCallback((nodeId: string) => {
    ws.openDetail(panelId, { panelType: "canvasnode", resourceKey: "cvn:" + nodeId });
  }, [ws, panelId]);
  const inspectEdge = useCallback((edgeId: string) => {
    ws.openDetail(panelId, { panelType: "canvasedge", resourceKey: "cve:" + edgeId });
  }, [ws, panelId]);

  const addAt = (kind: CvNode["kind"], x: number, y: number) => {
    board.update((st) => {
      const id = "n" + (st.seq + 1);
      const base = { card: { label: "New card", sub: "Click to inspect" }, note: { label: "New note", color: "soft" }, shape: { label: "Shape" }, label: { label: "SECTION" }, step: { label: "Step" } }[kind];
      return { ...st, seq: st.seq + 1, nodes: [...st.nodes, { id, kind, x, y, ...base } as CvNode] };
    });
  };
  const add = (kind: CvNode["kind"]) => {
    const el = hostRef.current;
    const r = el?.getBoundingClientRect();
    const c = r && r.width > 0
      ? rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
      : { x: 160, y: 140 };
    const off = (board.get().seq % 5) * 24;
    addAt(kind, Math.round(c.x - 90 + off), Math.round(c.y - 30 + off));
  };

  const autoLayout = () => {
    board.update((st) => {
      const depth = new Map<string, number>();
      const indeg = new Map<string, number>();
      st.nodes.forEach((n) => { depth.set(n.id, 0); indeg.set(n.id, 0); });
      st.edges.forEach((e) => indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1));
      // longest-path layering (bounded relaxation — the graph may have cycles)
      for (let i = 0; i < st.nodes.length; i++) {
        let changed = false;
        for (const e of st.edges) {
          const d = (depth.get(e.source) ?? 0) + 1;
          if (d > (depth.get(e.target) ?? 0) && d <= st.nodes.length) { depth.set(e.target, d); changed = true; }
        }
        if (!changed) break;
      }
      const perCol = new Map<number, number>();
      const nodes = st.nodes.map((n) => {
        if (n.kind === "label") return n; // section labels stay where the user put them
        const d = depth.get(n.id) ?? 0;
        const row = perCol.get(d) ?? 0;
        perCol.set(d, row + 1);
        return { ...n, x: 60 + d * 260, y: 60 + row * 128 };
      });
      return { ...st, nodes };
    });
    window.setTimeout(() => rf.fitView({ padding: 0.2, duration: 300, maxZoom: 1 }), 60);
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify(board.get(), null, 2)], { type: "application/json" }));
    a.download = "frameword-board.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importRef = useRef<HTMLInputElement>(null);
  const importJson = (file: File) => {
    file.text().then((t) => {
      try {
        const raw = JSON.parse(t);
        if (!Array.isArray(raw?.nodes)) return;
        board.update(() => ({ ...SEED, ...raw, ui: { ...DEFAULT_UI, ...(raw.ui ?? {}) } }));
      } catch { /* ignore invalid files */ }
    });
  };

  const ui = s.ui;
  const setUi = (patch: Partial<BoardUi>) => board.update((st) => ({ ...st, ui: { ...st.ui, ...patch } }), false);

  /* board shortcuts — window-level while a board is mounted (the RF pane is
     not reliably focusable, so a host onKeyDown would miss most keystrokes) */
  const rfNodesRef = useRef(rfNodes);
  rfNodesRef.current = rfNodes;
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) board.redo(); else board.undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const selIds = rfNodesRef.current.filter((n) => n.selected).map((n) => n.id);
        if (selIds.length) {
          board.update((st) => {
            const idMap = new Map<string, string>();
            let seq = st.seq;
            const clones = st.nodes.filter((n) => selIds.includes(n.id)).map((n) => {
              seq += 1; const nid = "n" + seq; idMap.set(n.id, nid);
              return { ...n, id: nid, x: n.x + 24, y: n.y + 24 };
            });
            const innerEdges = st.edges
              .filter((ed) => idMap.has(ed.source) && idMap.has(ed.target))
              .map((ed) => { seq += 1; return { ...ed, id: "e" + seq, source: idMap.get(ed.source)!, target: idMap.get(ed.target)! }; });
            return { ...st, seq, nodes: [...st.nodes, ...clones], edges: [...st.edges, ...innerEdges] };
          });
        }
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setRfNodes((cur) => cur.map((n) => ({ ...n, selected: true })));
      }
      if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        const selIds = rfNodesRef.current.filter((n) => n.selected).map((n) => n.id);
        if (selIds.length) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
          const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
          board.update((st) => ({ ...st, nodes: st.nodes.map((n) => selIds.includes(n.id) ? { ...n, x: n.x + dx, y: n.y + dy } : n) }), false);
        }
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  return (
    <div className="cv-host" ref={hostRef}>
      <ReactFlow
        nodes={rfNodes} edges={rfEdges} nodeTypes={NODE_TYPES}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
        onNodeClick={(_, n) => inspect(n.id)}
        onNodeDoubleClick={(_, n) => inspect(n.id)}
        onEdgeClick={(_, e) => inspectEdge(e.id)}
        onNodeDragStart={() => board.checkpoint()}
        onNodeDrag={(_, n) => setGuides(computeGuides(n, rfNodes))}
        onNodeDragStop={() => setGuides({ v: [], h: [] })}
        connectionMode={ConnectionMode.Loose}
        selectionOnDrag panOnDrag={[1, 2]} selectionMode={SelectionMode.Partial}
        onReconnect={onReconnect} onConnectEnd={onConnectEnd}
        snapToGrid={ui.snap} snapGrid={[ui.grid, ui.grid]}
        nodesDraggable={!ui.locked} nodesConnectable={!ui.locked}
        deleteKeyCode={ui.locked ? [] : ["Backspace", "Delete"]}
        zoomOnDoubleClick={false}
        onPaneClick={(e) => {
          if (e.detail === 2 && !ui.locked) {
            const p = rf.screenToFlowPosition({ x: e.clientX, y: e.clientY });
            addAt("card", Math.round(p.x - 90), Math.round(p.y - 30));
          }
        }}
        fitView fitViewOptions={{ padding: 0.2, maxZoom: 1 }} proOptions={{ hideAttribution: true }}
        minZoom={0.3} maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={ui.grid} size={1.2} color="color-mix(in oklab, var(--foreground) 14%, transparent)" />
        <MiniMap className="cv-minimap" pannable zoomable
          nodeColor={() => "color-mix(in oklab, var(--accent) 30%, var(--secondary))"} maskColor="color-mix(in oklab, var(--background) 72%, transparent)" />
        <ViewportPortal>
          {guides.v.map((x) => <div key={"v" + x} className="cv-guide v" style={{ transform: `translate(${x}px, -5000px)` }} />)}
          {guides.h.map((y) => <div key={"h" + y} className="cv-guide h" style={{ transform: `translate(-5000px, ${y}px)` }} />)}
        </ViewportPortal>
      </ReactFlow>

      <div className="cv-boardbar">
        <button className="cv-boardbtn" onClick={() => { setMenu((m) => (m === "boards" ? null : "boards")); setRen(null); }}>
          <span className="sig">§</span> {bf.boards[bf.active]?.name ?? "Board"} <span className="caret">⌄</span>
        </button>
        {menu === "boards" && (
          <div className="cv-fly boards">
            {bf.order.map((id) => (
              <div key={id} className={"fly-row" + (id === bf.active ? " on" : "")}>
                {ren?.id === id ? (
                  <input className="inline-edit" autoFocus value={ren.v}
                    onChange={(e) => setRen({ id, v: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { board.renameBoard(id, ren.v.trim() || "Untitled"); setRen(null); }
                      if (e.key === "Escape") setRen(null);
                    }}
                    onBlur={() => { board.renameBoard(id, ren.v.trim() || "Untitled"); setRen(null); }} />
                ) : (
                  <>
                    <button className="fly-main" onClick={() => { board.switchBoard(id); setMenu(null); }}>{bf.boards[id].name}</button>
                    <button className="fly-ico" title="Rename" onClick={() => setRen({ id, v: bf.boards[id].name })}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
                    </button>
                    {bf.order.length > 1 && (
                      <button className="fly-ico" title="Delete board" onClick={() => board.deleteBoard(id)}>✕</button>
                    )}
                  </>
                )}
              </div>
            ))}
            <button className="fly-new" onClick={() => { board.createBoard("Board " + (bf.order.length + 1)); setMenu(null); }}>+ New board</button>
          </div>
        )}
      </div>

      <div className="cv-toolbar" role="toolbar" aria-label="Canvas tools">
        <button title="Add element" className={menu === "add" ? "on" : ""} onClick={() => setMenu((m) => (m === "add" ? null : "add"))}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <button title="Grid, snap & lock" className={menu === "grid" || ui.locked ? "on" : ""} onClick={() => setMenu((m) => (m === "grid" ? null : "grid"))}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
        </button>
        <span className="cv-sep" />
        <button title="Fit view" onClick={() => rf.fitView({ padding: 0.2, duration: 300, maxZoom: 1 })}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" /></svg>
        </button>
        <button title="Auto layout — tidy the graph" onClick={autoLayout}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="6" height="6" rx="1.5" /><rect x="15" y="4" width="6" height="6" rx="1.5" /><rect x="9" y="14" width="6" height="6" rx="1.5" /><path d="M6 10v2a2 2 0 0 0 2 2h1M18 10v2a2 2 0 0 1-2 2h-1" /></svg>
        </button>
        <button title="Undo — ⌘Z" disabled={!board.canUndo()} onClick={() => board.undo()}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>
        </button>
        <button title="Redo — ⇧⌘Z" disabled={!board.canRedo()} onClick={() => board.redo()}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></svg>
        </button>
        <span className="cv-sep" />
        <button title="More — zoom, export, reset" className={menu === "more" ? "on" : ""} onClick={() => setMenu((m) => (m === "more" ? null : "more"))}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
        </button>

        {menu === "add" && (
          <div className="cv-fly">
            {([["card", "Card"], ["note", "Sticky note"], ["shape", "Shape"], ["step", "Step — numbered"], ["label", "Section label"]] as const).map(([k, lab]) => (
              <button key={k} className="fly-main" onClick={() => { add(k as CvNode["kind"]); setMenu(null); }}>{lab}</button>
            ))}
          </div>
        )}
        {menu === "grid" && (
          <div className="cv-fly">
            <button className="fly-main" onClick={() => setUi({ snap: !ui.snap })}>{ui.snap ? "✓ " : ""}Snap to grid</button>
            <div className="fly-seg">
              {GRID_STEPS.map((g) => (
                <button key={g} className={ui.grid === g ? "on" : ""} onClick={() => setUi({ grid: g })}>{g}</button>
              ))}
            </div>
            <button className="fly-main" onClick={() => setUi({ showNotes: !ui.showNotes })}>{ui.showNotes ? "✓ " : ""}Notes on cards</button>
            <button className="fly-main" onClick={() => { setUi({ locked: !ui.locked }); setMenu(null); }}>{ui.locked ? "✓ " : ""}Lock board</button>
          </div>
        )}
        {menu === "more" && (
          <div className="cv-fly">
            <button className="fly-main" onClick={() => rf.zoomIn({ duration: 150 })}>Zoom in</button>
            <button className="fly-main" onClick={() => rf.zoomOut({ duration: 150 })}>Zoom out</button>
            <button className="fly-main" onClick={() => { download(); setMenu(null); }}>Export JSON</button>
            <button className="fly-main" onClick={() => { importRef.current?.click(); setMenu(null); }}>Import JSON</button>
            <button className="fly-main danger" onClick={() => { board.reset(); setMenu(null); }}>Reset board</button>
          </div>
        )}
        <input ref={importRef} type="file" accept="application/json" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }} />
      </div>

      {(() => {
        const nodeSelIds = rfNodes.filter((n) => n.selected).map((n) => n.id);
        const total = nodeSelIds.length + edgeSel.size;
        if (total === 0) return null;
        const deleteSel = () => {
          board.update((st) => ({
            ...st,
            nodes: st.nodes.filter((n) => !nodeSelIds.includes(n.id)),
            edges: st.edges.filter((e) => !edgeSel.has(e.id) && !nodeSelIds.includes(e.source) && !nodeSelIds.includes(e.target)),
          }));
          setEdgeSel(new Set());
        };
        return (
          <div className="cv-selbar" role="toolbar" aria-label="Selection actions">
            <span className="cv-selcount">
              {nodeSelIds.length > 0 && `${nodeSelIds.length} element${nodeSelIds.length > 1 ? "s" : ""}`}
              {nodeSelIds.length > 0 && edgeSel.size > 0 && " · "}
              {edgeSel.size > 0 && `${edgeSel.size} link${edgeSel.size > 1 ? "s" : ""}`}
            </span>
            {edgeSel.size === 1 && (
              <button onClick={() => inspectEdge([...edgeSel][0])}>Edit link</button>
            )}
            {nodeSelIds.length === 1 && (
              <button onClick={() => inspect(nodeSelIds[0])}>Inspect</button>
            )}
            <button className="danger" onClick={deleteSel}>Delete ⌫</button>
          </div>
        );
      })()}
    </div>
  );
}

export function CanvasBoard({ panelId }: { panelId: string }) {
  return (
    <ReactFlowProvider>
      <BoardInner panelId={panelId} />
    </ReactFlowProvider>
  );
}

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

/* ── RichNotes — THE notes editor, shared by every notes surface ─────── */
export function RichNotes({ html, onChange, placeholder }: { html: string; onChange: (html: string) => void; placeholder?: string }) {
  const [ttMenu, setTtMenu] = useState<null | "block" | "more" | "list">(null);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "Write the full story of this element — headings, lists, quotes…" }),
      Link.configure({ openOnClick: false, autolink: true }),
      Underline,
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: html || "",
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
  });
  if (!editor) return null;
  const B = ({ on, label, run, title }: { on?: boolean; label: string; run: () => void; title: string }) => (
    <button className={on ? "on" : ""} title={title} onMouseDown={(e) => { e.preventDefault(); run(); }}>{label}</button>
  );
  const Sep = () => <span className="tt-sep" />;
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", prev ?? "https://");
    if (url === null) return;
    if (url === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: url }).run();
  };
  const blockLabel = editor.isActive("heading", { level: 1 }) ? "Title"
    : editor.isActive("heading", { level: 2 }) ? "Heading"
    : editor.isActive("heading", { level: 3 }) ? "Small"
    : editor.isActive("codeBlock") ? "Code"
    : editor.isActive("blockquote") ? "Quote"
    : "Text";
  const listLabel = editor.isActive("taskList") ? "☑" : editor.isActive("orderedList") ? "1." : "••";
  const listOn = editor.isActive("bulletList") || editor.isActive("orderedList") || editor.isActive("taskList");
  const MI = ({ on, label, run }: { on?: boolean; label: string; run: () => void }) => (
    <button className={"tt-mi" + (on ? " on" : "")}
      onMouseDown={(e) => { e.preventDefault(); run(); setTtMenu(null); }}>
      {label}{on ? <span className="ck">✓</span> : null}
    </button>
  );
  return (
    <div className="tt-wrap cv-notes">
      <div className="tt-toolbar">
        <span className="tt-dd">
          <button className={"tt-trigger" + (blockLabel !== "Text" ? " on" : "")} title="Paragraph style"
            onMouseDown={(e) => { e.preventDefault(); setTtMenu((m) => (m === "block" ? null : "block")); }}>
            {blockLabel} <span className="caret">⌄</span>
          </button>
          {ttMenu === "block" && (
            <div className="tt-menu">
              <MI on={blockLabel === "Text"} label="Text" run={() => editor.chain().focus().setParagraph().run()} />
              <MI on={blockLabel === "Title"} label="Title" run={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
              <MI on={blockLabel === "Heading"} label="Heading" run={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
              <MI on={blockLabel === "Small"} label="Small heading" run={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} />
              <MI on={blockLabel === "Quote"} label="Quote" run={() => editor.chain().focus().toggleBlockquote().run()} />
              <MI on={blockLabel === "Code"} label="Code block" run={() => editor.chain().focus().toggleCodeBlock().run()} />
            </div>
          )}
        </span>
        <Sep />
        <B on={editor.isActive("bold")} label="B" title="Bold — ⌘B" run={() => editor.chain().focus().toggleBold().run()} />
        <B on={editor.isActive("italic")} label="I" title="Italic — ⌘I" run={() => editor.chain().focus().toggleItalic().run()} />
        <B on={editor.isActive("underline")} label="U" title="Underline — ⌘U" run={() => editor.chain().focus().toggleUnderline().run()} />
        <span className="tt-dd">
          <button className={"tt-trigger" + (editor.isActive("strike") || editor.isActive("highlight") || editor.isActive("link") ? " on" : "")}
            title="More formatting"
            onMouseDown={(e) => { e.preventDefault(); setTtMenu((m) => (m === "more" ? null : "more")); }}>
            ⋯
          </button>
          {ttMenu === "more" && (
            <div className="tt-menu">
              <MI on={editor.isActive("strike")} label="Strikethrough" run={() => editor.chain().focus().toggleStrike().run()} />
              <MI on={editor.isActive("highlight")} label="Highlight" run={() => editor.chain().focus().toggleHighlight().run()} />
              <MI on={editor.isActive("link")} label="Link…" run={setLink} />
              <MI label="Divider" run={() => editor.chain().focus().setHorizontalRule().run()} />
            </div>
          )}
        </span>
        <Sep />
        <span className="tt-dd">
          <button className={"tt-trigger" + (listOn ? " on" : "")} title="Lists"
            onMouseDown={(e) => { e.preventDefault(); setTtMenu((m) => (m === "list" ? null : "list")); }}>
            {listLabel} <span className="caret">⌄</span>
          </button>
          {ttMenu === "list" && (
            <div className="tt-menu">
              <MI on={editor.isActive("bulletList")} label="•  Bullets" run={() => editor.chain().focus().toggleBulletList().run()} />
              <MI on={editor.isActive("orderedList")} label="1. Numbered" run={() => editor.chain().focus().toggleOrderedList().run()} />
              <MI on={editor.isActive("taskList")} label="☑ Checklist" run={() => editor.chain().focus().toggleTaskList().run()} />
            </div>
          )}
        </span>
        <span style={{ flex: 1 }} />
        <B label="↶" title="Undo" run={() => editor.chain().focus().undo().run()} />
        <B label="↷" title="Redo" run={() => editor.chain().focus().redo().run()} />
      </div>
      <EditorContent editor={editor} className="tiptap" />
    </div>
  );
}

/* ── node inspector — the panel opened by clicking a node ────────────── */
export function NodeInspector({ nodeKey, panelId }: { nodeKey: string; panelId: string }) {
  const ws = useWorkspace();
  const s = useBoard();
  const id = nodeKey.slice(4);
  const n = s.nodes.find((x) => x.id === id);
  if (!n) return <div className="leaf-note">This node was deleted from the board.</div>;
  const conns = s.edges.filter((e) => e.source === id || e.target === id);
  const upd = (patch: Partial<CvNode>) =>
    board.update((st) => ({ ...st, nodes: st.nodes.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  return (
    <>
      <div className="card">
        <div className="lab">Element</div>
        <div className="pop-sub" style={{ marginTop: 8 }}>Label</div>
        <input className="d-input" autoFocus style={{ width: "100%", marginBottom: 8 }} value={n.label}
          onChange={(e) => upd({ label: e.target.value })} />
        {n.kind === "card" && (<>
          <div className="pop-sub">Subtitle</div>
          <input className="d-input" style={{ width: "100%", marginBottom: 8 }} value={n.sub ?? ""}
            onChange={(e) => upd({ sub: e.target.value })} />
        </>)}
        {(n.kind === "note" || n.kind === "card") && (<>
          <div className="pop-sub">Color — accent ramp</div>
          <div className="swatch-row" style={{ marginTop: 4, marginBottom: 4 }}>
            {Object.entries(RAMP).map(([k, c]) => (
              <button key={k} className={"swatch" + ((n.color ?? "soft") === k ? " on" : "")}
                style={{ background: c }} title={k} onClick={() => upd({ color: k })} />
            ))}
          </div>
        </>)}
      </div>
      <div className="card">
        <div className="lab">Notes — write like a blog</div>
        <RichNotes key={id} html={n.notes ?? ""}
          onChange={(h) => board.update((st) => ({ ...st, nodes: st.nodes.map((x) => (x.id === id ? { ...x, notes: h } : x)) }), false)} />
      </div>
      <div className="card">
        <div className="lab">Sub-cards · {n.subs?.length ?? 0}</div>
        {(n.subs?.length ?? 0) === 0 && <p style={{ marginTop: 6 }}>Break this card into features — each sub-card can later be extracted as its own connected card.</p>}
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {(n.subs ?? []).map((f) => (
            <div key={f.id} className="cv-subedit">
              <button className={"cv-subcheck" + (f.done ? " on" : "")} title={f.done ? "Mark as open" : "Mark as done"}
                onClick={() => upd({ subs: (n.subs ?? []).map((x) => (x.id === f.id ? { ...x, done: !x.done } : x)) })}>
                {f.done ? "✓" : ""}
              </button>
              <input className="d-input" style={{ flex: 1, minWidth: 0 }} value={f.label}
                onChange={(e) => upd({ subs: (n.subs ?? []).map((x) => (x.id === f.id ? { ...x, label: e.target.value } : x)) })} />
              <button className="cv-conn-edit" title="Extract as a connected card"
                onClick={() => {
                  board.update((st) => {
                    const me = st.nodes.find((x) => x.id === id);
                    if (!me) return st;
                    const nid = "n" + (st.seq + 1);
                    return {
                      ...st, seq: st.seq + 2,
                      nodes: [
                        ...st.nodes.map((x) => (x.id === id ? { ...x, subs: (x.subs ?? []).filter((y) => y.id !== f.id) } : x)),
                        { id: nid, kind: "card", x: me.x + 40, y: me.y + 140 + (me.subs?.length ?? 0) * 24, label: f.label, sub: "from " + me.label } as CvNode,
                      ],
                      edges: [...st.edges, { id: "e" + (st.seq + 1), source: id, target: nid, sourceHandle: "b", targetHandle: "t" }],
                    };
                  });
                }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg>
              </button>
              <button className="cv-conn-edit" title="Remove"
                onClick={() => board.update((st) => ({
                  ...st,
                  nodes: st.nodes.map((x) => (x.id === id ? { ...x, subs: (x.subs ?? []).filter((y) => y.id !== f.id) } : x)),
                  edges: st.edges.filter((e) => e.sourceHandle !== "s:" + f.id && e.targetHandle !== "s:" + f.id),
                }))}>✕</button>
            </div>
          ))}
        </div>
        <form style={{ display: "flex", gap: 6, marginTop: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            const inp = (e.target as HTMLFormElement).elements.namedItem("nsub") as HTMLInputElement;
            const v = inp.value.trim();
            if (!v) return;
            upd({ subs: [...(n.subs ?? []), { id: "s" + Date.now().toString(36), label: v }] });
            inp.value = "";
          }}>
          <input name="nsub" className="d-input" style={{ flex: 1 }} placeholder="Add a sub-card…" />
          <button className="d-btn outline sm" type="submit">Add</button>
        </form>
      </div>
      <div className="card">
        <div className="lab">Connections · {conns.length}</div>
        {conns.length === 0 && <p style={{ marginTop: 6 }}>No connections yet — drag from any of the 4 handles on the board.</p>}
        <div className="drills" style={{ marginTop: 8 }}>
          {conns.map((e) => {
            const otherId = e.source === id ? e.target : e.source;
            const other = s.nodes.find((x) => x.id === otherId);
            if (!other) return null;
            return (
              <div key={e.id} className="cv-conn-row">
                <button className="drill" onClick={() => ws.openDetail(panelId, { panelType: "canvasnode", resourceKey: "cvn:" + otherId })}>
                  <span className="no">{e.source === id ? "→" : "←"}</span>
                  <span className="bd">
                    <span className="tt" style={{ display: "block" }}>{other.label}</span>
                    <span className="ss" style={{ display: "block" }}>{e.label ? `“${e.label}” · ` : ""}{other.kind}</span>
                  </span>
                  <span className="arr">→</span>
                </button>
                <button className="cv-conn-edit" title="Edit this link"
                  onClick={() => ws.openDetail(panelId, { panelType: "canvasedge", resourceKey: "cve:" + e.id })}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <div className="lab">Arrange</div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <button className="d-btn outline sm"
            onClick={() => board.update((st) => { const rest = st.nodes.filter((x) => x.id !== id); return { ...st, nodes: [...rest, n] }; })}>
            To front
          </button>
          <button className="d-btn outline sm"
            onClick={() => board.update((st) => { const rest = st.nodes.filter((x) => x.id !== id); return { ...st, nodes: [n, ...rest] }; })}>
            To back
          </button>
          <button className={"d-btn sm " + (n.pinned ? "" : "outline")} aria-pressed={!!n.pinned}
            onClick={() => upd({ pinned: !n.pinned })}>
            {n.pinned ? "Position locked" : "Lock position"}
          </button>
        </div>
      </div>
    </>
  );
}

/* ── edge inspector — the panel opened by clicking a link ────────────── */
export function EdgeInspector({ edgeKey, panelId }: { edgeKey: string; panelId: string }) {
  const ws = useWorkspace();
  const s = useBoard();
  const id = edgeKey.slice(4);
  const e = s.edges.find((x) => x.id === id);
  if (!e) return <div className="leaf-note">This link was deleted from the board.</div>;
  const src = s.nodes.find((x) => x.id === e.source);
  const dst = s.nodes.find((x) => x.id === e.target);
  const upd = (patch: Partial<CvEdge>) =>
    board.update((st) => ({ ...st, edges: st.edges.map((x) => (x.id === id ? { ...x, ...patch } : x)) }));
  const Tgl = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
    <button className={"d-btn sm " + (on ? "" : "outline")} onClick={onClick} aria-pressed={on}>{label}</button>
  );
  return (
    <>
      <div className="card">
        <div className="lab">Link</div>
        <div className="pop-sub" style={{ marginTop: 8 }}>Label</div>
        <input className="d-input" autoFocus style={{ width: "100%", marginBottom: 8 }} value={e.label ?? ""}
          placeholder="Name this connection…" onChange={(ev) => upd({ label: ev.target.value })} />
        <div className="pop-sub">Style</div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          <Tgl on={!e.dash} label="Solid" onClick={() => upd({ dash: false })} />
          <Tgl on={!!e.dash} label="Dashed" onClick={() => upd({ dash: true })} />
          <Tgl on={e.arrow !== false} label="Arrow" onClick={() => upd({ arrow: e.arrow === false })} />
          <Tgl on={!!e.animated} label="Flow" onClick={() => upd({ animated: !e.animated })} />
        </div>
        <div className="pop-sub" style={{ marginTop: 10 }}>Path</div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          <Tgl on={(e.shape ?? "smoothstep") === "smoothstep"} label="Smooth" onClick={() => upd({ shape: "smoothstep" })} />
          <Tgl on={e.shape === "default"} label="Curve" onClick={() => upd({ shape: "default" })} />
          <Tgl on={e.shape === "straight"} label="Straight" onClick={() => upd({ shape: "straight" })} />
          <Tgl on={e.shape === "step"} label="Step" onClick={() => upd({ shape: "step" })} />
        </div>
      </div>
      <div className="card">
        <div className="lab">Endpoints</div>
        <div className="drills" style={{ marginTop: 8 }}>
          {[{ n: src, tag: "from" }, { n: dst, tag: "to" }].map(({ n, tag }) => n && (
            <button key={tag} className="drill" onClick={() => ws.openDetail(panelId, { panelType: "canvasnode", resourceKey: "cvn:" + n.id })}>
              <span className="no">{tag === "from" ? "●" : "◦"}</span>
              <span className="bd">
                <span className="tt" style={{ display: "block" }}>{n.label}</span>
                <span className="ss" style={{ display: "block" }}>{tag} · {n.kind}</span>
              </span>
              <span className="arr">→</span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
