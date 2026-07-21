/**
 * PlatformApp: platform-class console & studio surfaces (the OpenAI-platform
 * archive), rebuilt in the panel grammar. One store, seventeen panel types:
 * API keys (masked secrets, reveal-once, roll/revoke), people & permissions,
 * projects, billing, spend limits & alerts, usage analytics, service health &
 * incidents, data-control forms, security empty-states, a prompt composer, a
 * realtime creator, an images grid and a prompt-card hub. Every settings PAGE
 * of the original becomes a sibling PANEL; every tab a segment; every floating
 * composer anchors in the foot (Law 6).
 */
import { useState, useSyncExternalStore } from "react";
import { useWorkspace } from "@frameword/panels-react";
import { popPos } from "./NotesApp";

/* ── model ───────────────────────────────────────────────────────────── */
export interface PfKey { id: string; name: string; secret: string; created: string; lastUsed: string; spend: number; status: "active" | "revoked" }
export interface PfMember { id: string; name: string; email: string; role: "Owner" | "Member" | "Reader"; you?: boolean; joined: string }
export interface PfInvite { id: string; email: string; role: string; sent: string }
export interface PfProject { id: string; name: string; pid: string; geo: string; retention: string; members: number; created: string; spend: number; archived?: boolean }
export interface PfIncident { id: string; date: string; title: string; service: string; note: string }
export interface PfRun { id: string; ts: string; model: string; text: string; status: number; ms: number; tokens: number }
export interface PfImage { id: string; hue: number; prompt: string }

interface PfState {
  keys: PfKey[]; freshKey: string | null;
  members: PfMember[]; invites: PfInvite[];
  projects: PfProject[];
  balance: number; auto: boolean; banner: string | null;
  limit: number; spent: number; alerts: number[]; tier: number;
  services: { id: string; name: string; up: number[] }[];
  incidents: PfIncident[];
  controls: { threads: string; usage: string; logs: string };
  controlsDraft: { threads: string; usage: string; logs: string };
  provider: { name: string; created: string } | null; ips: string[]; domains: string[];
  prompt: { model: string; reasoning: string; verbosity: string; store: boolean; text: string; vars: string[] };
  runs: PfRun[];
  rtDraft: string; rtSaved: { id: string; text: string }[];
  images: PfImage[];
  usageRange: "7d" | "30d";
  seq: number;
}

const KEY = "frameword-platform";
const CTRL_DEF = { threads: "hidden", usage: "everyone", logs: "owners" };
const UP = [100, 100, 99.98, 100, 100, 100, 99.94, 100, 100, 100, 100, 99.99, 100, 100];

const SEED: PfState = {
  keys: [
    { id: "k1", name: "Production", secret: "sk-stax-prod-9f2KxQ7wLm4Kx2", created: "Mar 12, 2026", lastUsed: "2 h ago", spend: 61.42, status: "active" },
    { id: "k2", name: "Staging", secret: "sk-stax-stg-Ct8pR2nVe6Ba1d", created: "May 2, 2026", lastUsed: "yesterday", spend: 8.9, status: "active" },
    { id: "k3", name: "CI runner", secret: "sk-stax-ci-Wm3zH8qYu2Ne7f", created: "Jun 20, 2026", lastUsed: "4 d ago", spend: 0.34, status: "active" },
    { id: "k4", name: "Legacy ingest", secret: "sk-stax-old-Jd5vT1cPo9Qi3s", created: "Jan 8, 2026", lastUsed: "Jun 30", spend: 122.07, status: "revoked" },
    { id: "k5", name: "Analytics batch", secret: "sk-stax-ana-Xr6bK4mDf8Lw5g", created: "Apr 17, 2026", lastUsed: "1 h ago", spend: 17.63, status: "active" },
  ],
  freshKey: null,
  members: [
    { id: "m1", name: "Alex Reyes", email: "x@stax.dev", role: "Owner", you: true, joined: "Jan 2026" },
    { id: "m2", name: "Jo Lambert", email: "jo@stax.dev", role: "Member", joined: "Feb 2026" },
    { id: "m3", name: "Sam Chen", email: "sam@stax.dev", role: "Reader", joined: "May 2026" },
  ],
  invites: [{ id: "i1", email: "lea@acme.io", role: "Member", sent: "Jul 18" }],
  projects: [
    { id: "p1", name: "Default project", pid: "proj_9f4KxQ7wLm2c", geo: "Global", retention: "None", members: 3, created: "May 26, 2026", spend: 84.11 },
    { id: "p2", name: "Voice lab", pid: "proj_a2Ct8pR6nVe1", geo: "EU", retention: "30 days", members: 2, created: "Jun 14, 2026", spend: 12.4 },
    { id: "p3", name: "Batch ingest", pid: "proj_x1Wm3zH8qYu4", geo: "US", retention: "None", members: 1, created: "Jul 2, 2026", spend: 9.86 },
    { id: "p4", name: "Sunset demo", pid: "proj_q7Jd5vT4cPo2", geo: "Global", retention: "7 days", members: 1, created: "Feb 3, 2026", spend: 0, archived: true },
  ],
  balance: 42.1, auto: true, banner: null,
  limit: 120, spent: 18.2, alerts: [80, 100], tier: 2,
  services: [
    { id: "chat", name: "Chat completions", up: UP },
    { id: "resp", name: "Responses", up: UP.map((v, i) => (i === 6 ? 99.91 : v)) },
    { id: "emb", name: "Embeddings", up: UP.map(() => 100) },
    { id: "rt", name: "Realtime", up: UP.map((v, i) => (i === 9 ? 99.85 : v)) },
  ],
  incidents: [
    { id: "inc1", date: "Jul 16 · 10:36", title: "Elevated error rates for SSO login", service: "auth", note: "A subset of SSO sign-ins returned 502 for 41 minutes while a certificate rotated. API traffic was not affected. The rotation runbook now staggers regions." },
    { id: "inc2", date: "Jul 11 · 08:35", title: "Elevated errors for the Realtime API", service: "realtime", note: "WebSocket session creation failed for ~4% of connects in EU during a gateway deploy. Rolled back in 18 minutes; session resume prevented audio loss." },
    { id: "inc3", date: "Jun 24 · 07:59", title: "High error rate on mini models", service: "chat", note: "One inference cluster served elevated 529s for mini-tier models. Traffic was drained and redistributed; capacity headroom was raised 20%." },
  ],
  controls: { ...CTRL_DEF }, controlsDraft: { ...CTRL_DEF },
  provider: null, ips: [], domains: ["stax.dev"],
  prompt: { model: "gpt-5.4-mini", reasoning: "standard", verbosity: "medium", store: true, text: "", vars: ["customer_name"] },
  runs: [
    { id: "r5", ts: "11:42", model: "gpt-5.4-mini", text: "Summarize the churn cohort for June and cite the three biggest drivers.", status: 200, ms: 1840, tokens: 412 },
    { id: "r4", ts: "11:38", model: "gpt-5.4", text: "Draft the renewal email for Acme Industries in Jo's tone.", status: 200, ms: 2610, tokens: 388 },
    { id: "r3", ts: "10:55", model: "gpt-5.4-mini", text: "Classify these 40 support tickets by product area.", status: 200, ms: 1190, tokens: 951 },
    { id: "r2", ts: "10:12", model: "o4-mini", text: "Explain the spike in realtime-audio spend on Jul 15.", status: 429, ms: 240, tokens: 0 },
    { id: "r1", ts: "09:30", model: "gpt-5.4-mini", text: "Generate the weekly pipeline digest.", status: 200, ms: 1505, tokens: 267 },
  ],
  rtDraft: "", rtSaved: [],
  images: [
    { id: "g1", hue: 18, prompt: "Terracotta studio, morning light" },
    { id: "g2", hue: 152, prompt: "Botanical glasshouse, mist" },
    { id: "g3", hue: 226, prompt: "Cobalt harbor at dusk" },
    { id: "g4", hue: 268, prompt: "Violet nebula macro" },
    { id: "g5", hue: 84, prompt: "Moss terrace, drone view" },
    { id: "g6", hue: 330, prompt: "Rose quartz still life" },
  ],
  usageRange: "30d",
  seq: 9,
};

