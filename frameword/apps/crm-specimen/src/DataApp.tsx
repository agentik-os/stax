/**
 * DataApp — integrated tables + pages, in the panel grammar. Airtable-class
 * collections (typed fields, inline cells, filters, sort) where every row
 * opens as the NEXT panel: a Notion-class page (fields + rich body).
 * The recurring panel options — search, filter, sort — live in a standard
 * toolbar every data panel shares. One store, localStorage-persisted.
 */
import { useState, useSyncExternalStore } from "react";
import { useWorkspace } from "@frameword/panels-react";
import { RichNotes } from "./CanvasBoard";
import { DatePicker } from "./NotesApp";

/* ── model ───────────────────────────────────────────────────────────── */
export type FieldType = "text" | "number" | "select" | "date" | "check" | "url";
export interface Field { id: string; name: string; type: FieldType; options?: string[] }
export interface Row { id: string; v: Record<string, string | number | boolean | undefined>; page?: string; ts: number }
export interface Filter { fieldId: string; op: string; value: string }
export interface Collection {
  id: string; name: string;
  fields: Field[]; rows: Row[];
  filters: Filter[]; sort?: { fieldId: string; dir: "asc" | "desc" };
}
interface DataState { collections: Collection[] }

const KEY = "frameword-data";
const now = Date.now();

const SEED: DataState = {
  collections: [
    {
      id: "c-customers", name: "Customers",
      fields: [
        { id: "f-name", name: "Name", type: "text" },
        { id: "f-mrr", name: "MRR", type: "number" },
        { id: "f-plan", name: "Plan", type: "select", options: ["Free", "Pro", "Scale"] },
        { id: "f-renew", name: "Renewal", type: "date" },
        { id: "f-active", name: "Active", type: "check" },
        { id: "f-site", name: "Site", type: "url" },
      ],
      rows: [
        { id: "r1", ts: now, v: { "f-name": "Acme Industries", "f-mrr": 2400, "f-plan": "Scale", "f-renew": "2026-09-01", "f-active": true, "f-site": "acme.com" }, page: "<h2>Account brief</h2><p>Flagship customer since 2024 — panels rolled out to 3 teams.</p><ul><li><p>Champion: Jo Lambert</p></li><li><p>Next QBR: September</p></li></ul>" },
        { id: "r2", ts: now, v: { "f-name": "Globex", "f-mrr": 840, "f-plan": "Pro", "f-renew": "2026-08-12", "f-active": true, "f-site": "globex.io" } },
        { id: "r3", ts: now, v: { "f-name": "Initech", "f-mrr": 0, "f-plan": "Free", "f-active": false, "f-site": "initech.dev" } },
        { id: "r4", ts: now, v: { "f-name": "Umbra Analytics", "f-mrr": 1620, "f-plan": "Scale", "f-renew": "2026-11-30", "f-active": true, "f-site": "umbra.app" } },
      ],
      filters: [],
    },
    {
      id: "c-content", name: "Content calendar",
      fields: [
        { id: "g-title", name: "Title", type: "text" },
        { id: "g-chan", name: "Channel", type: "select", options: ["Blog", "X", "LinkedIn"] },
        { id: "g-date", name: "Publish", type: "date" },
        { id: "g-done", name: "Done", type: "check" },
      ],
      rows: [
        { id: "s1", ts: now, v: { "g-title": "Panels, not pages — the manifesto", "g-chan": "Blog", "g-date": "2026-07-24", "g-done": false } },
        { id: "s2", ts: now, v: { "g-title": "Canvas board demo clip", "g-chan": "X", "g-date": "2026-07-22", "g-done": true } },
        { id: "s3", ts: now, v: { "g-title": "Migration engine announcement", "g-chan": "LinkedIn", "g-date": "2026-07-28", "g-done": false } },
      ],
      filters: [],
    },
  ],
};

