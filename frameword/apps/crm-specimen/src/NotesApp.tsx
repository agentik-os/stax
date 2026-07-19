/**
 * NotesApp — a Notes + personal Task manager module speaking the panel
 * grammar: the root panel lists notes and tasks; clicking an item opens its
 * editor as the NEXT PANEL. One tiny shared store (localStorage-persisted)
 * keeps the root list and every open editor in sync — each keystroke writes
 * the store, the list re-renders live.
 */
import { useState, useSyncExternalStore } from "react";
import { useWorkspace } from "@frameword/panels-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

/* ── shared store ────────────────────────────────────────────────────── */
export type Prio = "low" | "med" | "high";
export interface Note { id: string; title: string; body: string; ts: number; pinned?: boolean }
export interface TaskSub { id: string; label: string; done?: boolean }
export interface Task { id: string; label: string; done: boolean; prio: Prio; cat?: string; subs?: TaskSub[]; due?: string; dueTime?: string; notes?: string; ts: number }
export interface Category { id: string; name: string }
interface NotesState { notes: Note[]; tasks: Task[]; cats: Category[]; view?: "list" | "kanban" }

const KEY = "frameword-notesapp";
const now = Date.now();
const H = 3600_000;

const SEED: NotesState = {
  notes: [
    {
      id: "n-launch", title: "Launch checklist", pinned: true, ts: now - 2 * H,
      body: "<h2>Before the flip</h2><ul><li><p>Freeze the panel grammar — open right, nothing else</p></li><li><p>Sweep every route for console noise</p></li><li><p>Write the announcement note</p></li></ul><p>Ship it loud.</p>",
    },
    {
      id: "n-meet", title: "Meeting — panel grammar review", ts: now - 30 * H,
      body: "<p>Agreed: drilling stays the only navigation. No modals, no tabs.</p><blockquote><p>Every click answers the same question — what opens next?</p></blockquote><p>Follow-up: the canvas inspector should reuse the drill rows.</p>",
    },
  ],
  cats: [
    { id: "inbox", name: "Inbox" },
    { id: "launch", name: "Launch" },
  ],
  tasks: [
    { id: "t-ship", label: "Ship the notes module", done: false, prio: "high", cat: "launch", due: "2026-07-22", dueTime: "18:00", subs: [{ id: "s1", label: "Wire the store", done: true }, { id: "s2", label: "Kanban view" }], ts: now - 3 * H },
    { id: "t-drill", label: "Review drill-row spacing on mobile", done: false, prio: "med", cat: "inbox", ts: now - 5 * H },
    { id: "t-retro", label: "Book the launch retro", done: false, prio: "med", cat: "launch", due: "2026-07-28", ts: now - 8 * H },
    { id: "t-arch", label: "Archive the old prototype boards", done: true, prio: "low", cat: "inbox", ts: now - 40 * H },
  ],
};

function load(): NotesState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(raw?.notes) && Array.isArray(raw?.tasks)) {
      const cats: Category[] = Array.isArray(raw.cats) && raw.cats.length ? raw.cats : [{ id: "inbox", name: "Inbox" }];
      return {
        ...raw, cats,
        tasks: raw.tasks.map((t: Task) => ({ cat: cats[0].id, ...t })),
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
  patchTask: (id: string, patch: Partial<Task>) =>
    notesApp.update((s) => ({ ...s, tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch, ts: Date.now() } : t)) })),
  addNote: (): string => {
    const id = uid("n");
    notesApp.update((s) => ({ ...s, notes: [{ id, title: "Untitled note", body: "", ts: Date.now() }, ...s.notes] }));
    return id;
  },
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

/* ── root panel — notes list + task list ─────────────────────────────── */
export function NotesRoot({ panelId }: { panelId: string }) {
  const ws = useWorkspace();
  const s = useNotesApp();

  const notes = [...s.notes].sort((a, b) =>
    Number(!!b.pinned) - Number(!!a.pinned) || b.ts - a.ts);
  const openNote = (id: string) =>
    ws.openDetail(panelId, { panelType: "note", resourceKey: "nte:" + id });
  const newNote = () => openNote(notesApp.addNote());

  return (
    <div className="card">
      <div className="lab">Notes · {s.notes.length}</div>
      {s.notes.length === 0 && <p style={{ marginTop: 6 }}>No notes yet — start one below.</p>}
      <div className="drills" style={{ marginTop: 8 }}>
        {notes.map((n) => (
          <button key={n.id} className="drill" onClick={() => openNote(n.id)}>
            <span className="no">{n.pinned ? "✶" : "§"}</span>
            <span className="bd">
              <span className="tt" style={{ display: "block" }}>{n.title || "Untitled note"}</span>
              <span className="ss" style={{ display: "block" }}>
                {ago(n.ts)}{stripHtml(n.body) ? " · " + stripHtml(n.body).slice(0, 72) : " · empty"}
              </span>
            </span>
            <span className="arr">→</span>
          </button>
        ))}
      </div>
      <button className="d-btn outline sm" style={{ marginTop: 10 }} onClick={newNote}>
        New note
      </button>
    </div>
  );
}