/* ── store (module pattern: let + Set + useSyncExternalStore) ───────── */
const VER = 2; // bump when SEED's shape changes: stale snapshots are purged, never shallow-merged over
function load(): PfState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // freshKey never persists: "visible once" means once, not once per reload
      if (parsed && parsed.v === VER) return { ...SEED, ...parsed.s, freshKey: null };
    }
  } catch { /* fresh */ }
  return SEED;
}
let state: PfState = load();
const subs = new Set<() => void>();
const emit = () => {
  localStorage.setItem(KEY, JSON.stringify({ v: VER, s: { ...state, freshKey: null } }));
  subs.forEach((f) => f());
};
const update = (fn: (s: PfState) => PfState) => { state = fn(state); emit(); };

const nowStamp = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const timeStamp = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
const mkSecret = (n: number) => "sk-stax-new-" + (n * 2654435761 % 4294967296).toString(36).padStart(7, "x") + "Qa" + n;

export const pfApp = {
  get: () => state,
  key: (id: string) => state.keys.find((k) => k.id === id),
  member: (id: string) => state.members.find((m) => m.id === id),
  project: (id: string) => state.projects.find((p) => p.id === id),
  update,
  addKey(): string {
    const id = "k" + (state.seq + 1);
    update((s) => ({
      ...s, seq: s.seq + 1, freshKey: id,
      keys: [{ id, name: "New secret key", secret: mkSecret(s.seq + 1), created: nowStamp(), lastUsed: "never", spend: 0, status: "active" as const }, ...s.keys],
    }));
    return id;
  },
  rollKey(id: string) {
    update((s) => ({ ...s, freshKey: id, keys: s.keys.map((k) => (k.id === id ? { ...k, secret: mkSecret(s.seq + 1), created: nowStamp() } : k)), seq: s.seq + 1 }));
  },
  revokeKey(id: string) { update((s) => ({ ...s, freshKey: s.freshKey === id ? null : s.freshKey, keys: s.keys.map((k) => (k.id === id ? { ...k, status: "revoked" as const } : k)) })); },
  removeKey(id: string) { update((s) => ({ ...s, keys: s.keys.filter((k) => k.id !== id) })); },
  renameKey(id: string, name: string) { update((s) => ({ ...s, keys: s.keys.map((k) => (k.id === id ? { ...k, name } : k)) })); },
  invite(email: string) {
    const e = email.trim().toLowerCase();
    if (!e.includes("@") || e.length < 5) return;
    update((s) => (s.invites.some((i) => i.email === e) ? s : { ...s, seq: s.seq + 1, invites: [...s.invites, { id: "i" + (s.seq + 1), email: e, role: "Member", sent: "today" }] }));
  },
  cancelInvite(id: string) { update((s) => ({ ...s, invites: s.invites.filter((i) => i.id !== id) })); },
  soleOwner: (id: string) => state.members.filter((m) => m.role === "Owner").length === 1 && state.members.find((m) => m.id === id)?.role === "Owner",
  setRole(id: string, role: PfMember["role"]) {
    // the last Owner can never demote themself: the org would be ownerless
    if (role !== "Owner" && pfApp.soleOwner(id)) return;
    update((s) => ({ ...s, members: s.members.map((m) => (m.id === id ? { ...m, role } : m)) }));
  },
  removeMember(id: string) {
    if (pfApp.soleOwner(id)) return;
    update((s) => ({ ...s, members: s.members.filter((m) => m.id !== id) }));
  },
  addProject(): string {
    const id = "p" + (state.seq + 1);
    update((s) => ({
      ...s, seq: s.seq + 1,
      projects: [...s.projects, { id, name: "New project", pid: "proj_" + mkSecret(s.seq + 1).slice(-12), geo: "Global", retention: "None", members: 1, created: nowStamp(), spend: 0 }],
    }));
    return id;
  },
  renameProject(id: string, name: string) { update((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, name } : p)) })); },
  toggleArchive(id: string) { update((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, archived: !p.archived } : p)) })); },
  addCredits() { update((s) => ({ ...s, balance: Math.round((s.balance + 25) * 100) / 100, banner: "Payment successful: $25.00 added to your credit balance." })); },
  dismissBanner() { update((s) => ({ ...s, banner: null })); },
  toggleAuto() { update((s) => ({ ...s, auto: !s.auto })); },
  bumpLimit(d: number) { update((s) => ({ ...s, limit: Math.max(20, s.limit + d) })); },
  addAlert() {
    update((s) => {
      const free = [50, 60, 70, 75, 80, 90, 100].filter((p) => !s.alerts.includes(p));
      return free.length ? { ...s, alerts: [...s.alerts, free[0]].sort((a, b) => a - b) } : s;
    });
  },
  removeAlert(p: number) { update((s) => ({ ...s, alerts: s.alerts.filter((x) => x !== p) })); },
  upgradeTier() { update((s) => ({ ...s, tier: Math.min(5, s.tier + 1) })); },
  setControl(k: keyof PfState["controlsDraft"], v: string) { update((s) => ({ ...s, controlsDraft: { ...s.controlsDraft, [k]: v } })); },
  controlsDirty: () => JSON.stringify(state.controls) !== JSON.stringify(state.controlsDraft),
  saveControls() { update((s) => ({ ...s, controls: { ...s.controlsDraft } })); },
  createProvider() { update((s) => ({ ...s, provider: { name: "Stax Workforce ID", created: nowStamp() } })); },
  removeProvider() { update((s) => ({ ...s, provider: null })); },
  addIp() { update((s) => ({ ...s, ips: [...s.ips, "10.0." + s.ips.length + ".0/24"] })); },
  removeIp(ip: string) { update((s) => ({ ...s, ips: s.ips.filter((x) => x !== ip) })); },
  setPrompt(p: Partial<PfState["prompt"]>) { update((s) => ({ ...s, prompt: { ...s.prompt, ...p } })); },
  addVar() { update((s) => ({ ...s, seq: s.seq + 1, prompt: { ...s.prompt, vars: [...s.prompt.vars, "var_" + (s.seq + 1)] } })); },
  removeVar(v: string) { update((s) => ({ ...s, prompt: { ...s.prompt, vars: s.prompt.vars.filter((x) => x !== v) } })); },
  run(text: string) {
    // deterministic telemetry: a run is a LOG ROW: it streams into the
    // Console's Logs panel the moment it happens (cross-dashboard live store)
    const ms = 400 + ((text.length * 37) % 2200);
    const tokens = 60 + text.length * 3;
    update((s) => ({ ...s, seq: s.seq + 1, runs: [{ id: "r" + (s.seq + 1), ts: timeStamp(), model: s.prompt.model, text, status: 200, ms, tokens }, ...s.runs].slice(0, 40) }));
  },
  setUsageRange(r: "7d" | "30d") { update((s) => ({ ...s, usageRange: r })); },
  setRtDraft(t: string) { update((s) => ({ ...s, rtDraft: t })); },
  createRt() {
    if (!state.rtDraft.trim()) return;
    update((s) => ({ ...s, seq: s.seq + 1, rtSaved: [{ id: "v" + (s.seq + 1), text: s.rtDraft.trim() }, ...s.rtSaved], rtDraft: "" }));
  },
  genImage(prompt: string) {
    update((s) => ({ ...s, seq: s.seq + 1, images: [{ id: "g" + (s.seq + 1), hue: (s.seq * 47) % 360, prompt: prompt || "Untitled generation" }, ...s.images] }));
  },
};
export const usePfApp = () => useSyncExternalStore((cb) => (subs.add(cb), () => subs.delete(cb)), () => state);

