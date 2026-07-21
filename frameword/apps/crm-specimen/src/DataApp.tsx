/**
 * DataApp — integrated tables + pages, in the panel grammar. Notion/Airtable-
 * class collections: typed fields (incl. multi-select), named VIEWS carrying
 * their own filters/sort/hidden/group/wrap, per-column calculations, field
 * ops (hide, duplicate, move, width), row ops (duplicate, delete), and every
 * row opens as the NEXT panel — a page with fields + a rich body.
 */
import { useState, useSyncExternalStore } from "react";
import { useWorkspace } from "@frameword/panels-react";
import { RichNotes } from "./RichNotes";
import { DatePicker, popPos } from "./NotesApp";

/* ── model ───────────────────────────────────────────────────────────── */
export type FieldType = "text" | "number" | "select" | "multiselect" | "date" | "check" | "url" | "email" | "phone";
export type CellValue = string | number | boolean | string[] | undefined;
export interface Field { id: string; name: string; type: FieldType; options?: string[]; width?: "s" | "m" | "l" }
export interface Row { id: string; v: Record<string, CellValue>; page?: string; ts: number }
export interface Filter { fieldId: string; op: string; value: string }
export interface View {
  id: string; name: string;
  filters: Filter[]; sort?: { fieldId: string; dir: "asc" | "desc" };
  hidden: string[]; groupBy?: string; wrap?: boolean;
}
export interface Collection {
  id: string; name: string;
  fields: Field[]; rows: Row[];
  views: View[]; activeView: string;
  calcs?: Record<string, string>;
}
interface DataState { collections: Collection[] }

const KEY = "frameword-data";
const now = Date.now();
const defView = (id: string): View => ({ id, name: "Table", filters: [], hidden: [] });

const SEED: DataState = {
  collections: [
    {
      id: "c-customers", name: "Customers",
      fields: [
        { id: "f-name", name: "Name", type: "text", width: "m" },
        { id: "f-mrr", name: "MRR", type: "number", width: "s" },
        { id: "f-plan", name: "Plan", type: "select", options: ["Free", "Pro", "Scale"], width: "s" },
        { id: "f-tags", name: "Tags", type: "multiselect", options: ["Design", "Priority", "Champion", "Churn risk"], width: "m" },
        { id: "f-renew", name: "Renewal", type: "date", width: "s" },
        { id: "f-active", name: "Active", type: "check", width: "s" },
        { id: "f-site", name: "Site", type: "url", width: "s" },
      ],
      rows: [
        { id: "r1", ts: now, v: { "f-name": "Acme Industries", "f-mrr": 2400, "f-plan": "Scale", "f-tags": ["Priority", "Champion"], "f-renew": "2026-09-01", "f-active": true, "f-site": "acme.com" }, page: "<h2>Account brief</h2><p>Flagship customer since 2024 — panels rolled out to 3 teams.</p><ul><li><p>Champion: Jo Lambert</p></li><li><p>Next QBR: September</p></li></ul>" },
        { id: "r2", ts: now, v: { "f-name": "Globex", "f-mrr": 840, "f-plan": "Pro", "f-tags": ["Design"], "f-renew": "2026-08-12", "f-active": true, "f-site": "globex.io" } },
        { id: "r3", ts: now, v: { "f-name": "Initech", "f-mrr": 0, "f-plan": "Free", "f-tags": ["Churn risk"], "f-active": false, "f-site": "initech.dev" } },
        { id: "r4", ts: now, v: { "f-name": "Umbra Analytics", "f-mrr": 1620, "f-plan": "Scale", "f-renew": "2026-11-30", "f-active": true, "f-site": "umbra.app" } },
      ],
      views: [
        { id: "v1", name: "All customers", filters: [], hidden: [] },
        { id: "v2", name: "By plan", filters: [], hidden: ["f-site"], groupBy: "f-plan" },
      ],
      activeView: "v1",
      calcs: { "f-mrr": "sum", "f-name": "count" },
    },
    {
      id: "c-content", name: "Content calendar",
      fields: [
        { id: "g-title", name: "Title", type: "text", width: "l" },
        { id: "g-chan", name: "Channel", type: "select", options: ["Blog", "X", "LinkedIn"], width: "s" },
        { id: "g-date", name: "Publish", type: "date", width: "s" },
        { id: "g-done", name: "Done", type: "check", width: "s" },
      ],
      rows: [
        { id: "s1", ts: now, v: { "g-title": "Panels, not pages — the manifesto", "g-chan": "Blog", "g-date": "2026-07-24", "g-done": false } },
        { id: "s2", ts: now, v: { "g-title": "Canvas board demo clip", "g-chan": "X", "g-date": "2026-07-22", "g-done": true } },
        { id: "s3", ts: now, v: { "g-title": "Migration engine announcement", "g-chan": "LinkedIn", "g-date": "2026-07-28", "g-done": false } },
      ],
      views: [{ id: "v1", name: "Table", filters: [], hidden: [] }],
      activeView: "v1",
    },
  ],
};