function load(): DataState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(raw?.collections)) return raw as DataState;
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
  patchCol: (id: string, patch: Partial<Collection>) =>
    dataApp.update((s) => ({ collections: s.collections.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  addCollection: (): string => {
    const id = uid("c");
    dataApp.update((s) => ({
      collections: [...s.collections, {
        id, name: "New table",
        fields: [{ id: uid("f"), name: "Name", type: "text" }],
        rows: [], filters: [],
      }],
    }));
    return id;
  },
  removeCollection: (id: string) =>
    dataApp.update((s) => ({ collections: s.collections.filter((c) => c.id !== id) })),
  addRow: (colId: string): string => {
    const id = uid("r");
    dataApp.patchCol(colId, { rows: [...(dataApp.col(colId)?.rows ?? []), { id, v: {}, ts: Date.now() }] });
    return id;
  },
  patchRow: (colId: string, rowId: string, patch: Partial<Row>) =>
    dataApp.patchCol(colId, { rows: (dataApp.col(colId)?.rows ?? []).map((r) => (r.id === rowId ? { ...r, ...patch, ts: Date.now() } : r)) }),
  setCell: (colId: string, rowId: string, fieldId: string, value: Row["v"][string]) =>
    dataApp.patchCol(colId, { rows: (dataApp.col(colId)?.rows ?? []).map((r) => (r.id === rowId ? { ...r, v: { ...r.v, [fieldId]: value }, ts: Date.now() } : r)) }),
  removeRow: (colId: string, rowId: string) =>
    dataApp.patchCol(colId, { rows: (dataApp.col(colId)?.rows ?? []).filter((r) => r.id !== rowId) }),
  addField: (colId: string, type: FieldType): string => {
    const id = uid("f");
    const names: Record<FieldType, string> = { text: "Text", number: "Number", select: "Select", date: "Date", check: "Check", url: "Link" };
    const c = dataApp.col(colId);
    dataApp.patchCol(colId, {
      fields: [...(c?.fields ?? []), { id, name: names[type], type, options: type === "select" ? ["Option A", "Option B"] : undefined }],
    });
    return id;
  },
  removeField: (colId: string, fieldId: string) => {
    const c = dataApp.col(colId);
    dataApp.patchCol(colId, {
      fields: (c?.fields ?? []).filter((f) => f.id !== fieldId),
      filters: (c?.filters ?? []).filter((f) => f.fieldId !== fieldId),
      sort: c?.sort?.fieldId === fieldId ? undefined : c?.sort,
    });
  },
};
export const useDataApp = () => useSyncExternalStore(dataApp.subscribe, dataApp.get);

/* ── filtering / sorting ─────────────────────────────────────────────── */
const OPS: Record<FieldType, { id: string; label: string }[]> = {
  text: [{ id: "contains", label: "contains" }, { id: "is", label: "is" }, { id: "empty", label: "is empty" }],
  url: [{ id: "contains", label: "contains" }, { id: "empty", label: "is empty" }],
  number: [{ id: "eq", label: "=" }, { id: "gt", label: ">" }, { id: "lt", label: "<" }],
  select: [{ id: "is", label: "is" }, { id: "not", label: "is not" }],
  date: [{ id: "on", label: "on" }, { id: "before", label: "before" }, { id: "after", label: "after" }],
  check: [{ id: "checked", label: "is checked" }, { id: "unchecked", label: "is not checked" }],
};

function passes(row: Row, f: Filter, field: Field): boolean {
  const raw = row.v[f.fieldId];
  const s = String(raw ?? "").toLowerCase();
  const q = f.value.toLowerCase();
  switch (f.op) {
    case "contains": return s.includes(q);
    case "is": return s === q;
    case "not": return s !== q;
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

function viewRows(c: Collection, q: string): Row[] {
  let rows = c.rows;
  if (q.trim()) {
    const s = q.trim().toLowerCase();
    rows = rows.filter((r) => c.fields.some((f) => String(r.v[f.id] ?? "").toLowerCase().includes(s)));
  }
  for (const f of c.filters) {
    const field = c.fields.find((x) => x.id === f.fieldId);
    if (field) rows = rows.filter((r) => passes(r, f, field));
  }
  if (c.sort) {
    const { fieldId, dir } = c.sort;
    const field = c.fields.find((x) => x.id === fieldId);
    rows = [...rows].sort((a, b) => {
      const av = a.v[fieldId]; const bv = b.v[fieldId];
      let cmp: number;
      if (field?.type === "number") cmp = (Number(av) || 0) - (Number(bv) || 0);
      else if (field?.type === "check") cmp = Number(!!av) - Number(!!bv);
      else cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      return dir === "asc" ? cmp : -cmp;
    });
  }
  return rows;
}

const rowTitle = (c: Collection, r: Row): string => {
  const first = c.fields.find((f) => f.type === "text");
  return String((first && r.v[first.id]) || "Untitled");
};

/* ── home: the list of collections ───────────────────────────────────── */
export function DataHome({ panelId }: { panelId: string }) {
  const ws = useWorkspace();
  const s = useDataApp();
  return (
    <div className="card">
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
              <span className="ss" style={{ display: "block" }}>{c.rows.length} rows · {c.fields.length} fields</span>
            </span>
            <span className="arr">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── cell editors ────────────────────────────────────────────────────── */
function Cell({ colId, row, field }: { colId: string; row: Row; field: Field }) {
  const [fly, setFly] = useState(false);
  const v = row.v[field.id];
  const set = (nv: Row["v"][string]) => dataApp.setCell(colId, row.id, field.id, nv);
  switch (field.type) {
    case "check":
      return (
        <button className={"dt-check" + (v === true ? " on" : "")} aria-pressed={v === true}
          onClick={() => set(v !== true)}>✓</button>
      );
    case "select":
      return (
        <span className="dp-wrap" style={{ width: "100%" }}>
          <button className={"dt-pill" + (v ? "" : " empty")} onClick={() => setFly((x) => !x)}>
            {String(v ?? "—")}
          </button>
          {fly && <div className="pop-bg" onMouseDown={() => setFly(false)} />}
          {fly && (
            <div className="dp-pop dt-selfly">
              {(field.options ?? []).map((o) => (
                <button key={o} className={"tp-slot" + (v === o ? " on" : "")}
                  onClick={() => { set(o); setFly(false); }}>{o}</button>
              ))}
              {v != null && <button className="dp-clear" onClick={() => { set(undefined); setFly(false); }}>Clear</button>}
            </div>
          )}
        </span>
      );
    case "date":
      return <DatePicker value={v ? String(v) : undefined} onChange={(nv) => set(nv)} />;
    case "number":
      return (
        <input className="dt-cell num" inputMode="decimal" value={v == null ? "" : String(v)}
          onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value) || 0)} />
      );
    default:
      return (
        <input className={"dt-cell" + (field.type === "url" ? " url" : "")} value={v == null ? "" : String(v)}
          onChange={(e) => set(e.target.value || undefined)} />
      );
  }
}

/* ── the table panel — grid + the recurring options toolbar ──────────── */
export function DataTable({ colKey, panelId }: { colKey: string; panelId: string }) {
  const ws = useWorkspace();
  const s = useDataApp();
  const c = s.collections.find((x) => x.id === colKey.slice(4));
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState<null | "filter" | "field" | string>(null);
  if (!c) return <div className="leaf-note">This table was deleted.</div>;
  const rows = viewRows(c, q);
  const openRow = (id: string) =>
    ws.openDetail(panelId, { panelType: "datarow", resourceKey: "dtr:" + c.id + ":" + id });

  return (
    <>
      {menu && <div className="pop-bg" onMouseDown={() => setMenu(null)} />}
      <div className="dt-toolbar">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ color: "var(--muted-foreground)", flex: "none" }}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
        <input className="foot-search" style={{ maxWidth: 220 }} placeholder="Search rows…"
          value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="dp-wrap">
          <button className={"d-btn sm " + (c.filters.length ? "" : "outline")}
            onClick={() => setMenu(menu === "filter" ? null : "filter")}>
            Filter{c.filters.length ? " · " + c.filters.length : ""}
          </button>
          {menu === "filter" && (
            <div className="dp-pop dt-filterfly">
              {c.filters.map((f, i) => {
                const field = c.fields.find((x) => x.id === f.fieldId);
                return (
                  <div key={i} className="dt-frow">
                    <span className="dt-fname">{field?.name ?? "?"}</span>
                    <span className="dt-fop">{OPS[field?.type ?? "text"].find((o) => o.id === f.op)?.label ?? f.op}</span>
                    {!["empty", "checked", "unchecked"].includes(f.op) && (
                      <input className="inline-edit" value={f.value}
                        onChange={(e) => dataApp.patchCol(c.id, { filters: c.filters.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} />
                    )}
                    <button className="cv-conn-edit" title="Remove rule"
                      onClick={() => dataApp.patchCol(c.id, { filters: c.filters.filter((_, j) => j !== i) })}>✕</button>
                  </div>
                );
              })}
              <div className="dt-addrule">
                {c.fields.map((f) => (
                  <button key={f.id} className="tp-slot"
                    onClick={() => dataApp.patchCol(c.id, { filters: [...c.filters, { fieldId: f.id, op: OPS[f.type][0].id, value: "" }] })}>
                    + {f.name}
                  </button>
                ))}
              </div>
              {c.filters.length > 0 && (
                <button className="dp-clear" onClick={() => dataApp.patchCol(c.id, { filters: [] })}>Clear all filters</button>
              )}
            </div>
          )}
        </span>
        {c.sort && (
          <button className="d-btn sm" title="Clear sort"
            onClick={() => dataApp.patchCol(c.id, { sort: undefined })}>
            {c.fields.find((f) => f.id === c.sort!.fieldId)?.name} {c.sort.dir === "asc" ? "↑" : "↓"} ✕
          </button>
        )}
        <span style={{ flex: 1 }} />
        <span className="dp-wrap">
          <button className="d-btn outline sm" onClick={() => setMenu(menu === "field" ? null : "field")}>+ Field</button>
          {menu === "field" && (
            <div className="dp-pop dt-selfly" style={{ right: 0, left: "auto" }}>
              {(["text", "number", "select", "date", "check", "url"] as FieldType[]).map((t) => (
                <button key={t} className="tp-slot" onClick={() => { dataApp.addField(c.id, t); setMenu(null); }}>
                  {t === "check" ? "checkbox" : t}
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
              {c.fields.map((f) => (
                <th key={f.id}>
                  <span className="dp-wrap" style={{ display: "block" }}>
                    <button className="dt-th" onClick={() => setMenu(menu === "h:" + f.id ? null : "h:" + f.id)}>
                      {f.name}
                      {c.sort?.fieldId === f.id && <span className="dir">{c.sort.dir === "asc" ? "↑" : "↓"}</span>}
                      <span className="caret">⌄</span>
                    </button>
                    {menu === "h:" + f.id && (
                      <div className="dp-pop dt-selfly">
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
                        <button className="tp-slot" onMouseDown={(e) => e.preventDefault()} onClick={() => { dataApp.patchCol(c.id, { sort: { fieldId: f.id, dir: "asc" } }); setMenu(null); }}>Sort ↑</button>
                        <button className="tp-slot" onMouseDown={(e) => e.preventDefault()} onClick={() => { dataApp.patchCol(c.id, { sort: { fieldId: f.id, dir: "desc" } }); setMenu(null); }}>Sort ↓</button>
                        {f.type === "select" && (
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
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="dt-opentd">
                  <button className="dt-open" title="Open as a page" onClick={() => openRow(r.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg>
                  </button>
                </td>
                {c.fields.map((f) => (
                  <td key={f.id}><Cell colId={c.id} row={r} field={f} /></td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={c.fields.length + 1} className="dt-empty">No rows match — clear the search or filters.</td></tr>
            )}
          </tbody>
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
      <div className="card">
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
      <div className="card">
        <div className="lab">Page</div>
        <RichNotes key={r.id} html={r.page ?? ""} placeholder="Write the page — this row is also a document…"
          onChange={(h) => dataApp.patchRow(c.id, r.id, { page: h })} />
      </div>
    </>
  );
}
