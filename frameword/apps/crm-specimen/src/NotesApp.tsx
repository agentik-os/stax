/**
 * NotesApp: a Notes + personal Task manager module speaking the panel
 * grammar: the root panel lists notes and tasks; clicking an item opens its
 * editor as the NEXT PANEL. One tiny shared store (localStorage-persisted)
 * keeps the root list and every open editor in sync: each keystroke writes
 * the store, the list re-renders live.
 */
import { useState, useSyncExternalStore } from "react";
import { useWorkspace } from "@frameword/panels-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { RichNotes } from "./RichNotesLazy";

/* ── shared store ────────────────────────────────────────────────────── */
export type Prio = "low" | "med" | "high";
export interface Note { id: string; title: string; body: string; ts: number; pinned?: boolean; folder?: string }
export interface Folder { id: string; name: string }
export interface TaskSub { id: string; label: string; done?: boolean }
export interface Task { id: string; label: string; done: boolean; prio: Prio; cat?: string; subs?: TaskSub[]; due?: string; dueTime?: string; notes?: string; ts: number; assignee?: string; project?: string }
export interface Category { id: string; name: string }
export type TaskGroup = "cat" | "assignee" | "prio" | "project";
export interface TaskFilter { people: string[]; prios: Prio[]; projects: string[] }
/* the TEAM: the first member is the CONNECTED profile (the specimen's seed
   identity); a real app feeds this from its auth/members store */
export const TEAM = ["Gareth Agentik", "Jo Lambert", "Max Verne", "Sam Chen"];
export const TASK_PROJECTS = ["Website", "Ops", "Q3 launch"];
interface NotesState { notes: Note[]; tasks: Task[]; cats: Category[]; folders?: Folder[]; view?: "list" | "kanban"; taskGroup?: TaskGroup; taskF?: TaskFilter }

const KEY = "frameword-notesapp";
const now = Date.now();
const H = 3600_000;

const SEED: NotesState = {
  notes: [
    {
      id: "n-launch", title: "Launch checklist", pinned: true, ts: now - 2 * H,
      body: "<h2>Before the flip</h2><ul><li><p>Freeze the panel grammar: open right, nothing else</p></li><li><p>Sweep every route for console noise</p></li><li><p>Write the announcement note</p></li></ul><p>Ship it loud.</p>",
    },
    {
      id: "n-meet", title: "Meeting: panel grammar review", ts: now - 30 * H,
      body: "<p>Agreed: drilling stays the only navigation. No modals, no tabs.</p><blockquote><p>Every click answers the same question: what opens next?</p></blockquote><p>Follow-up: the canvas inspector should reuse the drill rows.</p>",
    },
  ],
  cats: [
    { id: "todo", name: "To do" },
    { id: "doing", name: "Doing" },
    { id: "review", name: "Review" },
    { id: "done", name: "Done" },
  ],
  tasks: [
    { id: "t-ship", label: "Ship the notes module", assignee: "Gareth Agentik", project: "Website", done: false, prio: "high", cat: "doing", due: "2026-07-22", dueTime: "18:00", subs: [{ id: "s1", label: "Wire the store", done: true }, { id: "s2", label: "Kanban view" }], ts: now - 3 * H },
    { id: "t-drill", label: "Review drill-row spacing on mobile", assignee: "Jo Lambert", project: "Website", done: false, prio: "med", cat: "todo", ts: now - 5 * H },
    { id: "t-retro", label: "Book the launch retro", assignee: "Max Verne", project: "Q3 launch", done: false, prio: "med", cat: "review", due: "2026-07-28", ts: now - 8 * H },
    { id: "t-arch", label: "Archive the old prototype boards", assignee: "Sam Chen", project: "Ops", done: true, prio: "low", cat: "done", ts: now - 40 * H },
  ],
};

function load(): NotesState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(raw?.notes) && Array.isArray(raw?.tasks)) {
      let cats: Category[] = Array.isArray(raw.cats) && raw.cats.length ? raw.cats : SEED.cats;
      let remap: Record<string, string> | null = null;
      if (cats.every((c: Category) => c.id === "inbox" || c.id === "launch")) {
        cats = SEED.cats;
        remap = { inbox: "todo", launch: "doing" };
      }
      return {
        ...raw, cats,
        tasks: raw.tasks.map((t: Task) => {
          let cat = t.cat ?? cats[0].id;
          if (remap) cat = t.done ? "done" : remap[cat] ?? "todo";
          return { ...t, cat };
        }),
      } as NotesState;
    }
  } catch { /* seed */ }
  return SEED;
}