function load(): DataState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(raw?.collections)) {
      // legacy (pre-views) collections carried filters/sort at the top level
      for (const c of raw.collections) {
        if (!Array.isArray(c.views) || c.views.length === 0) {
          c.views = [{ id: "v1", name: "Table", filters: c.filters ?? [], sort: c.sort, hidden: [] }];
          c.activeView = "v1";
          delete c.filters; delete c.sort;
        }
        if (!c.activeView || !c.views.some((v: View) => v.id === c.activeView)) c.activeView = c.views[0].id;
        for (const v of c.views) { v.filters ??= []; v.hidden ??= []; }
      }
      return raw as DataState;
    }
  } catch { /* seed */ }
  return SEED;
}

let state: DataState = load();
const subs = new Set<() => void>();
const emit = () => { localStorage.setItem(KEY, JSON.stringify(state)); subs.forEach((f) => f()); };
const uid = (p: string) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);

export const dataApp = {
  get: () => state,
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
  update: (fn: (s: DataState) => DataState) => { state = fn(state); emit(); },
  col: (id: string) => state.collections.find((c) => c.id === id),
  row: (colId: string, rowId: string) => dataApp.col(colId)?.rows.find((r) => r.id === rowId),
  view: (colId: string): View => {
    const c = dataApp.col(colId);
    return c?.views.find((v) => v.id === c.activeView) ?? c?.views[0] ?? defView("v1");
  },
  patchCol: (id: string, patch: Partial<Collection>) =>
    dataApp.update((s) => ({ collections: s.collections.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  patchView: (colId: string, patch: Partial<View>) => {
    const c = dataApp.col(colId);
    if (!c) return;
    dataApp.patchCol(colId, { views: c.views.map((v) => (v.id === c.activeView ? { ...v, ...patch } : v)) });
  },
  addView: (colId: string): string => {
    const id = uid("v");
    const c = dataApp.col(colId);
    if (!c) return id;
    dataApp.patchCol(colId, { views: [...c.views, { ...defView(id), name: "View " + (c.views.length + 1) }], activeView: id });
    return id;
  },
  removeView: (colId: string, viewId: string) => {
    const c = dataApp.col(colId);
    if (!c || c.views.length <= 1) return;
    const views = c.views.filter((v) => v.id !== viewId);
    dataApp.patchCol(colId, { views, activeView: c.activeView === viewId ? views[0].id : c.activeView });
  },
  addCollection: (): string => {
    const id = uid("c");
    dataApp.update((s) => ({
      collections: [...s.collections, {
        id, name: "New table",
        fields: [{ id: uid("f"), name: "Name", type: "text" as FieldType, width: "m" as const }],
        rows: [], views: [defView("v1")], activeView: "v1",
      }],
    }));
    return id;
  },
  removeCollection: (id: string) =>
    dataApp.update((s) => ({ collections: s.collections.filter((c) => c.id !== id) })),
  addRow: (colId: string, preset?: Record<string, CellValue>): string => {
    const id = uid("r");
    dataApp.patchCol(colId, { rows: [...(dataApp.col(colId)?.rows ?? []), { id, v: preset ?? {}, ts: Date.now() }] });
    return id;
  },
  duplicateRow: (colId: string, rowId: string): string => {
    const id = uid("r");
    const c = dataApp.col(colId);
    if (!c) return id;
    const rows: Row[] = [];
    for (const r of c.rows) {
      rows.push(r);
      if (r.id === rowId) rows.push({ ...r, id, v: { ...r.v }, ts: Date.now() });
    }
    dataApp.patchCol(colId, { rows });
    return id;
  },
  patchRow: (colId: string, rowId: string, patch: Partial<Row>) =>
    dataApp.patchCol(colId, { rows: (dataApp.col(colId)?.rows ?? []).map((r) => (r.id === rowId ? { ...r, ...patch, ts: Date.now() } : r)) }),
  setCell: (colId: string, rowId: string, fieldId: string, value: CellValue) =>
    dataApp.patchCol(colId, { rows: (dataApp.col(colId)?.rows ?? []).map((r) => (r.id === rowId ? { ...r, v: { ...r.v, [fieldId]: value }, ts: Date.now() } : r)) }),
  removeRow: (colId: string, rowId: string) =>
    dataApp.patchCol(colId, { rows: (dataApp.col(colId)?.rows ?? []).filter((r) => r.id !== rowId) }),
  addField: (colId: string, type: FieldType): string => {
    const id = uid("f");
    const names: Record<FieldType, string> = { text: "Text", number: "Number", select: "Select", multiselect: "Tags", date: "Date", check: "Check", url: "Link", email: "Email", phone: "Phone" };
    const c = dataApp.col(colId);
    dataApp.patchCol(colId, {
      fields: [...(c?.fields ?? []), { id, name: names[type], type, options: type === "select" || type === "multiselect" ? ["Option A", "Option B"] : undefined }],
    });
    return id;
  },
  duplicateField: (colId: string, fieldId: string) => {
    const c = dataApp.col(colId);
    const f = c?.fields.find((x) => x.id === fieldId);
    if (!c || !f) return;
    const id = uid("f");
    const fields: Field[] = [];
    for (const x of c.fields) { fields.push(x); if (x.id === fieldId) fields.push({ ...f, id, name: f.name + " copy" }); }
    dataApp.patchCol(colId, {
      fields,
      rows: c.rows.map((r) => ({ ...r, v: { ...r.v, [id]: Array.isArray(r.v[fieldId]) ? [...(r.v[fieldId] as string[])] : r.v[fieldId] } })),
    });
  },
  moveField: (colId: string, fieldId: string, dir: -1 | 1) => {
    const c = dataApp.col(colId);
    if (!c) return;
    const i = c.fields.findIndex((x) => x.id === fieldId);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= c.fields.length) return;
    const fields = [...c.fields];
    [fields[i], fields[j]] = [fields[j], fields[i]];
    dataApp.patchCol(colId, { fields });
  },
  removeField: (colId: string, fieldId: string) => {
    const c = dataApp.col(colId);
    if (!c) return;
    dataApp.patchCol(colId, {
      fields: c.fields.filter((f) => f.id !== fieldId),
      views: c.views.map((v) => ({
        ...v,
        filters: v.filters.filter((f) => f.fieldId !== fieldId),
        sort: v.sort?.fieldId === fieldId ? undefined : v.sort,
        hidden: v.hidden.filter((h) => h !== fieldId),
        groupBy: v.groupBy === fieldId ? undefined : v.groupBy,
      })),
    });
  },
};
export const useDataApp = () => useSyncExternalStore(dataApp.subscribe, dataApp.get);

/* ── filtering / sorting / grouping / calcs ──────────────────────────── */
const OPS: Record<FieldType, { id: string; label: string }[]> = {
  text: [{ id: "contains", label: "contains" }, { id: "is", label: "is" }, { id: "empty", label: "is empty" }],
  url: [{ id: "contains", label: "contains" }, { id: "empty", label: "is empty" }],
  email: [{ id: "contains", label: "contains" }, { id: "empty", label: "is empty" }],
  phone: [{ id: "contains", label: "contains" }, { id: "empty", label: "is empty" }],
  number: [{ id: "eq", label: "=" }, { id: "gt", label: ">" }, { id: "lt", label: "<" }],
  select: [{ id: "is", label: "is" }, { id: "not", label: "is not" }],
  multiselect: [{ id: "has", label: "has" }, { id: "nothas", label: "does not have" }],
  date: [{ id: "on", label: "on" }, { id: "before", label: "before" }, { id: "after", label: "after" }],
  check: [{ id: "checked", label: "is checked" }, { id: "unchecked", label: "is not checked" }],
};

function passes(row: Row, f: Filter): boolean {
  const raw = row.v[f.fieldId];
  const s = Array.isArray(raw) ? raw.join(" ").toLowerCase() : String(raw ?? "").toLowerCase();
  const q = f.value.toLowerCase();
  switch (f.op) {
    case "contains": return s.includes(q);
    case "is": return s === q;
    case "not": return s !== q;
    case "has": return Array.isArray(raw) && raw.some((x) => x.toLowerCase() === q);
    case "nothas": return !Array.isArray(raw) || !raw.some((x) => x.toLowerCase() === q);
    case "empty": return s === "";
    case "eq": return Number(raw) === Number(f.value);
    case "gt": return Number(raw) > Number(f.value);
    case "lt": return Number(raw) < Number(f.value);
    case "on": return s === q;
    case "before": return !!s && s < q;
    case "after": return !!s && s > q;
    case "checked": return raw === true;
    case "unchecked": return raw !== true;
    default: return true;
  }
}

function viewRows(c: Collection, view: View, q: string): Row[] {
  let rows = c.rows;
  if (q.trim()) {
    const s = q.trim().toLowerCase();
    rows = rows.filter((r) => c.fields.some((f) => {
      const v = r.v[f.id];
      return (Array.isArray(v) ? v.join(" ") : String(v ?? "")).toLowerCase().includes(s);
    }));
  }
  for (const f of view.filters) rows = rows.filter((r) => passes(r, f));
  if (view.sort) {
    const { fieldId, dir } = view.sort;
    const field = c.fields.find((x) => x.id === fieldId);
    rows = [...rows].sort((a, b) => {
      const av = a.v[fieldId]; const bv = b.v[fieldId];
      let cmp: number;
      if (field?.type === "number") cmp = (Number(av) || 0) - (Number(bv) || 0);
      else if (field?.type === "check") cmp = Number(!!av) - Number(!!bv);
      else cmp = String(Array.isArray(av) ? av[0] ?? "" : av ?? "").localeCompare(String(Array.isArray(bv) ? bv[0] ?? "" : bv ?? ""));
      return dir === "asc" ? cmp : -cmp;
    });
  }
  return rows;
}

const CALCS_ANY = [{ id: "count", label: "Count" }, { id: "filled", label: "Filled" }, { id: "empty", label: "Empty" }];
const CALCS_NUM = [{ id: "sum", label: "Sum" }, { id: "avg", label: "Avg" }, { id: "min", label: "Min" }, { id: "max", label: "Max" }];

function calcValue(rows: Row[], field: Field, op: string): string {
  const vals = rows.map((r) => r.v[field.id]);
  const filled = vals.filter((v) => (Array.isArray(v) ? v.length > 0 : v !== undefined && v !== "" && v !== false));
  switch (op) {
    case "count": return String(rows.length);
    case "filled": return String(filled.length);
    case "empty": return String(rows.length - filled.length);
  }
  const nums = vals.map((v) => Number(v)).filter((n) => !isNaN(n));
  if (nums.length === 0) return "—";
  switch (op) {
    case "sum": return String(Math.round(nums.reduce((a, b) => a + b, 0) * 100) / 100);
    case "avg": return String(Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10);
    case "min": return String(Math.min(...nums));
    case "max": return String(Math.max(...nums));
    default: return "—";
  }
}

/* ── home: the list of collections ───────────────────────────────────── */
export function DataHome({ panelId }: { panelId: string }) {
  const ws = useWorkspace();
  const s = useDataApp();
  return (
    <div className="section">
      <div className="lab">Tables · {s.collections.length}</div>
      {s.collections.length === 0 && <p style={{ marginTop: 6 }}>No tables yet — create one from the foot.</p>}
      <div className="drills" style={{ marginTop: 8 }}>
        {s.collections.map((c) => (
          <button key={c.id} className="drill"
            onClick={() => ws.openDetail(panelId, { panelType: "datatable", resourceKey: "dtc:" + c.id })}>
            <span className="no">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 10h18M3 15h18M9 4v16" /></svg>
            </span>
            <span className="bd">
              <span className="tt" style={{ display: "block" }}>{c.name}</span>
              <span className="ss" style={{ display: "block" }}>{c.rows.length} rows · {c.fields.length} fields · {c.views.length} view{c.views.length > 1 ? "s" : ""}</span>
            </span>
            <span className="arr">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── cell editors ────────────────────────────────────────────────────── */
function Cell({ colId, row, field, wrap }: { colId: string; row: Row; field: Field; wrap?: boolean }) {
  const [fly, setFly] = useState(false);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const v = row.v[field.id];
  const set = (nv: CellValue) => dataApp.setCell(colId, row.id, field.id, nv);
  switch (field.type) {
    case "check":
      return (
        <button className={"dt-check" + (v === true ? " on" : "")} aria-pressed={v === true}
          onClick={() => set(v !== true)}>✓</button>
      );
    case "select":
      return (
        <span className="dp-wrap" style={{ width: "100%" }}>
          <button className={"dt-pill" + (v ? "" : " empty")} onClick={(e) => { setPos(popPos(e, 220, 150)); setFly((x) => !x); }}>
            {String(v ?? "—")}
          </button>
          {fly && <div className="pop-bg" onMouseDown={() => setFly(false)} />}
          {fly && (
            <div className="dp-pop dt-selfly" style={pos}>
              {(field.options ?? []).map((o) => (
                <button key={o} className={"tp-slot" + (v === o ? " on" : "")}
                  onClick={() => { set(o); setFly(false); }}>{o}</button>
              ))}
              {v != null && <button className="dp-clear" onClick={() => { set(undefined); setFly(false); }}>Clear</button>}
            </div>
          )}
        </span>
      );
    case "multiselect": {
      const sel = Array.isArray(v) ? v : [];
      return (
        <span className="dp-wrap" style={{ width: "100%" }}>
          <button className={"dt-tags" + (sel.length ? "" : " empty")} onClick={(e) => { setPos(popPos(e, 240, 150)); setFly((x) => !x); }}>
            {sel.length === 0 ? "—" : sel.map((t) => <span key={t} className="dt-tag">{t}</span>)}
          </button>
          {fly && <div className="pop-bg" onMouseDown={() => setFly(false)} />}
          {fly && (
            <div className="dp-pop dt-selfly" style={pos}>
              {(field.options ?? []).map((o) => {
                const on = sel.includes(o);
                return (
                  <button key={o} className={"tp-slot" + (on ? " on" : "")}
                    onClick={() => set(on ? sel.filter((x) => x !== o) : [...sel, o])}>
                    {o}{on ? " ✓" : ""}
                  </button>
                );
              })}
              {sel.length > 0 && <button className="dp-clear" onClick={() => { set(undefined); setFly(false); }}>Clear</button>}
            </div>
          )}
        </span>
      );
    }
    case "date":
      return <DatePicker value={v ? String(v) : undefined} onChange={(nv) => set(nv)} />;
    case "number":
      return (
        <input className="dt-cell num" inputMode="decimal" value={v == null ? "" : String(v)}
          onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value) || 0)} />
      );
    default: {
      const cls = "dt-cell" + (field.type === "url" || field.type === "email" ? " url" : "");
      if (wrap && field.type === "text") {
        return (
          <textarea className={cls + " wrap"} rows={1} value={v == null ? "" : String(v)}
            onChange={(e) => set(e.target.value || undefined)} />
        );
      }
      return (
        <input className={cls} value={v == null ? "" : String(v)}
          onChange={(e) => set(e.target.value || undefined)} />
      );
    }
  }
}

/* ── the table panel — views, toolbar, grid, group, calcs ────────────── */
const WIDTHS: Record<string, number> = { s: 120, m: 200, l: 300 };

export function DataTable({ colKey, panelId }: { colKey: string; panelId: string }) {
  const ws = useWorkspace();
  const s = useDataApp();
  const c = s.collections.find((x) => x.id === colKey.slice(4));
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<null | string>(null);
  const [pos, setPos] = useState<React.CSSProperties>({});
  const [renView, setRenView] = useState<{ id: string; v: string } | null>(null);
  const openMenu = (id: string, e: { currentTarget: EventTarget & Element }, h = 240, w = 180) => {
    setPos(popPos(e, h, w));
    setMenu(menu === id ? null : id);
  };
  if (!c) return <div className="leaf-note">This table was deleted.</div>;
  const view = c.views.find((v) => v.id === c.activeView) ?? c.views[0];
  const fields = c.fields.filter((f) => !view.hidden.includes(f.id));
  const rows = viewRows(c, view, q);
  const openRow = (id: string) =>
    ws.openDetail(panelId, { panelType: "datarow", resourceKey: "dtr:" + c.id + ":" + id });
  const groupField = view.groupBy ? c.fields.find((f) => f.id === view.groupBy) : undefined;
  const groups: { label: string; rows: Row[] }[] = groupField
    ? [...(groupField.options ?? []).map((o) => ({ label: o, rows: rows.filter((r) => r.v[groupField.id] === o) })),
       { label: "No " + groupField.name.toLowerCase(), rows: rows.filter((r) => !r.v[groupField.id]) }]
      .filter((g) => g.rows.length > 0)
    : [{ label: "", rows }];

  const HeaderCell = ({ f }: { f: Field }) => (
    <th style={{ minWidth: WIDTHS[f.width ?? "m"] }}>
      <span className="dp-wrap" style={{ display: "block" }}>
        <button className="dt-th" onClick={(e) => openMenu("h:" + f.id, e, 330, 170)}>
          {f.name}
          {view.sort?.fieldId === f.id && <span className="dir">{view.sort.dir === "asc" ? "↑" : "↓"}</span>}
          <span className="caret">⌄</span>
        </button>
        {menu === "h:" + f.id && (
          <div className="dp-pop dt-selfly" style={pos}>
            <input className="inline-edit" defaultValue={f.name} autoFocus title="Rename field"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const name = (e.target as HTMLInputElement).value.trim();
                  if (name) dataApp.patchCol(c.id, { fields: c.fields.map((x) => (x.id === f.id ? { ...x, name } : x)) });
                  setMenu(null);
                }
                if (e.key === "Escape") setMenu(null);
              }}
              onBlur={(e) => {
                const name = e.target.value.trim();
                if (name && name !== f.name) dataApp.patchCol(c.id, { fields: c.fields.map((x) => (x.id === f.id ? { ...x, name } : x)) });
              }} />
            <button className="tp-slot" onMouseDown={(e) => e.preventDefault()} onClick={() => { dataApp.patchView(c.id, { sort: { fieldId: f.id, dir: "asc" } }); setMenu(null); }}>Sort ↑</button>
            <button className="tp-slot" onMouseDown={(e) => e.preventDefault()} onClick={() => { dataApp.patchView(c.id, { sort: { fieldId: f.id, dir: "desc" } }); setMenu(null); }}>Sort ↓</button>
            <button className="tp-slot" onMouseDown={(e) => e.preventDefault()} onClick={() => { dataApp.patchView(c.id, { hidden: [...view.hidden, f.id] }); setMenu(null); }}>Hide in view</button>
            <button className="tp-slot" onMouseDown={(e) => e.preventDefault()} onClick={() => { dataApp.duplicateField(c.id, f.id); setMenu(null); }}>Duplicate field</button>
            <div className="dt-mrow">
              <button className="tp-slot" onMouseDown={(e) => e.preventDefault()} onClick={() => dataApp.moveField(c.id, f.id, -1)}>← Move</button>
              <button className="tp-slot" onMouseDown={(e) => e.preventDefault()} onClick={() => dataApp.moveField(c.id, f.id, 1)}>Move →</button>
            </div>
            <div className="dt-mrow">
              {(["s", "m", "l"] as const).map((w) => (
                <button key={w} className={"tp-slot" + ((f.width ?? "m") === w ? " on" : "")}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => dataApp.patchCol(c.id, { fields: c.fields.map((x) => (x.id === f.id ? { ...x, width: w } : x)) })}>
                  {w.toUpperCase()}
                </button>
              ))}
            </div>
            {(f.type === "select" || f.type === "multiselect") && (
              <input className="inline-edit" placeholder="+ Add option…"
                onMouseDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const o = (e.target as HTMLInputElement).value.trim();
                    if (o) dataApp.patchCol(c.id, { fields: c.fields.map((x) => (x.id === f.id ? { ...x, options: [...(x.options ?? []), o] } : x)) });
                    (e.target as HTMLInputElement).value = "";
                  }
                }} />
            )}
            {c.fields.length > 1 && (
              <button className="tp-slot danger" onMouseDown={(e) => e.preventDefault()} onClick={() => { dataApp.removeField(c.id, f.id); setMenu(null); }}>Delete field</button>
            )}
          </div>
        )}
      </span>
    </th>
  );

  const BodyRow = ({ r }: { r: Row }) => (
    <tr>
      <td className="dt-opentd">
        <button className="dt-open" title="Open as a page" onClick={() => openRow(r.id)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg>
        </button>
        <span className="dp-wrap">
          <button className="dt-open" title="Row actions" onClick={(e) => openMenu("r:" + r.id, e, 130, 160)}>⋯</button>
          {menu === "r:" + r.id && (
            <div className="dp-pop dt-selfly" style={pos}>
              <button className="tp-slot" onClick={() => { dataApp.duplicateRow(c.id, r.id); setMenu(null); }}>Duplicate row</button>
              <button className="tp-slot" onClick={() => { openRow(r.id); setMenu(null); }}>Open page</button>
              <button className="tp-slot danger" onClick={() => { dataApp.removeRow(c.id, r.id); setMenu(null); }}>Delete row</button>
            </div>
          )}
        </span>
      </td>
      {fields.map((f) => (
        <td key={f.id}><Cell colId={c.id} row={r} field={f} wrap={view.wrap} /></td>
      ))}
    </tr>
  );

  return (
    <>
      {menu && <div className="pop-bg" onMouseDown={() => setMenu(null)} />}

      {/* named views — each carries its own filters/sort/hidden/group/wrap */}
      <div className="dtv-tabs">
        {c.views.map((v) => (
          renView?.id === v.id ? (
            <input key={v.id} className="inline-edit" autoFocus value={renView.v} style={{ width: 120 }}
              onChange={(e) => setRenView({ id: v.id, v: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") { dataApp.patchCol(c.id, { views: c.views.map((x) => (x.id === v.id ? { ...x, name: renView.v.trim() || x.name } : x)) }); setRenView(null); }
                if (e.key === "Escape") setRenView(null);
              }}
              onBlur={() => { dataApp.patchCol(c.id, { views: c.views.map((x) => (x.id === v.id ? { ...x, name: renView.v.trim() || x.name } : x)) }); setRenView(null); }} />
          ) : (
            <button key={v.id} className={"dtv-tab" + (v.id === c.activeView ? " on" : "")}
              onClick={() => dataApp.patchCol(c.id, { activeView: v.id })}
              onDoubleClick={() => setRenView({ id: v.id, v: v.name })}>
              {v.name}
              {v.id === c.activeView && c.views.length > 1 && (
                <span className="x" title="Delete view" onClick={(e) => { e.stopPropagation(); dataApp.removeView(c.id, v.id); }}>✕</span>
              )}
            </button>
          )
        ))}
        <button className="dtv-add" title="New view" onClick={() => dataApp.addView(c.id)}>+</button>
      </div>

      <div className="dt-toolbar">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--muted-foreground)", flex: "none" }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        <input className="foot-search" style={{ maxWidth: 200 }} placeholder="Search rows…"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <span style={{ flex: 1 }} />
        {view.sort && (
          <button className="d-btn sm" title="Clear sort"
            onClick={() => dataApp.patchView(c.id, { sort: undefined })}>
            {c.fields.find((f) => f.id === view.sort!.fieldId)?.name} {view.sort.dir === "asc" ? "↑" : "↓"} ✕
          </button>
        )}
        {groupField && (
          <button className="d-btn sm" title="Clear grouping"
            onClick={() => dataApp.patchView(c.id, { groupBy: undefined })}>
            Group: {groupField.name} ✕
          </button>
        )}
        {view.hidden.length > 0 && (
          <span className="dp-wrap">
            <button className="d-btn outline sm" onClick={(e) => openMenu("hidden", e, 200, 180)}>
              {view.hidden.length} hidden
            </button>
            {menu === "hidden" && (
              <div className="dp-pop dt-selfly" style={pos}>
                {view.hidden.map((hid) => (
                  <button key={hid} className="tp-slot"
                    onClick={() => { if (view.hidden.length === 1) setMenu(null); dataApp.patchView(c.id, { hidden: view.hidden.filter((x) => x !== hid) }); }}>
                    Show {c.fields.find((f) => f.id === hid)?.name ?? "?"}
                  </button>
                ))}
              </div>
            )}
          </span>
        )}
        <span className="dp-wrap">
          <button className={"d-btn sm " + (view.filters.length ? "" : "outline")}
            onClick={(e) => openMenu("filter", e, 320, 250)}>
            Filter{view.filters.length ? " · " + view.filters.length : ""}
          </button>
          {menu === "filter" && (
            <div className="dp-pop dt-filterfly" style={pos}>
              {view.filters.map((f, i) => {
                const field = c.fields.find((x) => x.id === f.fieldId);
                return (
                  <div key={i} className="dt-frow">
                    <span className="dt-fname">{field?.name ?? "?"}</span>
                    <span className="dt-fop">{OPS[field?.type ?? "text"].find((o) => o.id === f.op)?.label ?? f.op}</span>
                    {!["empty", "checked", "unchecked"].includes(f.op) && (
                      <input className="inline-edit" value={f.value}
                        onChange={(e) => dataApp.patchView(c.id, { filters: view.filters.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
                    )}
                    <button className="cv-conn-edit" title="Remove rule"
                      onClick={() => dataApp.patchView(c.id, { filters: view.filters.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                );
              })}
              <div className="dt-addrule">
                {c.fields.map((f) => (
                  <button key={f.id} className="tp-slot"
                    onClick={() => dataApp.patchView(c.id, { filters: [...view.filters, { fieldId: f.id, op: OPS[f.type][0].id, value: "" }] })}>
                    + {f.name}
                  </button>
                ))}
              </div>
              {view.filters.length > 0 && (
                <button className="dp-clear" onClick={() => dataApp.patchView(c.id, { filters: [] })}>Clear all filters</button>
              )}
            </div>
          )}
        </span>
        <span className="dp-wrap">
          <button className="d-btn outline sm" onClick={(e) => openMenu("field", e, 330, 170)}>+ Field</button>
          {menu === "field" && (
            <div className="dp-pop dt-selfly" style={pos}>
              {(["text", "number", "select", "multiselect", "date", "check", "url", "email", "phone"] as FieldType[]).map((t) => (
                <button key={t} className="tp-slot" onClick={() => { dataApp.addField(c.id, t); setMenu(null); }}>
                  {t === "check" ? "checkbox" : t === "multiselect" ? "multi-select" : t}
                </button>
              ))}
            </div>
          )}
        </span>
        <span className="dp-wrap">
          <button className="d-btn outline sm" title="View options" onClick={(e) => openMenu("opts", e, 260, 170)}>⋯</button>
          {menu === "opts" && (
            <div className="dp-pop dt-selfly" style={{ ...pos, width: 170 }}>
              <button className="tp-slot" onClick={() => dataApp.patchView(c.id, { wrap: !view.wrap })}>{view.wrap ? "✓ " : ""}Wrap text lines</button>
              <div className="pop-sub" style={{ margin: "6px 8px 2px" }}>Group by</div>
              <button className={"tp-slot" + (!view.groupBy ? " on" : "")} onClick={() => { dataApp.patchView(c.id, { groupBy: undefined }); setMenu(null); }}>None</button>
              {c.fields.filter((f) => f.type === "select").map((f) => (
                <button key={f.id} className={"tp-slot" + (view.groupBy === f.id ? " on" : "")}
                  onClick={() => { dataApp.patchView(c.id, { groupBy: f.id }); setMenu(null); }}>
                  {f.name}
                </button>
              ))}
            </div>
          )}
        </span>
        <span className="dt-count">{rows.length}/{c.rows.length}</span>
      </div>

      <div className="dt-scroll">
        <table className="dt">
          <thead>
            <tr>
              <th className="dt-openth" />
              {fields.map((f) => <HeaderCell key={f.id} f={f} />)}
            </tr>
          </thead>
          {groups.map((g, gi) => (
            <tbody key={gi}>
              {groupField && (
                <tr className="dt-group">
                  <td colSpan={fields.length + 1}>
                    <span className="dt-gname">{g.label}</span>
                    <span className="dt-gcount">{g.rows.length}</span>
                  </td>
                </tr>
              )}
              {g.rows.map((r) => <BodyRow key={r.id} r={r} />)}
            </tbody>
          ))}
          {rows.length === 0 && (
            <tbody><tr><td colSpan={fields.length + 1} className="dt-empty">No rows match — clear the search or filters.</td></tr></tbody>
          )}
          <tfoot>
            <tr>
              <td className="dt-opentd" />
              {fields.map((f) => {
                const op = c.calcs?.[f.id];
                const opts = f.type === "number" ? [...CALCS_ANY, ...CALCS_NUM] : CALCS_ANY;
                return (
                  <td key={f.id}>
                    <span className="dp-wrap" style={{ display: "block" }}>
                      <button className={"dt-calc" + (op ? " on" : "")}
                        onClick={(e) => openMenu("c:" + f.id, e, 260, 150)}>
                        {op ? `${opts.find((o) => o.id === op)?.label ?? op} ${calcValue(rows, f, op)}` : "Calc ⌄"}
                      </button>
                      {menu === "c:" + f.id && (
                        <div className="dp-pop dt-selfly" style={{ bottom: "calc(100% + 6px)", top: "auto" }}>
                          <button className={"tp-slot" + (!op ? " on" : "")}
                            onClick={() => {
                              const calcs = { ...(c.calcs ?? {}) };
                              delete calcs[f.id];
                              dataApp.patchCol(c.id, { calcs });
                              setMenu(null);
                            }}>None</button>
                          {opts.map((o) => (
                            <button key={o.id} className={"tp-slot" + (op === o.id ? " on" : "")}
                              onClick={() => { dataApp.patchCol(c.id, { calcs: { ...(c.calcs ?? {}), [f.id]: o.id } }); setMenu(null); }}>
                              {o.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </span>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </>
  );
}

/* ── the row panel — a Notion-class page ─────────────────────────────── */
export function DataRow({ rowKey, panelId }: { rowKey: string; panelId: string }) {
  const s = useDataApp();
  void panelId;
  const [, colId, rowId] = rowKey.split(":");
  const c = s.collections.find((x) => x.id === colId);
  const r = c?.rows.find((x) => x.id === rowId);
  if (!c || !r) return <div className="leaf-note">This row was deleted.</div>;
  const firstText = c.fields.find((f) => f.type === "text");
  return (
    <>
      {firstText && (
        <input className="nt-title" autoFocus value={String(r.v[firstText.id] ?? "")} placeholder="Untitled"
          onChange={(e) => dataApp.setCell(c.id, r.id, firstText.id, e.target.value || undefined)} />
      )}
      <div className="section">
        <div className="lab">Fields</div>
        <div className="dt-props">
          {c.fields.filter((f) => f.id !== firstText?.id).map((f) => (
            <div key={f.id} className="dt-prop">
              <span className="dt-proplabel">{f.name}</span>
              <span className="dt-propval"><Cell colId={c.id} row={r} field={f} /></span>
            </div>
          ))}
        </div>
      </div>
      <div className="section">
        <div className="lab">Page</div>
        <RichNotes key={r.id} html={r.page ?? ""} placeholder="Write the page — this row is also a document…"
          onChange={(h) => dataApp.patchRow(c.id, r.id, { page: h })} />
      </div>
    </>
  );
}
