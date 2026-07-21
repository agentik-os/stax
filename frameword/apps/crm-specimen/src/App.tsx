import { createContext, lazy, Suspense, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { PanelInstance, PanelTarget } from "@frameword/panels-core";
import {
  WorkspaceProvider,
  useWorkspace,
  panelWidth,
  useIsCompact,
  type PanelRegistry,
  type PanelSize,
} from "@frameword/panels-react";
import { DOMAIN, SPACES, DASHBOARDS, dashboardOfSpace, chainOf, spaceOf } from "./domain";
import { ComponentDemo } from "./ComponentDemo";
import { BlockDemo } from "./BlockDemo";
import { board, boardFromPrompt } from "./boardStore";
// the canvas renderer (React Flow + dagre) loads lazily — it is the heaviest
// module in the app and only two panel types ever need it
const CanvasBoard = lazy(() => import("./CanvasBoard").then((m) => ({ default: m.CanvasBoard })));
const NodeInspector = lazy(() => import("./CanvasBoard").then((m) => ({ default: m.NodeInspector })));
const EdgeInspector = lazy(() => import("./CanvasBoard").then((m) => ({ default: m.EdgeInspector })));
import { BlockLive } from "./BlockLive";
import { ProfileBody, AvatarBubble, useProfile } from "./Profile";
import { NotesRoot, TasksRoot, NoteEditor, TaskDetail, FolderPanel, notesApp, useNotesApp } from "./NotesApp";
import { DataHome, DataTable, DataRow, dataApp, useDataApp } from "./DataApp";
import { PlatformBody, PlatformFoot, pfApp, usePfApp } from "./PlatformApp";
import { NotifBell } from "./Notifications";
import { Flag } from "./Flags";

/* ── registry : width belongs to the KIND, not the user ──────────────── */
const REGISTRY: PanelRegistry = {
  space: { size: "L" },
  account: { size: "M" },
  contact: { size: "M" },
  opportunity: { size: "M" },
  activity: { size: "S" },
  report: { size: "M" },
  section: { size: "L" },
  doc: { size: "M" },
  law: { size: "S" },
  improvement: { size: "M" },
  prompt: { size: "M" },
  component: { size: "M" },
  settings: { size: "M" },
  block: { size: "M" },
  canvas: { size: "XL" },
  canvasnode: { size: "S" },
  canvasedge: { size: "S" },
  blocklive: { size: "XL" },
  profile: { size: "M" },
  notes: { size: "M" },
  datahome: { size: "M" },
  datatable: { size: "XL" },
  datarow: { size: "L" },
  notefolder: { size: "M" },
  tasks: { size: "XL" },
  note: { size: "M" },
  task: { size: "S" },
  pfkeys: { size: "XL" },
  pfkey: { size: "S" },
  pfpeople: { size: "L" },
  pfmember: { size: "S" },
  pfprojects: { size: "L" },
  pfproject: { size: "S" },
  pfbilling: { size: "M" },
  pflimits: { size: "M" },
  pfusage: { size: "L" },
  pfhealth: { size: "M" },
  pfincident: { size: "S" },
  pflogs: { size: "XL" },
  pflog: { size: "S" },
  pfcontrols: { size: "M" },
  pfsecurity: { size: "M" },
  pfprompt: { size: "L" },
  pfrealtime: { size: "M" },
  pfimages: { size: "L" },
  pfhub: { size: "L" },
};

/* ── device-local preferences (the zip's Settings panel, and then some) ─ */
interface Prefs {
  titleFont: string; bodyFont: string; monoFont: string;
  titleSize: "S" | "M" | "L"; bodySize: "S" | "M" | "L"; monoSize: "S" | "M" | "L";
  accent: string; gap: "S" | "M" | "L"; pad: "S" | "M" | "L";
  crumb: boolean; dots: boolean; zoom: number; lang: string;
}
const DEFAULT_PREFS: Prefs = { titleFont: "news", bodyFont: "inter", monoFont: "geist", titleSize: "M", bodySize: "M", monoSize: "M", accent: "default", gap: "M", pad: "M", crumb: true, dots: true, zoom: 100, lang: "en" };
const FZ_TITLE: Record<"S" | "M" | "L", string> = { S: "23px", M: "27px", L: "31px" };
const FZ_BODY: Record<"S" | "M" | "L", string> = { S: "12.5px", M: "13.5px", L: "14.5px" };
const FZ_MONO: Record<"S" | "M" | "L", string> = { S: "9px", M: "10px", L: "11px" };
const ZOOMS = [80, 90, 100, 110, 120];
const TITLE_FONTS: Record<string, { label: string; css: string }> = {
  news: { label: "Newsreader", css: "'Newsreader','Times New Roman',Georgia,serif" },
  playfair: { label: "Playfair Display", css: "'Playfair Display',Georgia,serif" },
  lora: { label: "Lora", css: "'Lora',Georgia,serif" },
  sourceserif: { label: "Source Serif 4", css: "'Source Serif 4',Georgia,serif" },
  georgia: { label: "Georgia", css: "Georgia,'Times New Roman',serif" },
  grotesk: { label: "Space Grotesk", css: "'Space Grotesk',ui-sans-serif,sans-serif" },
  inter: { label: "Inter", css: "'Inter',ui-sans-serif,system-ui,sans-serif" },
};
const BODY_FONTS: Record<string, { label: string; css: string }> = {
  inter: { label: "Inter", css: "'Inter',ui-sans-serif,system-ui,-apple-system,sans-serif" },
  grotesk: { label: "Space Grotesk", css: "'Space Grotesk',ui-sans-serif,sans-serif" },
  plex: { label: "IBM Plex Sans", css: "'IBM Plex Sans',ui-sans-serif,sans-serif" },
  system: { label: "System", css: "system-ui,-apple-system,'Segoe UI',sans-serif" },
  georgia: { label: "Georgia", css: "Georgia,'Times New Roman',serif" },
};
const MONO_FONTS: Record<string, { label: string; css: string }> = {
  geist: { label: "Geist Mono", css: "'Geist Mono',ui-monospace,SFMono-Regular,Menlo,monospace" },
  jetbrains: { label: "JetBrains Mono", css: "'JetBrains Mono',ui-monospace,monospace" },
  fira: { label: "Fira Code", css: "'Fira Code',ui-monospace,monospace" },
  menlo: { label: "Menlo", css: "Menlo,ui-monospace,SFMono-Regular,monospace" },
  courier: { label: "Courier", css: "'Courier New',Courier,monospace" },
};
const ACCENTS: { key: string; color: string; title: string }[] = [
  { key: "default", color: "oklch(0.578 0.245 27)", title: "Supreme red (default)" },
  { key: "#16161A", color: "#16161A", title: "Noir" },
  { key: "#3452D9", color: "#3452D9", title: "Cobalt" },
  { key: "#7C3AED", color: "#7C3AED", title: "Violet" },
  { key: "#0F7B4D", color: "#0F7B4D", title: "Vert" },
  { key: "#D97706", color: "#D97706", title: "Ambre" },
];
const GAPS: Record<Prefs["gap"], string> = { S: "8px", M: "14px", L: "22px" };
const PADS: Record<Prefs["pad"], string> = { S: "10px", M: "18px", L: "28px" };

/* ── organisations / teams — the sidebar-08 team switcher, framework-side ─ */
interface Org { id: string; name: string; tier: string }
const ORGS: Org[] = [
  { id: "stax", name: "Stax", tier: "Enterprise" },
  { id: "acme", name: "Acme Inc", tier: "Startup" },
  { id: "evil", name: "Evil Corp.", tier: "Free" },
];
function OrgIcon({ id, inverted }: { id: string; inverted?: boolean }) {
  const c = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const style = inverted ? undefined : { color: "var(--muted-foreground)" };
  if (id === "acme") return (<svg {...c} style={style}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>);
  if (id === "evil") return (<svg {...c} style={style}><circle cx="12" cy="12" r="9" /><path d="M8 15s1.5-2 4-2 4 2 4 2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>);
  return (<svg {...c} style={style}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>);
}

const PrefsCtx = createContext<{
  prefs: Prefs; set: (p: Partial<Prefs>) => void; reset: () => void;
  theme: string; setTheme: (m: string) => void;
} | null>(null);
const usePrefs = () => useContext(PrefsCtx)!;

const LANGS = [
  { id: "en", label: "English", flag: "gb" },
  { id: "fr", label: "Français", flag: "fr" },
  { id: "de", label: "Deutsch", flag: "de" },
  { id: "es", label: "Español", flag: "es" },
  { id: "pt", label: "Português", flag: "pt" },
];

const targetOf = (key: string): PanelTarget => ({
  panelType: DOMAIN[key].panelType,
  resourceKey: key,
});

/* canvas nodes live in the board store, not in DOMAIN — resolve titles through both */
const titleOfKey = (key: string): string =>
  DOMAIN[key]?.title ??
  (key.startsWith("cvn:") ? board.node(key.slice(4))?.label ?? "Node"
    : key.startsWith("cve:") ? (board.edge(key.slice(4))?.label || "Connection")
    : key.startsWith("nte:") ? (notesApp.note(key.slice(4))?.title || "Note")
    : key.startsWith("nfd:") ? (notesApp.folder(key.slice(4))?.name || "Folder")
    : key.startsWith("dtc:") ? (dataApp.col(key.slice(4))?.name || "Table")
    : key.startsWith("dtr:") ? (() => {
        const [, cid, rid] = key.split(":");
        const c = dataApp.col(cid); const r = c && dataApp.row(cid, rid);
        const ft = c?.fields.find((f) => f.type === "text");
        return String((ft && r?.v[ft.id]) || "Row");
      })()
    : key.startsWith("tsk:") ? (notesApp.task(key.slice(4))?.label || "Task")
    : key.startsWith("pfk:") ? (pfApp.key(key.slice(4))?.name || "API key")
    : key.startsWith("pfm:") ? (pfApp.member(key.slice(4))?.name || "Member")
    : key.startsWith("pfp:") ? (pfApp.project(key.slice(4))?.name || "Project")
    : key.startsWith("pfi:") ? (pfApp.get().incidents.find((i) => i.id === key.slice(4))?.title || "Incident")
    : key.startsWith("pfl:") ? (() => { const r = pfApp.get().runs.find((x) => x.id === key.slice(4)); return r ? r.model + " · " + r.ts : "Request"; })()
    : key);

export function App() {
  return (
    <WorkspaceProvider registry={REGISTRY} urlSync="push" storageKey="frameword-crm">
      <Shell />
    </WorkspaceProvider>
  );
}

/* lucide icons for sidebar space items (sidebar-08 adaptation) */
function SpaceIcon({ id }: { id: string }) {
  const c = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (id) {
    case "overview": return (<svg {...c}><path d="m3 9.5 9-7 9 7" /><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" /></svg>);
    case "model": return (<svg {...c}><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="M15 3v18" /></svg>);
    case "laws": return (<svg {...c}><path d="M20 6 9 17l-5-5" /><rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="none" /></svg>);
    case "improvements": return (<svg {...c}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>);
    case "architecture": return (<svg {...c}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.29 7 12 12 20.71 7" /><line x1="12" y1="22" x2="12" y2="12" /></svg>);
    case "prompts": return (<svg {...c}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>);
    case "components": return (<svg {...c}><path d="M5.5 8.5 9 12l-3.5 3.5L2 12l3.5-3.5Z" /><path d="m12 2 3.5 3.5L12 9 8.5 5.5 12 2Z" /><path d="M18.5 8.5 22 12l-3.5 3.5L15 12l3.5-3.5Z" /><path d="m12 15 3.5 3.5L12 22l-3.5-3.5L12 15Z" /></svg>);
    case "crm": return (<svg {...c}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
    case "reports": return (<svg {...c}><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>);
    case "ana-overview": return (<svg {...c}><path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" /></svg>);
    case "ana-revenue": return (<svg {...c}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>);
    case "glossary": return (<svg {...c}><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" /></svg>);
    case "pf-tour": return (<svg {...c}><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>);
    case "pf-console": return (<svg {...c}><polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" /></svg>);
    case "pf-studio": return (<svg {...c}><path d="M12 3v3M18.4 5.6l-2.1 2.1M21 12h-3M18.4 18.4l-2.1-2.1M12 18v3M7.7 16.3l-2.1 2.1M6 12H3M7.7 7.7 5.6 5.6" /><circle cx="12" cy="12" r="3.2" /></svg>);
    default: return (<svg {...c}><circle cx="12" cy="12" r="9" /></svg>);
  }
}

/* lucide icons for the dashboard nav — word + icon, no text glyphs */
function DashIcon({ id }: { id: string }) {
  const common = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (id === "crm")
    return (<svg {...common}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
  if (id === "analytics")
    return (<svg {...common}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>);
  if (id === "platform")
    return (<svg {...common}><rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="6 9 9 12 6 15" /><line x1="12" y1="15" x2="17" y2="15" /></svg>);
  return (<svg {...common}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>);
}

/* ═══ Shell : topbar 52 · sidebar · stage · crumbbar 34 ═══════════════ */

function Shell() {
  const ws = useWorkspace();
  const compact = useIsCompact(640);
  const [sbOpen, setSbOpen] = useState(() => window.innerWidth >= 640);
  useEffect(() => { if (compact) setSbOpen(false); }, [compact]);
  const [dash, setDash] = useState<string>(() => localStorage.getItem("frameword-dash") ?? "framework");
  const [navOpen, setNavOpen] = useState<string | null>(null);
  useEffect(() => { localStorage.setItem("frameword-dash", dash); }, [dash]);
  // opening a space from ⌘K or a deep link auto-switches to its dashboard
  useEffect(() => {
    const owner = dashboardOfSpace(ws.state.spaceId);
    if (owner && owner !== dash) setDash(owner);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.state.spaceId]);
  const activeDash = DASHBOARDS.find((d) => d.id === dash) ?? DASHBOARDS[0];
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  // sidebar view: an OPEN Space gets its own dedicated menu; ‹ returns to the
  // dashboard's space list (the console "Back to project" pattern)
  const [sbView, setSbView] = useState<"dash" | "space">("space");
  useEffect(() => {
    if (ws.state.spaceId && dashboardOfSpace(ws.state.spaceId) === dash) setSbView("space");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws.state.spaceId, dash]);
  const sbSpace = sbView === "space" && ws.state.spaceId && dashboardOfSpace(ws.state.spaceId) === dash
    ? SPACES.find((s) => s.spaceId === ws.state.spaceId) ?? null
    : null;
  const pathKeys = new Set(ws.path.map((id) => ws.state.panelsById[id]?.target.resourceKey));
  // UI-only: the ROOT panel can collapse to a slim spine on stage — toggled
  // from the space head; it is presentation, never navigation state
  const [rootCollapsed, setRootCollapsed] = useState(false);
  useEffect(() => { setRootCollapsed(false); }, [ws.state.spaceId]);
  const [org, setOrgState] = useState<Org>(() => ORGS.find((o) => o.id === localStorage.getItem("frameword-org")) ?? ORGS[0]);
  const [orgMenu, setOrgMenu] = useState(false);
  const setOrg = (o: Org) => { setOrgState(o); localStorage.setItem("frameword-org", o.id); };
  const [themeMenu, setThemeMenu] = useState(false);
  const [acctMenu, setAcctMenu] = useState(false);
  const [langMenu, setLangMenu] = useState(false);
  const prof = useProfile();
  const [drawer, setDrawer] = useState(false);
  const [palette, setPalette] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [theme, setThemeState] = useState<string>(() => localStorage.getItem("frameword-theme") ?? "system");

  // FIRST RUN — a brand-new visitor (no snapshot, no deep link) should see the
  // mechanic immediately, not an empty stage
  useEffect(() => {
    if (!ws.state.rootInstanceId && !location.hash && localStorage.getItem("frameword-crm") === null)
      ws.openSpace("overview", targetOf("sec:overview"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const say = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };
  const setTheme = (m: string) => {
    setThemeState(m);
    localStorage.setItem("frameword-theme", m);
  };
  const [prefs, setPrefsState] = useState<Prefs>(() => {
    try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem("frameword-prefs") ?? "{}") }; }
    catch { return DEFAULT_PREFS; }
  });
  const setPrefs = (p: Partial<Prefs>) => setPrefsState((v) => ({ ...v, ...p }));
  useEffect(() => {
    localStorage.setItem("frameword-prefs", JSON.stringify(prefs));
    const r = document.documentElement.style;
    r.setProperty("--font-serif", TITLE_FONTS[prefs.titleFont]?.css ?? TITLE_FONTS.news.css);
    r.setProperty("--font-sans", BODY_FONTS[prefs.bodyFont]?.css ?? BODY_FONTS.inter.css);
    r.setProperty("--font-mono", MONO_FONTS[prefs.monoFont]?.css ?? MONO_FONTS.geist.css);
    if (prefs.accent === "default") {
      ["--accent", "--accent-soft", "--accent-hover", "--ring", "--accent-foreground"].forEach((v) => r.removeProperty(v));
    } else {
      r.setProperty("--accent", prefs.accent);
      r.setProperty("--accent-soft", `color-mix(in oklab, ${prefs.accent} 14%, var(--card))`);
      r.setProperty("--accent-hover", `color-mix(in oklch, ${prefs.accent} 85%, black)`);
      r.setProperty("--ring", `color-mix(in oklab, ${prefs.accent} 40%, transparent)`);
      // text ON the accent: dark ink for light accents, white otherwise
      const hex = /^#([0-9a-f]{6})$/i.exec(prefs.accent)?.[1];
      const lum = hex ? (0.2126 * parseInt(hex.slice(0, 2), 16) + 0.7152 * parseInt(hex.slice(2, 4), 16) + 0.0722 * parseInt(hex.slice(4, 6), 16)) / 255 : 0;
      r.setProperty("--accent-foreground", lum > 0.62 ? "oklch(0.205 0 0)" : "oklch(1 0 0)");
    }
    r.setProperty("--stage-gap", GAPS[prefs.gap]);
    r.setProperty("--stage-pad", PADS[prefs.pad]);
    r.setProperty("--fz-title", FZ_TITLE[prefs.titleSize]);
    r.setProperty("--fz-body", FZ_BODY[prefs.bodySize]);
    r.setProperty("--fz-mono", FZ_MONO[prefs.monoSize]);
    document.body.dataset.dots = prefs.dots ? "on" : "off";
    // zoom + compensated frame height: at 80% the frame must be 125vh in zoomed
    // coordinates (= 100 real vh) or the bottom goes blank; at 120% it must shrink
    (document.body.style as CSSStyleDeclaration & { zoom: string }).zoom = prefs.zoom === 100 ? "" : prefs.zoom + "%";
    r.setProperty("--frame-h", prefs.zoom === 100 ? "100vh" : `${Math.round(1000000 / prefs.zoom) / 100}vh`);
    r.setProperty("--frame-w", prefs.zoom === 100 ? "100vw" : `${Math.round(1000000 / prefs.zoom) / 100}vw`);
  }, [prefs]);
  useEffect(() => {
    const root = document.documentElement;
    const sys = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = theme === "dark" || (theme === "system" && sys.matches);
      if (dark) root.setAttribute("data-theme", "dark");
      else root.removeAttribute("data-theme");
    };
    apply();
    sys.addEventListener("change", apply);
    return () => sys.removeEventListener("change", apply);
  }, [theme]);

  /* dynamic (store-owned) resources live outside DOMAIN — resolve their opening
   * path here: owning system space root → container → the resource itself */
  const dynamicPath = (key: string): { spaceId: string; targets: PanelTarget[] } | null => {
    const t = (panelType: string, resourceKey: string): PanelTarget => ({ panelType, resourceKey });
    if (key.startsWith("nte:")) {
      const note = notesApp.note(key.slice(4));
      if (!note) return null;
      const targets = [t("notes", "sec:notes")];
      if (note.folder) targets.push(t("notefolder", "nfd:" + note.folder));
      targets.push(t("note", key));
      return { spaceId: "notes", targets };
    }
    if (key.startsWith("nfd:")) return notesApp.folder(key.slice(4)) ? { spaceId: "notes", targets: [t("notes", "sec:notes"), t("notefolder", key)] } : null;
    if (key.startsWith("tsk:")) return notesApp.task(key.slice(4)) ? { spaceId: "tasks", targets: [t("tasks", "sec:tasks"), t("task", key)] } : null;
    if (key.startsWith("dtc:")) return dataApp.col(key.slice(4)) ? { spaceId: "data", targets: [t("datahome", "sec:data"), t("datatable", key)] } : null;
    if (key.startsWith("dtr:")) {
      const [, cid] = key.split(":");
      return dataApp.col(cid) ? { spaceId: "data", targets: [t("datahome", "sec:data"), t("datatable", "dtc:" + cid), t("datarow", key)] } : null;
    }
    if (key.startsWith("pfk:")) return pfApp.key(key.slice(4)) ? { spaceId: "pf-console", targets: [t("section", "sec:pf-console"), t("pfkeys", "pf:keys"), t("pfkey", key)] } : null;
    if (key.startsWith("pfm:")) return pfApp.member(key.slice(4)) ? { spaceId: "pf-console", targets: [t("section", "sec:pf-console"), t("pfpeople", "pf:people"), t("pfmember", key)] } : null;
    if (key.startsWith("pfp:")) return pfApp.project(key.slice(4)) ? { spaceId: "pf-console", targets: [t("section", "sec:pf-console"), t("pfprojects", "pf:projects"), t("pfproject", key)] } : null;
    if (key.startsWith("pfi:")) return pfApp.get().incidents.some((i) => i.id === key.slice(4)) ? { spaceId: "pf-console", targets: [t("section", "sec:pf-console"), t("pfhealth", "pf:health"), t("pfincident", key)] } : null;
    if (key.startsWith("pfl:")) return pfApp.get().runs.some((r) => r.id === key.slice(4)) ? { spaceId: "pf-console", targets: [t("section", "sec:pf-console"), t("pflogs", "pf:logs"), t("pflog", key)] } : null;
    return null;
  };

  const SYS_ROOTS = ["sec:canvas", "sec:data", "sec:notes", "sec:tasks", "sys:profile", "sys:settings"];
  const deepLink = (key: string, fromRefId?: string) => {
    const sp = spaceOf(key);
    const dyn = !sp && !DOMAIN[key] ? dynamicPath(key) : null;
    if (sp) ws.openPath(sp.spaceId, chainOf(key).map(targetOf));
    /* nodes living outside every dashboard (sys:settings, sec:canvas) open as their own space */
    else if (DOMAIN[key]) ws.openSpace(key.replace(/^\w+:/, ""), targetOf(key));
    else if (dyn) ws.openPath(dyn.spaceId, dyn.targets);
    else return;
    // resuming a SPACE-ROOT reference consumes it — the reopened Space IS the
    // reference; keeping both would show the same Space twice side-by-side.
    // Detail references keep their stay-in-rail semantics.
    if (fromRefId && (sp?.rootKey === key || SYS_ROOTS.includes(key))) ws.closePanel(fromRefId);
  };

  /* Escape precedence : palette → drawer → menus → active panel */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPalette((v) => !v);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setDrawer((v) => !v);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSbOpen((v) => !v);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && ["1", "2", "3"].includes(e.key)) {
        const o = ORGS[Number(e.key) - 1];
        if (o) { e.preventDefault(); setOrg(o); say(`Switched to ${o.name}`); }
        return;
      }
      // [ / ] move panel focus along the thread — the ‹ › bar buttons, on keys
      if (!e.metaKey && !e.ctrlKey && !e.altKey && (e.key === "[" || e.key === "]")) {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
        const cur = ws.state.focusedPanelId ?? ws.state.contextLeafId ?? "";
        const i = ws.path.indexOf(cur);
        const j = e.key === "[" ? i - 1 : i + 1;
        if (i !== -1 && j >= 0 && j < ws.path.length) { e.preventDefault(); ws.focusPanel(ws.path[j]); }
        return;
      }
      // P pins the focused panel — keep it across pages (skip while typing)
      if (!e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === "p") {
        const t = e.target as HTMLElement | null;
        if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
        const fid = ws.state.focusedPanelId;
        const fp = fid ? ws.state.panelsById[fid] : undefined;
        if (fp && fp.placement === "context") {
          e.preventDefault();
          const on = fp.role === "root" ? !!fp.pinned : fp.retention === "retained";
          if (on) { ws.unpinPanel(fid!); say("Unpinned"); }
          else { ws.pinPanel(fid!); say(fp.role === "root" ? "Pinned — this root rides the rail across switches" : "Pinned — survives every page"); }
        }
        return;
      }
      if (e.key !== "Escape") return;
      if (document.querySelector(".nf-menu")) return; // the notification bell closes itself
      // an open in-panel popover (table menus, date pickers, cell flys…) always
      // mounts a .pop-bg backdrop — Escape closes IT, never the panel behind it
      const popBg = document.querySelector(".pop-bg");
      if (popBg) {
        popBg.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        return;
      }
      if (palette) return setPalette(false);
      if (drawer) return setDrawer(false);
      if (navOpen || themeMenu || acctMenu || orgMenu) {
        setLangMenu(false);
        setNavOpen(null);
        setThemeMenu(false);
        setAcctMenu(false);
        setOrgMenu(false);
        return;
      }
      const leaf = ws.state.contextLeafId;
      if (leaf && ws.state.panelsById[leaf]?.role !== "root") ws.closePanel(leaf);
      else if (ws.state.rootInstanceId) ws.closePanel(ws.state.rootInstanceId);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [palette, drawer, themeMenu, acctMenu, navOpen, orgMenu, ws]);

  const path = ws.path;
  const refs = ws.state.referenceRailOrder;

  return (
    <PrefsCtx.Provider value={{ prefs, set: setPrefs, reset: () => setPrefsState(DEFAULT_PREFS), theme, setTheme }}>
    <div className="frame">
      <div className="topbar">
        <button className="tb-icon" title="Toggle sidebar — ⌘B" onClick={() => setSbOpen((v) => !v)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /></svg>
        </button>
        <nav className="tb-nav" aria-label="Dashboards">
          {DASHBOARDS.map((d) => (
            <div key={d.id} className="tb-nav-wrap">
              <button className={"tb-nav-item" + (dash === d.id && Object.keys(ws.state.panelsById).length > 0 ? " on" : "")}
                aria-expanded={navOpen === d.id}
                onClick={() => setNavOpen((v) => (v === d.id ? null : d.id))}>
                <DashIcon id={d.id} />{d.label}<span className="caret">▼</span>
              </button>
              {navOpen === d.id && (
                <>
                  <div className="menu-bg" onClick={() => setNavOpen(null)} />
                  <div className="dd">
                    {d.groups.map((g) => (
                      <div key={g.label}>
                        <div className="dd-label">{g.label}</div>
                        {g.spaces.map((sp, i) => (
                          <button key={sp.spaceId}
                            className={"dd-item" + (ws.state.spaceId === sp.spaceId ? " on" : "")}
                            onClick={() => {
                              setDash(d.id);
                              ws.openSpace(sp.spaceId, targetOf(sp.rootKey));
                              setNavOpen(null);
                            }}>
                            <span className="no">{String(i + 1).padStart(2, "0")}</span>{sp.label}
                          </button>
                        ))}
                      </div>
                    ))}
                    <div className="dd-foot">switches the sidebar</div>
                  </div>
                </>
              )}
            </div>
          ))}
        </nav>
        <div style={{ flex: 1 }} />
        <button className="tb-goto" onClick={() => setPalette(true)}>
          GO TO<span className="kbd" style={{ minWidth: 0 }}>⌘K</span>
        </button>
        <button className="tb-btn" title="Data — tables & pages" onClick={() => ws.openSpace("data", targetOf("sec:data"))}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><ellipse cx="12" cy="6" rx="8" ry="3" /><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" /><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" /></svg>
        </button>
        <button className="tb-btn" title="Notes" onClick={() => ws.openSpace("notes", targetOf("sec:notes"))}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v5h5" /><path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7z" /><path d="M9 13h6M9 17h4" /></svg>
        </button>
        <button className="tb-btn" title="Tasks" onClick={() => ws.openSpace("tasks", targetOf("sec:tasks"))}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 12l3 3 5-6" /></svg>
        </button>
        <button className="tb-btn" title="Canvas board — your whiteboard" onClick={() => ws.openSpace("canvas", targetOf("sec:canvas"))}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M12 17v4" /><path d="M8 21h8" /><path d="M7.5 12l3-3.5 2.5 2 3.5-4" /></svg>
        </button>
        <NotifBell />
        {themeMenu && (
          <>
            <div className="menu-bg" onClick={() => setThemeMenu(false)} />
            <div className="menu" style={{ bottom: 44, right: 10, top: "auto" }}>
              {[
                { m: "light", glyph: "○", label: "Light" },
                { m: "dark", glyph: "●", label: "Dark" },
                { m: "system", glyph: "◐", label: "System" },
              ].map((t) => (
                <button key={t.m} className={"menu-item" + (theme === t.m ? " on" : "")}
                  onClick={() => { setTheme(t.m); setThemeMenu(false); }}>
                  <span className="glyph">{t.glyph}</span>{t.label}
                </button>
              ))}
            </div>
          </>
        )}
        <button className="tb-btn agent" title="Agent — ⌘J" onClick={() => setDrawer((v) => !v)}>✶</button>
      </div>

      <div className="mid">
        {compact && sbOpen && <div className="sb-backdrop" onClick={() => setSbOpen(false)} />}
        <aside className={"sidebar" + (sbOpen ? "" : " closed") + (compact ? " overlay" : "")} aria-label="Spaces">
          {compact && (
            <div className="sb-dash" role="tablist" aria-label="Dashboards">
              {DASHBOARDS.map((d) => (
                <button key={d.id} className={dash === d.id ? "on" : ""} title={d.label} role="tab" aria-selected={dash === d.id}
                  onClick={() => {
                    setDash(d.id);
                    const first = d.groups[0].spaces[0];
                    ws.openSpace(first.spaceId, targetOf(first.rootKey));
                  }}>
                  <DashIcon id={d.id} />
                  <span>{d.label}</span>
                </button>
              ))}
            </div>
          )}
          <div style={{ position: "relative" }}>
            <button className="sb-head" onClick={() => setOrgMenu((v) => !v)} aria-expanded={orgMenu}>
              <span className="sb-logo"><OrgIcon id={org.id} inverted /></span>
              <span style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                <span className="sb-name" style={{ display: "block" }}>{org.name}</span>
                <span className="sb-tier" style={{ display: "block" }}>{org.tier}</span>
              </span>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="7 9 12 4 17 9" /><polyline points="7 15 12 20 17 15" /></svg>
            </button>
            {orgMenu && (
              <>
                <div className="menu-bg" onClick={() => setOrgMenu(false)} />
                <div className="org-menu">
                  <div className="dd-label">Organisations</div>
                  {ORGS.map((o, i) => (
                    <button key={o.id} className={"org-item" + (o.id === org.id ? " on" : "")}
                      onClick={() => { setOrg(o); setOrgMenu(false); say(`Switched to ${o.name}`); }}>
                      <span className="org-ico"><OrgIcon id={o.id} /></span>
                      <span style={{ flex: 1, textAlign: "left" }}>{o.name}</span>
                      <span className="kbd" style={{ minWidth: 0 }}>⌘{i + 1}</span>
                    </button>
                  ))}
                  <div className="menu-sep" />
                  <button className="org-item" onClick={() => { setOrgMenu(false); say("Add organisation — demo"); }}>
                    <span className="org-ico">＋</span>
                    <span style={{ flex: 1, textAlign: "left", color: "var(--muted-foreground)" }}>Add organisation</span>
                  </button>
                  <div className="dd-foot">scopes the workspace in production</div>
                </div>
              </>
            )}
          </div>
          <div className="sb-cta-row">
            <button className="sb-cta" onClick={() => setPalette(true)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" /></svg>
              Quick open
              <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 9.5, opacity: 0.7 }}>⌘K</span>
            </button>
          </div>
          {sbSpace ? (
            /* ── DEDICATED SPACE MENU — the sidebar mirrors the OPEN Space,
             *    not the dashboard's space list (the console "Back to project"
             *    pattern): ‹ back to the dashboard, then this Space's own
             *    tree, deep-linkable, following the active thread. ── */
            <div className="sb-space">
              <div className="sb-space-head">
                <button className="sb-backarrow" data-tip={activeDash.label} aria-label={"Back — " + activeDash.label}
                  onClick={() => setSbView("dash")}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
                </button>
                <button className="sb-item head" title="Focus the main panel"
                  onClick={() => {
                    setRootCollapsed(false);
                    if (ws.state.rootInstanceId) ws.focusPanel(ws.state.rootInstanceId);
                    document.querySelector(".stage")?.scrollTo({ left: 0, behavior: "smooth" });
                  }}>
                  {sbSpace.label}
                </button>
                {(
                  <button className={"sb-collapse" + (rootCollapsed ? " on" : "")} aria-pressed={rootCollapsed}
                    disabled={ws.path.length <= 1 && !rootCollapsed}
                    title={rootCollapsed ? "Show the main panel" : ws.path.length > 1 ? "Hide the main panel" : "Open a drill first — nothing to hide yet"}
                    onClick={() => setRootCollapsed((v) => !v)}>
                    {rootCollapsed ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="m14 9 3 3-3 3" /></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="m16 15-3-3 3-3" /></svg>
                    )}
                  </button>
                )}
              </div>
              <nav className="sb-nav">
                {(DOMAIN[sbSpace.rootKey]?.children ?? []).map((key, i) => {
                  const kids = DOMAIN[key]?.children ?? [];
                  const canExpand = kids.length > 0 && kids.length <= 14;
                  const open = expanded[key] ?? false;
                  const onPath = pathKeys.has(key);
                  return (
                    <div key={key}>
                      <button className={"sb-item sub" + (onPath ? " on" : "")}
                        onClick={() => { deepLink(key); if (compact) setSbOpen(false); }}>
                        <span className="no">{String(i + 1).padStart(2, "0")}</span>
                        <span className="sb-tt">{DOMAIN[key].title}</span>
                        {canExpand && (
                          <span className={"chev" + (open ? " open" : "")}
                            onClick={(e) => { e.stopPropagation(); setExpanded((m) => ({ ...m, [key]: !open })); }}>
                            ›
                          </span>
                        )}
                      </button>
                      {canExpand && open && (
                        <div className="sb-sub">
                          {kids.map((k2) => (
                            <button key={k2} className={"sb-subitem" + (pathKeys.has(k2) ? " on" : "")}
                              onClick={() => { deepLink(k2); if (compact) setSbOpen(false); }}>
                              {DOMAIN[k2].title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          ) : (
            activeDash.groups.map((g) => (
              <div key={g.label} style={{ marginBottom: 12 }}>
                <div className="sb-label">{g.label}</div>
                <nav className="sb-nav">
                  {g.spaces.map((sp) => (
                    <button key={sp.spaceId}
                      className={"sb-item" + (ws.state.spaceId === sp.spaceId ? " on" : "")}
                      onClick={() => { ws.openSpace(sp.spaceId, targetOf(sp.rootKey)); setSbView("space"); if (compact) setSbOpen(false); }}>
                      <SpaceIcon id={sp.spaceId} />
                      {sp.label}
                      <span className="chev">›</span>
                    </button>
                  ))}
                </nav>
              </div>
            ))
          )}
          <div className="sb-foot">
            <div>
              <div className="usage-block">
                <div className="usage-head">
                  <span className="usage-label">Pipeline</span>
                  <span className="usage-val">62%</span>
                </div>
                <div className="usage-track"><div className="usage-fill" style={{ width: "62%" }} /></div>
                <div className="usage-sub">46k open · 75k quarterly target</div>
              </div>
            </div>
            <div style={{ position: "relative" }}>
              <button className="account" onClick={() => { setAcctMenu((v) => !v); setLangMenu(false); }}>
                <AvatarBubble />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="nm" style={{ display: "block" }}>{prof.name}</span>
                  <span className="em" style={{ display: "block" }}>{prof.title ? prof.title + " · " + prof.email : prof.email}</span>
                </span>
                <span style={{ color: "var(--muted-foreground)", flex: "none" }}>⋯</span>
              </button>
              {acctMenu && (
                <>
                  <div className="menu-bg" onClick={() => { setAcctMenu(false); setLangMenu(false); }} />
                  <div className="acct-menu">
                    <button className="menu-item" onClick={() => { setAcctMenu(false); ws.openSpace("profile", targetOf("sys:profile")); }}>Profile</button>
                    <button className="menu-item" onClick={() => { setAcctMenu(false); ws.openSpace("settings", targetOf("sys:settings")); }}>Settings</button>
                    <button className="menu-item" onClick={() => { setAcctMenu(false); say("Docs — see PROMPT-KIT.md"); }}>Documentation</button>
                    <div className="menu-sep" />
                    <button className="menu-item" onClick={() => setLangMenu((v) => !v)} aria-expanded={langMenu}>
                      <span className="flag"><Flag id={LANGS.find((l) => l.id === prefs.lang)?.flag ?? "gb"} /></span>
                      <span style={{ flex: 1 }}>Language</span>
                    </button>
                    {langMenu && LANGS.map((l) => (
                      <button key={l.id} className={"menu-item lang-item" + (prefs.lang === l.id ? " on" : "")}
                        onClick={() => { setPrefs({ lang: l.id }); setLangMenu(false); say("Language — " + l.label); }}>
                        <span className="flag"><Flag id={l.flag} /></span>
                        <span style={{ flex: 1 }}>{l.label}</span>
                        {prefs.lang === l.id && <span style={{ color: "var(--accent)", fontSize: 11 }}>✓</span>}
                      </button>
                    ))}
                    <div className="menu-sep" />
                    <button className="menu-item" style={{ color: "var(--accent)" }}
                      onClick={() => { setAcctMenu(false); say("Signed out (demo)"); }}>Sign out</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </aside>

        {compact ? <PushHost deepLink={deepLink} /> : <ColumnHost deepLink={deepLink} rootCollapsed={rootCollapsed} onExpandRoot={() => setRootCollapsed(false)} />}
      </div>

      {prefs.crumb && <div className="crumbbar">
        <span className="crumb" title={activeDash.label + " — home"} style={{ display: "inline-flex", alignItems: "center" }}
          onClick={() => ws.state.rootInstanceId && ws.closePanel(ws.state.rootInstanceId)}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9.5 9-7 9 7" /><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" /></svg>
        </span>
        {path.map((id, i) => (
          <span key={id} style={{ display: "contents" }}>
            <span className="crumb-sep">›</span>
            <span className={"crumb" + (i === path.length - 1 ? " here" : "") + (id === ws.state.focusedPanelId ? " focus" : "")}
              onClick={() => ws.navigateTo(id)}>
              {titleOfKey(ws.state.panelsById[id].target.resourceKey)}
            </span>
          </span>
        ))}
        {refs.length > 0 && (
          <>
            <span style={{ flex: 1 }} />
            <span className="crumb" style={{ color: "var(--accent)" }}>
              {refs.length} pinned ref{refs.length > 1 ? "s" : ""}
            </span>
          </>
        )}
        <span style={{ flex: 1 }} />
        {toast && <span className="crumb-toast">{toast}</span>}
        <a className="crumb-theme crumb-gh" href="https://github.com/agentik-os/stax" target="_blank" rel="noreferrer" title="GitHub — source & docs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
        </a>
        <button className="crumb-theme" title="Theme" onClick={() => setThemeMenu((v) => !v)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" /></svg>
        </button>
      </div>}

      {drawer && <AgentDrawer onClose={() => setDrawer(false)} />}
      {palette && <Palette onClose={() => setPalette(false)} deepLink={deepLink} say={say} setTheme={setTheme} />}
      {toast && !prefs.crumb && <div className="toast">{toast}</div>}
    </div>
    </PrefsCtx.Provider>
  );
}

/* ═══ ColumnHost — the stage ══════════════════════════════════════════ */

function ColumnHost({ deepLink, rootCollapsed, onExpandRoot }: { deepLink: (k: string, fromRefId?: string) => void; rootCollapsed?: boolean; onExpandRoot?: () => void }) {
  const ws = useWorkspace();
  const stageRef = useRef<HTMLDivElement>(null);
  const count = ws.path.length + ws.state.referenceRailOrder.length;
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    // switching Space (path back to the root alone) rewinds the stage —
    // the root panel is always fully visible, never hidden behind the sidebar edge
    if (ws.path.length <= 1) { el.scrollTo({ left: 0 }); return; }
    // scroll the context LEAF into view — never the rail: references render
    // after the path, so scrollWidth would park the viewport on the pins and
    // hide the panel the user just opened.
    const leafEl = el.querySelector<HTMLElement>("[data-leaf]");
    if (!leafEl) { el.scrollTo({ left: el.scrollWidth, behavior: "smooth" }); return; }
    const sr = el.getBoundingClientRect();
    const lr = leafEl.getBoundingClientRect();
    let left = el.scrollLeft;
    if (lr.right > sr.right - 8) left = el.scrollLeft + (lr.right - sr.right) + 16;
    if (lr.left < sr.left + 8) left = el.scrollLeft + (lr.left - sr.left) - 16;
    if (left !== el.scrollLeft) el.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [count, ws.state.contextLeafId, ws.state.rootInstanceId, ws.path.length]);

  if (!ws.state.rootInstanceId)
    return (
      <div className="stage" ref={stageRef}>
        {ws.state.referenceRailOrder.length === 0 ? (
          <div className="stage-empty">
            <div className="glyph"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="8" height="16" rx="2" /><rect x="14" y="4" width="7" height="16" rx="2" opacity="0.45" /></svg></div>
            <b>Open a space to begin.</b>
            <br />
            Click anything that has depth and a panel opens to the right. The parent stays. <span className="kbd">⌘K</span> goes anywhere.
          </div>
        ) : (
          ws.state.referenceRailOrder.map((id) => (
            <Panel key={id} id={id} deepLink={deepLink} />
          ))
        )}
      </div>
    );

  return (
    <div className="stage" ref={stageRef}>
      {ws.path.map((id) => (
        <Panel key={id} id={id} deepLink={deepLink}
          collapsed={rootCollapsed && id === ws.state.rootInstanceId && ws.path.length > 1}
          onExpand={onExpandRoot} />
      ))}
      {ws.state.referenceRailOrder.length > 0 && <div className="rail-sep" />}
      {ws.state.referenceRailOrder.map((id) => (
        <Panel key={id} id={id} deepLink={deepLink} />
      ))}
    </div>
  );
}

/* ═══ PushHost — compact, one card + back ═════════════════════════════ */

function PushHost({ deepLink }: { deepLink: (k: string, fromRefId?: string) => void }) {
  const ws = useWorkspace();
  const leaf = ws.state.contextLeafId;
  const refTray = ws.state.referenceRailOrder.length > 0 && (
    <div className="ref-tray">
      {ws.state.referenceRailOrder.map((id) => (
        <span key={id} className="ref-chip" role="button" tabIndex={0}
          title="Reopen this thread"
          onClick={() => deepLink(ws.state.panelsById[id].target.resourceKey, id)}>
          ✶ {titleOfKey(ws.state.panelsById[id].target.resourceKey)}
          <button className="ref-x" title="Remove reference"
            onClick={(e) => { e.stopPropagation(); ws.closePanel(id); }}>×</button>
        </span>
      ))}
    </div>
  );
  if (!leaf)
    return (
      <div className="push-col">
        {refTray}
        <div className="push-stage">
          <div className="stage-empty" style={{ margin: "auto" }}>
            <div className="glyph"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="8" height="16" rx="2" /><rect x="14" y="4" width="7" height="16" rx="2" opacity="0.45" /></svg></div>
            <b>Open a space to begin.</b>
            <br />
            Pick a space from the sidebar — or search everything with GO TO.
          </div>
        </div>
      </div>
    );
  return (
    <div className="push-col">
      {refTray}
      <div className="push-stage">
        {ws.path.length > 1 && <div className="push-peek" />}
        <Panel id={leaf} deepLink={deepLink} compact />
      </div>
    </div>
  );
}

/* ═══ Panel — bar 56 · body · foot ════════════════════════════════════ */

function Panel({ id, deepLink, compact, collapsed, onExpand }: { id: string; deepLink: (k: string, fromRefId?: string) => void; compact?: boolean; collapsed?: boolean; onExpand?: () => void }) {
  const ws = useWorkspace();
  const [gear, setGear] = useState(false);
  const [wOverride, setWOverride] = useState<PanelSize | undefined>(undefined);
  const [sOpen, setSOpen] = useState(false);
  const [q, setQ] = useState("");
  const p: PanelInstance | undefined = ws.state.panelsById[id];
  if (!p) return null;
  useNotesApp(); // foot actions (pin state, counts) re-render with the notes store
  useDataApp(); // crumb/foot re-render with the data store
  usePfApp(); // platform titles & foot state re-render with the platform store
  const bn = p.target.panelType === "canvasnode" ? board.node(p.target.resourceKey.slice(4)) : null;
  const be = p.target.panelType === "canvasedge" ? board.edge(p.target.resourceKey.slice(4)) : null;
  const nt = p.target.panelType === "note" ? notesApp.note(p.target.resourceKey.slice(4)) : null;
  const tk = p.target.panelType === "task" ? notesApp.task(p.target.resourceKey.slice(4)) : null;
  const fd = p.target.panelType === "notefolder" ? notesApp.folder(p.target.resourceKey.slice(4)) : null;
  const dc = p.target.panelType === "datatable" ? dataApp.col(p.target.resourceKey.slice(4)) : null;
  const isDataRow = p.target.panelType === "datarow";
  const pfDyn = /^pf[kmpil]:/.test(p.target.resourceKey);
  const n = DOMAIN[p.target.resourceKey] ?? (pfDyn ? {
    panelType: p.target.panelType,
    // pfkey/pfproject render their own inline-edit name, pfmember its id card — no double title
    title: ["pfincident", "pflog"].includes(p.target.panelType) ? titleOfKey(p.target.resourceKey) : "",
    eyebrow: { pfkey: "console · key", pfmember: "console · member", pfproject: "console · project", pfincident: "console · incident", pflog: "console · request" }[p.target.panelType],
  } : {
    panelType: p.target.panelType,
    title: nt || tk || isDataRow ? "" : dc ? dc.name : fd ? fd.name : be ? (be.label || "Connection") : bn?.label ?? "Node",
    eyebrow: bn ? "canvas · " + bn.kind : be ? "canvas · link" : nt ? "note" : fd ? "folder" : tk ? "task" : dc ? "table" : isDataRow ? "page" : undefined,
    subtitle: dc ? dc.rows.length + " rows · filters, sort and search live in the toolbar." : bn?.sub,
  });
  const isCanvas = p.target.panelType === "canvas";
  const isRef = p.placement === "reference";
  const isRoot = p.role === "root";
  // a root is always retention:"retained" — its pin state lives in `pinned`
  const retained = isRoot ? !!p.pinned : p.retention === "retained";
  // references are peripheral — cap them at S so L/XL root-refs never eat the stage
  const width = panelWidth(ws.registry, p, isRef ? "S" : wOverride);
  const refIndex = ws.state.referenceRailOrder.indexOf(id);
  // per-panel search (the zip's foot search) — panels with a real list get it
  const searchable = !isRef && (n.children?.length ?? 0) >= 4;
  const kids = (n.children ?? []).filter((k) =>
    !q.trim() || (DOMAIN[k].title + " " + (DOMAIN[k].subtitle ?? "")).toLowerCase().includes(q.trim().toLowerCase()),
  );

  if (collapsed)
    return (
      <section className="panel root-collapsed" aria-label={(n.title || titleOfKey(p.target.resourceKey)) + " — hidden"}
        role="button" tabIndex={0} title="Show the main panel"
        onClick={onExpand}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onExpand?.(); } }}>
        <span className="rc-ic">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </span>
        <span className="rc-title">{n.title || titleOfKey(p.target.resourceKey)}</span>
      </section>
    );
  return (
    <section className={"panel" + (isRef ? " ref" : "") + (retained && !isRef ? " pinned" : "") + (id === ws.state.focusedPanelId ? " focused" : "")} aria-label={n.title || titleOfKey(p.target.resourceKey)}
      data-leaf={id === ws.state.contextLeafId || undefined}
      onMouseDown={() => { if (!isRef && ws.state.focusedPanelId !== id) ws.focusPanel(id); }}
      style={compact ? undefined : isCanvas && !isRef ? { width, flex: "1 1 auto", minWidth: 520 } : { width }}>
      <div className="panel-bar">
        {compact && !isRoot && (
          <button className="bar-btn back" title="Back" onClick={() => ws.closePanel(id)}>‹</button>
        )}
        <span className="eyebrow">{n.eyebrow ?? n.panelType}</span>
        {isRef && <span className="badge-ref">Ref</span>}
        <div style={{ flex: 1 }} />
        {isRef ? (
          <>
            <button className="bar-btn" title="Move left" onClick={() => ws.moveReference(id, -1)} disabled={refIndex <= 0}>‹</button>
            <button className="bar-btn" title="Move right" onClick={() => ws.moveReference(id, 1)}
              disabled={refIndex === ws.state.referenceRailOrder.length - 1}>›</button>
          </>
        ) : !isRoot ? (
          <>
            <button className="bar-btn" title="Focus left panel"
              onClick={() => { const i = ws.path.indexOf(id); if (i > 0) ws.focusPanel(ws.path[i - 1]); }}>‹</button>
            <button className="bar-btn" title="Focus right panel"
              onClick={() => { const i = ws.path.indexOf(id); if (i < ws.path.length - 1) ws.focusPanel(ws.path[i + 1]); }}>›</button>
          </>
        ) : null}
        {!isRef && (
          <button className={"pin-btn" + (retained ? " on" : "")} aria-pressed={retained}
            title={isRoot ? "Pin — keep this Space in the rail when you switch" : "Pin — keep this panel when drilling elsewhere"}
            onClick={() => (retained ? ws.unpinPanel(id) : ws.pinPanel(id))}>
            PIN
          </button>
        )}
        <button className="bar-btn" title={isRef ? "Remove reference" : isRoot ? "Close space" : "Close"} style={{ fontSize: 15 }}
          onClick={() => ws.closePanel(id)}>×</button>
      </div>

      <div className="panel-body" style={isCanvas ? { padding: 0, overflow: "hidden" } : undefined}>
        {isCanvas && <Suspense fallback={<div className="leaf-note">Loading the canvas…</div>}><CanvasBoard panelId={id} /></Suspense>}
        {!isCanvas && (n.title !== "" || isRef) && <h2 className="panel-title" onClick={isRef ? () => deepLink(p.target.resourceKey, id) : undefined}
          style={isRef ? { cursor: "pointer" } : undefined}
          title={isRef ? "Reopen this thread" : undefined}>{n.title || titleOfKey(p.target.resourceKey)}</h2>}
        {!isCanvas && n.subtitle && <p className="panel-sub">{n.subtitle}</p>}

        {n.kpis && (
          <div className="stats">
            {n.kpis.map((k) => (
              <div key={k.l} className="stat">
                <div className="lab">{k.l}</div>
                <div className="val">{k.v}</div>
              </div>
            ))}
          </div>
        )}

        {(
          <>
            {p.target.panelType === "component" && <ComponentDemo name={n.title} />}
            {p.target.panelType === "settings" && <SettingsBody />}
            {p.target.panelType === "block" && <BlockDemo name={p.target.resourceKey} />}
            {p.target.panelType === "canvasnode" && <Suspense fallback={<div className="leaf-note">Loading…</div>}><NodeInspector nodeKey={p.target.resourceKey} panelId={id} /></Suspense>}
            {p.target.panelType === "canvasedge" && <Suspense fallback={<div className="leaf-note">Loading…</div>}><EdgeInspector edgeKey={p.target.resourceKey} panelId={id} /></Suspense>}
            {p.target.panelType === "blocklive" && <BlockLive name={p.target.resourceKey} />}
            {p.target.panelType === "profile" && <ProfileBody />}
            {p.target.panelType === "notes" && <NotesRoot panelId={id} />}
            {p.target.panelType === "tasks" && <TasksRoot panelId={id} />}
            {p.target.panelType === "note" && <NoteEditor noteKey={p.target.resourceKey} panelId={id} />}
            {p.target.panelType === "notefolder" && <FolderPanel folderKey={p.target.resourceKey} panelId={id} />}
            {p.target.panelType.startsWith("pf") && <PlatformBody panelType={p.target.panelType} resourceKey={p.target.resourceKey} panelId={id} />}
            {p.target.panelType === "datahome" && <DataHome panelId={id} />}
            {p.target.panelType === "datatable" && <DataTable colKey={p.target.resourceKey} panelId={id} />}
            {p.target.panelType === "datarow" && <DataRow rowKey={p.target.resourceKey} panelId={id} />}
            {p.target.panelType === "task" && <TaskDetail taskKey={p.target.resourceKey} panelId={id} />}
            {(n.blocks ?? []).map((b, i) =>
              b.kind === "diagram" ? (
                <div key={i} className="mini-flow">
                  <div className="strip">
                    <div className="mini-panel root"><div className="mhead" /><div className="mbody"><div className="ln" style={{ width: "80%" }} /><div className="ln" /><div className="ln" style={{ width: "60%" }} /><div style={{ height: 22 }} /></div></div>
                    <span className="arr">→</span>
                    <div className="mini-panel"><div className="mhead" /><div className="mbody"><div className="ln" /><div className="ln" style={{ width: "70%" }} /><div style={{ height: 32 }} /></div></div>
                    <span className="arr">→</span>
                    <div className="mini-panel pin"><div className="mhead"><span>PIN</span></div><div className="mbody"><div className="ln" style={{ width: "85%" }} /><div className="ln" /><div style={{ height: 32 }} /></div></div>
                    <span className="arr">→</span>
                    <div className="mini-panel ghost"><div className="mhead" /><div className="mbody"><div className="ln" style={{ width: "70%" }} /><div style={{ height: 37 }} /></div></div>
                  </div>
                  <div className="legend"><span>Root — fixed</span><span>Child</span><span className="hot">Pinned — stays</span><span>Preview — replaceable</span></div>
                </div>
              ) : b.kind === "ops" ? (
                <div key={i} className="card" style={{ marginBottom: 16 }}>
                  <div className="lab"><span className="sig">✶</span> State — the only thing that exists</div>
                  <pre className="codeblock" style={{ margin: "8px 0 0", border: "none", background: "transparent", padding: 0 }}>{"WorkspaceState = { panelsById, contextLeafId,\n                   focusedPanelId, referenceRailOrder }\nPanelInstance  = { target, parentInstanceId,\n                   retention, placement }"}</pre>
                  <div className="op-pills">
                    {["openSpace", "openDetail", "pinPanel", "unpinPanel", "closePanel", "navigateTo", "resumeReference"].map((op) => (
                      <span key={op} className="op-pill">{op}</span>
                    ))}
                  </div>
                  <p style={{ fontSize: "calc(var(--fz-body, 13.5px) - 1.5px)", color: "var(--muted-foreground)" }}>Seven intent commands, (state, args) → state. That's the entire API — no other way to change what's on screen.</p>
                </div>
              ) : b.kind === "row" ? (
                <div key={i} className={"anat-row" + ((b.label?.length ?? 0) > 10 ? " note" : "")}><span className="k">{b.label}</span><span className="t">{b.text}</span></div>
              ) : b.kind === "code" ? (
                <pre key={i} className="codeblock">{b.code}</pre>
              ) : (
                <div key={i}
                  className={"card" + (b.kind === "do" ? " tone-do" : b.kind === "dont" ? " tone-dont" : "")}
                  style={{ marginBottom: 8 }}>
                  {b.label && <div className="lab">{b.label.startsWith("✶")
                    ? <><span className="sig">✶</span>{b.label.slice(1)}</>
                    : b.label}</div>}
                  {b.text && <p>{b.text}</p>}
                </div>
              ),
            )}
            {(n.blocks ?? []).length > 0 && (n.children ?? []).length > 0 && <div style={{ height: 8 }} />}
            {(n.children ?? []).length > 0 && (
              <div className="drills">
                {kids.map((key, i) => (
                  <button key={key} className="drill"
                    onClick={() => (isRef ? deepLink(key) : ws.openDetail(id, targetOf(key)))}>
                    <span className="no">{String(i + 1).padStart(2, "0")}</span>
                    <span className="bd">
                      <span className="tt" style={{ display: "block" }}>{DOMAIN[key].title}</span>
                      <span className="ss" style={{ display: "block" }}>{DOMAIN[key].subtitle ?? DOMAIN[key].panelType}</span>
                    </span>
                    {DOMAIN[key].meta && <span className="tag">{DOMAIN[key].meta}</span>}
                    <span className="arr">→</span>
                  </button>
                ))}
                {q.trim() !== "" && kids.length === 0 && (
                  <div className="drill-empty">No results for “{q}”.</div>
                )}
                {q.trim() === "" && (n.seeAlso ?? []).map((key) => (
                  <button key={key} className="drill seealso"
                    onClick={() => (isRef ? deepLink(key) : ws.openDetail(id, targetOf(key)))}>
                    <span className="no">✶</span>
                    <span className="bd">
                      <span className="tt" style={{ display: "block" }}>See also — {DOMAIN[key].title}</span>
                      <span className="ss" style={{ display: "block" }}>same target, this parent → a distinct instance</span>
                    </span>
                    <span className="arr">→</span>
                  </button>
                ))}
              </div>
            )}
            {n.body && <div className="leaf-note" style={{ marginTop: (n.children ?? []).length ? 12 : 0 }}>{n.body}</div>}
          </>
        )}
      </div>

      <div className="panel-foot">
        {searchable && (
          <button className={"foot-gear" + (sOpen ? " on-btn" : "")} style={{ marginLeft: 0 }}
            title="Search this panel"
            onClick={() => { setSOpen((v) => !v); setQ(""); }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          </button>
        )}
        {sOpen ? (
          <input className="foot-search" autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") { e.stopPropagation(); setSOpen(false); setQ(""); } }}
            placeholder="Search this panel…" />
        ) : isRef ? (
          <span className="foot-note"><span className="sig">✶</span> Pinned — click the title or a drill to reopen</span>
        ) : n.footActions ? (
          n.footActions.map((a) => (
            <button key={a.label} className={"foot-cta" + (a.kind === "outline" ? " ghost" : "")}
              onClick={() => {
                if (a.space) {
                  const sp = SPACES.find((s) => s.spaceId === a.space);
                  if (sp) ws.openSpace(sp.spaceId, targetOf(sp.rootKey));
                } else if (a.drill) ws.openDetail(id, targetOf(a.drill));
              }}>
              {a.label}
            </button>
          ))
        ) : p.target.panelType.startsWith("pf") ? (
          <PlatformFoot panelType={p.target.panelType} resourceKey={p.target.resourceKey} panelId={id} closePanel={() => ws.closePanel(id)} />
        ) : isCanvas ? (
          <span className="foot-note">Canvas — click a node to inspect · drag a handle to connect</span>
        ) : p.target.panelType === "canvasnode" ? (
          <div className="foot-actions">
            <button className="d-btn outline sm"
              onClick={() => {
                const nid = p.target.resourceKey.slice(4);
                const src = board.node(nid);
                if (src) board.update((st) => ({ ...st, seq: st.seq + 1, nodes: [...st.nodes, { ...src, id: "n" + (st.seq + 1), x: src.x + 24, y: src.y + 24 }] }));
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg> Duplicate — ⌘D
            </button>
            <button className="d-btn destructive sm"
              onClick={() => {
                const nid = p.target.resourceKey.slice(4);
                board.update((st) => ({ ...st, nodes: st.nodes.filter((x) => x.id !== nid), edges: st.edges.filter((e) => e.source !== nid && e.target !== nid) }));
                ws.closePanel(id);
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg> Delete element
            </button>
          </div>
        ) : p.target.panelType === "canvasedge" ? (
          <div className="foot-actions">
            <button className="d-btn destructive sm"
              onClick={() => {
                const eid = p.target.resourceKey.slice(4);
                board.update((st) => ({ ...st, edges: st.edges.filter((x) => x.id !== eid) }));
                ws.closePanel(id);
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg> Delete link
            </button>
          </div>
        ) : p.target.panelType === "note" ? (
          <div className="foot-actions">
            <button className="d-btn destructive sm"
              onClick={() => { notesApp.removeNote(p.target.resourceKey.slice(4)); ws.closePanel(id); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg> Delete note
            </button>
          </div>
        ) : p.target.panelType === "notes" ? (
          <div className="foot-actions">
            <button className="foot-cta"
              onClick={() => ws.openDetail(id, { panelType: "note", resourceKey: "nte:" + notesApp.addNote() })}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg> New note
            </button>
            <button className="d-btn outline sm" onClick={() => notesApp.addFolder()}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.2 3.9A2 2 0 0 0 7.5 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" /><path d="M12 10v6M9 13h6" /></svg> New folder</button>
          </div>
        ) : p.target.panelType === "notefolder" ? (
          <div className="foot-actions">
            <button className="foot-cta"
              onClick={() => ws.openDetail(id, { panelType: "note", resourceKey: "nte:" + notesApp.addNote(p.target.resourceKey.slice(4)) })}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg> New note here
            </button>
            <button className="d-btn destructive sm"
              onClick={() => { notesApp.removeFolder(p.target.resourceKey.slice(4)); ws.closePanel(id); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg> Delete folder
            </button>
          </div>
        ) : p.target.panelType === "datahome" ? (
          <div className="foot-actions">
            <button className="foot-cta"
              onClick={() => ws.openDetail(id, { panelType: "datatable", resourceKey: "dtc:" + dataApp.addCollection() })}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg> New table
            </button>
          </div>
        ) : p.target.panelType === "datatable" ? (
          <div className="foot-actions">
            <button className="foot-cta"
              onClick={() => {
                const cid = p.target.resourceKey.slice(4);
                ws.openDetail(id, { panelType: "datarow", resourceKey: "dtr:" + cid + ":" + dataApp.addRow(cid) });
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg> New row
            </button>
            <button className="d-btn destructive sm"
              onClick={() => { dataApp.removeCollection(p.target.resourceKey.slice(4)); ws.closePanel(id); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg> Delete table
            </button>
          </div>
        ) : p.target.panelType === "datarow" ? (
          <div className="foot-actions">
            <button className="d-btn destructive sm"
              onClick={() => {
                const [, cid, rid] = p.target.resourceKey.split(":");
                dataApp.removeRow(cid, rid);
                ws.closePanel(id);
              }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg> Delete row
            </button>
          </div>
        ) : p.target.panelType === "task" ? (
          <div className="foot-actions">
            <button className="d-btn destructive sm"
              onClick={() => { notesApp.removeTask(p.target.resourceKey.slice(4)); ws.closePanel(id); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg> Delete task
            </button>
          </div>
        ) : p.target.panelType === "tasks" ? (
          <button className="foot-cta" onClick={() => notesApp.addCategory()}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg> New category</button>
        ) : p.target.panelType === "block" ? (
          <button className="foot-cta" onClick={() => ws.openDetail(id, { panelType: "blocklive", resourceKey: p.target.resourceKey })}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="6 3 20 12 6 21 6 3" /></svg> Live demo — full width
          </button>
        ) : p.target.panelType === "blocklive" ? (
          <span className="foot-note">Live demo — real size, live tokens; change the accent in Settings and watch it follow</span>
        ) : n.composer ? (
          <button className="foot-cta" onClick={() => { /* demo action zone */ }}>{n.composer.replace("…", "")}</button>
        ) : (
          <span className="foot-note">Read-only</span>
        )}
        <button className="foot-gear" title="Panel settings" onClick={() => setGear((v) => !v)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
        </button>
        {gear && (
          <div className="panel-pop">
            <div className="pop-head">
              <span className="pop-label">Panel options</span>
              <button style={{ color: "var(--muted-foreground)" }} onClick={() => setGear(false)}>×</button>
            </div>
            <div className="pop-sub">Width</div>
            <button className={"wbtn" + (!wOverride ? " on" : "")} style={{ width: "100%", marginBottom: 4 }}
              onClick={() => setWOverride(undefined)}>DEFAULT</button>
            <div className="wrow">
              {(["S", "M", "L", "XL"] as PanelSize[]).map((w) => (
                <button key={w} className={"wbtn" + (wOverride === w ? " on" : "")}
                  onClick={() => setWOverride(w)}>{w}</button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ═══ Settings — the zip's panel, complete ════════════════════════════ */

function SettingsBody() {
  const { prefs, set, reset, theme, setTheme } = usePrefs();
  const FontRow = ({ label, value, options, onPick }: {
    label: string; value: string;
    options: Record<string, { label: string; css: string }>;
    onPick: (k: string) => void;
  }) => {
    const [open, setOpen] = useState(false);
    return (
      <div style={{ marginBottom: 10 }}>
        <div className="pop-sub">{label}</div>
        <div style={{ position: "relative" }}>
          <button className="d-input" style={{ width: "100%", textAlign: "left", fontFamily: options[value]?.css, fontSize: 13, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
            onClick={() => setOpen((v) => !v)}>
            {options[value]?.label}<span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>⌄</span>
          </button>
          {open && (
            <>
              <div className="menu-bg" style={{ zIndex: 59 }} onClick={() => setOpen(false)} />
              <div className="d-menu" style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 60, maxHeight: 200, overflowY: "auto" }}>
                {Object.entries(options).map(([k, f]) => (
                  <button key={k} className="it" style={{ fontFamily: f.css, fontSize: 13.5, width: "100%", textAlign: "left", background: k === value ? "var(--secondary)" : undefined }}
                    onClick={() => { onPick(k); setOpen(false); }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };
  const SizeRow = ({ label, value, onPick }: { label: string; value: "S" | "M" | "L"; onPick: (s: "S" | "M" | "L") => void }) => (
    <div style={{ marginBottom: 10 }}>
      <div className="pop-sub">{label}</div>
      <div className="wrow">
        {(["S", "M", "L"] as const).map((s) => (
          <button key={s} className={"wbtn" + (value === s ? " on" : "")} onClick={() => onPick(s)}>{s}</button>
        ))}
      </div>
    </div>
  );
  const Toggle = ({ label, on, onFlip }: { label: string; on: boolean; onFlip: () => void }) => (
    <button onClick={onFlip} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "4px 0", cursor: "pointer" }}>
      <span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{label}</span>
      <span className={"d-switch" + (on ? " on" : "")} />
    </button>
  );
  return (
    <>
      <div className="card">
        <div className="lab">Appearance</div>
        <div style={{ display: "flex", gap: 8, margin: "10px 0 12px" }}>
          {[{ m: "light", l: "Light" }, { m: "dark", l: "Dark" }, { m: "system", l: "System" }].map((t) => (
            <button key={t.m} className={"wbtn" + (theme === t.m ? " on" : "")} style={{ padding: "8px 0", fontSize: 12, textTransform: "none", letterSpacing: 0, fontFamily: "var(--font-sans)" }}
              onClick={() => setTheme(t.m)}>{t.l}</button>
          ))}
        </div>
        <FontRow label="Title font" value={prefs.titleFont} options={TITLE_FONTS} onPick={(k) => set({ titleFont: k })} />
        <SizeRow label="Title size" value={prefs.titleSize} onPick={(s) => set({ titleSize: s })} />
        <FontRow label="Body font" value={prefs.bodyFont} options={BODY_FONTS} onPick={(k) => set({ bodyFont: k })} />
        <SizeRow label="Body size" value={prefs.bodySize} onPick={(s) => set({ bodySize: s })} />
        <FontRow label="Mono font" value={prefs.monoFont} options={MONO_FONTS} onPick={(k) => set({ monoFont: k })} />
        <SizeRow label="Mono size" value={prefs.monoSize} onPick={(s) => set({ monoSize: s })} />
        <div className="pop-sub">Accent color</div>
        <div className="swatch-row">
          {ACCENTS.map((a) => (
            <button key={a.key} className={"swatch" + (prefs.accent === a.key ? " on" : "")}
              title={a.title} style={{ background: a.color }}
              onClick={() => set({ accent: a.key })} />
          ))}
          <input type="color" className="swatch-custom" title="Color picker — any accent"
            value={prefs.accent.startsWith("#") ? prefs.accent : "#e02d27"}
            onChange={(e) => set({ accent: e.target.value })} />
          <input className="d-input" style={{ width: 86, fontFamily: "var(--font-mono)", fontSize: 11, padding: "5px 8px" }}
            value={prefs.accent === "default" ? "default" : prefs.accent}
            onChange={(e) => {
              const val = e.target.value.trim();
              if (val === "default" || /^#[0-9a-fA-F]{3,8}$/.test(val)) set({ accent: val === "default" ? "default" : val });
            }} />
        </div>
      </div>
      <div className="card">
        <div className="lab">Layout</div>
        <div className="pop-sub" style={{ marginTop: 8 }}>Panel gap</div>
        <div className="wrow" style={{ marginBottom: 10 }}>
          {(["S", "M", "L"] as const).map((g) => (
            <button key={g} className={"wbtn" + (prefs.gap === g ? " on" : "")} onClick={() => set({ gap: g })}>{g}</button>
          ))}
        </div>
        <div className="pop-sub">Stage padding</div>
        <div className="wrow" style={{ marginBottom: 10 }}>
          {(["S", "M", "L"] as const).map((g) => (
            <button key={g} className={"wbtn" + (prefs.pad === g ? " on" : "")} onClick={() => set({ pad: g })}>{g}</button>
          ))}
        </div>
        <div className="pop-sub">Zoom</div>
        <div className="wrow">
          {ZOOMS.map((z) => (
            <button key={z} className={"wbtn" + (prefs.zoom === z ? " on" : "")} onClick={() => set({ zoom: z })}>{z}%</button>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="lab">Navigation</div>
        <Toggle label="Show breadcrumb toolbar" on={prefs.crumb} onFlip={() => set({ crumb: !prefs.crumb })} />
        <Toggle label="Dot-grid background" on={prefs.dots} onFlip={() => set({ dots: !prefs.dots })} />
      </div>
      <div className="card">
        <div className="lab">Usage</div>
        <div className="usage-track" style={{ margin: "10px 0 6px" }}><div className="usage-fill" style={{ width: "62%" }} /></div>
        <p style={{ fontSize: "calc(var(--fz-body, 13.5px) - 1.5px)", color: "var(--muted-foreground)" }}>124k / 200k tokens this session · resets in 6d</p>
      </div>
      <div className="card">
        <div className="lab">Shortcuts</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 8, fontSize: "calc(var(--fz-body, 13.5px) - 1px)", color: "var(--ink-2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="kbd">⌘K</span>Command palette</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="kbd">⌘B</span>Toggle sidebar</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="kbd">esc</span>Palette → drawer → menus → panel</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="kbd">P</span>Pin the focused panel — keeps it across pages</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="kbd">⌘J</span>Open / close the Agent</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="kbd">⌘1–3</span>Switch organization</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="kbd">⌫</span>Canvas — delete the selected element</div>
        </div>
      </div>
      <button onClick={() => { reset(); setTheme("system"); }}
        style={{ textAlign: "center", padding: 8, fontSize: 11.5, color: "var(--muted-foreground)", textDecoration: "underline", textUnderlineOffset: 2, width: "100%" }}>
        Reset appearance & layout to defaults
      </button>
    </>
  );
}

/* ═══ Palette ⌘K ══════════════════════════════════════════════════════ */

interface PaletteItem { tag: string; label: string; run: () => void }

function Palette({ onClose, deepLink, say, setTheme }: {
  onClose: () => void;
  deepLink: (k: string) => void;
  say: (m: string) => void;
  setTheme: (m: string) => void;
}) {
  const ws = useWorkspace();
  useNotesApp(); useDataApp(); usePfApp(); // live rows/notes/keys stay searchable
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const items = useMemo<PaletteItem[]>(() => {
    const out: PaletteItem[] = [];
    for (const sp of SPACES)
      out.push({ tag: "space", label: sp.label, run: () => ws.openSpace(sp.spaceId, targetOf(sp.rootKey)) });
    for (const [key, n] of Object.entries(DOMAIN))
      if (n.panelType !== "space")
        out.push({ tag: n.panelType, label: n.title, run: () => deepLink(key) });
    // LIVE content — the palette searches the stores, not just the docs
    for (const nt of notesApp.get().notes)
      out.push({ tag: "note", label: nt.title || "Untitled note", run: () => deepLink("nte:" + nt.id) });
    for (const fd of notesApp.get().folders ?? [])
      out.push({ tag: "folder", label: fd.name, run: () => deepLink("nfd:" + fd.id) });
    for (const tk of notesApp.get().tasks)
      out.push({ tag: "task", label: tk.label, run: () => deepLink("tsk:" + tk.id) });
    for (const c of dataApp.get().collections) {
      out.push({ tag: "table", label: c.name, run: () => deepLink("dtc:" + c.id) });
      const ft = c.fields.find((f) => f.type === "text");
      for (const r of c.rows) {
        const label = String((ft && r.v[ft.id]) || "").trim();
        if (label) out.push({ tag: "row", label: label + " — " + c.name, run: () => deepLink("dtr:" + c.id + ":" + r.id) });
      }
    }
    for (const k of pfApp.get().keys)
      out.push({ tag: "api key", label: k.name, run: () => deepLink("pfk:" + k.id) });
    for (const pj of pfApp.get().projects)
      out.push({ tag: "project", label: pj.name, run: () => deepLink("pfp:" + pj.id) });
    for (const m of pfApp.get().members)
      out.push({ tag: "member", label: m.name, run: () => deepLink("pfm:" + m.id) });
    out.push({ tag: "action", label: "Copy stack link", run: () => { navigator.clipboard?.writeText(location.href); say("Stack link copied"); } });
    out.push({ tag: "action", label: "Toggle sidebar — ⌘B", run: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", metaKey: true })) });
    out.push({ tag: "action", label: "Open Settings", run: () => ws.openSpace("settings", targetOf("sys:settings")) });
    out.push({ tag: "action", label: "Open Canvas board", run: () => ws.openSpace("canvas", targetOf("sec:canvas")) });
    out.push({ tag: "action", label: "Open Agent — ⌘J", run: () => window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", metaKey: true })) });
    out.push({ tag: "action", label: "Open Profile", run: () => ws.openSpace("profile", targetOf("sys:profile")) });
    out.push({ tag: "action", label: "Open Data — tables & pages", run: () => ws.openSpace("data", targetOf("sec:data")) });
    out.push({ tag: "action", label: "Open Notes", run: () => ws.openSpace("notes", targetOf("sec:notes")) });
    out.push({ tag: "action", label: "Open Tasks", run: () => ws.openSpace("tasks", targetOf("sec:tasks")) });
    out.push({ tag: "action", label: "Theme — light", run: () => setTheme("light") });
    out.push({ tag: "action", label: "Theme — dark", run: () => setTheme("dark") });
    out.push({ tag: "action", label: "Theme — system", run: () => setTheme("system") });
    out.push({ tag: "action", label: "Reset workspace", run: () => ws.reset() });
    return out;
  }, [ws, deepLink, say, setTheme]);

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (s ? items.filter((i) => i.label.toLowerCase().includes(s) || i.tag.includes(s)) : items).slice(0, 12);
  }, [q, items]);
  useEffect(() => setSel(0), [q]);

  const run = (i: PaletteItem) => { i.run(); onClose(); };

  return (
    <div className="palette-bg" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <div className="palette-head">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Go to panel, section, action…"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, hits.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              if (e.key === "Enter" && hits[sel]) run(hits[sel]);
            }} />
          <span className="palette-esc">esc</span>
        </div>
        <div className="palette-list">
          {hits.map((i, idx) => (
            <button key={i.tag + i.label + idx} className={"palette-row" + (idx === sel ? " sel" : "")}
              onMouseEnter={() => setSel(idx)} onClick={() => run(i)}>
              <span className="tag2">{i.tag}</span>
              <span className="lb">{i.label}</span>
              <span className="ret">↵</span>
            </button>
          ))}
          {hits.length === 0 && (
            <div style={{ padding: "14px 12px", fontSize: 12.5, color: "var(--muted-foreground)" }}>
              Nothing matches "{q}".
            </div>
          )}
        </div>
        <div className="palette-foot">↑↓ navigate · ↵ open · the palette reads the panel registry</div>
      </div>
    </div>
  );
}

/* ═══ Agent drawer — a real LLM client: sizes, files, voice, history ══ */

interface ChatAtt { kind: "file" | "audio"; name?: string; size?: number; url?: string; dur?: number }
interface ChatMsg { me: boolean; t: string; atts?: ChatAtt[] }
interface Convo { id: string; title: string; ts: number; msgs: ChatMsg[] }
type DrawerSize = "S" | "M" | "L";
const DRAWER_W: Record<DrawerSize, number> = { S: 380, M: 560, L: 780 };

const fmtSize = (b: number) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB");
const fmtWhen = (ts: number) => new Date(ts).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function loadAgentStore(): { size: DrawerSize; convos: Convo[]; activeId: string | null } {
  try {
    const raw = JSON.parse(localStorage.getItem("frameword-agent") ?? "null");
    if (raw?.convos) return { size: raw.size ?? "M", convos: raw.convos, activeId: raw.activeId ?? null };
  } catch { /* fresh start */ }
  return { size: "M", convos: [], activeId: null };
}

function AgentDrawer({ onClose }: { onClose: () => void }) {
  const ws = useWorkspace();
  const init = useRef(loadAgentStore()).current;
  const [size, setSize] = useState<DrawerSize>(init.size);
  const [convos, setConvos] = useState<Convo[]>(init.convos);
  const [activeId, setActiveId] = useState<string | null>(init.activeId ?? init.convos[0]?.id ?? null);
  const [histOpen, setHistOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [atts, setAtts] = useState<ChatAtt[]>([]);
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const recStart = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const active = convos.find((c) => c.id === activeId) ?? null;
  const msgs = active?.msgs ?? [];

  useEffect(() => {
    // persist without blob URLs (they don't survive a reload)
    const safe = convos.map((c) => ({ ...c, msgs: c.msgs.map((m) => ({ ...m, atts: m.atts?.map(({ url: _url, ...a }) => a) })) }));
    localStorage.setItem("frameword-agent", JSON.stringify({ size, convos: safe, activeId }));
  }, [convos, size, activeId]);
  useEffect(() => { msgsRef.current?.scrollTo({ top: 99999 }); }, [msgs.length, histOpen]);

  const mdToHtml = (t: string): string => {
    const esc = t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    return esc.split(/\n/).map((line) => {
      if (/^### /.test(line)) return `<div class="md-h">${line.slice(4)}</div>`;
      if (/^## /.test(line)) return `<div class="md-h">${line.slice(3)}</div>`;
      if (/^[-*] /.test(line)) return `<div class="md-li">• ${line.slice(2)}</div>`;
      return line ? `<p>${line}</p>` : "";
    }).join("").replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/`([^`]+)`/g, "<code>$1</code>");
  };

  const answer = (q: string, sent: ChatAtt[]): string => {
    const built = boardFromPrompt(q);
    if (built) {
      ws.openSpace("canvas", targetOf("sec:canvas"));
      return built + "\n\nTip: describe chains like \"Idea -> Prototype -> Test\" (one per line for branches), or ask for a sprint / retro / roadmap / funnel / launch / onboarding board.";
    }
    const path = ws.path.map((id) => titleOfKey(ws.state.panelsById[id].target.resourceKey));
    const refs = ws.state.referenceRailOrder.map((id) => titleOfKey(ws.state.panelsById[id].target.resourceKey));
    const ctx = path.length
      ? `Your stack right now: ${path.join(" › ")}${refs.length ? ` · pinned refs: ${refs.join(", ")}` : ""}.`
      : "Your stack is empty — open a space and I'll see it.";
    const attNote = sent.length
      ? `\n\nReceived ${sent.map((a) => (a.kind === "audio" ? `a ${a.dur ?? 0}s voice note` : `"${a.name}"`)).join(", ")} — in production each attachment is resolved into the stack context (files parsed, voice transcribed) before the model answers.`
      : "";
    const s = q.toLowerCase();
    if (s.includes("law")) return `${ctx}\n\nThe laws in force here: ancestry is parent links (never visual order); same target + same parent reveals; a pinned panel detaches into a reference instead of orphaning; only references reorder; the URL carries the ContextPath alone.${attNote}`;
    if (s.includes("convex")) return `${ctx}\n\nIn production this state writes to a Convex stacks table on every navigation — one mutation, one live query for presence. Signed out it falls back to localStorage, exactly like this demo.${attNote}`;
    if (s.includes("modal")) return `${ctx}\n\nA modal steals context and cannot nest. A panel is a modal that respects its parent — it opens beside its source and keeps the whole thread on stage.${attNote}`;
    if (s.includes("pin")) return `${ctx}\n\nPIN sets retention:"retained". If a branch change would orphan it, it detaches into the reference rail — visual order never lies about parentage.${attNote}`;
    return `${ctx}\n\nThis is the stack-as-working-memory seam: agent.ask resolves every open PanelRef via its registered load(params) and answers from exactly what you see. Ask about laws, pin, Convex, or modals.${attNote}`;
  };

  const [typing, setTyping] = useState(false);
  const send = (text: string) => {
    const t = text.trim();
    if (!t && atts.length === 0) return;
    const sent = atts;
    const userMsg: ChatMsg = { me: true, t: t || "(attachment)", atts: sent };
    const botMsg: ChatMsg = { me: false, t: answer(t, sent) };
    const deliver = (cid: string) => {
      setTyping(true);
      window.setTimeout(() => {
        setConvos((cs) => cs.map((c) => (c.id === cid ? { ...c, ts: Date.now(), msgs: [...c.msgs, botMsg] } : c)));
        setTyping(false);
      }, 650);
    };
    if (active) {
      setConvos((cs) => cs.map((c) => (c.id === active.id ? { ...c, ts: Date.now(), msgs: [...c.msgs, userMsg] } : c)));
      deliver(active.id);
    } else {
      const id = "c" + Date.now();
      setConvos((cs) => [{ id, title: (t || "Attachment").slice(0, 34), ts: Date.now(), msgs: [userMsg] }, ...cs]);
      setActiveId(id);
      deliver(id);
    }
    setDraft("");
    setAtts([]);
  };

  const newConvo = () => { setActiveId(null); setHistOpen(false); setDraft(""); setAtts([]); };

  const toggleRec = async () => {
    if (rec) { rec.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const url = URL.createObjectURL(new Blob(chunks, { type: "audio/webm" }));
        setAtts((a) => [...a, { kind: "audio", url, dur: Math.max(1, Math.round((Date.now() - recStart.current) / 1000)) }]);
        setRec(null);
      };
      recStart.current = Date.now();
      r.start();
      setRec(r);
    } catch {
      setAtts((a) => [...a, { kind: "audio", dur: 0 }]); // mic denied — demo chip anyway
    }
  };

  return (
    <div className="drawer" role="complementary" aria-label="Demo agent" style={{ width: DRAWER_W[size] }}>
      <div className="drawer-bar">
        <span style={{ color: "var(--accent)" }}>✶</span>
        <span className="nm">Agent</span>
        <span className="ai-dot" title="Online" />
        <span className="aseg" role="group" aria-label="Drawer size">
          {(["S", "M", "L"] as DrawerSize[]).map((s) => (
            <button key={s} className={size === s ? "on" : ""} onClick={() => setSize(s)}>{s}</button>
          ))}
        </span>
        <div style={{ flex: 1 }} />
        <button className="bar-btn" title="New conversation" onClick={newConvo}>＋</button>
        <button className={"bar-btn" + (histOpen ? " on-btn" : "")} title="Conversation history"
          onClick={() => setHistOpen((v) => !v)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15.5 13.5" /></svg>
        </button>
        <button className="bar-btn" title="Close" style={{ fontSize: 15 }} onClick={onClose}>×</button>
      </div>

      {histOpen ? (
        <div className="drawer-msgs">
          <button className="hist-item new" onClick={newConvo}>＋ New conversation</button>
          {convos.length === 0 && <div className="hist-empty">No conversations yet — ask your first question.</div>}
          {convos.map((c) => (
            <div key={c.id} className={"hist-item" + (c.id === activeId ? " on" : "")}
              onClick={() => { setActiveId(c.id); setHistOpen(false); }}>
              <span className="ht">{c.title}</span>
              <span className="hd">{fmtWhen(c.ts)} · {c.msgs.length} msg</span>
              <button className="hx" title="Delete" onClick={(e) => {
                e.stopPropagation();
                setConvos((cs) => cs.filter((x) => x.id !== c.id));
                if (activeId === c.id) setActiveId(null);
              }}>×</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="drawer-msgs" ref={msgsRef}>
          <div className="msg bot"><span style={{ color: "var(--accent)" }}>✶</span> I can see your open stack — it is my working memory. Ask about the laws, pinning, Convex, or why not modals. Attach a file or a voice note — I see those too. And ask me to BUILD A BOARD: “canvas: Idea → Prototype → Ship”.</div>
          {msgs.map((m, i) => (
            <div key={i} className={"msg " + (m.me ? "me" : "bot")}>
              {!m.me && <span className="b-tag">Agent</span>}
              {m.me ? m.t : <span className="md" dangerouslySetInnerHTML={{ __html: mdToHtml(m.t) }} />}
              {m.atts && m.atts.length > 0 && (
                <span className="msg-atts">
                  {m.atts.map((a, j) =>
                    a.kind === "audio" ? (
                      a.url
                        ? <audio key={j} controls src={a.url} className="msg-audio" />
                        : <span key={j} className="att-chip">🎙 voice note · {a.dur}s</span>
                    ) : (
                      <span key={j} className="att-chip">📎 {a.name}{a.size ? ` · ${fmtSize(a.size)}` : ""}</span>
                    ),
                  )}
                </span>
              )}
            </div>
          ))}
          {typing && <div className="msg bot"><span className="typing"><i /><i /><i /></span></div>}
          {msgs.length === 0 && (
            <div className="chips">
              {["What are the laws?", "How does pin work?", "How does Convex fit?", "Why not modals?"].map((c) => (
                <button key={c} className="chip" onClick={() => send(c)}>{c}</button>
              ))}
            </div>
          )}
        </div>
      )}

      {!histOpen && (
        <div className="drawer-compose">
          {atts.length > 0 && (
            <div className="compose-atts">
              {atts.map((a, i) => (
                <span key={i} className="att-chip">
                  {a.kind === "audio" ? `🎙 ${a.dur}s` : `📎 ${a.name}`}
                  <button onClick={() => setAtts((x) => x.filter((_, j) => j !== i))}>×</button>
                </span>
              ))}
            </div>
          )}
          <div className="drawer-input">
            <input ref={fileRef} type="file" multiple hidden
              onChange={(e) => {
                for (const f of Array.from(e.target.files ?? [])) setAtts((a) => [...a, { kind: "file", name: f.name, size: f.size }]);
                e.target.value = "";
              }} />
            <button className="tool-btn" title="Attach a file" onClick={() => fileRef.current?.click()}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>
            </button>
            <button className={"tool-btn" + (rec ? " rec" : "")} title={rec ? "Stop recording" : "Voice note"} onClick={toggleRec}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
            </button>
            <textarea rows={1} value={draft} onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(draft); } }}
              placeholder={rec ? "Recording…" : "Ask — or describe a board to build…"} />
            <button className="chat-send" title="Send" onClick={() => send(draft)}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