let state: NotesState = load();
const subs = new Set<() => void>();
const emit = () => {
  localStorage.setItem(KEY, JSON.stringify(state));
  subs.forEach((f) => f());
};
const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const notesApp = {
  get: () => state,
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
  update: (fn: (s: NotesState) => NotesState) => { state = fn(state); emit(); },
  note: (id: string) => state.notes.find((n) => n.id === id),
  task: (id: string) => state.tasks.find((t) => t.id === id),
  patchNote: (id: string, patch: Partial<Note>) =>
    notesApp.update((s) => ({ ...s, notes: s.notes.map((n) => (n.id === id ? { ...n, ...patch, ts: Date.now() } : n)) })),
  setTaskGroup: (g: TaskGroup) => notesApp.update((st) => ({ ...st, taskGroup: g })),
  patchTaskFilter: (p: Partial<TaskFilter>) =>
    notesApp.update((st) => ({ ...st, taskF: { people: [], prios: [], projects: [], ...(st.taskF ?? {}), ...p } })),
  patchTask: (id: string, patch: Partial<Task>) =>
    notesApp.update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, ts: Date.now() } : t)) })),
  addNote: (folder?: string): string => {
    const id = uid("n");
    notesApp.update((s) => ({ ...s, notes: [{ id, title: "Untitled note", body: "", ts: Date.now(), folder }, ...s.notes] }));
    return id;
  },
  folder: (id: string) => (state.folders ?? []).find((f) => f.id === id),
  addFolder: (name?: string): string => {
    const id = uid("f");
    notesApp.update((s) => ({ ...s, folders: [...(s.folders ?? []), { id, name: name ?? "Folder " + ((s.folders?.length ?? 0) + 1) }] }));
    return id;
  },
  renameFolder: (id: string, name: string) =>
    notesApp.update((s) => ({ ...s, folders: (s.folders ?? []).map((f) => (f.id === id ? { ...f, name } : f)) })),
  removeFolder: (id: string) =>
    notesApp.update((s) => ({
      ...s,
      folders: (s.folders ?? []).filter((f) => f.id !== id),
      notes: s.notes.map((n) => (n.folder === id ? { ...n, folder: undefined } : n)),
    })),
  addTask: (label: string, cat?: string): string => {
    const id = uid("t");
    notesApp.update((s) => ({ ...s, tasks: [...s.tasks, { id, label, done: false, prio: "med" as Prio, cat: cat ?? s.cats[0]?.id ?? "inbox", ts: Date.now() }] }));
    return id;
  },
  addCategory: (name?: string): string => {
    const id = uid("c");
    notesApp.update((s) => ({ ...s, cats: [...s.cats, { id, name: name ?? "Category " + (s.cats.length + 1) }] }));
    return id;
  },
  renameCategory: (id: string, name: string) =>
    notesApp.update((s) => ({ ...s, cats: s.cats.map((c) => (c.id === id ? { ...c, name } : c)) })),
  removeCategory: (id: string) =>
    notesApp.update((s) => {
      if (s.cats.length <= 1) return s;
      const fallback = s.cats.find((c) => c.id !== id)!.id;
      return { ...s, cats: s.cats.filter((c) => c.id !== id), tasks: s.tasks.map((t) => (t.cat === id ? { ...t, cat: fallback } : t)) };
    }),
  setView: (view: "list" | "kanban") => notesApp.update((s) => ({ ...s, view })),
  /** drag&drop: reassign category and insert before `beforeId` (or append) */
  moveTask: (id: string, cat: string, beforeId?: string) =>
    notesApp.update((s) => {
      const task = s.tasks.find((t) => t.id === id);
      if (!task) return s;
      const rest = s.tasks.filter((t) => t.id !== id);
      const moved = { ...task, cat };
      const at = beforeId ? rest.findIndex((t) => t.id === beforeId) : -1;
      const tasks = at === -1 ? [...rest, moved] : [...rest.slice(0, at), moved, ...rest.slice(at)];
      return { ...s, tasks };
    }),
  removeNote: (id: string) => notesApp.update((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) })),
  removeTask: (id: string) => notesApp.update((s) => ({ ...s, tasks: s.tasks.filter((t) => t.id !== id) })),
};
export const useNotesApp = () => useSyncExternalStore(notesApp.subscribe, notesApp.get);

/* ── fixed-position popovers: escape scroll clipping and stacking traps ── */
const zoomFactor = () => {
  const z = (document.body.style as CSSStyleDeclaration & { zoom: string }).zoom;
  return z ? parseFloat(z) / 100 : 1;
};
/** Anchor a popover to the clicked trigger with viewport clamping + flip-up. */
export const popPos = (e: { currentTarget: EventTarget & Element }, popH = 240, popW = 180): React.CSSProperties => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const z = zoomFactor();
  const iw = window.innerWidth / z;
  const ih = window.innerHeight / z;
  const up = r.bottom / z + popH + 8 > ih && r.top / z - popH - 8 > 0;
  const left = Math.max(8, Math.min(r.left / z, iw - popW - 8));
  return up
    ? { position: "fixed", left, bottom: ih - r.top / z + 6, top: "auto", right: "auto", zIndex: 40 }
    : { position: "fixed", left, top: r.bottom / z + 6, bottom: "auto", right: "auto", zIndex: 40 };
};

