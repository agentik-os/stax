/**
 * Notifications: the topbar notification center. A bell button with an
 * unread dot; clicking it opens a fixed dropdown listing mentions, task
 * reminders, agent reports and system events, searchable and filterable.
 * One tiny module store (localStorage-persisted, useSyncExternalStore)
 * keeps the badge and the open list in sync: marking a row read updates
 * the dot instantly.
 */
import { useEffect, useState, useSyncExternalStore } from "react";

export type NotifKind = "mention" | "task" | "agent" | "system";
export interface Notif {
  id: string;
  kind: NotifKind;
  title: string;
  body?: string;
  ts: number;
  read: boolean;
}

const KEY = "frameword-notifs";
const now = Date.now();
const M = 60_000;
const H = 3_600_000;

const SEED: Notif[] = [
  { id: "nf-mention-refonte", kind: "mention", title: "Jo mentioned you in Refonte e-commerce", body: "Can you check the checkout panel spacing before Friday?", ts: now - 25 * M, read: false },
  { id: "nf-task-notes", kind: "task", title: "Ship the notes module is due tomorrow 18:00", body: "High priority · in Doing · 1 of 2 subtasks left", ts: now - 2 * H, read: false },
  { id: "nf-agent-board", kind: "agent", title: "Board build finished: 4 cards, 3 links", body: "The canvas agent laid out Refonte e-commerce and wired the flows", ts: now - 3 * H, read: false },
  { id: "nf-sys-deploy", kind: "system", title: "Vercel deploy went live", body: "crm-specimen · production · built in 42s, all routes green", ts: now - 5 * H, read: false },
  { id: "nf-mention-launch", kind: "mention", title: "Mel replied in Launch checklist", body: "Freeze the grammar today, sweep the routes right after.", ts: now - 9 * H, read: false },
  { id: "nf-task-retro", kind: "task", title: "Book the launch retro moved to Jul 28", body: "Rescheduled from Jul 24: the calendar hold followed", ts: now - 28 * H, read: true },
  { id: "nf-agent-digest", kind: "agent", title: "Weekly digest is ready", body: "3 notes touched, 6 tasks closed, 1 board grew by 4 cards", ts: now - 2 * 24 * H, read: true },
  { id: "nf-sys-signin", kind: "system", title: "New sign-in from Safari on macOS", body: "Paris, FR · marked as trusted", ts: now - 3 * 24 * H, read: true },
];

function load(): Notif[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (Array.isArray(raw) && raw.length > 0 && raw.every((n) => n && typeof n.id === "string" && typeof n.ts === "number")) {
      return raw as Notif[];
    }
  } catch { /* seed */ }
  return SEED;
}

let state: Notif[] = load();
const subs = new Set<() => void>();
const emit = () => {
  localStorage.setItem(KEY, JSON.stringify(state));
  subs.forEach((f) => f());
};

export const notifs = {
  get: () => state,
  subscribe: (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; },
  markRead: (id: string) => {
    if (!state.some((n) => n.id === id && !n.read)) return;
    state = state.map((n) => (n.id === id ? { ...n, read: true } : n));
    emit();
  },
  markAllRead: () => {
    if (!state.some((n) => !n.read)) return;
    state = state.map((n) => (n.read ? n : { ...n, read: true }));
    emit();
  },
  unreadCount: () => state.filter((n) => !n.read).length,
};
export const useNotifs = () => useSyncExternalStore(notifs.subscribe, notifs.get);

/* ── small formatters ────────────────────────────────────────────────── */
function ago(ts: number): string {
  const m = Math.floor((Date.now() - ts) / M);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  const d = Math.floor(h / 24);
  if (d < 7) return d + "d ago";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ── the bell + dropdown: fully self-contained ──────────────────────── */
export function NotifBell() {
  const list = useNotifs();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"all" | "unread">("all");
  const unread = list.filter((n) => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const needle = q.trim().toLowerCase();
  const shown = [...list]
    .filter((n) => (tab === "unread" ? !n.read : true))
    .filter((n) => !needle || (n.title + " " + (n.body ?? "")).toLowerCase().includes(needle))
    .sort((a, b) => b.ts - a.ts);

  return (
    <>
      <button className="tb-btn" title="Notifications" aria-haspopup="true" aria-expanded={open}
        style={{ position: "relative" }} onClick={() => setOpen((v) => !v)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && <span className="nf-dot" />}
      </button>

      {open && (
        <>
          <div className="menu-bg" onClick={() => setOpen(false)} />
          <div className="nf-menu" style={{ position: "fixed", top: 52, right: 96 }} role="dialog" aria-label="Notifications">
            <div className="nf-head">
              <input className="inline-edit" autoFocus placeholder="Search notifications…" aria-label="Search notifications"
                value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="nf-seg" role="group" aria-label="Filter notifications">
                <button className={tab === "all" ? "on" : ""} aria-pressed={tab === "all"}
                  onClick={() => setTab("all")}>All</button>
                <button className={tab === "unread" ? "on" : ""} aria-pressed={tab === "unread"}
                  onClick={() => setTab("unread")}>Unread</button>
              </div>
            </div>

            <div className="nf-list">
              {shown.map((n) => (
                <button key={n.id} className={"nf-row" + (n.read ? "" : " unread")}
                  title={n.read ? undefined : "Mark as read"}
                  onClick={() => notifs.markRead(n.id)}>
                  <span className="nf-kind" data-kind={n.kind} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="nf-title">{n.title}</div>
                    <div className="nf-sub">{n.body ? n.body.slice(0, 72) + " · " : ""}{ago(n.ts)}</div>
                  </div>
                </button>
              ))}
              {shown.length === 0 && <div className="nf-empty">You&rsquo;re all caught up ✶</div>}
            </div>

            <div className="nf-foot">
              {unread > 0 && <button onClick={() => notifs.markAllRead()}>Mark all as read</button>}
              <span>{unread === 0 ? "No unread" : unread === 1 ? "1 unread" : unread + " unread"}</span>
            </div>
          </div>
        </>
      )}
    </>
  );
}