/* ── shared bits ─────────────────────────────────────────────────────── */
const usd = (n: number) => "$" + n.toFixed(2);
const mask = (s: string) => s.slice(0, 7) + "…" + s.slice(-4);
const Ic = (p: { d: React.ReactNode; s?: number }) => (
  <svg width={p.s ?? 15} height={p.s ?? 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{p.d}</svg>
);
const KeyGlyph = <><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4" /></>;
const Pill = ({ on, children }: { on?: boolean; children: React.ReactNode }) => (
  <span className={"pf-pill" + (on ? " ok" : " off")}>{children}</span>
);
function Seg({ items, value, onPick }: { items: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="pf-seg">
      {items.map((it) => (
        <button key={it} className={value === it ? "on" : ""} onClick={() => onPick(it)}>{it}</button>
      ))}
    </div>
  );
}
function Grammar({ text }: { text: string }) {
  return <div className="anat-row note" style={{ marginTop: 14 }}><span className="k">IN THE GRAMMAR</span><span className="t">{text}</span></div>;
}
function EmptyState({ glyph, title, text, cta, onCta }: { glyph: React.ReactNode; title: string; text: string; cta?: string; onCta?: () => void }) {
  return (
    <div className="pf-empty">
      <div className="pf-empty-ic"><Ic d={glyph} s={18} /></div>
      <div className="pf-empty-t">{title}</div>
      <div className="pf-empty-s">{text}</div>
      {cta && <button className="d-btn outline sm" onClick={onCta}>{cta}</button>}
    </div>
  );
}

/* ── Console · API keys (XL table) ───────────────────────────────────── */
function KeysTable({ panelId }: { panelId: string }) {
  const s = usePfApp();
  const ws = useWorkspace();
  const [q, setQ] = useState("");
  const [flt, setFlt] = useState("All");
  const [menu, setMenu] = useState<{ id: string; pos: React.CSSProperties } | null>(null);
  const rows = s.keys.filter((k) =>
    (flt === "All" || (flt === "Active") === (k.status === "active")) &&
    (!q.trim() || (k.name + " " + k.secret).toLowerCase().includes(q.trim().toLowerCase())));
  return (
    <div>
      <div className="pf-toolbar">
        <input className="d-input pf-search" placeholder="Search keys…" value={q} onChange={(e) => setQ(e.target.value)} />
        <Seg items={["All", "Active", "Revoked"]} value={flt} onPick={setFlt} />
        <span className="pf-count">{rows.length} {rows.length === 1 ? "key" : "keys"}</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState glyph={KeyGlyph} title="No keys match" text="Nothing in this organization matches the current search and filter." cta="Clear filters" onCta={() => { setQ(""); setFlt("All"); }} />
      ) : (
        <div className="pf-scroll">
          <table className="pf-tbl">
            <thead><tr><th>Name</th><th>Secret</th><th>Created</th><th>Last used</th><th className="num">Spend</th><th>Status</th><th /></tr></thead>
            <tbody>
              {rows.map((k) => (
                <tr key={k.id} className={k.status === "revoked" ? "dim" : ""}
                  onClick={() => ws.openDetail(panelId, { panelType: "pfkey", resourceKey: "pfk:" + k.id })}>
                  <td className="strong">{k.name}</td>
                  <td className="mono">{mask(k.secret)}</td>
                  <td>{k.created}</td>
                  <td>{k.lastUsed}</td>
                  <td className="num mono">{usd(k.spend)}</td>
                  <td><Pill on={k.status === "active"}>{k.status}</Pill></td>
                  <td className="act">
                    <button className="pf-dots" title="Key actions"
                      onClick={(e) => { e.stopPropagation(); setMenu(menu?.id === k.id ? null : { id: k.id, pos: popPos(e, 132, 168) }); }}>⋯</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {menu && <div className="pop-bg" onMouseDown={() => setMenu(null)} />}
      {menu && (
        <div className="tt-menu" style={{ ...menu.pos, zIndex: 40 }}>
          <button className="tp-slot" onClick={() => { ws.openDetail(panelId, { panelType: "pfkey", resourceKey: "pfk:" + menu.id }); setMenu(null); }}>Open detail →</button>
          <button className="tp-slot" onClick={() => { pfApp.rollKey(menu.id); ws.openDetail(panelId, { panelType: "pfkey", resourceKey: "pfk:" + menu.id }); setMenu(null); }}>Roll secret</button>
          {pfApp.key(menu.id)?.status === "active"
            ? <button className="tp-slot danger" onClick={() => { pfApp.revokeKey(menu.id); setMenu(null); }}>Revoke key</button>
            : <button className="tp-slot danger" onClick={() => { pfApp.removeKey(menu.id); setMenu(null); }}>Delete key</button>}
        </div>
      )}
      <Grammar text="pfkeys · XL 800. The org table pattern: search + segment filter in the toolbar, masked mono secrets, a row ⋯ menu (fixed-positioned: it never clips in the scroll container), and the empty state when a filter dries up. A row opens its key BESIDE the table: never a page swap." />
    </div>
  );
}

function KeyDetail({ id }: { id: string }) {
  const s = usePfApp();
  const k = s.keys.find((x) => x.id === id);
  if (!k) return <div className="leaf-note">This key was deleted.</div>;
  const fresh = s.freshKey === id;
  return (
    <div>
      <input className="inline-edit pf-name" value={k.name} onChange={(e) => pfApp.renameKey(id, e.target.value)} aria-label="Key name" />
      {fresh ? (
        <div className="pf-secretbox">
          <div className="lab">Secret: visible once</div>
          <div className="mono val">{k.secret}</div>
          <div className="hint">Copy it now. After you leave, only the masked form remains.</div>
          <button className="d-btn outline sm" onClick={() => { navigator.clipboard?.writeText(k.secret); }}>Copy secret</button>
        </div>
      ) : (
        <div className="anat-row"><span className="k">SECRET</span><span className="t mono">{mask(k.secret)}</span></div>
      )}
      <div className="anat-row"><span className="k">STATUS</span><span className="t"><Pill on={k.status === "active"}>{k.status}</Pill></span></div>
      <div className="anat-row"><span className="k">CREATED</span><span className="t">{k.created}</span></div>
      <div className="anat-row"><span className="k">LAST USED</span><span className="t">{k.lastUsed}</span></div>
      <div className="anat-row"><span className="k">SPEND</span><span className="t mono">{usd(k.spend)} this month</span></div>
      <Grammar text="pfkey · S 380: the inspector class. Reveal-once lives HERE, not in a modal: the table row simply opened its detail panel. Revoke is in the foot: the one action zone." />
    </div>
  );
}

/* ── Console · People (L, segment = tab) ─────────────────────────────── */
function PeopleList({ panelId }: { panelId: string }) {
  const s = usePfApp();
  const ws = useWorkspace();
  const [tab, setTab] = useState("Members");
  return (
    <div>
      <div className="pf-toolbar">
        <Seg items={["Members", "Invitations"]} value={tab} onPick={setTab} />
        <span className="pf-count">{tab === "Members" ? s.members.length + " members" : s.invites.length + " pending"}</span>
      </div>
      {tab === "Members" ? (
        <div className="pf-list">
          {s.members.map((m) => (
            <button key={m.id} className="pf-person" onClick={() => ws.openDetail(panelId, { panelType: "pfmember", resourceKey: "pfm:" + m.id })}>
              <span className="pf-ava">{m.name.split(" ").map((w) => w[0]).join("")}</span>
              <span className="bd">
                <span className="nm">{m.name}{m.you && <span className="pf-you">You</span>}<span className="pf-role">{m.role}</span></span>
                <span className="em mono">{m.email}</span>
              </span>
              <span className="arr">→</span>
            </button>
          ))}
        </div>
      ) : s.invites.length === 0 ? (
        <EmptyState glyph={<><path d="M22 6 12 13 2 6" /><rect x="2" y="4" width="20" height="16" rx="2" /></>} title="No pending invitations" text="Invite a teammate from the foot: the invitation appears here until it is accepted." />
      ) : (
        <div className="pf-list">
          {s.invites.map((i) => (
            <div key={i.id} className="pf-person static">
              <span className="pf-ava dim">@</span>
              <span className="bd">
                <span className="nm">{i.email}<span className="pf-role">{i.role}</span></span>
                <span className="em">Invited {i.sent}: pending</span>
              </span>
              <button className="d-btn ghost sm" onClick={() => pfApp.cancelInvite(i.id)}>Cancel</button>
            </div>
          ))}
        </div>
      )}
      <Grammar text="pfpeople · L 640. The original's Members/Invitations TABS become a segment: a view filter, not navigation (Law 2). 'Select a member to view details' does not exist here: the detail IS the next panel." />
    </div>
  );
}

function MemberDetail({ id }: { id: string }) {
  const s = usePfApp();
  const m = s.members.find((x) => x.id === id);
  if (!m) return <div className="leaf-note">This member was removed.</div>;
  return (
    <div>
      <div className="pf-idcard">
        <span className="pf-ava lg">{m.name.split(" ").map((w) => w[0]).join("")}</span>
        <div>
          <div className="nm">{m.name}{m.you && <span className="pf-you">You</span>}</div>
          <div className="em mono">{m.email}</div>
        </div>
      </div>
      <div className="pop-sub" style={{ marginTop: 14 }}>Role</div>
      <Seg items={["Owner", "Member", "Reader"]} value={m.role} onPick={(r) => pfApp.setRole(id, r as PfMember["role"])} />
      {pfApp.soleOwner(id) && <div className="pf-hint" style={{ marginTop: 6 }}>The last Owner cannot be demoted or removed: promote someone else first.</div>}
      <div className="anat-row" style={{ marginTop: 12 }}><span className="k">JOINED</span><span className="t">{m.joined}</span></div>
      <div className="anat-row"><span className="k">ACCESS</span><span className="t">{m.role === "Owner" ? "Full: billing, keys, members" : m.role === "Member" ? "Build: keys and usage" : "Read: usage only"}</span></div>
      <Grammar text="pfmember · S 380. Role is a segmented choice, not a dropdown; removing the member is a foot action. The people list stays mounted on the left the whole time (Law 3)." />
    </div>
  );
}

/* ── Console · Projects (L table) ────────────────────────────────────── */
function ProjectsTable({ panelId }: { panelId: string }) {
  const s = usePfApp();
  const ws = useWorkspace();
  const [flt, setFlt] = useState("Active");
  const rows = s.projects.filter((p) => flt === "All" || (flt === "Active") === !p.archived);
  return (
    <div>
      <div className="pf-toolbar">
        <Seg items={["Active", "Archived", "All"]} value={flt} onPick={setFlt} />
        <span className="pf-count">{rows.length} {rows.length === 1 ? "project" : "projects"}</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState glyph={<><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.2 3.9A2 2 0 0 0 7.5 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /></>} title="Nothing here" text="No project matches this filter." cta="Show all" onCta={() => setFlt("All")} />
      ) : (
        <div className="pf-scroll">
          <table className="pf-tbl">
            <thead><tr><th>Name</th><th>ID</th><th>Geography</th><th>Retention</th><th className="num">Members</th><th className="num">Spend</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className={p.archived ? "dim" : ""}
                  onClick={() => ws.openDetail(panelId, { panelType: "pfproject", resourceKey: "pfp:" + p.id })}>
                  <td className="strong">{p.name}</td>
                  <td className="mono">{p.pid}</td>
                  <td><span className="pf-geo">{p.geo}</span></td>
                  <td>{p.retention}</td>
                  <td className="num mono">{p.members}</td>
                  <td className="num mono">{usd(p.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Grammar text="pfprojects · L 640. Same table pattern, narrower columns; the geography badge and mono IDs come straight from the type law. Create lives in the foot and opens the new project's panel immediately." />
    </div>
  );
}

function ProjectDetail({ id }: { id: string }) {
  const s = usePfApp();
  const p = s.projects.find((x) => x.id === id);
  if (!p) return <div className="leaf-note">This project was deleted.</div>;
  return (
    <div>
      <input className="inline-edit pf-name" value={p.name} onChange={(e) => pfApp.renameProject(id, e.target.value)} aria-label="Project name" />
      {p.archived && <div style={{ marginBottom: 10 }}><Pill>archived</Pill></div>}
      <div className="anat-row"><span className="k">ID</span><span className="t mono">{p.pid}</span></div>
      <div className="anat-row"><span className="k">GEOGRAPHY</span><span className="t">{p.geo}</span></div>
      <div className="anat-row"><span className="k">RETENTION</span><span className="t">{p.retention}</span></div>
      <div className="anat-row"><span className="k">MEMBERS</span><span className="t mono">{p.members}</span></div>
      <div className="anat-row"><span className="k">CREATED</span><span className="t">{p.created}</span></div>
      <div className="anat-row"><span className="k">SPEND</span><span className="t mono">{usd(p.spend)} this month</span></div>
      <Grammar text="pfproject · S 380. Inline rename with the .inline-edit pattern: no borders, no window.prompt. Archive toggles in the foot." />
    </div>
  );
}

/* ── Console · Billing (M) ───────────────────────────────────────────── */
function BillingBody({ panelId }: { panelId: string }) {
  const s = usePfApp();
  const ws = useWorkspace();
  const NAV: { key: string; label: string; sub: string; glyph: React.ReactNode; target: { panelType: string; resourceKey: string } }[] = [
    { key: "lim", label: "Spend limits", sub: "Caps, alerts, tiers", glyph: <><path d="M12 2v20M2 12h20" /></>, target: { panelType: "pflimits", resourceKey: "pf:limits" } },
    { key: "use", label: "Usage", sub: "Daily spend, by model", glyph: <><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></>, target: { panelType: "pfusage", resourceKey: "pf:usage" } },
    { key: "pay", label: "Payment methods", sub: "Cards on file", glyph: <><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></>, target: { panelType: "doc", resourceKey: "pf:payments" } },
    { key: "his", label: "Billing history", sub: "Invoices & receipts", glyph: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>, target: { panelType: "doc", resourceKey: "pf:history" } },
  ];
  return (
    <div>
      {s.banner && (
        <div className="pf-banner">
          <Ic d={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>} s={14} />
          <span>{s.banner}</span>
          <button onClick={() => pfApp.dismissBanner()} title="Dismiss">×</button>
        </div>
      )}
      <div className="pf-big-wrap">
        <div className="lab">Credit balance</div>
        <div className="pf-big">{usd(s.balance)}</div>
      </div>
      <div className="pf-autorow">
        <div>
          <div className="t">Automatic recharge</div>
          <div className="s">{s.auto ? "When the balance drops below $5, restore to $10." : "Off: API calls fail once the balance reaches $0."}</div>
        </div>
        <button className={"d-switch" + (s.auto ? " on" : "")} role="switch" aria-checked={s.auto} aria-label="Automatic recharge" onClick={() => pfApp.toggleAuto()} />
      </div>
      <div className="pf-nav">
        {NAV.map((n) => (
          <button key={n.key} className="pf-navcard" onClick={() => ws.openDetail(panelId, n.target)}>
            <span className="ic"><Ic d={n.glyph} /></span>
            <span className="t">{n.label}</span>
            <span className="s">{n.sub}</span>
          </button>
        ))}
      </div>
      <Grammar text="pfbilling · M 480. The billing hub: one big mono number, a switch row, and icon nav-cards that DRILL: the original's sub-pages become sibling panels, and the success toast becomes a dismissible banner inside the panel, never a modal (Law 1)." />
    </div>
  );
}

/* ── Console · Limits (M) ────────────────────────────────────────────── */
function LimitsBody() {
  const s = usePfApp();
  const pct = Math.min(100, (s.spent / s.limit) * 100);
  const TIERS = ["Free", "Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5"];
  return (
    <div>
      <div className="section">
        <div className="lab">Organization spend limit <span className="pf-dim">· resets in 11 days</span></div>
        <div className="pf-limitline"><span className="pf-big sm">{usd(s.spent)}</span><span className="pf-dim mono"> / {usd(s.limit)}</span>
          <span className="pf-steppers">
            <button className="d-btn outline sm" onClick={() => pfApp.bumpLimit(-20)} title="Lower limit by $20">−20</button>
            <button className="d-btn outline sm" onClick={() => pfApp.bumpLimit(20)} title="Raise limit by $20">+20</button>
          </span>
        </div>
        <div className="pf-prog"><div style={{ width: pct + "%" }} /></div>
        <div className="pf-hint">Actual costs may exceed this based on in-flight usage.</div>
      </div>
      <div className="section">
        <div className="lab">Spend alerts</div>
        {s.alerts.length === 0 && <div className="pf-hint">No alerts: add one from the foot.</div>}
        {s.alerts.map((a) => (
          <div key={a} className="pf-alertrow">
            <Ic d={<><path d="M22 6 12 13 2 6" /><rect x="2" y="4" width="20" height="16" rx="2" /></>} s={13} />
            <span>Email when spend reaches <span className="mono">{a}%</span> <span className="pf-dim mono">({usd((s.limit * a) / 100)})</span></span>
            <button className="pf-x" title="Remove alert" onClick={() => pfApp.removeAlert(a)}>×</button>
          </div>
        ))}
      </div>
      <div className="section">
        <div className="lab">Usage tier</div>
        <div className="pf-rail">
          {TIERS.map((t, i) => (
            <div key={t} className={"seg" + (i <= s.tier ? " on" : "")}><span>{t}</span></div>
          ))}
        </div>
        <div className="pf-railfoot">
          <span className="pf-hint">Higher tiers unlock higher rate limits as credit purchases accumulate.</span>
          {s.tier < 5 && <button className="d-btn outline sm" onClick={() => pfApp.upgradeTier()}>Upgrade tier</button>}
        </div>
      </div>
      <Grammar text="pflimits · M 480. Big numbers stay mono and tabular; the progress bar and the tier rail are token-painted divs. Alerts are a small collection: add in the foot, remove inline." />
    </div>
  );
}

/* ── Console · Usage (L, SVG chart) ──────────────────────────────────── */
const DAILY = [0.31, 0.42, 0.28, 0.66, 0.51, 0.9, 0.74, 0.38, 0.45, 0.82, 1.12, 0.67, 0.5, 0.93, 1.31, 0.78, 0.6, 0.44, 0.71, 1.02, 0.86, 0.58, 0.49, 0.95, 1.24, 0.91, 0.63, 0.55, 0.7, 0.62];
const MODELS = [
  { name: "gpt-5.4-mini", v: 9.84, pct: 54 },
  { name: "gpt-image-2", v: 4.92, pct: 27 },
  { name: "realtime-audio", v: 2.19, pct: 12 },
  { name: "embeddings-4", v: 1.25, pct: 7 },
];
const rangeSlice = (range: string) => (range === "7d" ? DAILY.slice(-7) : DAILY);
// per-day derived telemetry: the KPI stats and the CSV follow the range, always
const dayStats = (range: string) => {
  const data = rangeSlice(range);
  const sum = data.reduce((a, b) => a + b, 0);
  return {
    data, sum,
    requests: Math.round(sum * 1780).toLocaleString("en-US"),
    tokens: (sum * 0.79).toFixed(1) + "M",
    images: Math.round(sum * 13.4),
  };
};
export function usageCsv(range: string): string {
  const data = rangeSlice(range);
  return "day,usd\n" + data.map((v, i) => `${i + 1},${v.toFixed(2)}`).join("\n");
}
function UsageBody() {
  const s = usePfApp();
  const range = s.usageRange;
  const { data, sum: total, requests, tokens, images } = dayStats(range);
  const max = Math.max(...data);
  const W = 560, H = 120, gap = 3;
  const bw = (W - gap * (data.length - 1)) / data.length;
  return (
    <div>
      <div className="pf-toolbar">
        <Seg items={["7d", "30d"]} value={range} onPick={(r) => pfApp.setUsageRange(r as "7d" | "30d")} />
        <span className="pf-count mono">{usd(total)} total</span>
      </div>
      <div className="stats">
        <div className="stat"><div className="lab">requests</div><div className="val">{requests}</div></div>
        <div className="stat"><div className="lab">tokens</div><div className="val">{tokens}</div></div>
        <div className="stat"><div className="lab">images</div><div className="val">{images}</div></div>
      </div>
      <div className="pf-chart">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-label="Daily spend">
          {data.map((v, i) => {
            const h = Math.max(2, (v / max) * (H - 8));
            return <rect key={i} x={i * (bw + gap)} y={H - h} width={bw} height={h} rx="1.5" className={i === data.length - 1 ? "hot" : ""} />;
          })}
        </svg>
        <div className="pf-axis mono"><span>{range === "7d" ? "Jul 14" : "Jun 21"}</span><span>daily spend</span><span>Jul 20</span></div>
      </div>
      <div className="section">
        <div className="lab">By model</div>
        {MODELS.map((m) => (
          <div key={m.name} className="pf-modelrow">
            <span className="nm mono">{m.name}</span>
            <span className="bar"><span style={{ width: m.pct + "%" }} /></span>
            <span className="v mono">{usd(m.v)}</span>
          </div>
        ))}
      </div>
      <Grammar text="pfusage · L 640. The usage dashboard: KPI stats reuse the framework's stat row, the chart is a plain token-colored SVG, and Export in the foot downloads a real CSV. The original's right rail became the stat row: no second column inside a panel." />
    </div>
  );
}

/* ── Console · Service health (M) ────────────────────────────────────── */
function HealthBody({ panelId }: { panelId: string }) {
  const s = usePfApp();
  const ws = useWorkspace();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div>
      <div className="pf-okline"><span className="dot" />All systems operational</div>
      <div className="pf-list">
        {s.services.map((sv) => (
          <div key={sv.id}>
            <button className="pf-svc" onClick={() => setOpen(open === sv.id ? null : sv.id)} aria-expanded={open === sv.id}>
              <Ic d={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>} s={14} />
              <span className="nm">{sv.name}</span>
              <span className="mono up">{Math.min(...sv.up).toFixed(2)}%</span>
              <span className="car">{open === sv.id ? "⌄" : "›"}</span>
            </button>
            {open === sv.id && (
              <div className="pf-upbar">
                {sv.up.map((u, i) => <span key={i} className={u < 100 ? "warn" : ""} title={u + "%"} />)}
                <span className="pf-hint">14 days · worst {Math.min(...sv.up).toFixed(2)}%</span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="section">
        <div className="lab">Incident history</div>
        <div className="drills">
          {s.incidents.map((inc, i) => (
            <button key={inc.id} className="drill" onClick={() => ws.openDetail(panelId, { panelType: "pfincident", resourceKey: "pfi:" + inc.id })}>
              <span className="no">{String(i + 1).padStart(2, "0")}</span>
              <span className="bd">
                <span className="tt" style={{ display: "block" }}>{inc.title}</span>
                <span className="ss" style={{ display: "block" }}>{inc.date}: resolved</span>
              </span>
              <span className="arr">→</span>
            </button>
          ))}
        </div>
      </div>
      <Grammar text="pfhealth · M 480. Status rows expand in place (a disclosure, not navigation); each incident is a real drill to an S panel. The green dot is the only status color the panel needs." />
    </div>
  );
}

function IncidentDetail({ id }: { id: string }) {
  const s = usePfApp();
  const inc = s.incidents.find((x) => x.id === id);
  if (!inc) return null;
  return (
    <div>
      <div className="anat-row"><span className="k">DATE</span><span className="t mono">{inc.date}</span></div>
      <div className="anat-row"><span className="k">SERVICE</span><span className="t">{inc.service}</span></div>
      <div className="anat-row"><span className="k">STATUS</span><span className="t"><Pill on>resolved</Pill></span></div>
      <div className="leaf-note" style={{ marginTop: 12 }}>{inc.note}</div>
      <Grammar text="pfincident · S 380: a leaf. The incident rail of the original is just a drill list here; the write-up gets its own panel instead of a hover popover." />
    </div>
  );
}

/* ── Console · Data controls (M form) ────────────────────────────────── */
const CONTROL_GROUPS: { key: "threads" | "usage" | "logs"; label: string; sub: string; opts: { v: string; l: string }[] }[] = [
  { key: "threads", label: "Threads", sub: "The threads page shows conversations created with the API and the Studio.", opts: [{ v: "hidden", l: "Hidden" }, { v: "owners", l: "Visible to organization owners" }, { v: "everyone", l: "Visible to everyone" }] },
  { key: "usage", label: "Usage dashboard", sub: "Activity and costs for the whole organization.", opts: [{ v: "owners", l: "Owners and users with usage permissions" }, { v: "everyone", l: "Visible to everyone" }] },
  { key: "logs", label: "Logs page", sub: "Who can read request logs in the console UI: API access is unaffected.", opts: [{ v: "hidden", l: "Hidden" }, { v: "owners", l: "Visible to organization owners" }, { v: "everyone", l: "Visible to everyone" }] },
];
function ControlsBody() {
  const s = usePfApp();
  return (
    <div>
      {CONTROL_GROUPS.map((g) => (
        <div key={g.key} className="section">
          <div className="lab">{g.label}</div>
          <div className="pf-hint" style={{ marginBottom: 8 }}>{g.sub}</div>
          {g.opts.map((o) => (
            <button key={o.v} className="pf-radio" role="radio" aria-checked={s.controlsDraft[g.key] === o.v}
              onClick={() => pfApp.setControl(g.key, o.v)}>
              <span className={"dot" + (s.controlsDraft[g.key] === o.v ? " on" : "")} />
              <span>{o.l}</span>
            </button>
          ))}
        </div>
      ))}
      {pfApp.controlsDirty() && <div className="pf-hint hot">Unsaved changes: Save lives in the foot, the one action zone.</div>}
      <Grammar text="pfcontrols · M 480. A settings FORM in the grammar: radio groups with their explanations, drafts held until Save: and Save is the foot's primary action, not a button floating at the end of the page." />
    </div>
  );
}

/* ── Console · Security (M, segments + empty states) ─────────────────── */
function SecurityBody() {
  const s = usePfApp();
  const [tab, setTab] = useState("Identity");
  return (
    <div>
      <div className="pf-toolbar"><Seg items={["Identity", "IP allowlist", "Domains"]} value={tab} onPick={setTab} /></div>
      {tab === "Identity" && (s.provider ? (
        <div className="pf-list">
          <div className="pf-person static">
            <span className="pf-ava"><Ic d={<><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>} s={14} /></span>
            <span className="bd">
              <span className="nm">{s.provider.name}</span>
              <span className="em">Workload identity provider · created {s.provider.created}</span>
            </span>
            <Pill on>active</Pill>
          </div>
        </div>
      ) : (
        <EmptyState glyph={<><rect x="3" y="11" width="18" height="10" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>}
          title="No workload identity provider"
          text="Create a provider to let external workloads authenticate without long-lived API keys. The create action is in the foot." />
      ))}
      {tab === "IP allowlist" && (s.ips.length === 0 ? (
        <EmptyState glyph={<><circle cx="12" cy="12" r="9" /><path d="M3.6 9h16.8M3.6 15h16.8M12 3a17 17 0 0 1 0 18M12 3a17 17 0 0 0 0 18" /></>}
          title="No IP restrictions" text="API traffic is accepted from any address." cta="+ Add a range" onCta={() => pfApp.addIp()} />
      ) : (
        <div className="pf-list">
          {s.ips.map((ip) => (
            <div key={ip} className="pf-alertrow"><span className="mono">{ip}</span><button className="pf-x" title="Remove" onClick={() => pfApp.removeIp(ip)}>×</button></div>
          ))}
          <button className="d-btn outline sm" onClick={() => pfApp.addIp()}>+ Add a range</button>
        </div>
      ))}
      {tab === "Domains" && (
        <div className="pf-list">
          {s.domains.map((d) => (
            <div key={d} className="pf-alertrow"><span className="mono">{d}</span><Pill on>verified</Pill></div>
          ))}
        </div>
      )}
      <Grammar text="pfsecurity · M 480. Three former tabs, one segment. The empty state is a first-class pattern: an icon, one sentence, and at most one inline CTA: the panel never pretends to be full." />
    </div>
  );
}

/* ── Studio · Prompt composer (L) ────────────────────────────────────── */
const PROMPT_TPL = "You are a senior support agent for {{customer_name}}. Answer in the customer's language, cite the exact doc section for every claim, and escalate billing disputes to a human.";
function PromptBody() {
  const s = usePfApp();
  const p = s.prompt;
  return (
    <div>
      <div className="section">
        <div className="lab">Prompt</div>
        <textarea className="pf-ta" rows={4} placeholder="Describe desired model behavior: tone, tool usage, response style…"
          value={p.text} onChange={(e) => pfApp.setPrompt({ text: e.target.value })} />
        <div className="pf-btnrow">
          <button className="d-btn outline sm" onClick={() => pfApp.setPrompt({ text: PROMPT_TPL })}>Generate prompt</button>
          <button className="d-btn ghost sm" onClick={() => pfApp.setPrompt({ text: "" })}>Clear</button>
        </div>
      </div>
      <div className="section">
        <div className="lab">Model</div>
        <Seg items={["gpt-5.4", "gpt-5.4-mini", "o4-mini"]} value={p.model} onPick={(v) => pfApp.setPrompt({ model: v })} />
        <div className="pop-sub" style={{ marginTop: 10 }}>Reasoning</div>
        <Seg items={["low", "standard", "high"]} value={p.reasoning} onPick={(v) => pfApp.setPrompt({ reasoning: v })} />
        <div className="pop-sub" style={{ marginTop: 10 }}>Verbosity</div>
        <Seg items={["low", "medium", "high"]} value={p.verbosity} onPick={(v) => pfApp.setPrompt({ verbosity: v })} />
        <div className="pf-autorow slim">
          <div><div className="t">Store logs</div><div className="s">Keep runs in the Logs page for this project.</div></div>
          <button className={"d-switch" + (p.store ? " on" : "")} role="switch" aria-checked={p.store} aria-label="Store logs" onClick={() => pfApp.setPrompt({ store: !p.store })} />
        </div>
      </div>
      <div className="section">
        <div className="lab">Variables</div>
        <div className="pf-vars">
          {p.vars.map((v) => (
            <span key={v} className="pf-var mono">{"{{" + v + "}}"}<button title="Remove variable" onClick={() => pfApp.removeVar(v)}>×</button></span>
          ))}
          <button className="d-btn ghost sm" onClick={() => pfApp.addVar()}>+ Add</button>
        </div>
      </div>
      {s.runs.length > 0 && (
        <div className="section">
          <div className="lab">Runs</div>
          {s.runs.map((r) => (
            <div key={r.id} className="pf-runrow">
              <span className="mono ts">{r.ts}</span>
              <span className="mono md">{r.model}</span>
              <span className="tx">{r.text}</span>
            </div>
          ))}
        </div>
      )}
      <Grammar text="pfprompt · L 640. The playground's config column becomes stacked sections; model, reasoning and verbosity are segments, never native selects. The floating 'Ask anything' composer is anchored in the FOOT: one action zone, Law 6." />
    </div>
  );
}

/* ── Studio · Realtime creator (M) ───────────────────────────────────── */
const RT_CHIPS = ["A calm concierge for late-night hotel calls", "A pair-programming voice for code reviews", "A sports commentator for live matches", "A bilingual museum guide, FR/EN"];
function RealtimeBody() {
  const s = usePfApp();
  return (
    <div>
      <div className="pf-hero">
        <span className="ic"><Ic d={<><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></>} s={22} /></span>
        <div className="t">Create a realtime voice prompt</div>
        <div className="s">Pick a starting point, refine it, then press Create in the foot.</div>
      </div>
      <div className="pf-suggs">
        {RT_CHIPS.map((c) => (
          <button key={c} className={"pf-sugg" + (s.rtDraft === c ? " on" : "")} onClick={() => pfApp.setRtDraft(c)}>{c}</button>
        ))}
      </div>
      <textarea className="pf-ta" rows={3} placeholder="…or describe the voice agent yourself"
        value={s.rtDraft} onChange={(e) => pfApp.setRtDraft(e.target.value)} />
      {s.rtSaved.length > 0 && (
        <div className="section">
          <div className="lab">Recent prompts</div>
          {s.rtSaved.map((r) => (
            <div key={r.id} className="pf-runrow"><span className="tx">{r.text}</span></div>
          ))}
        </div>
      )}
      <Grammar text="pfrealtime · M 480. The centered creator: icon, one sentence, suggestion chips that FILL the draft (they never act on their own), and the single Create verb in the foot." />
    </div>
  );
}

/* ── Studio · Images (L grid + foot composer) ────────────────────────── */
function ImagesBody() {
  const s = usePfApp();
  const [size, setSize] = useState("1x"); // 1x/2x/4x = tile density
  return (
    <div>
      <div className="pf-toolbar">
        <span className="pf-modelchip mono">gpt-image-2</span>
        <Seg items={["1x", "2x", "4x"]} value={size} onPick={setSize} />
        <span className="pf-count">{s.images.length} generations</span>
      </div>
      <div className={"pf-grid d" + size.replace("x", "")}>
        {s.images.map((im) => (
          <figure key={im.id} className="pf-tile">
            <svg viewBox="0 0 100 76" preserveAspectRatio="none" aria-label={im.prompt}>
              <defs>
                <linearGradient id={"pfg" + im.id} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor={`oklch(0.82 0.10 ${im.hue})`} />
                  <stop offset="1" stopColor={`oklch(0.55 0.16 ${(im.hue + 40) % 360})`} />
                </linearGradient>
              </defs>
              <rect width="100" height="76" fill={`url(#pfg${im.id})`} />
              <circle cx={72} cy={22} r={10} fill="oklch(0.95 0.03 90 / 0.55)" />
            </svg>
            <figcaption>{im.prompt}</figcaption>
          </figure>
        ))}
      </div>
      <Grammar text="pfimages · L 640. The media grid: tiles are token-painted SVG, captions stay small, and the 'describe what you want to see' composer sits in the foot with Generate as its primary: the floating pill of the original, anchored." />
    </div>
  );
}

/* ── Studio · Build hub (L prompt cards) ─────────────────────────────── */
interface HubCard { id: string; title: string; sub: string; glyph: React.ReactNode; prompt: string }
const HUB_BUILD: HubCard[] = [
  { id: "crm", title: "Build a panel-native CRM", sub: "Accounts → contacts → deals as one drill chain.", glyph: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></>, prompt: "Build a CRM on the Stax panel grammar. Spaces: Accounts (root L), Reports (read-only). Every record opens with openDetail beside its parent: no routes, no modals. Foot = one accent CTA per panel. Widths from the registry (S380/M480/L640/XL800). Start from packages/panels-react." },
  { id: "agent", title: "Build an agent console", sub: "Runs, traces and tools as drillable panels.", glyph: <><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 11h.01M15 11h.01M9.5 15h5" /></>, prompt: "Build an agent-operations console in the Stax grammar: a Runs space (XL table with status pills, mono ids, row → run detail panel), each run drilling to its trace (steps as numbered drills) and tool calls (S inspectors). Live state in a module store with useSyncExternalStore." },
  { id: "voice", title: "Build a realtime audio app", sub: "A voice-first surface with session panels.", glyph: <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /></>, prompt: "Build a realtime voice app in the Stax grammar: a Sessions space, each session a panel with a live transcript, the composer anchored in the foot, and device settings as an S drill. No floating overlays: every surface is a panel." },
];
const HUB_IMPROVE: HubCard[] = [
  { id: "modals", title: "Convert modals to panels", sub: "Kill every dialog without losing a feature.", glyph: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></>, prompt: "Inventory every modal/dialog/drawer in this codebase (grep for Modal|Dialog|Drawer). For each, restate its job, then re-express it in the Stax grammar: detail modals → openDetail panels, confirms → foot actions with undo, wizards → chained drills. Produce the conversion table first, then migrate one modal per commit." },
  { id: "audit", title: "Audit against the laws", sub: "Nine laws, evidence or it didn't happen.", glyph: <><path d="M20 6 9 17l-5-5" /></>, prompt: "Run the Stax law audit on this app (the master prompt ships in Prompt pack → Compliance audit). For each of the nine laws: PASS/FAIL with grep output, file:line or screenshot. Any FAIL blocks done. Output laws-report.md." },
  { id: "table", title: "Add a data-table space", sub: "Views, filters, calcs: rows open as panels.", glyph: <><path d="M3 9h18M3 15h18M9 3v18" /><rect x="3" y="3" width="18" height="18" rx="2" /></>, prompt: "Add an Airtable-class collection space to this Stax app: typed fields, named views carrying filters/sort/hidden/group, per-column calcs, and every row opening as a document panel beside the table. Follow apps/crm-specimen/src/DataApp.tsx as the reference implementation." },
];
function HubBody({ panelId }: { panelId: string }) {
  const ws = useWorkspace();
  const [openCard, setOpenCard] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (c: HubCard) => {
    navigator.clipboard?.writeText(c.prompt);
    setCopied(c.id);
    window.setTimeout(() => setCopied((v) => (v === c.id ? null : v)), 1400);
  };
  const openStudio = (c: HubCard) => {
    pfApp.setPrompt({ text: c.prompt });
    ws.openDetail(panelId, { panelType: "pfprompt", resourceKey: "pf:prompt" });
  };
  const Cards = ({ cards }: { cards: HubCard[] }) => (
    <div className="pf-hubs">
      {cards.map((c) => (
        <div key={c.id} className="pf-hubcard">
          <span className="ic"><Ic d={c.glyph} /></span>
          <div className="t">{c.title}</div>
          <div className="s">{c.sub}</div>
          <div className="pf-btnrow">
            <button className="d-btn outline sm" onClick={() => copy(c)}>{copied === c.id ? "Copied ✓" : "Copy prompt"}</button>
            <button className="d-btn outline sm" onClick={() => openStudio(c)}>Open in Studio</button>
            <button className="d-btn ghost sm" title="Show the prompt" onClick={() => setOpenCard(openCard === c.id ? null : c.id)}>{openCard === c.id ? "⌄" : "›"}</button>
          </div>
          {openCard === c.id && <pre className="pf-promptpre">{c.prompt}</pre>}
        </div>
      ))}
    </div>
  );
  return (
    <div>
      <div className="pf-herocard">
        <div className="t">Build faster with Stax in your coding agent.</div>
        <div className="s">Every card below is a ready-to-paste mission for Claude Code or Codex: the same prompts that ship in the Prompt pack, scoped to a single build.</div>
        <div className="steps">
          <span><span className="no mono">1</span>Copy a prompt</span>
          <span><span className="no mono">2</span>Paste it into your agent</span>
          <span><span className="no mono">3</span>Audit with the laws</span>
        </div>
      </div>
      <div className="pop-sub" style={{ margin: "14px 0 6px" }}>Build a new app</div>
      <Cards cards={HUB_BUILD} />
      <div className="pop-sub" style={{ margin: "14px 0 6px" }}>Improve an existing app</div>
      <Cards cards={HUB_IMPROVE} />
      <Grammar text="pfhub · L 640. The prompt-card hub: a hero with numbered steps, then card rows whose ONLY verbs are Copy and Open-in-Studio: and Open in Studio drills the composer panel beside this one, prefilled. Expanding a card is a disclosure, not navigation." />
    </div>
  );
}

/* ── Console · Logs (XL): fed live by the Studio composer's runs ────── */
function LogsBody({ panelId }: { panelId: string }) {
  const s = usePfApp();
  const ws = useWorkspace();
  const [flt, setFlt] = useState("All");
  const rows = s.runs.filter((r) => flt === "All" || (flt === "OK") === (r.status < 400));
  return (
    <div>
      <div className="pf-toolbar">
        <Seg items={["All", "OK", "Errors"]} value={flt} onPick={setFlt} />
        <span className="pf-count">{rows.length} {rows.length === 1 ? "request" : "requests"}</span>
      </div>
      {rows.length === 0 ? (
        <EmptyState glyph={<><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /><path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" /><line x1="4" y1="12" x2="20" y2="12" /></>}
          title="No requests match" text="Run something in the Studio composer: it lands here the moment it returns." cta="Show all" onCta={() => setFlt("All")} />
      ) : (
        <div className="pf-scroll">
          <table className="pf-tbl">
            <thead><tr><th>Time</th><th>Model</th><th>Status</th><th className="num">Tokens</th><th className="num">Latency</th><th>Prompt</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => ws.openDetail(panelId, { panelType: "pflog", resourceKey: "pfl:" + r.id })}>
                  <td className="mono">{r.ts}</td>
                  <td className="mono">{r.model}</td>
                  <td><Pill on={r.status < 400}>{r.status}</Pill></td>
                  <td className="num mono">{r.tokens.toLocaleString("en-US")}</td>
                  <td className="num mono">{(r.ms / 1000).toFixed(2)}s</td>
                  <td className="pf-trunc">{r.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Grammar text="pflogs · XL 800. The Logs page the console copy promised: fed LIVE by the Studio composer's runs store: fire a prompt in the other dashboard and the row appears here. One store, two dashboards, zero sync code: that is the module-store pattern." />
    </div>
  );
}

function LogDetail({ id }: { id: string }) {
  const s = usePfApp();
  const r = s.runs.find((x) => x.id === id);
  if (!r) return <div className="leaf-note">This request rotated out of the log window.</div>;
  return (
    <div>
      <div className="anat-row"><span className="k">TIME</span><span className="t mono">{r.ts}</span></div>
      <div className="anat-row"><span className="k">MODEL</span><span className="t mono">{r.model}</span></div>
      <div className="anat-row"><span className="k">STATUS</span><span className="t"><Pill on={r.status < 400}>{r.status}</Pill></span></div>
      <div className="anat-row"><span className="k">TOKENS</span><span className="t mono">{r.tokens.toLocaleString("en-US")}</span></div>
      <div className="anat-row"><span className="k">LATENCY</span><span className="t mono">{(r.ms / 1000).toFixed(2)}s</span></div>
      <div className="section">
        <div className="lab">Prompt</div>
        <div className="leaf-note">{r.text}</div>
      </div>
      <Grammar text="pflog · S 380: the request inspector. A log row opened beside its table; in production this panel would carry the full request/response pair and a re-run foot action." />
    </div>
  );
}

/* ── entry points for the Panel shell ────────────────────────────────── */
export function PlatformBody({ panelType, resourceKey, panelId }: { panelType: string; resourceKey: string; panelId: string }) {
  usePfApp();
  const id = resourceKey.split(":")[1] ?? "";
  switch (panelType) {
    case "pfkeys": return <KeysTable panelId={panelId} />;
    case "pfkey": return <KeyDetail id={id} />;
    case "pfpeople": return <PeopleList panelId={panelId} />;
    case "pfmember": return <MemberDetail id={id} />;
    case "pfprojects": return <ProjectsTable panelId={panelId} />;
    case "pfproject": return <ProjectDetail id={id} />;
    case "pfbilling": return <BillingBody panelId={panelId} />;
    case "pflimits": return <LimitsBody />;
    case "pfusage": return <UsageBody />;
    case "pfhealth": return <HealthBody panelId={panelId} />;
    case "pfincident": return <IncidentDetail id={id} />;
    case "pflogs": return <LogsBody panelId={panelId} />;
    case "pflog": return <LogDetail id={id} />;
    case "pfcontrols": return <ControlsBody />;
    case "pfsecurity": return <SecurityBody />;
    case "pfprompt": return <PromptBody />;
    case "pfrealtime": return <RealtimeBody />;
    case "pfimages": return <ImagesBody />;
    case "pfhub": return <HubBody panelId={panelId} />;
    default: return null;
  }
}

function ComposerFoot({ placeholder, cta, onRun }: { placeholder: string; cta: string; onRun: (t: string) => void }) {
  const [t, setT] = useState("");
  const fire = () => { if (t.trim()) { onRun(t.trim()); setT(""); } };
  return (
    <>
      <input className="foot-search" style={{ flex: 1 }} placeholder={placeholder} value={t}
        onChange={(e) => setT(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") fire(); if (e.key === "Escape") { e.stopPropagation(); setT(""); } }} />
      <button className="foot-cta" onClick={fire}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" /></svg> {cta}
      </button>
    </>
  );
}

export function PlatformFoot({ panelType, resourceKey, panelId, closePanel }: { panelType: string; resourceKey: string; panelId: string; closePanel: () => void }) {
  const s = usePfApp();
  const ws = useWorkspace();
  const id = resourceKey.split(":")[1] ?? "";
  const plus = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>;
  const trash = <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>;
  switch (panelType) {
    case "pfkeys":
      return <button className="foot-cta" onClick={() => ws.openDetail(panelId, { panelType: "pfkey", resourceKey: "pfk:" + pfApp.addKey() })}>{plus} Create secret key</button>;
    case "pfkey": {
      const k = s.keys.find((x) => x.id === id);
      if (!k) return <span className="foot-note">Key deleted</span>;
      return k.status === "active"
        ? <button className="d-btn destructive sm" onClick={() => pfApp.revokeKey(id)}>{trash} Revoke key</button>
        : <button className="d-btn destructive sm" onClick={() => { pfApp.removeKey(id); closePanel(); }}>{trash} Delete key</button>;
    }
    case "pfpeople":
      return <ComposerFoot placeholder="teammate@company.com" cta="Invite" onRun={(t) => pfApp.invite(t)} />;
    case "pfmember": {
      const m = s.members.find((x) => x.id === id);
      if (!m) return <span className="foot-note">Member removed</span>;
      return m.you
        ? <span className="foot-note">This is you: the workspace owner</span>
        : <button className="d-btn destructive sm" onClick={() => { pfApp.removeMember(id); closePanel(); }}>{trash} Remove member</button>;
    }
    case "pfprojects":
      return <button className="foot-cta" onClick={() => ws.openDetail(panelId, { panelType: "pfproject", resourceKey: "pfp:" + pfApp.addProject() })}>{plus} Create project</button>;
    case "pfproject": {
      const p = s.projects.find((x) => x.id === id);
      if (!p) return <span className="foot-note">Project deleted</span>;
      return <button className={"d-btn sm" + (p.archived ? " outline" : " destructive")} onClick={() => pfApp.toggleArchive(id)}>{p.archived ? "Restore project" : "Archive project"}</button>;
    }
    case "pfbilling":
      return <button className="foot-cta" onClick={() => pfApp.addCredits()}>{plus} Add credits</button>;
    case "pflimits":
      return <button className="foot-cta" onClick={() => pfApp.addAlert()}>{plus} Add spend alert</button>;
    case "pfusage":
      return (
        <button className="d-btn outline sm" onClick={() => {
          const a = document.createElement("a");
          a.href = URL.createObjectURL(new Blob([usageCsv(pfApp.get().usageRange)], { type: "text/csv" }));
          a.download = "stax-usage-" + pfApp.get().usageRange + ".csv";
          a.click();
          URL.revokeObjectURL(a.href);
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg> Export CSV
        </button>
      );
    case "pfhealth":
      return <span className="foot-note">Live status: read-only</span>;
    case "pfincident":
      return <span className="foot-note">Read-only</span>;
    case "pflogs":
      return <button className="d-btn outline sm" onClick={() => ws.openDetail(panelId, { panelType: "pfprompt", resourceKey: "pf:prompt" })}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg> Open the composer
      </button>;
    case "pflog":
      return <span className="foot-note">Read-only</span>;
    case "pfcontrols":
      return <button className="foot-cta" disabled={!pfApp.controlsDirty()} onClick={() => pfApp.saveControls()}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg> Save changes
      </button>;
    case "pfsecurity":
      return s.provider
        ? <button className="d-btn destructive sm" onClick={() => pfApp.removeProvider()}>{trash} Remove provider</button>
        : <button className="foot-cta" onClick={() => pfApp.createProvider()}>{plus} Create identity provider</button>;
    case "pfprompt":
      return <ComposerFoot placeholder="Ask anything: runs with the config above…" cta="Run" onRun={(t) => pfApp.run(t)} />;
    case "pfrealtime":
      return <button className="foot-cta" disabled={!s.rtDraft.trim()} onClick={() => pfApp.createRt()}>{plus} Create prompt</button>;
    case "pfimages":
      return <ComposerFoot placeholder="Describe what you want to see…" cta="Generate" onRun={(t) => pfApp.genImage(t)} />;
    case "pfhub":
      return <span className="foot-note">Copy a prompt: or open it in the Studio composer beside this panel</span>;
    default:
      return <span className="foot-note">Read-only</span>;
  }
}