export function TasksRoot({ panelId }: { panelId: string }) {
  const ws = useWorkspace();
  const s = useNotesApp();
  const view = s.view ?? "list";
  const [dragId, setDragId] = useState<string | null>(null);
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
      <span title={"Priority — " + t.prio}
        style={{ width: 7, height: 7, flex: "none", borderRadius: 999, background: PRIO_DOT[t.prio] }} />
      {t.due && <span className="tag" style={{ flex: "none" }}>{fmtDue(t.due)}{t.dueTime ? " · " + t.dueTime : ""}</span>}
    </div>
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
      <div className="nt-viewseg" role="group" aria-label="Tasks view">
        <button className={view === "list" ? "on" : ""} onClick={() => notesApp.setView("list")}>List</button>
        <button className={view === "kanban" ? "on" : ""} onClick={() => notesApp.setView("kanban")}>Kanban</button>
      </div>

      {view === "list" && s.cats.map((c) => {
        const list = s.tasks.filter((t) => (t.cat ?? s.cats[0].id) === c.id).sort((a, b) => Number(a.done) - Number(b.done));
        const open = list.filter((t) => !t.done).length;
        return (
          <div className="card" key={c.id}>
            <div className="lab" style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ flex: 1 }}>{c.name} · {open}/{list.length}</span>
              <button className="cv-conn-edit" title="Rename category" style={{ width: 22, height: 22 }}
                onClick={() => {
                  const name = window.prompt("Category name", c.name);
                  if (name?.trim()) notesApp.renameCategory(c.id, name.trim());
                }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
              </button>
              {s.cats.length > 1 && (
                <button className="cv-conn-edit" title="Delete category (tasks move to the first one)" style={{ width: 22, height: 22 }}
                  onClick={() => notesApp.removeCategory(c.id)}>✕</button>
              )}
            </div>
            <div style={{ margin: "10px 0", display: "flex", flexDirection: "column", gap: 4 }}>
              {list.map((t) => <TaskRow key={t.id} t={t} />)}
              {list.length === 0 && <p style={{ margin: 0 }}>Nothing here.</p>}
            </div>
            <QuickAdd cat={c.id} />
          </div>
        );
      })}

      {view === "kanban" && (
        <div className="nt-kanban">
          {s.cats.map((c) => {
            const list = s.tasks.filter((t) => (t.cat ?? s.cats[0].id) === c.id).sort((a, b) => Number(a.done) - Number(b.done));
            const open = list.filter((t) => !t.done).length;
            return (
              <div key={c.id}
                className={"nt-col" + (overCol === c.id ? " over" : "")}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverCol(c.id); }}
                onDragLeave={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) { setOverCol(null); setOverCard(null); } }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/task") || dragId;
                  if (id) notesApp.moveTask(id, c.id, overCard ?? undefined);
                  setDragId(null); setOverCol(null); setOverCard(null);
                }}>
                <div className="nt-colhead">
                  <span className="nm">{c.name}</span>
                  <span className="cnt">{open}</span>
                  <span style={{ flex: 1 }} />
                  <button className="nt-colbtn" title="Rename column"
                    onClick={() => {
                      const name = window.prompt("Column name", c.name);
                      if (name?.trim()) notesApp.renameCategory(c.id, name.trim());
                    }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z" /></svg>
                  </button>
                  {s.cats.length > 1 && (
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
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setOverCol(c.id); if (t.id !== dragId) setOverCard(t.id); }}
                      onClick={() => openTask(t.id)}
                      role="button" tabIndex={0}>
                      <div className="nt-ktitle">{t.label}</div>
                      <div className="nt-kmeta">
                        <span style={{ width: 6, height: 6, borderRadius: 999, background: PRIO_DOT[t.prio], flex: "none" }} />
                        {t.due && <span>{fmtDue(t.due)}{t.dueTime ? " " + t.dueTime : ""}</span>}
                        {(t.subs?.length ?? 0) > 0 && <span>{t.subs!.filter((x) => x.done).length}/{t.subs!.length}</span>}
                      </div>
                    </div>
                  ))}
                  {list.length === 0 && overCol !== c.id && <div className="nt-empty">Drop tasks here</div>}
                </div>
                <button className="nt-kadd" onClick={() => openTask(notesApp.addTask("New task", c.id))}>+ Add task</button>
              </div>
            );
          })}
          <button className="nt-newcol" title="New column" onClick={() => notesApp.addCategory()}>+</button>
        </div>
      )}
    </>
  );
}