/* ── shadcn-style pickers: popover calendar + time list, no native UI ── */
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function DatePicker({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const [view, setView] = useState(() => (value ?? new Date().toISOString().slice(0, 10)).slice(0, 7));
  const [vy, vm] = view.split("-").map(Number);
  const first = new Date(vy, vm - 1, 1);
  const offset = (first.getDay() + 6) % 7; // Monday first
  const days = new Date(vy, vm, 0).getDate();
  const today = new Date().toISOString().slice(0, 10);
  const nav = (d: number) => {
    const dt = new Date(vy, vm - 1 + d, 1);
    setView(dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0"));
  };
  return (
    <span className="dp-wrap">
      <button className={"d-btn sm " + (value ? "dp-has" : "outline")} onClick={(e) => { setPos(popPos(e, 330, 232)); setOpen((v) => !v); }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ marginRight: 6 }}><rect x="3" y="4" width="18" height="17" rx="3" /><path d="M8 2v4M16 2v4M3 9h18" /></svg>
        {value ? fmtDue(value) : "Date"}
      </button>
      {open && <div className="pop-bg" onMouseDown={() => setOpen(false)} />}
      {open && (
        <div className="dp-pop" style={pos}>
          <div className="dp-head">
            <button onClick={() => nav(-1)}>‹</button>
            <span>{MONTHS[vm - 1]} {vy}</span>
            <button onClick={() => nav(1)}>›</button>
          </div>
          <div className="dp-grid">
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <span key={d} className="dp-wd">{d}</span>)}
            {Array.from({ length: offset }, (_, i) => <span key={"e" + i} />)}
            {Array.from({ length: days }, (_, i) => {
              const iso = view + "-" + String(i + 1).padStart(2, "0");
              return (
                <button key={iso}
                  className={"dp-day" + (iso === value ? " on" : "") + (iso === today ? " today" : "")}
                  onClick={() => { onChange(iso); setOpen(false); }}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          {value && <button className="dp-clear" onClick={() => { onChange(undefined); setOpen(false); }}>Clear date</button>}
        </div>
      )}
    </span>
  );
}
function TimePicker({ value, onChange }: { value?: string; onChange: (v?: string) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const slots: string[] = [];
  for (let h = 0; h < 24; h++) for (const m of ["00", "30"]) slots.push(String(h).padStart(2, "0") + ":" + m);
  return (
    <span className="dp-wrap">
      <button className={"d-btn sm " + (value ? "" : "outline")} onClick={(e) => { setPos(popPos(e, 280, 128)); setOpen((v) => !v); }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" style={{ marginRight: 6 }}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        {value ?? "Time"}
      </button>
      {open && <div className="pop-bg" onMouseDown={() => setOpen(false)} />}
      {open && (
        <div className="dp-pop tp" style={pos}>
          <div className="tp-list">
            {slots.map((t) => (
              <button key={t} className={"tp-slot" + (t === value ? " on" : "")}
                onClick={() => { onChange(t); setOpen(false); }}>
                {t}
              </button>
            ))}
          </div>
          {value && <button className="dp-clear" onClick={() => { onChange(undefined); setOpen(false); }}>Clear time</button>}
        </div>
      )}
    </span>
  );
}

/* ── small formatters ────────────────────────────────────────────────── */
function ago(ts: number): string {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
const stripHtml = (html: string) =>
  html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
const fmtDue = (due: string) => {
  const d = new Date(due + "T00:00:00");
  return isNaN(d.getTime()) ? due : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const PRIO_DOT: Record<Prio, string> = {
  high: "var(--accent)",
  med: "var(--accent-2)",
  low: "var(--ink-4)",
};

/* ── root panel: notes list + task list ─────────────────────────────── */
export function NotesRoot({ panelId, searchQ = "" }: { panelId: string; searchQ?: string }) {
  const ws = useWorkspace();
  const s = useNotesApp();

  const q = searchQ.trim().toLowerCase();
  const folders = (s.folders ?? []).filter((f) => !q || f.name.toLowerCase().includes(q));
  const loose = [...s.notes].filter((n) => !n.folder || !(s.folders ?? []).some((f) => f.id === n.folder))
    .filter((n) => !q || (n.title || "Untitled note").toLowerCase().includes(q))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.ts - a.ts);
  const openNote = (id: string) =>
    ws.openDetail(panelId, { panelType: "note", resourceKey: "nte:" + id });
  const openFolder = (id: string) =>
    ws.openDetail(panelId, { panelType: "notefolder", resourceKey: "nfd:" + id });

  return (
    <div className="section">
      <div className="lab">Notes · {s.notes.length}</div>
      {s.notes.length === 0 && (s.folders ?? []).length === 0 && <p style={{ marginTop: 6 }}>No notes yet: start one from the foot.</p>}
      {q && folders.length === 0 && loose.length === 0 && <p style={{ marginTop: 6 }}>No matches: clear the search above.</p>}
      <div className="drills" style={{ marginTop: 8 }}>
        {folders.map((f) => {
          const count = s.notes.filter((n) => n.folder === f.id).length;
          return (
            <button key={f.id} className="drill" onClick={() => openFolder(f.id)}>
              <span className="no">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.2 3.9A2 2 0 0 0 7.5 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /></svg>
              </span>
              <span className="bd">
                <span className="tt" style={{ display: "block" }}>{f.name}</span>
                <span className="ss" style={{ display: "block" }}>{count} note{count === 1 ? "" : "s"}</span>
              </span>
              <span className="arr">→</span>
            </button>
          );
        })}
        {loose.map((n) => (
          <div key={n.id} className="cv-conn-row">
            <button className="drill" onClick={() => openNote(n.id)}>
              <span className="bd">
                <span className="tt" style={{ display: "block" }}>{n.pinned ? "✶ " : ""}{n.title || "Untitled note"}</span>
                <span className="ss" style={{ display: "block" }}>
                  {ago(n.ts)}{stripHtml(n.body) ? " · " + stripHtml(n.body).slice(0, 68) : " · empty"}
                </span>
              </span>
              <span className="arr">→</span>
            </button>
            <button className="cv-conn-edit" title={n.pinned ? "Unpin" : "Pin to top"}
              onClick={() => notesApp.patchNote(n.id, { pinned: !n.pinned })}>✶</button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── folder panel: a folder opens its own panel of notes ────────────── */
export function FolderPanel({ folderKey, panelId, searchQ = "" }: { folderKey: string; panelId: string; searchQ?: string }) {
  const ws = useWorkspace();
  const s = useNotesApp();
  const id = folderKey.slice(4);
  const folder = (s.folders ?? []).find((f) => f.id === id);
  const [ren, setRen] = useState<string | null>(null);
  if (!folder) return <div className="leaf-note">This folder was deleted.</div>;
  const q = searchQ.trim().toLowerCase();
  const notes = s.notes.filter((n) => n.folder === id)
    .filter((n) => !q || (n.title || "Untitled note").toLowerCase().includes(q))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || b.ts - a.ts);
  return (
    <div className="section">
      <div className="lab" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {ren !== null ? (
          <input className="inline-edit" autoFocus value={ren}
            onChange={(e) => setRen(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { notesApp.renameFolder(id, ren.trim() || folder.name); setRen(null); }
              if (e.key === "Escape") setRen(null);
            }}
            onBlur={() => { notesApp.renameFolder(id, ren.trim() || folder.name); setRen(null); }} />
        ) : (
          <span style={{ flex: 1 }} onDoubleClick={() => setRen(folder.name)}>{folder.name} · {notes.length}</span>
        )}
        <button className="cv-conn-edit" title="Rename folder" style={{ width: 22, height: 22 }}
          onClick={() => setRen(folder.name)}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
        </button>
      </div>
      {notes.length === 0 && <p style={{ marginTop: 6 }}>{q ? "No matches: clear the search above." : "Empty folder: add a note from the foot."}</p>}
      <div className="drills" style={{ marginTop: 8 }}>
        {notes.map((n) => (
          <div key={n.id} className="cv-conn-row">
            <button className="drill" onClick={() => ws.openDetail(panelId, { panelType: "note", resourceKey: "nte:" + n.id })}>
              <span className="bd">
                <span className="tt" style={{ display: "block" }}>{n.pinned ? "✶ " : ""}{n.title || "Untitled note"}</span>
                <span className="ss" style={{ display: "block" }}>
                  {ago(n.ts)}{stripHtml(n.body) ? " · " + stripHtml(n.body).slice(0, 68) : " · empty"}
                </span>
              </span>
              <span className="arr">→</span>
            </button>
            <button className="cv-conn-edit" title={n.pinned ? "Unpin" : "Pin to top"}
              onClick={() => notesApp.patchNote(n.id, { pinned: !n.pinned })}>✶</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TasksRoot({ panelId, searchQ = "", me }: { panelId: string; searchQ?: string; me?: string }) {
  const ws = useWorkspace();
  const s = useNotesApp();
  const q = searchQ.trim().toLowerCase();
  const tf: TaskFilter = { people: [], prios: [], projects: [], ...(s.taskF ?? {}) };
  const matches = (t: Task) =>
    (!q || t.label.toLowerCase().includes(q)) &&
    (tf.people.length === 0 || tf.people.includes(t.assignee ?? "")) &&
    (tf.prios.length === 0 || tf.prios.includes(t.prio)) &&
    (tf.projects.length === 0 || tf.projects.includes(t.project ?? ""));
  const view = s.view ?? "list";
  const group: TaskGroup = s.taskGroup ?? "cat";
  const [fly, setFly] = useState<null | "group" | "person" | "prio" | "project">(null);
  const [flyPos, setFlyPos] = useState<React.CSSProperties>({});
  const openFly = (id: typeof fly, e: { currentTarget: EventTarget & Element }) => { setFlyPos(popPos(e, 200, 170)); setFly(fly === id ? null : id); };
  // the group DRIVES both layouts: each entry knows how to WRITE itself on drop
  const PRIOS: Prio[] = ["high", "med", "low"];
  const groups: { id: string; name: string; write: (taskId: string) => void }[] =
    group === "cat" ? s.cats.map((c) => ({ id: c.id, name: c.name, write: (tid) => notesApp.moveTask(tid, c.id, undefined) }))
    : group === "assignee" ? [...TEAM.map((p) => ({ id: p, name: p === me ? p + " (you)" : p, write: (tid: string) => notesApp.patchTask(tid, { assignee: p }) })), { id: "", name: "Unassigned", write: (tid: string) => notesApp.patchTask(tid, { assignee: undefined }) }]
    : group === "prio" ? PRIOS.map((p) => ({ id: p, name: p.toUpperCase(), write: (tid) => notesApp.patchTask(tid, { prio: p }) }))
    : [...TASK_PROJECTS.map((p) => ({ id: p, name: p, write: (tid: string) => notesApp.patchTask(tid, { project: p }) })), { id: "", name: "No project", write: (tid: string) => notesApp.patchTask(tid, { project: undefined }) }];
  const keyOf = (t: Task): string =>
    group === "cat" ? (t.cat ?? s.cats[0].id) : group === "assignee" ? (t.assignee ?? "") : group === "prio" ? t.prio : (t.project ?? "");
  const [dragId, setDragId] = useState<string | null>(null);
  const [renCat, setRenCat] = useState<{ id: string; v: string } | null>(null);
  const CatName = ({ c, className }: { c: Category; className: string }) =>
    renCat?.id === c.id ? (
      <input className="inline-edit" autoFocus value={renCat.v}
        onChange={(e) => setRenCat({ id: c.id, v: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") { notesApp.renameCategory(c.id, renCat.v.trim() || c.name); setRenCat(null); }
          if (e.key === "Escape") setRenCat(null);
        }}
        onBlur={() => { notesApp.renameCategory(c.id, renCat.v.trim() || c.name); setRenCat(null); }} />
    ) : (
      <span className={className} onDoubleClick={() => setRenCat({ id: c.id, v: c.name })}>{c.name}</span>
    );
  const [overCol, setOverCol] = useState<string | null>(null);
  const [overCard, setOverCard] = useState<string | null>(null);
  const openTask = (id: string) =>
    ws.openDetail(panelId, { panelType: "task", resourceKey: "tsk:" + id });

  const TaskRow = ({ t }: { t: Task }) => (
    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <button
        title={t.done ? "Mark as open" : "Mark as done"} aria-pressed={t.done}
        onClick={() => notesApp.patchTask(t.id, { done: !t.done })}
        style={{
          width: 18, height: 18, flex: "none", borderRadius: 5,
          border: "1px solid " + (t.done ? "var(--accent)" : "var(--border)"),
          background: t.done ? "var(--accent)" : "transparent",
          color: t.done ? "var(--background)" : "transparent",
          fontSize: "calc(var(--fz-mono, 10px) + 1px)", lineHeight: 1, cursor: "pointer",
        }}>
        ✓
      </button>
      <button onClick={() => openTask(t.id)}
        style={{
          flex: 1, minWidth: 0, textAlign: "left", background: "transparent", border: "none",
          padding: "3px 0", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          fontSize: "var(--fz-body, 13.5px)",
          color: t.done ? "var(--muted-foreground)" : "var(--foreground)",
          textDecoration: t.done ? "line-through" : "none", textUnderlineOffset: 2,
        }}>
        {t.label}
      </button>
      {(t.subs?.length ?? 0) > 0 && (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: "calc(var(--fz-mono, 10px) * 0.9)", color: "var(--muted-foreground)", flex: "none", fontVariantNumeric: "tabular-nums" }}>
          {t.subs!.filter((x) => x.done).length}/{t.subs!.length}
        </span>
      )}
      {t.assignee && <span className="nt-ava" title={t.assignee}>{t.assignee.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>}
      {t.project && <span className="nt-proj">{t.project}</span>}
      <span title={"Priority: " + t.prio}
        style={{ width: 7, height: 7, flex: "none", borderRadius: 999, background: PRIO_DOT[t.prio] }} />
      {t.due && <span className="tag" style={{ flex: "none" }}>{fmtDue(t.due)}{t.dueTime ? " · " + t.dueTime : ""}</span>}
    </div>
  );

  const SubRows = ({ t, indent }: { t: Task; indent?: boolean }) => (
    (t.subs?.length ?? 0) > 0 ? (
      <div className="nt-subs" style={indent ? { marginLeft: 26 } : undefined}>
        {t.subs!.map((f) => (
          <button key={f.id} className={"cv-subrow" + (f.done ? " done" : "")}
            title={f.done ? "Mark as open" : "Mark as done"}
            onClick={(e) => { e.stopPropagation(); notesApp.patchTask(t.id, { subs: (t.subs ?? []).map((x) => (x.id === f.id ? { ...x, done: !x.done } : x)) }); }}>
            <span className="cv-subdot" />{f.label}
          </button>
        ))}
      </div>
    ) : null
  );

  const QuickAdd = ({ cat }: { cat?: string }) => (
    <form style={{ display: "flex", gap: 6 }}
      onSubmit={(e) => {
        e.preventDefault();
        const inp = (e.target as HTMLFormElement).elements.namedItem("qtask") as HTMLInputElement;
        const v = inp.value.trim();
        if (!v) return;
        notesApp.addTask(v, cat);
        inp.value = "";
      }}>
      <input name="qtask" className="d-input" style={{ flex: 1, minWidth: 0 }} placeholder="Add a task…" />
      <button className="d-btn outline sm" type="submit">Add</button>
    </form>
  );

  return (
    <>
      {fly && <div className="pop-bg" onMouseDown={() => setFly(null)} />}
      <div className="nt-ctl">
        <div className="nt-viewseg" role="group" aria-label="Tasks view">
          <button className={view === "list" ? "on" : ""} onClick={() => notesApp.setView("list")}>List</button>
          <button className={view === "kanban" ? "on" : ""} onClick={() => notesApp.setView("kanban")}>Kanban</button>
        </div>
        <span className="dp-wrap">
          <button className="d-btn outline sm" onClick={(e) => openFly("group", e)}>Group: {group === "cat" ? "Status" : group === "assignee" ? "Person" : group === "prio" ? "Priority" : "Project"}</button>
          {fly === "group" && (
            <div className="dp-pop dt-selfly" style={flyPos}>
              {([["cat", "Status"], ["assignee", "Person"], ["prio", "Priority"], ["project", "Project"]] as const).map(([g2, lbl]) => (
                <button key={g2} className={"tp-slot" + (group === g2 ? " on" : "")} onClick={() => { notesApp.setTaskGroup(g2); setFly(null); }}>{lbl}</button>
              ))}
            </div>
          )}
        </span>
        <span className="dp-wrap">
          <button className={"d-btn sm" + (tf.people.length ? "" : " outline")} onClick={(e) => openFly("person", e)}>
            {tf.people.length ? tf.people.map((p) => p.split(" ")[0]).join(", ") : "Person"}
          </button>
          {fly === "person" && (
            <div className="dp-pop dt-selfly" style={flyPos}>
              {TEAM.map((p) => (
                <button key={p} className={"tp-slot" + (tf.people.includes(p) ? " on" : "")}
                  onClick={() => notesApp.patchTaskFilter({ people: tf.people.includes(p) ? tf.people.filter((x) => x !== p) : [...tf.people, p] })}>
                  {p === me ? p + " (you)" : p}
                </button>
              ))}
              {tf.people.length > 0 && <button className="dp-clear" onClick={() => { notesApp.patchTaskFilter({ people: [] }); setFly(null); }}>Clear</button>}
            </div>
          )}
        </span>
        <span className="dp-wrap">
          <button className={"d-btn sm" + (tf.projects.length ? "" : " outline")} onClick={(e) => openFly("project", e)}>
            {tf.projects.length ? tf.projects.join(", ") : "Project"}
          </button>
          {fly === "project" && (
            <div className="dp-pop dt-selfly" style={flyPos}>
              {TASK_PROJECTS.map((p) => (
                <button key={p} className={"tp-slot" + (tf.projects.includes(p) ? " on" : "")}
                  onClick={() => notesApp.patchTaskFilter({ projects: tf.projects.includes(p) ? tf.projects.filter((x) => x !== p) : [...tf.projects, p] })}>{p}</button>
              ))}
              {tf.projects.length > 0 && <button className="dp-clear" onClick={() => { notesApp.patchTaskFilter({ projects: [] }); setFly(null); }}>Clear</button>}
            </div>
          )}
        </span>
        {me && (
          <button className={"d-btn sm" + (tf.people.length === 1 && tf.people[0] === me ? "" : " outline")}
            title="Only my tasks"
            onClick={() => notesApp.patchTaskFilter({ people: tf.people.length === 1 && tf.people[0] === me ? [] : [me] })}>
            Mine
          </button>
        )}
      </div>

      {view === "list" && groups.map((g) => {
        const c = group === "cat" ? s.cats.find((x) => x.id === g.id)! : null;
        const list = s.tasks.filter((t) => keyOf(t) === g.id).filter(matches).sort((a, b) => Number(a.done) - Number(b.done));
        if (group !== "cat" && list.length === 0) return null;
        const open = list.filter((t) => !t.done).length;
        return (
          <div className="card" key={g.id || "none"}>
            <div className="lab" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1, display: "inline-flex", gap: 6, alignItems: "center", minWidth: 0 }}>
                {c ? <CatName c={c} className="" /> : <span>{g.name}</span>} · {open}/{list.length}
              </span>
              {c && (
                <button className="cv-conn-edit" title="Rename category" style={{ width: 22, height: 22 }}
                  onClick={() => setRenCat({ id: c.id, v: c.name })}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
                </button>
              )}
              {c && s.cats.length > 1 && (
                <button className="cv-conn-edit" title="Delete category (tasks move to the first one)" style={{ width: 22, height: 22 }}
                  onClick={() => notesApp.removeCategory(c.id)}>✕</button>
              )}
            </div>
            <div style={{ margin: "10px 0", display: "flex", flexDirection: "column", gap: 4 }}>
              {list.map((t) => (
                <div key={t.id}>
                  <TaskRow t={t} />
                  <SubRows t={t} indent />
                </div>
              ))}
              {list.length === 0 && <p style={{ margin: 0 }}>Nothing here.</p>}
            </div>
            {c ? <QuickAdd cat={c.id} /> : null}
          </div>
        );
      })}

      {view === "kanban" && (
        <div className="nt-kanban">
          {groups.map((g) => {
            const c = group === "cat" ? s.cats.find((x) => x.id === g.id)! : null;
            const list = s.tasks.filter((t) => keyOf(t) === g.id).filter(matches).sort((a, b) => Number(a.done) - Number(b.done));
            if (group !== "cat" && g.id === "" && list.length === 0) return null;
            const open = list.filter((t) => !t.done).length;
            return (
              <div key={g.id || "none"}
                className={"nt-col" + (overCol === g.id ? " over" : "")}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverCol(g.id); }}
                onDragLeave={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) { setOverCol(null); setOverCard(null); } }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/task") || dragId;
                  if (id) { g.write(id); if (group === "cat" && overCard) notesApp.moveTask(id, g.id, overCard); }
                  setDragId(null); setOverCol(null); setOverCard(null);
                }}>
                <div className="nt-colhead">
                  {c ? <CatName c={c} className="nm" /> : <span className="nm">{g.name}</span>}
                  <span className="cnt">{open}</span>
                  <span style={{ flex: 1 }} />
                  {c && (
                    <button className="nt-colbtn" title="Rename column"
                      onClick={() => setRenCat({ id: c.id, v: c.name })}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
                    </button>
                  )}
                  {c && s.cats.length > 1 && (
                    <button className="nt-colbtn" title="Delete column (tasks move left)"
                      onClick={() => notesApp.removeCategory(c.id)}>✕</button>
                  )}
                </div>
                <div className="nt-cards">
                  {list.map((t) => (
                    <div key={t.id}
                      className={"nt-kcard" + (t.done ? " done" : "") + (dragId === t.id ? " drag" : "") + (overCard === t.id ? " target" : "")}
                      draggable
                      onDragStart={(e) => { e.dataTransfer.setData("text/task", t.id); e.dataTransfer.effectAllowed = "move"; setDragId(t.id); }}
                      onDragEnd={() => { setDragId(null); setOverCol(null); setOverCard(null); }}
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOverCol(g.id); if (t.id !== dragId) setOverCard(t.id); }}
                      onClick={() => openTask(t.id)}
                      role="button" tabIndex={0}>
                      <div className="nt-ktitle">{t.label}</div>
                      <SubRows t={t} />
                      <div className="nt-kmeta">
                        {t.assignee && <span className="nt-ava" title={t.assignee}>{t.assignee.split(" ").map((w) => w[0]).join("").slice(0, 2)}</span>}
                        {t.project && <span className="nt-proj">{t.project}</span>}
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: PRIO_DOT[t.prio], flex: "none" }} />
                        {t.due && <span>{fmtDue(t.due)}{t.dueTime ? " " + t.dueTime : ""}</span>}
                        {(t.subs?.length ?? 0) > 0 && <span>{t.subs!.filter((x) => x.done).length}/{t.subs!.length}</span>}
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && overCol !== g.id && <div className="nt-empty">Drop tasks here</div>}
                </div>
                <button className="nt-kadd" onClick={() => { const id = notesApp.addTask("New task", c?.id); if (!c) g.write(id); openTask(id); }}>+ Add task</button>
              </div>
            );
          })}
          <button className="nt-newcol" title="New column" onClick={() => notesApp.addCategory()}>+</button>
        </div>
      )}
    </>
  );
}

/* ── note body: a real Tiptap editor, keyed by note id ──────────────── */
function NoteDoc({ noteId, html }: { noteId: string; html: string }) {
  return (
    <div className="nt-docwrap">
      <RichNotes key={noteId} html={html} placeholder="Write the note: headings, lists, checklists, links…"
        onChange={(h) => notesApp.update((st) => ({
          ...st,
          notes: st.notes.map((n) => (n.id === noteId ? { ...n, body: h, ts: Date.now() } : n)),
        }))} />
    </div>
  );
}

/* ── note panel: the panel opened by clicking a note ────────────────── */
export function NoteEditor({ noteKey, panelId }: { noteKey: string; panelId: string }) {
  const ws = useWorkspace();
  const s = useNotesApp();
  const id = noteKey.slice(4);
  const n = s.notes.find((x) => x.id === id);
  if (!n) return <div className="leaf-note">This note was deleted.</div>;
  return (
    <>
      <input autoFocus
        value={n.title} placeholder="Untitled note" aria-label="Note title"
        onChange={(e) => notesApp.patchNote(id, { title: e.target.value })}
        style={{
          fontFamily: "var(--font-serif)", fontSize: "var(--fz-title, 24px)",
          border: "none", outline: "none", background: "transparent",
          width: "100%", color: "var(--foreground)", padding: 0,
        }} />
      {(s.folders?.length ?? 0) > 0 && (
        <select className="d-input" style={{ alignSelf: "flex-start", marginBottom: 8 }}
          value={n.folder ?? ""} title="Folder"
          onChange={(e) => notesApp.patchNote(id, { folder: e.target.value || undefined })}>
          <option value="">No folder</option>
          {(s.folders ?? []).map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
      )}
      <NoteDoc key={id} noteId={id} html={n.body} />
    </>
  );
}

/* ── task panel: the panel opened by clicking a task ────────────────── */
export function TaskDetail({ taskKey, panelId }: { taskKey: string; panelId: string }) {
  const ws = useWorkspace();
  const s = useNotesApp();
  const id = taskKey.slice(4);
  const t = s.tasks.find((x) => x.id === id);
  if (!t) return <div className="leaf-note">This task was deleted.</div>;
  const patch = (p: Partial<Task>) => notesApp.patchTask(id, p);
  const P = ({ p, label }: { p: Prio; label: string }) => (
    <button className={"d-btn sm " + (t.prio === p ? "" : "outline")} aria-pressed={t.prio === p}
      onClick={() => patch({ prio: p })}>
      {label}
    </button>
  );
  return (
    <>
      <div className="fs-head">
        <input className="fs-title" autoFocus placeholder="Untitled task" aria-label="Label" value={t.label}
          onChange={(e) => patch({ label: e.target.value })} />
      </div>
      <div className="section">
        <div className="lab">Status</div>
        <div className="pop-sub">Completed</div>
        <div style={{ marginTop: 4, marginBottom: 8 }}>
          <button className={"d-btn sm " + (t.done ? "" : "outline")} aria-pressed={t.done}
            onClick={() => patch({ done: !t.done })}>
            {t.done ? "Done ✓" : "Open"}
          </button>
        </div>
        <div className="pop-sub">Priority</div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, marginBottom: 8, flexWrap: "wrap" }}>
          <P p="low" label="Low" />
          <P p="med" label="Med" />
          <P p="high" label="High" />
        </div>
        <div className="pop-sub">Status</div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, marginBottom: 8, flexWrap: "wrap" }}>
          {s.cats.map((c) => (
            <button key={c.id} className={"d-btn sm " + ((t.cat ?? s.cats[0]?.id) === c.id ? "" : "outline")}
              aria-pressed={(t.cat ?? s.cats[0]?.id) === c.id}
              onClick={() => patch({ cat: c.id })}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="pop-sub">Due: date & time</div>
        <div style={{ display: "flex", gap: 6, marginTop: 4, flexWrap: "wrap" }}>
          <DatePicker value={t.due} onChange={(v) => patch({ due: v })} />
          <TimePicker value={t.dueTime} onChange={(v) => patch({ dueTime: v })} />
        </div>
      </div>
      <div className="section">
        <div className="lab">Subtasks · {(t.subs ?? []).filter((x) => x.done).length}/{t.subs?.length ?? 0}</div>
        <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          {(t.subs ?? []).map((f) => (
            <div key={f.id} className="cv-subedit">
              <button className={"cv-subcheck" + (f.done ? " on" : "")} title={f.done ? "Mark as open" : "Mark as done"}
                onClick={() => patch({ subs: (t.subs ?? []).map((x) => (x.id === f.id ? { ...x, done: !x.done } : x)) })}>
                {f.done ? "✓" : ""}
              </button>
              <input className="d-input" style={{ flex: 1, minWidth: 0 }} value={f.label}
                onChange={(e) => patch({ subs: (t.subs ?? []).map((x) => (x.id === f.id ? { ...x, label: e.target.value } : x)) })} />
              <button className="cv-conn-edit" title="Remove"
                onClick={() => patch({ subs: (t.subs ?? []).filter((x) => x.id !== f.id) })}>✕</button>
            </div>
          ))}
        </div>
        <form style={{ display: "flex", gap: 6, marginTop: 8 }}
          onSubmit={(e) => {
            e.preventDefault();
            const inp = (e.target as HTMLFormElement).elements.namedItem("nsub") as HTMLInputElement;
            const v = inp.value.trim();
            if (!v) return;
            patch({ subs: [...(t.subs ?? []), { id: "s" + Date.now().toString(36), label: v }] });
            inp.value = "";
          }}>
          <input name="nsub" className="d-input" style={{ flex: 1 }} placeholder="Add a subtask…" />
          <button className="d-btn outline sm" type="submit">Add</button>
        </form>
      </div>
      <div className="section">
        <div className="lab">Notes</div>
        <RichNotes key={id} html={t.notes ?? ""} placeholder="Context, links, next steps…"
          onChange={(h) => patch({ notes: h })} />
      </div>
    </>
  );
}