/* ── note body — a real Tiptap editor, keyed by note id ──────────────── */
function NoteDoc({ noteId, html }: { noteId: string; html: string }) {
  const editor = useEditor({
    extensions: [StarterKit, Placeholder.configure({ placeholder: "Write the note — headings, lists, quotes…" })],
    content: html || "",
    onUpdate: ({ editor: ed }) => {
      notesApp.update((s) => ({
        ...s,
        notes: s.notes.map((n) => (n.id === noteId ? { ...n, body: ed.getHTML(), ts: Date.now() } : n)),
      }));
    },
  });
  if (!editor) return null;
  const B = ({ on, label, run, title }: { on?: boolean; label: string; run: () => void; title: string }) => (
    <button className={on ? "on" : ""} title={title} onMouseDown={(e) => { e.preventDefault(); run(); }}>{label}</button>
  );
  return (
    <div className="tt-wrap nt-doc">
      <div className="tt-toolbar">
        <B on={editor.isActive("heading", { level: 2 })} label="H2" title="Heading" run={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
        <B on={editor.isActive("bold")} label="B" title="Bold" run={() => editor.chain().focus().toggleBold().run()} />
        <B on={editor.isActive("italic")} label="I" title="Italic" run={() => editor.chain().focus().toggleItalic().run()} />
        <B on={editor.isActive("bulletList")} label="••" title="Bullet list" run={() => editor.chain().focus().toggleBulletList().run()} />
        <B on={editor.isActive("blockquote")} label="❝" title="Quote" run={() => editor.chain().focus().toggleBlockquote().run()} />
        <B on={editor.isActive("codeBlock")} label="{ }" title="Code" run={() => editor.chain().focus().toggleCodeBlock().run()} />
      </div>
      <EditorContent editor={editor} className="tiptap" style={{ minHeight: 320 }} />
    </div>
  );
}

/* ── note panel — the panel opened by clicking a note ────────────────── */
export function NoteEditor({ noteKey, panelId }: { noteKey: string; panelId: string }) {
  const ws = useWorkspace();
  const s = useNotesApp();
  const id = noteKey.slice(4);
  const n = s.notes.find((x) => x.id === id);
  if (!n) return <div className="leaf-note">This note was deleted.</div>;
  return (
    <>
      <input
        value={n.title} placeholder="Untitled note" aria-label="Note title"
        onChange={(e) => notesApp.patchNote(id, { title: e.target.value })}
        style={{
          fontFamily: "var(--font-serif)", fontSize: "var(--fz-title, 24px)",
          border: "none", outline: "none", background: "transparent",
          width: "100%", color: "var(--foreground)", padding: 0,
        }} />
      <div className="pop-sub">{n.pinned ? "✶ pinned · " : ""}edited {ago(n.ts)}</div>
      <NoteDoc key={id} noteId={id} html={n.body} />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="d-btn outline sm" aria-pressed={!!n.pinned}
          onClick={() => notesApp.patchNote(id, { pinned: !n.pinned })}>
          {n.pinned ? "Unpin" : "Pin"}
        </button>
        <button className="d-btn destructive sm"
          onClick={() => { notesApp.removeNote(id); ws.closePanel(panelId); }}>
          Delete note
        </button>
      </div>
    </>
  );
}

/* ── task panel — the panel opened by clicking a task ────────────────── */
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
      <div className="card">
        <div className="lab">Task</div>
        <div className="pop-sub" style={{ marginTop: 8 }}>Label</div>
        <input className="d-input" style={{ width: "100%", marginBottom: 8 }} value={t.label}
          onChange={(e) => patch({ label: e.target.value })} />
        <div className="pop-sub">Status</div>
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
        <div className="pop-sub">Category</div>
        <select className="d-input" style={{ marginTop: 4, marginBottom: 8, width: "100%" }}
          value={t.cat ?? s.cats[0]?.id}
          onChange={(e) => patch({ cat: e.target.value })}>
          {s.cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="pop-sub">Due — date & time</div>
        <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
          <input type="date" className="d-input" style={{ flex: 1.4, minWidth: 0 }} value={t.due ?? ""}
            onChange={(e) => patch({ due: e.target.value || undefined })} />
          <input type="time" className="d-input" style={{ flex: 1, minWidth: 0 }} value={t.dueTime ?? ""}
            onChange={(e) => patch({ dueTime: e.target.value || undefined })} />
        </div>
      </div>
      <div className="card">
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
      <div className="card">
        <div className="lab">Notes</div>
        <textarea className="d-input" style={{ width: "100%", height: 80, resize: "vertical", marginTop: 8 }}
          value={t.notes ?? ""} placeholder="Context, links, next steps…"
          onChange={(e) => patch({ notes: e.target.value })} />
      </div>
      <button className="d-btn destructive sm" style={{ alignSelf: "flex-start" }}
        onClick={() => { notesApp.removeTask(id); ws.closePanel(panelId); }}>
        Delete task
      </button>
    </>
  );
}
