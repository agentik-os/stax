/**
 * The Blocks catalog — every dashboard element the framework ships, each in
 * THREE structurally different versions, each with the grammar table that
 * explains how it plugs into the panel framework (lives / drill / state / size).
 */
import { useRef, useState, type ReactNode } from "react";
import { RichNotes } from "./RichNotes";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TTImage from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";

/* ── meta: category + grammar table values ───────────────────────────── */
export interface BlockMeta { title: string; sub: string; cat: string; g: [string, string, string, string] }
// g = [Vit dans, Interaction/drill, État, Taille panneau]

export const BLOCKS: Record<string, BlockMeta> = {
  /* KPI & stats */
  "blk:stat-card": { title: "Stat card", sub: "Mono label + serif value + delta.", cat: "kpi", g: ["Panel body (stats grid)", "Click → drills the metric detail to the right", "App data (query)", "L root · M detail"] },
  "blk:big-number": { title: "Big number", sub: "The number IS the message.", cat: "kpi", g: ["Body, full width", "Click → metric explainer panel", "App data", "S · M"] },
  "blk:delta-badge": { title: "Delta badge", sub: "+12% ↑ — the change in one pill.", cat: "kpi", g: ["Inline in stats, tables, titles", "Click → period comparison panel", "Derived (computed)", "—"] },
  "blk:sparkline-stat": { title: "Sparkline stat", sub: "Value + trend in one block.", cat: "kpi", g: ["Body (KPI row)", "Click → full-size chart as a drill", "App data", "M"] },
  "blk:gauge": { title: "Gauge", sub: "Position on a bounded scale.", cat: "kpi", g: ["Body", "Click → gauge history", "Data + configured thresholds", "S"] },
  "blk:progress-ring": { title: "Progress ring", sub: "Circular completion.", cat: "kpi", g: ["Body · card corner", "Click → list of remaining items", "Derived", "S"] },
  "blk:objective-bar": { title: "Objective bar", sub: "Progress toward a target (the PIPELINE bar).", cat: "kpi", g: ["Body · sidebar", "Click → objective breakdown", "Data + configured target", "S · M"] },
  "blk:comparison-ab": { title: "Comparison A/B", sub: "Two values head to head.", cat: "kpi", g: ["Body", "Click A or B → drills the cohort", "App data", "M"] },
  "blk:scorecard": { title: "Scorecard", sub: "A battery of metrics in one block.", cat: "kpi", g: ["Body du root (dashboard)", "Every row is a DrillTrigger", "App data", "L"] },
  /* Charts */
  "blk:line": { title: "Line chart", sub: "Trend over time.", cat: "charts", g: ["Body", "Point click → day/segment panel", "App data", "M · L"] },
  "blk:area": { title: "Area chart", sub: "Volume + trend.", cat: "charts", g: ["Body", "Point → segment drill", "App data", "M · L"] },
  "blk:bars": { title: "Bar chart", sub: "Category comparison.", cat: "charts", g: ["Body", "Bar = the category's DrillTrigger", "App data", "M"] },
  "blk:stacked-bars": { title: "Stacked bars", sub: "Composition per category.", cat: "charts", g: ["Body", "Segment → sub-series drill", "App data", "M · L"] },
  "blk:donut": { title: "Donut / Pie", sub: "Parts of a whole.", cat: "charts", g: ["Body", "Slice → slice drill", "App data", "S · M"] },
  "blk:scatter": { title: "Scatter", sub: "Correlation across two axes.", cat: "charts", g: ["Body", "Point = a record → openDetail", "App data", "L"] },
  "blk:heatmap": { title: "Calendar heatmap", sub: "The GitHub pixel-grid — the LifeOS signature.", cat: "charts", g: ["Body, full width, jamais de h-scroll", "Cell = a day → drills that day", "App data (logs/jour)", "L · XL"] },
  "blk:funnel": { title: "Funnel", sub: "Step-by-step conversion.", cat: "charts", g: ["Body", "Step → drills the lost/passed cohort", "Derived", "M"] },
  "blk:radar": { title: "Radar", sub: "Multi-dimensional profile.", cat: "charts", g: ["Body", "Axis → dimension drill", "App data", "M"] },
  "blk:treemap": { title: "Treemap", sub: "Proportional hierarchy.", cat: "charts", g: ["Body", "Cell → drill (recursive — it IS a tree!)", "App data", "L · XL"] },
  "blk:sankey": { title: "Sankey", sub: "Flows between states.", cat: "charts", g: ["Body (panneau wide)", "Ribbon → flow drill", "Derived", "XL"] },
  "blk:geo-map": { title: "Geo map", sub: "Values by territory.", cat: "charts", g: ["Body (canvas-like)", "Marker → node-inspector drill", "App data", "L · XL"] },
  "blk:sparklines": { title: "Sparklines", sub: "Inline micro-trends.", cat: "charts", g: ["Inline (tables, lists, text)", "Click → full chart as a drill", "Derived", "—"] },
  /* Data */
  "blk:pivot": { title: "Pivot table", sub: "Cross aggregates, rows × columns.", cat: "data", g: ["Body (wide)", "Cell → drills the aggregated records", "Derived (aggregates)", "XL"] },
  "blk:tree-table": { title: "Tree table", sub: "Hierarchy + columns.", cat: "data", g: ["Body", "Caret expands IN PLACE · title → drills right", "App data", "L"] },
  "blk:virtual-list": { title: "Virtual list", sub: "10k rows without flinching.", cat: "data", g: ["Body (seul scrolleur vertical)", "Row = DrillTrigger", "Paginated data (query)", "M · L"] },
  "blk:timeline": { title: "Timeline / feed", sub: "Activity, in order.", cat: "data", g: ["Body", "Entry → drills the related record", "App data", "M"] },
  "blk:kanban": { title: "Kanban", sub: "State columns, draggable cards.", cat: "data", g: ["Body (wide) — a VIEW, not a navigation", "Card → openDetail beside the board", "App data (mutations)", "XL"] },
  "blk:gantt": { title: "Gantt", sub: "Durations and dependencies.", cat: "data", g: ["Body (wide)", "Bar → task drill", "App data", "XL"] },
  "blk:log-viewer": { title: "Log viewer", sub: "Mono stream, colored levels.", cat: "data", g: ["Body pleine hauteur", "Line → error-context drill", "Stream (append-only)", "L · XL"] },
  "blk:diff-viewer": { title: "Diff viewer", sub: "Before / after.", cat: "data", g: ["Body", "Hunk → full-file drill", "Derived", "L · XL"] },
  "blk:code-block": { title: "Code block", sub: "Readable, copyable source.", cat: "data", g: ["Body", "Copy in the block · run → result as a drill", "Static content", "M · L"] },
  /* Content */
  "blk:rich-editor": { title: "Rich text editor (Tiptap)", sub: "Real Tiptap — notes, blog writing, image note-taking.", cat: "content", g: ["Panel body, full height (editor-typed panel)", "@-mention a record → opens its panel beside the draft", "Draft state (local) → document (app data) on save", "L · XL"] },
  "blk:stepper": { title: "Stepper / wizard", sub: "Sequenced progression.", cat: "content", g: ["Body · the step CTA lives in the FOOT", "Next/Back = footActions — never floating", "Local draft state", "M"] },
  /* Navigation & filters */
  "blk:filter-bar": { title: "Filter bar", sub: "Active filter chips.", cat: "nav", g: ["Top of the body, under the title", "A chip changes the QUERY, not navigation", "Presentation (device-local)", "—"] },
  "blk:saved-views": { title: "Saved views", sub: "Named, reusable segments.", cat: "nav", g: ["Top of the body · ⌘K palette", "A view = named query params", "Preference (device/org)", "—"] },
  /* États */
  "blk:presence": { title: "Presence", sub: "Who is viewing what, live.", cat: "states", g: ["Panel bar", "Avatar → profile drill", "Ephemeral (live query)", "—"] },
  "blk:panel-states": { title: "Panel states", sub: "All 8 states from the brief, drawn.", cat: "states", g: ["The panel's ENTIRE body", "Retry / Request access = footActions", "Query lifecycle", "all"] },
  /* IA */
  "blk:voice-input": { title: "Voice to text", sub: "Dictate anywhere — Web Speech here, ElevenLabs Scribe in production.", cat: "ai", g: ["Composer of chat panels · any input", "Transcript lands in the focused field/panel", "Ephemeral until sent", "—"] },
  "blk:tool-trace": { title: "Tool-call trace", sub: "What the agent did — verifiable.", cat: "ai", g: ["Body du chat (sous le message)", "Step → drills the panel it read", "Execution log", "M"] },
  "blk:agent-presence": { title: "Agent presence", sub: "The agent is a visible collaborator.", cat: "ai", g: ["Panel bar + presence stack", "Click → opens the agent drawer", "Ephemeral", "—"] },
  /* Natifs */
  "blk:canvas": { title: "Canvas + node inspector", sub: "The topology axis — React Flow as a panel.", cat: "native", g: ["A panel TYPE (XL)", "Node → node-inspector drill to the right", "{nodes, edges} JSON — URL/agent ready", "XL + S inspector"] },
  "blk:stack-minimap": { title: "Stack minimap", sub: "The stack as thumbnails.", cat: "native", g: ["Breadcrumb hover · stage corner", "Thumbnail → focus/scroll that panel", "Derived du ContextPath", "—"] },
  "blk:saved-stacks": { title: "Saved stacks", sub: "A named arrangement = a workspace.", cat: "native", g: ["Sidebar · palette", "Open = openPath of the saved stack", "Persisted (Convex/localStorage)", "—"] },
};

export const BLOCK_CATS: { key: string; label: string; blocks: string[]; done: string[] }[] = [
  { key: "kpi", label: "KPI & stats", blocks: ["blk:stat-card", "blk:big-number", "blk:delta-badge", "blk:sparkline-stat", "blk:gauge", "blk:progress-ring", "blk:objective-bar", "blk:comparison-ab", "blk:scorecard"], done: [] },
  { key: "charts", label: "Charts", blocks: ["blk:line", "blk:area", "blk:bars", "blk:stacked-bars", "blk:donut", "blk:scatter", "blk:heatmap", "blk:funnel", "blk:radar", "blk:treemap", "blk:sankey", "blk:geo-map", "blk:sparklines"], done: [] },
  { key: "data", label: "Data", blocks: ["blk:pivot", "blk:tree-table", "blk:virtual-list", "blk:timeline", "blk:kanban", "blk:gantt", "blk:log-viewer", "blk:diff-viewer", "blk:code-block"], done: ["cmp:table", "cmp:data-table", "cmp:calendar"] },
  { key: "content", label: "Content", blocks: ["blk:stepper", "blk:rich-editor"], done: ["cmp:card", "cmp:empty", "cmp:alert", "cmp:toast", "cmp:badge", "cmp:avatar", "cmp:accordion", "cmp:tabs", "cmp:carousel"] },
  { key: "nav", label: "Navigation & filters", blocks: ["blk:filter-bar", "blk:saved-views"], done: ["cmp:sidebar", "cmp:breadcrumb", "cmp:command", "cmp:pagination"] },
  { key: "states", label: "States & feedback", blocks: ["blk:presence", "blk:panel-states"], done: ["cmp:skeleton", "cmp:spinner", "cmp:progress"] },
  { key: "ai", label: "AI", blocks: ["blk:tool-trace", "blk:agent-presence", "blk:voice-input"], done: ["cmp:message", "cmp:bubble", "cmp:attachment", "cmp:message-scroller"] },
  { key: "native", label: "Framework natives", blocks: ["blk:canvas", "blk:stack-minimap", "blk:saved-stacks"], done: [] },
];

/* ── helpers ─────────────────────────────────────────────────────────── */
const Zone = ({ children, col }: { children: ReactNode; col?: boolean }) => (
  <div className="demo-zone" style={col ? { flexDirection: "column", alignItems: "stretch" } : undefined}>{children}</div>
);
const Ph = ({ w = "100%", h = 8 }: { w?: number | string; h?: number }) => (
  <span style={{ display: "block", width: w, height: h, borderRadius: 3, background: "var(--border)" }} />
);
const muted = { color: "var(--muted-foreground)" } as const;
const mono10 = { fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)" } as const;
const serifV = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" } as const;
const Delta = ({ v, neg }: { v: string; neg?: boolean }) => (
  <span style={{ fontSize: 11, fontWeight: 600, color: neg ? "var(--accent)" : "var(--foreground)", background: neg ? "var(--accent-soft)" : "var(--secondary)", borderRadius: 9999, padding: "2px 7px 1px" }}>{neg ? "▼" : "▲"} {v}</span>
);
const Spark = ({ pts = "0,18 15,12 30,15 45,7 60,10 75,3", w = 80, h = 22, fill }: { pts?: string; w?: number; h?: number; fill?: boolean }) => (
  <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
    {fill && <polygon points={`${pts} ${w},${h} 0,${h}`} fill="var(--accent)" opacity="0.15" />}
    <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="1.6" />
  </svg>
);
const Ring = ({ pct, size = 56, color = "var(--accent)", label }: { pct: number; size?: number; color?: string; label?: string }) => (
  <svg width={size} height={size} viewBox="0 0 42 42">
    <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--secondary)" strokeWidth="5" />
    <circle cx="21" cy="21" r="15.9" fill="none" stroke={color} strokeWidth="5" strokeDasharray={`${pct} ${100 - pct}`} strokeDashoffset="25" strokeLinecap="round" />
    <text x="21" y="24" textAnchor="middle" style={{ font: "600 8.5px var(--font-sans)", fill: "var(--foreground)" }}>{label ?? pct + "%"}</text>
  </svg>
);
const HBar = ({ w, c = "var(--accent)", h = 14 }: { w: string; c?: string; h?: number }) => (
  <span style={{ display: "block", width: w, height: h, borderRadius: 3, background: c }} />
);

/* ── the grammar table (the "how it works in the panel framework" demo) ─ */
function Gram({ g }: { g: [string, string, string, string] }) {
  const rows = [["Lives in", g[0]], ["Drill / interaction", g[1]], ["State", g[2]], ["Panel size", g[3]]];
  return (
    <div className="card" style={{ marginBottom: 0, padding: 0, overflow: "hidden" }}>
      <div className="lab" style={{ padding: "12px 16px 0" }}><span className="sig">✶</span> In the panel framework</div>
      <table className="d-table" style={{ marginTop: 8 }}>
        <tbody>{rows.map(([k, val]) => (
          <tr key={k}><td style={{ ...mono10, whiteSpace: "nowrap", width: 120 }}>{k}</td><td>{val}</td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}


/* ── REAL Tiptap integration ─────────────────────────────────────────── */
export function TiptapDemo({ v }: { v: 1 | 2 | 3 }) {
  const [rich, setRich] = useState(
    "<h2>The framework editor</h2><p>The same <b>RichNotes</b> component the canvas, tasks and data pages use — smart paragraph menu, checklists, links, highlight.</p><ul data-type=\"taskList\"><li data-type=\"taskItem\" data-checked=\"true\"><label><input type=\"checkbox\" checked=\"checked\"><span></span></label><div><p>One editor everywhere</p></div></li><li data-type=\"taskItem\" data-checked=\"false\"><label><input type=\"checkbox\"><span></span></label><div><p>Try the Text menu</p></div></li></ul>");
  const editor = useEditor({
    extensions: [
      StarterKit,
      TTImage,
      Placeholder.configure({ placeholder: v === 2 ? "Title your story, then just write…" : "Take a note…" }),
    ],
    content:
      v === 1
        ? "<p>A <b>real</b> Tiptap editor inside a panel — select text, use the toolbar.</p><ul><li>Notes</li><li>Specs</li><li>Meeting minutes</li></ul>"
        : v === 2
          ? "<h2>Why panels beat pages</h2><p>The draft lives beside its sources — pin a record, quote it, keep writing. <i>Blog writing without losing the thread.</i></p><blockquote>A panel is a modal that respects its parent.</blockquote>"
          : "<p>Image note-taking — insert screenshots and annotate around them.</p>",
  }, [v]);
  if ((v as number) === 1) {
    return (
      <Zone col>
        <RichNotes html={rich} onChange={setRich} />
      </Zone>
    );
  }
  if (!editor) return null;
  const B = ({ act, on, label }: { act: () => void; on?: boolean; label: string }) => (
    <button className={on ? "on" : ""} onMouseDown={(e) => { e.preventDefault(); act(); }}>{label}</button>
  );
  return (
    <Zone col>
      <div className="tt-wrap">
        <div className="tt-toolbar">
          <B label="B" on={editor.isActive("bold")} act={() => editor.chain().focus().toggleBold().run()} />
          <B label="I" on={editor.isActive("italic")} act={() => editor.chain().focus().toggleItalic().run()} />
          <B label="H2" on={editor.isActive("heading", { level: 2 })} act={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <B label="• List" on={editor.isActive("bulletList")} act={() => editor.chain().focus().toggleBulletList().run()} />
          <B label="❝" on={editor.isActive("blockquote")} act={() => editor.chain().focus().toggleBlockquote().run()} />
          <B label="‹›" on={editor.isActive("code")} act={() => editor.chain().focus().toggleCode().run()} />
          {v === 3 && <B label="🖼 Image" act={() => editor.chain().focus().setImage({ src: "https://picsum.photos/seed/stax/360/140" }).run()} />}
        </div>
        <EditorContent editor={editor} className={v === 2 ? "blog-host" : undefined} />
      </div>
      <div style={{ fontSize: 10.5, ...muted }}>
        {v === 1 ? "Default editor — StarterKit, fully editable right now." : v === 2 ? "Blog mode — serif voice, placeholder, headings & quotes." : "Note-taker — click 🖼 Image to insert, then keep typing around it."}
      </div>
    </Zone>
  );
}

/* ── voice to text — Web Speech API live, ElevenLabs Scribe in prod ──── */
export function VoiceDemo({ v }: { v: 1 | 2 | 3 }) {
  const [live, setLive] = useState(false);
  const [text, setText] = useState("");
  const recRef = useRef<{ stop: () => void } | null>(null);
  const toggle = () => {
    if (live) { recRef.current?.stop(); return; }
    const W = window as unknown as { webkitSpeechRecognition?: new () => never; SpeechRecognition?: new () => never };
    const SR = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SR) { setText("Speech recognition unavailable in this browser — production wires ElevenLabs Scribe here."); return; }
    const r = new (SR as new () => {
      continuous: boolean; interimResults: boolean; lang: string;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onend: () => void; start: () => void; stop: () => void;
    })();
    r.continuous = true; r.interimResults = true; r.lang = "en-US";
    r.onresult = (e) => { let t = ""; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; setText(t); };
    r.onend = () => setLive(false);
    recRef.current = r; r.start(); setLive(true);
  };
  const Wave = () => (
    <span className="vc-wave">{[10, 16, 22, 14, 18, 9, 15].map((h, i) => <span key={i} style={{ height: live ? h : 4, animationDelay: i * 0.1 + "s", animationPlayState: live ? "running" : "paused" }} />)}</span>
  );
  return (
    <Zone col>
      {v === 1 ? (
        <>
          <button className={"vc-btn" + (live ? " live" : "")} onClick={toggle} style={{ alignSelf: "flex-start" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="22" /></svg>
            {live ? "Stop" : "Push to talk"}
          </button>
          <div className="d-msg" style={{ maxWidth: "100%", minHeight: 40 }}>{text || "Your words land here — live transcript."}</div>
        </>
      ) : v === 2 ? (
        <div className="d-row" style={{ border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", background: "var(--card)", justifyContent: "space-between" }}>
          <button className={"vc-btn" + (live ? " live" : "")} onClick={toggle} style={{ padding: "6px 12px" }}>🎙</button>
          <Wave />
          <span style={{ fontSize: 11, ...muted }}>{live ? "listening…" : "tap to record"}</span>
        </div>
      ) : (
        <div className="d-row" style={{ width: "100%" }}>
          <input className="d-input" style={{ flex: 1 }} value={text} placeholder="Dictate into this field…" onChange={(e) => setText(e.target.value)} />
          <button className={"vc-btn" + (live ? " live" : "")} onClick={toggle} style={{ padding: "7px 12px" }}>🎙</button>
        </div>
      )}
      <div style={{ fontSize: 10.5, ...muted }}>Live Web Speech API in this demo · production swaps in ElevenLabs Scribe (ui.elevenlabs.io) behind the same seam.</div>
    </Zone>
  );
}

export function BlockDemo({ name }: { name: string }) {
  const [v, setV] = useState<1 | 2 | 3>(1);
  const meta = BLOCKS[name];
  if (!meta) return null;
  return (
    <>
      <div className="variant-row">
        <span className="lbl">Version</span>
        <div className="d-tabs">
          {([1, 2, 3] as const).map((n) => (
            <button key={n} className={"d-tab" + (v === n ? " on" : "")} onClick={() => setV(n)}>V{n}</button>
          ))}
        </div>
      </div>
      <Body k={name} v={v} />
      <div style={{ height: 12 }} />
      <Gram g={meta.g} />
    </>
  );
}

function Body({ k, v }: { k: string; v: 1 | 2 | 3 }) {
  switch (k) {
    /* ═══ KPI ═══ */
    case "blk:stat-card":
      return v === 1 ? (<Zone><div className="d-card"><div style={mono10}>Pipeline</div><div style={{ ...serifV, fontSize: 30 }}>46k€</div><Delta v="+12%" /></div></Zone>)
        : v === 2 ? (<Zone><div className="d-card" style={{ display: "flex", gap: 12, alignItems: "center" }}><span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", fontSize: 16 }}>◆</span><span><div style={mono10}>Deals ouverts</div><div style={{ ...serifV, fontSize: 24 }}>12</div></span></div></Zone>)
        : (<Zone><div className="d-card"><div className="d-row" style={{ justifyContent: "space-between" }}><span style={mono10}>MRR</span><Delta v="+4,2%" /></div><div style={{ ...serifV, fontSize: 26 }}>8 214 €</div><Spark w={150} fill /></div></Zone>);
    case "blk:big-number":
      return v === 1 ? (<Zone><div style={{ textAlign: "center" }}><div style={{ ...serifV, fontSize: 56, lineHeight: 1 }}>37,2<span style={{ fontSize: 26, ...muted }}>%</span></div></div></Zone>)
        : v === 2 ? (<Zone><div style={{ textAlign: "center" }}><div style={mono10}>Win rate · T3</div><div style={{ ...serifV, fontSize: 48, lineHeight: 1.1 }}>37,2%</div><Delta v="+3,1 pts" /></div></Zone>)
        : (<Zone><div><div style={{ ...serifV, fontSize: 48, lineHeight: 1 }}>128</div><div style={{ fontSize: 12, ...muted }}>signatures ce trimestre · record : 141</div></div></Zone>);
    case "blk:delta-badge":
      return v === 1 ? (<Zone><Delta v="+12%" /><Delta v="−8%" neg /><span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-foreground)", background: "var(--secondary)", borderRadius: 9999, padding: "2px 7px 1px" }}>= 0%</span></Zone>)
        : v === 2 ? (<Zone><span style={{ fontSize: 13, color: "var(--ink-2)" }}>MRR <b style={{ color: "var(--foreground)" }}>↗ 8 214 €</b> · churn <b style={{ color: "var(--accent)" }}>↘ 1,2%</b></span></Zone>)
        : (<Zone><span className="d-badge outline" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><span style={{ color: "var(--foreground)", fontWeight: 700 }}>+12%</span><span style={{ ...mono10, fontSize: 9 }}>vs Q2</span></span></Zone>);
    case "blk:sparkline-stat":
      return v === 1 ? (<Zone><div className="d-row" style={{ gap: 14 }}><div><div style={mono10}>Visites</div><div style={{ ...serifV, fontSize: 22 }}>1 240</div></div><Spark /></div></Zone>)
        : v === 2 ? (<Zone><div className="d-row" style={{ gap: 14, alignItems: "flex-end" }}><div><div style={mono10}>Leads</div><div style={{ ...serifV, fontSize: 22 }}>86</div></div><div className="d-chart" style={{ height: 26 }}>{[40, 70, 55, 90, 65, 100].map((h, i) => <div key={i} className="bar" style={{ height: h + "%", width: 7 }} />)}</div></div></Zone>)
        : (<Zone><div style={{ position: "relative", width: 190, padding: "10px 12px" }}><span style={{ position: "absolute", inset: 0, opacity: 0.5 }}><Spark w={190} h={54} fill pts="0,44 30,36 60,40 95,22 130,30 160,10 190,16" /></span><div style={{ position: "relative" }}><div style={mono10}>Signups</div><div style={{ ...serifV, fontSize: 24 }}>412</div></div></div></Zone>);
    case "blk:gauge":
      return v === 1 ? (<Zone><svg width="110" height="64" viewBox="0 0 110 64"><path d="M10 58 A45 45 0 0 1 100 58" fill="none" stroke="var(--secondary)" strokeWidth="9" strokeLinecap="round" /><path d="M10 58 A45 45 0 0 1 78 21" fill="none" stroke="var(--accent)" strokeWidth="9" strokeLinecap="round" /><text x="55" y="56" textAnchor="middle" style={{ font: "600 13px var(--font-sans)", fill: "var(--foreground)" }}>68</text></svg></Zone>)
        : v === 2 ? (<Zone><Ring pct={68} size={64} /></Zone>)
        : (<Zone><div style={{ width: 200 }}><div style={{ display: "flex", height: 8, borderRadius: 9999, overflow: "hidden" }}><span style={{ flex: 4, background: "var(--foreground)" }} /><span style={{ flex: 3, background: "var(--accent-3)" }} /><span style={{ flex: 3, background: "var(--accent)" }} /></div><div style={{ position: "relative", height: 12 }}><span style={{ position: "absolute", left: "68%", top: -12, width: 2, height: 14, background: "var(--foreground)" }} /></div><div className="d-row" style={{ justifyContent: "space-between", ...mono10, fontSize: 8.5 }}><span>SAIN</span><span>TENDU</span><span>CRITIQUE</span></div></div></Zone>);
    case "blk:progress-ring":
      return v === 1 ? (<Zone><Ring pct={62} /></Zone>)
        : v === 2 ? (<Zone><svg width="70" height="70" viewBox="0 0 42 42"><circle cx="21" cy="21" r="17.5" fill="none" stroke="var(--secondary)" strokeWidth="3" /><circle cx="21" cy="21" r="17.5" fill="none" stroke="var(--accent)" strokeWidth="3" strokeDasharray="70 30" strokeDashoffset="25" strokeLinecap="round" /><circle cx="21" cy="21" r="12.5" fill="none" stroke="var(--secondary)" strokeWidth="3" /><circle cx="21" cy="21" r="12.5" fill="none" stroke="var(--accent-3)" strokeWidth="3" strokeDasharray="45 55" strokeDashoffset="25" strokeLinecap="round" /></svg></Zone>)
        : (<Zone>{[["Docs", 80], ["Tests", 45], ["A11y", 62]].map(([l, p]) => <div key={l as string} style={{ textAlign: "center" }}><Ring pct={p as number} size={46} color="var(--accent-2)" /><div style={{ ...mono10, fontSize: 8.5, marginTop: 3 }}>{l as string}</div></div>)}</Zone>);
    case "blk:objective-bar":
      return v === 1 ? (<Zone><div style={{ width: 220 }}><div className="usage-head"><span className="usage-label">Pipeline</span><span className="usage-val">62%</span></div><div className="usage-track"><div className="usage-fill" style={{ width: "62%" }} /></div><div className="usage-sub">46k€ ouvert · objectif 75k€</div></div></Zone>)
        : v === 2 ? (<Zone><div style={{ width: 220, position: "relative" }}><div className="usage-track" style={{ height: 8 }}><div className="usage-fill" style={{ width: "84%", background: "var(--foreground)" }} /></div><span style={{ position: "absolute", left: "75%", top: -3, width: 2, height: 14, background: "var(--foreground)" }} /><div className="d-row" style={{ justifyContent: "space-between", marginTop: 5, fontSize: 10.5, ...muted }}><span>63k realized</span><b style={{ color: "var(--foreground)" }}>target beaten ✓</b></div></div></Zone>)
        : (<Zone><div style={{ width: 230 }}><div style={{ display: "flex", gap: 3 }}>{[1, 1, 1, 1, 0, 0].map((on, i) => <span key={i} style={{ flex: 1, height: 8, borderRadius: 3, background: on ? "var(--accent)" : "var(--secondary)", border: "1px solid var(--border)" }} />)}</div><div style={{ fontSize: 10.5, ...muted, marginTop: 5 }}>4 / 6 milestones · next: client demo</div></div></Zone>);
    case "blk:comparison-ab":
      return v === 1 ? (<Zone><div className="d-row" style={{ gap: 22 }}><div style={{ textAlign: "center" }}><div style={mono10}>Q2</div><div style={{ ...serifV, fontSize: 26 }}>38k€</div></div><span style={{ ...muted, fontSize: 16 }}>→</span><div style={{ textAlign: "center" }}><div style={mono10}>Q3</div><div style={{ ...serifV, fontSize: 26, color: "var(--foreground)" }}>46k€</div></div></div></Zone>)
        : v === 2 ? (<Zone><div style={{ width: 220 }}><div style={{ display: "flex", height: 14, borderRadius: 7, overflow: "hidden" }}><span style={{ width: "58%", background: "var(--accent)" }} /><span style={{ width: "42%", background: "var(--accent-2)" }} /></div><div className="d-row" style={{ justifyContent: "space-between", marginTop: 5, fontSize: 10.5 }}><span style={{ color: "var(--accent)", fontWeight: 600 }}>Direct 58%</span><span style={{ color: "var(--accent-2)", fontWeight: 600 }}>Partner 42%</span></div></div></Zone>)
        : (<Zone><div style={{ width: 220 }}>{[["Us", 72, "var(--accent)"], ["Market", 48, "var(--ink-4)"]].map(([l, p, c]) => <div key={l as string} className="d-row" style={{ marginBottom: 5 }}><span style={{ ...mono10, width: 52 }}>{l as string}</span><HBar w={(p as number) + "%"} c={c as string} h={10} /><b style={{ fontSize: 11, fontVariantNumeric: "tabular-nums" }}>{p as number}</b></div>)}</div></Zone>);
    case "blk:scorecard":
      return v === 1 ? (<Zone><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: 240 }}>{[["MRR", "8,2k€"], ["Churn", "1,2%"], ["NPS", "62"], ["CAC", "340€"]].map(([l, va]) => <div key={l} className="d-card" style={{ padding: "9px 12px" }}><div style={{ ...mono10, fontSize: 8.5 }}>{l}</div><div style={{ ...serifV, fontSize: 19 }}>{va}</div></div>)}</div></Zone>)
        : v === 2 ? (<Zone col>{[["Response < 2h", "94%", 1], ["First-contact resolution", "71%", 1], ["Escalations", "9%", 0]].map(([l, va, ok]) => <div key={l as string} className="d-row" style={{ justifyContent: "space-between", padding: "6px 2px", borderBottom: "1px solid var(--rule-1)", fontSize: 12.5 }}><span style={muted}>{l as string}</span><b style={{ fontVariantNumeric: "tabular-nums", color: ok ? "var(--foreground)" : "var(--accent)" }}>{va as string}</b></div>)}</Zone>)
        : (<Zone col><table className="d-table"><tbody>{[["Uptime", "99,98%", "ok"], ["p95 latency", "212 ms", "warn"], ["Error rate", "0,4%", "ok"]].map(([l, va, s]) => <tr key={l}><td><span className={"dot " + s} style={{ display: "inline-block", width: 7, height: 7, borderRadius: 9999, marginRight: 8, background: s === "ok" ? "var(--foreground)" : "var(--accent-3)" }} />{l}</td><td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{va}</td></tr>)}</tbody></table></Zone>);
    /* ═══ CHARTS ═══ */
    case "blk:line":
      return v === 1 ? (<Zone><Spark w={240} h={80} pts="0,60 40,48 80,54 120,26 160,36 200,14 240,22" /></Zone>)
        : v === 2 ? (<Zone><svg width="240" height="80"><polyline points="0,60 60,42 120,48 180,20 240,26" fill="none" stroke="var(--accent)" strokeWidth="2" /><polyline points="0,68 60,60 120,52 180,44 240,40" fill="none" stroke="var(--accent-2)" strokeWidth="2" strokeDasharray="4 3" /></svg></Zone>)
        : (<Zone><svg width="240" height="80"><path d="M0 60 H40 V44 H80 V52 H120 V24 H160 V34 H200 V12 H240" fill="none" stroke="var(--accent)" strokeWidth="2" /></svg></Zone>);
    case "blk:area":
      return v === 1 ? (<Zone><Spark w={240} h={80} fill pts="0,60 40,48 80,54 120,26 160,36 200,14 240,22" /></Zone>)
        : v === 2 ? (<Zone><svg width="240" height="80"><polygon points="0,66 60,54 120,58 180,40 240,44 240,80 0,80" fill="var(--accent-2)" opacity="0.25" /><polygon points="0,52 60,38 120,44 180,20 240,26 240,44 180,40 120,58 60,54 0,66" fill="var(--accent)" opacity="0.3" /></svg></Zone>)
        : (<Zone><svg width="240" height="80"><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent)" stopOpacity="0.5" /><stop offset="100%" stopColor="var(--accent)" stopOpacity="0" /></linearGradient></defs><polygon points="0,60 60,44 120,50 180,18 240,26 240,80 0,80" fill="url(#ag)" /><polyline points="0,60 60,44 120,50 180,18 240,26" fill="none" stroke="var(--accent)" strokeWidth="2" /><circle cx="240" cy="26" r="3.5" fill="var(--accent)" /></svg></Zone>);
    case "blk:bars":
      return v === 1 ? (<Zone><div className="d-chart">{[38, 62, 45, 80, 55, 70].map((h, i) => <div key={i} className="bar" style={{ height: h + "%" }} />)}</div></Zone>)
        : v === 2 ? (<Zone><div style={{ width: 220 }}>{[["Organic", 84], ["Outbound", 61], ["Referral", 42]].map(([l, p]) => <div key={l as string} className="d-row" style={{ marginBottom: 6 }}><span style={{ ...mono10, width: 62, fontSize: 9 }}>{l as string}</span><HBar w={(p as number) + "%"} /></div>)}</div></Zone>)
        : (<Zone><div className="d-chart">{[[60, 40], [80, 55], [45, 70]].map(([a, b], i) => <div key={i} style={{ display: "flex", gap: 2, alignItems: "flex-end", height: "100%" }}><div className="bar" style={{ height: a + "%", width: 14 }} /><div className="bar b3" style={{ height: b + "%", width: 14 }} /></div>)}</div></Zone>);
    case "blk:stacked-bars":
      return v === 1 ? (<Zone><div className="d-chart">{[[40, 25, 15], [55, 20, 10], [35, 30, 20]].map((seg, i) => <div key={i} style={{ display: "flex", flexDirection: "column-reverse", height: "100%", width: 24, gap: 1 }}>{seg.map((h, j) => <span key={j} style={{ height: h + "%", borderRadius: 2, background: ["var(--accent)", "var(--accent-3)", "var(--accent-2)"][j] }} />)}</div>)}</div></Zone>)
        : v === 2 ? (<Zone><div style={{ width: 220 }}>{[["Q2", [50, 30, 20]], ["Q3", [45, 20, 35]]].map(([l, seg]) => <div key={l as string} className="d-row" style={{ marginBottom: 6 }}><span style={{ ...mono10, width: 26 }}>{l as string}</span><div style={{ display: "flex", flex: 1, height: 12, borderRadius: 6, overflow: "hidden", gap: 1 }}>{(seg as number[]).map((p, j) => <span key={j} style={{ width: p + "%", background: ["var(--accent)", "var(--accent-3)", "var(--accent-2)"][j] }} />)}</div></div>)}</div></Zone>)
        : (<Zone><div style={{ width: 220 }}>{[["FR", [70, 30]], ["DE", [45, 55]], ["UK", [55, 45]]].map(([l, seg]) => <div key={l as string} className="d-row" style={{ marginBottom: 5 }}><span style={{ ...mono10, width: 24 }}>{l as string}</span><div style={{ display: "flex", flex: 1, height: 10, borderRadius: 5, overflow: "hidden" }}>{(seg as number[]).map((p, j) => <span key={j} style={{ width: p + "%", background: j ? "var(--ink-4)" : "var(--accent)" }} />)}</div></div>)}<div style={{ ...mono10, fontSize: 8.5, marginTop: 4 }}>100% — part won / lost</div></div></Zone>);
    case "blk:donut":
      return v === 1 ? (<Zone><Ring pct={44} size={72} color="var(--accent)" label="44%" /><div className="d-col" style={{ width: "auto", gap: 4 }}>{[["Organic", "var(--accent)"], ["Outbound", "var(--accent-3)"], ["Referral", "var(--secondary)"]].map(([l, c]) => <div key={l} className="d-row" style={{ fontSize: 11 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />{l}</div>)}</div></Zone>)
        : v === 2 ? (<Zone><svg width="80" height="80" viewBox="0 0 42 42"><circle cx="21" cy="21" r="21" fill="var(--accent-3)" /><path d="M21 21 L21 0 A21 21 0 0 1 42 21 Z" fill="var(--accent)" /><path d="M21 21 L42 21 A21 21 0 0 1 30 39 Z" fill="var(--accent-2)" /></svg></Zone>)
        : (<Zone><svg width="110" height="62" viewBox="0 0 110 62"><path d="M8 58 A48 48 0 0 1 102 58" fill="none" stroke="var(--secondary)" strokeWidth="12" /><path d="M8 58 A48 48 0 0 1 74 15" fill="none" stroke="var(--accent)" strokeWidth="12" /><text x="55" y="54" textAnchor="middle" style={{ font: "600 12px var(--font-sans)", fill: "var(--foreground)" }}>64%</text></svg></Zone>);
    case "blk:scatter":
      return v === 1 ? (<Zone><svg width="220" height="90">{[[20, 70], [45, 55], [70, 62], [95, 38], [120, 46], [150, 22], [180, 30], [205, 14]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill="var(--accent)" opacity="0.8" />)}</svg></Zone>)
        : v === 2 ? (<Zone><svg width="220" height="90">{[[30, 66, 4], [60, 50, 7], [95, 58, 5], [130, 30, 10], [170, 40, 6], [200, 18, 8]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} fill="var(--accent-2)" opacity="0.5" />)}</svg></Zone>)
        : (<Zone><svg width="220" height="90"><line x1="10" y1="72" x2="210" y2="18" stroke="var(--ink-4)" strokeDasharray="4 3" />{[[20, 70], [55, 52], [90, 58], [125, 34], [160, 40], [195, 20]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.5" fill="var(--accent)" />)}</svg></Zone>);
    case "blk:heatmap": {
      const cell = (lvl: number, i: number) => <span key={i} style={{ width: 8, height: 8, borderRadius: 2, background: lvl ? `color-mix(in oklab, var(--accent) ${lvl * 24}%, var(--secondary))` : "var(--secondary)" }} />;
      return v === 1 ? (<Zone><div style={{ display: "grid", gridTemplateRows: "repeat(7, 8px)", gridAutoFlow: "column", gap: 2 }}>{Array.from({ length: 26 * 7 }, (_, i) => cell((i * 7 + 3) % 11 % 5 > 2 ? (i % 4) + 1 : 0, i))}</div></Zone>)
        : v === 2 ? (<Zone col>{["Lun", "Mer", "Ven"].map((d, r) => <div key={d} className="d-row" style={{ gap: 3 }}><span style={{ ...mono10, fontSize: 8.5, width: 24 }}>{d}</span>{Array.from({ length: 24 }, (_, i) => cell((i + r * 5) % 7 > 3 ? ((i + r) % 4) + 1 : 0, i))}</div>)}</Zone>)
        : (<Zone><div style={{ display: "grid", gridTemplateColumns: "repeat(7, 20px)", gap: 3 }}>{Array.from({ length: 28 }, (_, i) => <span key={i} style={{ width: 20, height: 20, borderRadius: 4, display: "grid", placeItems: "center", fontSize: 8, fontVariantNumeric: "tabular-nums", color: (i * 5) % 9 > 4 ? "var(--accent-foreground)" : "var(--muted-foreground)", background: (i * 5) % 9 > 4 ? `color-mix(in oklab, var(--accent) ${((i % 4) + 1) * 22}%, var(--secondary))` : "var(--secondary)" }}>{i + 1}</span>)}</div></Zone>);
    }
    case "blk:funnel":
      return v === 1 ? (<Zone col>{[["Visits", 100, "1 240"], ["Leads", 62, "86"], ["Demos", 34, "29"], ["Deals", 14, "12"]].map(([l, p, n]) => <div key={l as string} style={{ textAlign: "center" }}><div style={{ width: (p as number) * 2 + 40, maxWidth: "100%", height: 18, margin: "0 auto", borderRadius: 4, background: `color-mix(in oklab, var(--accent) ${(p as number)}%, var(--secondary))`, display: "grid", placeItems: "center", fontSize: 9, fontFamily: "var(--font-mono)", color: (p as number) > 40 ? "var(--accent-foreground)" : "var(--ink-2)" }}>{l as string} · {n as string}</div></div>)}</Zone>)
        : v === 2 ? (<Zone col>{[["Visits → Leads", "6,9%"], ["Leads → Demos", "34%"], ["Demos → Deals", "41%"]].map(([l, p]) => <div key={l as string} className="d-row" style={{ justifyContent: "space-between", padding: "6px 2px", borderBottom: "1px solid var(--rule-1)", fontSize: 12 }}><span style={muted}>{l as string}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{p as string}</b></div>)}</Zone>)
        : (<Zone><div style={{ display: "flex" }}>{["1 240", "86", "12"].map((n, i) => <div key={n} style={{ padding: "8px 16px 8px 22px", clipPath: "polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%, 12px 50%)", background: ["var(--accent)", "var(--accent-3)", "var(--accent-2)"][i], color: "var(--accent-foreground)", fontSize: 11, fontVariantNumeric: "tabular-nums", marginLeft: i ? -8 : 0 }}>{n}</div>)}</div></Zone>);
    case "blk:radar": {
      const P = "60,12 100,38 88,86 32,86 20,38", Q = "60,28 84,44 76,74 42,76 34,46";
      return v === 1 ? (<Zone><svg width="120" height="100"><polygon points={P} fill="none" stroke="var(--border)" /><polygon points={Q} fill="var(--accent)" opacity="0.25" stroke="var(--accent)" strokeWidth="1.5" /></svg></Zone>)
        : v === 2 ? (<Zone><svg width="120" height="100"><polygon points={P} fill="none" stroke="var(--border)" /><polygon points={Q} fill="none" stroke="var(--accent)" strokeWidth="1.5" /><polygon points="60,20 92,42 80,80 36,80 28,44" fill="none" stroke="var(--accent-2)" strokeWidth="1.5" strokeDasharray="4 3" /></svg></Zone>)
        : (<Zone><svg width="120" height="100"><polygon points={P} fill="none" stroke="var(--border)" />{Q.split(" ").map((pt, i) => { const [x, y] = pt.split(",").map(Number); return <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" />; })}</svg></Zone>);
    }
    case "blk:treemap":
      return v === 1 ? (<Zone><div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gridTemplateRows: "40px 40px", gap: 3, width: 220 }}><span style={{ gridRow: "1/3", borderRadius: 6, background: "var(--accent)", opacity: 0.85 }} /><span style={{ borderRadius: 6, background: "var(--accent-3)", opacity: 0.85 }} /><span style={{ borderRadius: 6, background: "var(--accent-2)", opacity: 0.7 }} /><span style={{ gridColumn: "2/4", borderRadius: 6, background: "var(--ink-4)", opacity: 0.6 }} /></div></Zone>)
        : v === 2 ? (<Zone><div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 3, width: 220, height: 86 }}><span style={{ borderRadius: 6, background: "var(--accent)", opacity: 0.85 }} /><div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: 3 }}><span style={{ borderRadius: 6, background: "var(--accent-3)", opacity: 0.85 }} /><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}><span style={{ borderRadius: 6, background: "var(--accent-2)", opacity: 0.7 }} /><span style={{ borderRadius: 6, background: "var(--ink-4)", opacity: 0.55 }} /></div></div></div></Zone>)
        : (<Zone><div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr", gap: 3, width: 230, height: 86 }}><span style={{ borderRadius: 6, background: "var(--accent)", opacity: 0.85, display: "grid", placeItems: "center", color: "var(--accent-foreground)", fontSize: 10, fontFamily: "var(--font-mono)" }}>Enterprise · 52%</span><div style={{ display: "grid", gap: 3 }}><span style={{ borderRadius: 6, background: "var(--accent-3)", opacity: 0.85, display: "grid", placeItems: "center", color: "var(--accent-foreground)", fontSize: 9, fontFamily: "var(--font-mono)" }}>Pro · 31%</span><span style={{ borderRadius: 6, background: "var(--ink-4)", opacity: 0.6, display: "grid", placeItems: "center", color: "var(--accent-foreground)", fontSize: 9, fontFamily: "var(--font-mono)" }}>Starter</span></div></div></Zone>);
    case "blk:sankey":
      return v === 1 ? (<Zone><svg width="230" height="90"><path d="M10 15 C 110 15, 120 25, 220 25 L220 45 C 120 45, 110 35, 10 35 Z" fill="var(--accent)" opacity="0.45" /><path d="M10 45 C 110 45, 120 55, 220 55 L220 70 C 120 70, 110 60, 10 60 Z" fill="var(--accent-2)" opacity="0.45" /><rect x="4" y="12" width="6" height="52" rx="2" fill="var(--foreground)" /><rect x="220" y="22" width="6" height="52" rx="2" fill="var(--foreground)" /></svg></Zone>)
        : v === 2 ? (<Zone><svg width="240" height="90"><rect x="4" y="14" width="5" height="56" rx="2" fill="var(--foreground)" /><rect x="118" y="10" width="5" height="34" rx="2" fill="var(--foreground)" /><rect x="118" y="52" width="5" height="26" rx="2" fill="var(--foreground)" /><rect x="232" y="18" width="5" height="44" rx="2" fill="var(--foreground)" /><path d="M9 18 C 60 18, 70 14, 118 14 L118 40 C 70 40, 60 44, 9 44 Z" fill="var(--accent)" opacity="0.4" /><path d="M9 48 C 60 48, 70 56, 118 56 L118 74 C 70 74, 60 66, 9 66 Z" fill="var(--accent-3)" opacity="0.4" /><path d="M123 16 C 170 16, 180 22, 232 22 L232 56 C 180 56, 170 38, 123 38 Z" fill="var(--accent-2)" opacity="0.35" /></svg></Zone>)
        : (<Zone col>{[["Visites → Signup", 62, "var(--accent)"], ["Signup → Payant", 24, "var(--accent-3)"], ["Payant → Churn", 4, "var(--ink-4)"]].map(([l, p, c]) => <div key={l as string} className="d-row"><span style={{ ...mono10, width: 110, fontSize: 8.5 }}>{l as string}</span><HBar w={(p as number) * 2 + "px"} c={c as string} h={10} /><span style={{ fontSize: 10.5, fontVariantNumeric: "tabular-nums", ...muted }}>{p as number}%</span></div>)}</Zone>);
    case "blk:geo-map":
      return v === 1 ? (<Zone><div style={{ position: "relative", width: 220, height: 90, borderRadius: 10, background: "radial-gradient(color-mix(in oklab, var(--foreground) 14%, transparent) 1px, transparent 1px)", backgroundSize: "8px 8px", border: "1px solid var(--border)" }}>{[[40, 30], [90, 55], [160, 25], [190, 60]].map(([x, y], i) => <span key={i} style={{ position: "absolute", left: x, top: y, width: 9, height: 9, borderRadius: "50%", background: "var(--accent)", border: "2px solid var(--card)", boxShadow: "var(--shadow-xs)" }} />)}</div></Zone>)
        : v === 2 ? (<Zone><div style={{ display: "grid", gridTemplateColumns: "repeat(6, 26px)", gap: 3 }}>{[3, 1, 4, 2, 0, 1, 2, 4, 3, 1, 2, 0].map((lvl, i) => <span key={i} style={{ height: 26, borderRadius: 4, background: lvl ? `color-mix(in oklab, var(--accent-2) ${lvl * 22}%, var(--secondary))` : "var(--secondary)", display: "grid", placeItems: "center", fontSize: 8, fontFamily: "var(--font-mono)", color: lvl > 2 ? "var(--accent-foreground)" : "var(--muted-foreground)" }}>{["FR", "BE", "DE", "ES", "IT", "UK", "NL", "PT", "CH", "AT", "SE", "DK"][i]}</span>)}</div></Zone>)
        : (<Zone><div style={{ position: "relative", width: 200, height: 86, borderRadius: 10, border: "1px solid var(--border)", background: "var(--secondary)" }}>{[[36, 24, "12"], [110, 50, "34"], [160, 20, "8"]].map(([x, y, n], i) => <span key={i} style={{ position: "absolute", left: x as number, top: y as number, minWidth: 20, height: 20, borderRadius: 9999, padding: "0 5px", background: "var(--foreground)", color: "var(--background)", display: "grid", placeItems: "center", fontSize: 10, fontVariantNumeric: "tabular-nums" }}>{n as string}</span>)}</div></Zone>);
    case "blk:sparklines":
      return v === 1 ? (<Zone col>{[["MRR", "8,2k€"], ["Churn", "1,2%"]].map(([l, n]) => <div key={l} className="d-row" style={{ justifyContent: "space-between", fontSize: 12.5 }}><span style={muted}>{l}</span><span className="d-row" style={{ gap: 8 }}><Spark w={64} h={16} /><b style={{ fontVariantNumeric: "tabular-nums" }}>{n}</b></span></div>)}</Zone>)
        : v === 2 ? (<Zone col><table className="d-table"><tbody>{[["Refonte", "0,18 15,10 30,14 45,4"], ["Migration", "0,14 15,16 30,8 45,12"]].map(([l, pts]) => <tr key={l}><td>{l}</td><td><Spark w={50} h={18} pts={pts + " 60,6"} /></td><td style={{ textAlign: "right" }}><Delta v="+8%" /></td></tr>)}</tbody></table></Zone>)
        : (<Zone>{[1, 2, 3].map((i) => <div key={i} className="d-card" style={{ padding: "8px 10px", width: 96 }}><div style={{ ...mono10, fontSize: 8 }}>W{i}</div><Spark w={72} h={20} fill /></div>)}</Zone>);
    /* ═══ DATA ═══ */
    case "blk:pivot":
      return v === 1 ? (<Zone col><table className="d-table" style={{ fontSize: 11 }}><thead><tr><th /><th>Q2</th><th>Q3</th><th style={{ color: "var(--foreground)" }}>Σ</th></tr></thead><tbody>{[["FR", "12", "18", "30"], ["DE", "8", "11", "19"], ["Σ", "20", "29", "49"]].map((r, i) => <tr key={r[0]} style={i === 2 ? { fontWeight: 600, color: "var(--foreground)" } : undefined}>{r.map((c, j) => <td key={j} style={{ textAlign: j ? "right" : "left", fontVariantNumeric: "tabular-nums" }}>{c}</td>)}</tr>)}</tbody></table></Zone>)
        : v === 2 ? (<Zone col>{[["▸ Europe", "49", true], ["▾ America", "31", false], ["· US", "24", false], ["· CA", "7", false]].map(([l, n, top], i) => <div key={i} className="d-row" style={{ justifyContent: "space-between", padding: "5px 2px", paddingLeft: (l as string).startsWith("·") ? 22 : 2, fontSize: 12, borderBottom: "1px solid var(--rule-1)", fontWeight: top ? 600 : 400 }}><span>{l as string}</span><b style={{ fontVariantNumeric: "tabular-nums" }}>{n as string}</b></div>)}</Zone>)
        : (<Zone col><table className="d-table" style={{ fontSize: 11 }}><thead><tr><th /><th>Won</th><th>Lost</th></tr></thead><tbody>{[["Q2", 60, 20], ["Q3", 85, 10]].map(([q, w, l]) => <tr key={q}><td>{q}</td>{[w, l].map((p, j) => <td key={j} style={{ textAlign: "center", background: `color-mix(in oklab, ${j ? "var(--accent)" : "var(--foreground)"} ${(p as number) * 0.5}%, transparent)`, fontVariantNumeric: "tabular-nums" }}>{p}</td>)}</tr>)}</tbody></table></Zone>);
    case "blk:tree-table":
      return v === 1 ? (<Zone col>{[["▾ Acme SARL", 0, "30k€"], ["▾ Jo Lambert", 1, "26k€"], ["Refonte", 2, "18k€"], ["Maintenance", 2, "8k€"], ["▸ Max Verne", 1, "6,5k€"]].map(([l, d, n], i) => <div key={i} className="d-row" style={{ justifyContent: "space-between", paddingLeft: (d as number) * 18 + 2, padding: "4px 2px", fontSize: 12, borderBottom: "1px solid var(--rule-1)" }}><span style={{ paddingLeft: (d as number) * 18 }}>{l as string}</span><b style={{ fontVariantNumeric: "tabular-nums", ...muted }}>{n as string}</b></div>)}</Zone>)
        : v === 2 ? (<Zone col><table className="d-table" style={{ fontSize: 11.5 }}><thead><tr><th>Node</th><th style={{ textAlign: "right" }}>Deals</th><th style={{ textAlign: "right" }}>€</th></tr></thead><tbody>{[["▾ Europe", "5", "49k"], ["· France", "3", "30k"], ["· Allemagne", "2", "19k"]].map((r) => <tr key={r[0]}><td style={{ paddingLeft: r[0].startsWith("·") ? 24 : 10 }}>{r[0]}</td><td style={{ textAlign: "right" }}>{r[1]}</td><td style={{ textAlign: "right" }}>{r[2]}</td></tr>)}</tbody></table></Zone>)
        : (<Zone col>{[["▾ Design", 0, 1], ["Maquettes", 1, 1], ["Tokens", 1, 0]].map(([l, d, on], i) => <div key={i} className="d-row" style={{ paddingLeft: (d as number) * 20, padding: "4px 2px", fontSize: 12.5 }}><span className={"d-check" + (on ? "" : " off")} style={{ marginLeft: (d as number) * 20 }}>{on ? "✓" : ""}</span>{l as string}</div>)}</Zone>);
    case "blk:virtual-list":
      return v === 1 ? (<Zone col><div className="d-row" style={{ justifyContent: "space-between" }}><span style={mono10}>1 240 rows · 12 rendered</span><span className="tag">virtual</span></div><div style={{ position: "relative" }}>{["Acme SARL", "Globex", "Initech"].map((l) => <div key={l} style={{ padding: "6px 2px", borderBottom: "1px solid var(--rule-1)", fontSize: 12.5 }}>{l}</div>)}<span style={{ position: "absolute", right: 0, top: 4, width: 4, height: 22, borderRadius: 9999, background: "var(--border)" }} /></div></Zone>)
        : v === 2 ? (<Zone col><div style={{ position: "sticky", top: 0, ...mono10, background: "var(--secondary)", padding: "4px 8px", borderRadius: 5 }}>A</div>{["Acme SARL", "Atlas Corp"].map((l) => <div key={l} style={{ padding: "5px 8px", fontSize: 12.5 }}>{l}</div>)}<div style={{ ...mono10, background: "var(--secondary)", padding: "4px 8px", borderRadius: 5 }}>B</div><div style={{ padding: "5px 8px", fontSize: 12.5 }}>Boréa SAS</div></Zone>)
        : (<Zone col>{["Globex", "Initech"].map((l) => <div key={l} style={{ padding: "6px 2px", borderBottom: "1px solid var(--rule-1)", fontSize: 12.5 }}>{l}</div>)}<div className="d-row" style={{ justifyContent: "center", gap: 8, padding: 6 }}><span className="d-spin" style={{ width: 12, height: 12 }} /><span style={{ fontSize: 11, ...muted }}>loading 40 more…</span></div></Zone>);
    case "blk:timeline":
      return v === 1 ? (<Zone col><div style={{ position: "relative", paddingLeft: 18 }}><span style={{ position: "absolute", left: 5, top: 4, bottom: 4, width: 1, background: "var(--border)" }} />{[["Quote sent", "14:02", "var(--accent-2)"], ["Scoping call", "11:30", "var(--foreground)"], ["Deal created", "yesterday", "var(--ink-4)"]].map(([l, t, c]) => <div key={l as string} style={{ position: "relative", marginBottom: 8 }}><span style={{ position: "absolute", left: -17, top: 4, width: 7, height: 7, borderRadius: "50%", background: c as string, border: "2px solid var(--card)" }} /><div style={{ fontSize: 12.5, color: "var(--foreground)", fontWeight: 500 }}>{l as string}</div><div style={{ fontSize: 10.5, ...muted }}>{t as string}</div></div>)}</div></Zone>)
        : v === 2 ? (<Zone col><div style={{ ...mono10, marginBottom: 2 }}>Today</div><div className="d-row" style={{ fontSize: 12.5 }}><span className="d-avatar" style={{ width: 20, height: 20, fontSize: 8 }}>JL</span>Jo pinned “Refonte”</div><div style={{ ...mono10, margin: "8px 0 2px" }}>Yesterday</div><div className="d-row" style={{ fontSize: 12.5 }}><span className="d-avatar" style={{ width: 20, height: 20, fontSize: 8 }}>MV</span>Max closed 2 tasks</div></Zone>)
        : (<Zone><div style={{ display: "flex", width: "100%", maxWidth: 360, margin: "0 auto" }}>{[["Created", 1], ["Qualified", 1], ["Proposed", 1], ["Signed", 0]].map(([l, on], i, arr) => <div key={l as string} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", width: "100%" }}><span style={{ flex: 1, height: 2, background: i === 0 ? "transparent" : on ? "var(--accent)" : "var(--border)" }} /><span style={{ width: 12, height: 12, flex: "none", borderRadius: "50%", background: on ? "var(--accent)" : "var(--secondary)", border: "2px solid " + (on ? "var(--accent)" : "var(--border)") }} /><span style={{ flex: 1, height: 2, background: i === arr.length - 1 ? "transparent" : (arr[i + 1][1] ? "var(--accent)" : "var(--border)") }} /></div><div style={{ ...mono10, fontSize: 8, whiteSpace: "nowrap" }}>{l as string}</div></div>)}</div></Zone>);
    case "blk:kanban":
      return v === 1 ? (<Zone>{[["To do", 2, "var(--ink-4)"], ["In progress", 1, "var(--accent-3)"], ["Done", 1, "var(--foreground)"]].map(([t, n, c]) => <div key={t as string} style={{ width: 92, background: "var(--secondary)", borderRadius: 9, padding: 6 }}><div className="d-row" style={{ justifyContent: "space-between", marginBottom: 5 }}><span style={{ ...mono10, fontSize: 8 }}>{t as string}</span><span style={{ width: 6, height: 6, borderRadius: 9999, background: c as string }} /></div>{Array.from({ length: n as number }, (_, i) => <div key={i} style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 7px", fontSize: 9.5, marginBottom: 4, boxShadow: "var(--shadow-2xs)" }}>Card {i + 1}</div>)}</div>)}</Zone>)
        : v === 2 ? (<Zone col>{["Refonte", "Migration"].map((lane) => <div key={lane}><div style={{ ...mono10, fontSize: 8.5, marginBottom: 3 }}>{lane}</div><div className="d-row" style={{ gap: 4 }}>{[1, 2, 3].map((i) => <span key={i} style={{ flex: 1, height: 18, borderRadius: 5, background: i === 2 ? "var(--accent-soft)" : "var(--secondary)", border: "1px solid var(--border)" }} />)}</div></div>)}</Zone>)
        : (<Zone>{[["Doing", "2/3", false], ["Review", "3/3", true]].map(([t, wip, full]) => <div key={t as string} style={{ width: 100, background: "var(--secondary)", borderRadius: 9, padding: 6 }}><div className="d-row" style={{ justifyContent: "space-between" }}><span style={{ ...mono10, fontSize: 8 }}>{t as string}</span><span className="tag" style={full ? { background: "var(--accent-soft)", color: "var(--accent)" } : undefined}>{wip as string}</span></div><div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6, padding: "6px 7px", fontSize: 9.5, marginTop: 5 }}>WIP limit</div></div>)}</Zone>);
    case "blk:gantt":
      return v === 1 ? (<Zone col>{[["Design", 4, 30, "var(--accent)"], ["Dev", 26, 46, "var(--accent-2)"], ["QA", 62, 24, "var(--accent-3)"]].map(([l, x, w, c]) => <div key={l as string} className="d-row"><span style={{ ...mono10, width: 44, fontSize: 8.5 }}>{l as string}</span><div style={{ flex: 1, position: "relative", height: 12 }}><span style={{ position: "absolute", left: (x as number) + "%", width: (w as number) + "%", top: 0, bottom: 0, borderRadius: 6, background: c as string, opacity: 0.85 }} /></div></div>)}</Zone>)
        : v === 2 ? (<Zone><svg width="230" height="70"><rect x="10" y="8" width="70" height="12" rx="6" fill="var(--accent)" /><rect x="60" y="30" width="90" height="12" rx="6" fill="var(--accent-2)" /><rect x="130" y="52" width="60" height="12" rx="6" fill="var(--accent-3)" /><path d="M80 14 C 100 14, 50 36, 62 36" fill="none" stroke="var(--ink-4)" strokeDasharray="3 2" /><path d="M150 36 C 170 36, 120 58, 132 58" fill="none" stroke="var(--ink-4)" strokeDasharray="3 2" /></svg></Zone>)
        : (<Zone col><div style={{ position: "relative", height: 30 }}><span style={{ position: "absolute", left: 0, right: 0, top: 14, height: 2, background: "var(--border)" }} />{[["Kickoff", 8], ["Beta", 46], ["GA", 84]].map(([l, x]) => <span key={l as string} style={{ position: "absolute", left: (x as number) + "%", top: 8 }}><span style={{ display: "block", width: 12, height: 12, background: "var(--accent)", transform: "rotate(45deg)", borderRadius: 2 }} /><span style={{ ...mono10, fontSize: 8, position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)" }}>{l as string}</span></span>)}</div></Zone>);
    case "blk:log-viewer":
      return v === 1 ? (<Zone col><div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, lineHeight: 1.8, color: "var(--ink-2)" }}><div><span style={{ color: "var(--foreground)" }}>INFO</span> panel opened acc:acme</div><div><span style={{ color: "var(--accent-2)" }}>WARN</span> slow query 1.2s stacks.byUser</div><div><span style={{ color: "var(--accent)" }}>ERR </span> resume failed: ref p7 missing</div></div></Zone>)
        : v === 2 ? (<Zone col><div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, lineHeight: 1.8, color: "var(--ink-2)" }}><div style={{ cursor: "pointer" }}>▸ 14:02:11 openSpace(crm) · 3 events</div><div>▾ 14:02:36 openDetail(acc:acme)</div><div style={{ paddingLeft: 16, ...muted }}>parent p1 · preview · 42ms</div></div></Zone>)
        : (<Zone col><div className="d-row" style={{ justifyContent: "space-between" }}><span className="tag success" style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><span className="d-spin" style={{ width: 8, height: 8, borderTopColor: "var(--foreground)" }} />LIVE</span><span style={mono10}>tail −f</span></div><div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, lineHeight: 1.8, color: "var(--ink-2)" }}><div>14:03:02 GET /stacks 200 12ms</div><div>14:03:04 POST /pin 200 8ms</div></div></Zone>);
    case "blk:diff-viewer":
      return v === 1 ? (<Zone col><div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, lineHeight: 1.7 }}><div style={{ background: "var(--accent-soft)", color: "var(--accent)", padding: "1px 8px", borderRadius: 3 }}>− retention: "preview"</div><div style={{ background: "var(--secondary)", color: "var(--foreground)", padding: "1px 8px", borderRadius: 3 }}>+ retention: "retained"</div><div style={{ padding: "1px 8px", ...muted }}>&nbsp; placement: "context"</div></div></Zone>)
        : v === 2 ? (<Zone><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, width: "100%", fontFamily: "var(--font-mono)", fontSize: 9.5 }}><div style={{ background: "var(--accent-soft)", borderRadius: 5, padding: 6, color: "var(--ink-2)" }}>pinned: false</div><div style={{ background: "var(--secondary)", borderRadius: 5, padding: 6, color: "var(--ink-2)" }}>retention: "retained"</div></div></Zone>)
        : (<Zone><span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>The panel <s style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>disappears</s> <b style={{ background: "var(--secondary)", color: "var(--foreground)" }}>detaches as a reference</b> on branch change.</span></Zone>);
    case "blk:code-block":
      return v === 1 ? (<Zone col><pre className="codeblock" style={{ margin: 0 }}>{"openDetail(parentId, {\n  panelType: 'contact',\n  resourceKey: 'con:jo',\n})"}</pre></Zone>)
        : v === 2 ? (<Zone col><div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, lineHeight: 1.8, background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: 10, padding: "10px 0", color: "var(--ink-2)" }}>{["const path = getContextPath(state)", "const url  = encodeLocation(state)", "history.replaceState(null, '', '#'+url)"].map((l, i) => <div key={i} style={{ display: "flex", background: i === 1 ? "var(--accent-soft)" : "transparent" }}><span style={{ width: 30, textAlign: "right", paddingRight: 10, ...muted, userSelect: "none" }}>{i + 1}</span>{l}</div>)}</div></Zone>)
        : (<Zone col><div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}><div className="d-row" style={{ justifyContent: "space-between", padding: "6px 12px", background: "var(--secondary)", borderBottom: "1px solid var(--border)" }}><span style={mono10}>panels-core.ts</span><button className="d-btn ghost sm">⧉ Copy</button></div><pre className="codeblock" style={{ margin: 0, border: "none", borderRadius: 0 }}>{"export function pinPanel(state, id) {\n  …retention = 'retained'\n}"}</pre></div></Zone>);
    /* ═══ CONTENU ═══ */
    case "blk:stepper":
      return v === 1 ? (<Zone><div style={{ display: "flex", alignItems: "center", width: 240 }}>{[1, 2, 3].map((n, i) => <div key={n} style={{ display: "flex", alignItems: "center", flex: i < 2 ? 1 : "none" }}><span style={{ width: 22, height: 22, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 10.5, background: n <= 2 ? "var(--primary)" : "var(--secondary)", color: n <= 2 ? "var(--primary-foreground)" : "var(--muted-foreground)", border: "1px solid var(--border)" }}>{n < 2 ? "✓" : n}</span>{i < 2 && <span style={{ flex: 1, height: 2, background: n < 2 ? "var(--primary)" : "var(--border)" }} />}</div>)}</div></Zone>)
        : v === 2 ? (<Zone col><div style={{ position: "relative", paddingLeft: 22 }}><span style={{ position: "absolute", left: 8, top: 6, bottom: 6, width: 2, background: "var(--border)" }} />{[["Account created", 1], ["Team invited", 1], ["First deal", 0]].map(([l, on]) => <div key={l as string} style={{ position: "relative", marginBottom: 8, fontSize: 12.5, color: on ? "var(--foreground)" : "var(--muted-foreground)" }}><span style={{ position: "absolute", left: -20, top: 3, width: 12, height: 12, borderRadius: "50%", background: on ? "var(--foreground)" : "var(--secondary)", border: "2px solid var(--card)", outline: "1px solid var(--border)" }} />{l as string}</div>)}</div></Zone>)
        : (<Zone col><div className="d-row" style={{ justifyContent: "space-between", marginBottom: 4 }}><b style={{ fontSize: 12.5 }}>Step 2 / 4 — Contact details</b><span style={mono10}>50%</span></div><div className="d-prog" style={{ width: "100%" }}><div className="fill" style={{ width: "50%" }} /></div><div className="d-row" style={{ justifyContent: "space-between", marginTop: 8 }}><button className="d-btn ghost sm">‹ Back</button><button className="d-btn sm">Next ›</button></div></Zone>);
    case "blk:rich-editor":
      return <TiptapDemo v={v} />;
    /* ═══ NAV ═══ */
    case "blk:filter-bar":
      return v === 1 ? (<Zone><div className="d-row" style={{ flexWrap: "wrap" }}><span className="att-chip">stage: proposal<button>×</button></span><span className="att-chip">owner: Jo<button>×</button></span><span className="att-chip">&gt; 10k€<button>×</button></span><button className="d-btn ghost sm" style={{ color: "var(--accent)" }}>Clear all</button></div></Zone>)
        : v === 2 ? (<Zone><div className="d-row"><button className="d-btn outline sm">Stage ⌄</button><button className="d-btn outline sm">Owner ⌄</button><button className="d-btn outline sm">＋ Filter</button><span style={{ fontSize: 11, ...muted, marginLeft: 6 }}>12 results</span></div></Zone>)
        : (<Zone><span style={{ fontSize: 12, ...muted }}>Filtered by <b style={{ color: "var(--foreground)" }}>3 criteria</b> · 12 / 128 deals · <b style={{ color: "var(--accent)", cursor: "pointer" }}>reset</b></span></Zone>);
    case "blk:saved-views":
      return v === 1 ? (<Zone><div className="d-tabs"><span className="d-tab on">⭐ Mes deals</span><span className="d-tab">Q3 pipeline</span><span className="d-tab">Churn risk</span><span className="d-tab" style={{ color: "var(--accent)" }}>＋</span></div></Zone>)
        : v === 2 ? (<Zone><div className="d-menu" style={{ width: 190 }}><div style={{ ...mono10, padding: "5px 9px 3px" }}>Saved views</div><div className="it" style={{ background: "var(--secondary)" }}>Mes deals ✓</div><div className="it">Q3 pipeline</div><div className="d-sep" style={{ margin: "4px 0" }} /><div className="it" style={{ color: "var(--accent)" }}>Save current view…</div></div></Zone>)
        : (<Zone col>{[["My deals", "private"], ["Q3 pipeline", "team"]].map(([l, s]) => <div key={l} className="d-row" style={{ justifyContent: "space-between", padding: "6px 2px", borderBottom: "1px solid var(--rule-1)", fontSize: 12.5 }}><span>⭐ {l}</span><span className="tag">{s.toUpperCase()}</span></div>)}</Zone>);
    /* ═══ ÉTATS ═══ */
    case "blk:presence":
      return v === 1 ? (<Zone><div style={{ display: "flex" }}>{["JL", "MV", "✶"].map((a, i) => <span key={a} style={{ position: "relative", marginLeft: i ? -7 : 0 }}><span className="d-avatar" style={{ width: 26, height: 26, fontSize: 9, border: "2px solid var(--card)", background: a === "✶" ? "var(--accent)" : undefined }}>{a}</span><span style={{ position: "absolute", bottom: 0, right: 0, width: 8, height: 8, borderRadius: "50%", background: "var(--foreground)", border: "2px solid var(--card)" }} /></span>)}</div><span style={{ fontSize: 11.5, ...muted }}>3 viewing</span></Zone>)
        : v === 2 ? (<Zone col><div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}><div className="d-row" style={{ height: 34, padding: "0 12px", borderBottom: "1px solid var(--border)", justifyContent: "space-between" }}><span style={mono10}>account · acme</span><span className="d-row" style={{ gap: 4 }}><span className="d-avatar" style={{ width: 18, height: 18, fontSize: 7 }}>JL</span><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--foreground)" }} /></span></div><div style={{ padding: 10 }}><Ph w="70%" /><div style={{ height: 5 }} /><Ph w="45%" /></div></div></Zone>)
        : (<Zone col>{[["Jo Lambert", "viewing Refonte", "var(--foreground)"], ["Agent ✶", "summarizing the thread", "var(--accent)"]].map(([n, a, c]) => <div key={n as string} className="d-row" style={{ fontSize: 12 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: c as string }} /><b>{n as string}</b><span style={muted}>{a as string}</span></div>)}</Zone>);
    case "blk:panel-states":
      return v === 1 ? (<Zone><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>{[["LOADING", <span key="s" className="d-skel" style={{ height: 22, width: "100%" }} />], ["EMPTY", <span key="e" style={{ fontSize: 11, ...muted }}>Nothing here yet — add one.</span>]].map(([t, body]) => <div key={t as string} className="d-card" style={{ padding: 10 }}><div style={{ ...mono10, fontSize: 8, marginBottom: 6 }}>{t as string}</div>{body as ReactNode}</div>)}</div></Zone>)
        : v === 2 ? (<Zone><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>{[["ERROR", "Query failed — Retry", "var(--accent)"], ["PERMISSION", "Access required — Request", "var(--accent-3)"]].map(([t, m, c]) => <div key={t as string} className="d-card" style={{ padding: 10, borderColor: `color-mix(in oklab, ${c} 40%, var(--border))` }}><div style={{ ...mono10, fontSize: 8, color: c as string, marginBottom: 4 }}>{t as string}</div><span style={{ fontSize: 11, ...muted }}>{m as string}</span></div>)}</div></Zone>)
        : (<Zone><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, width: "100%" }}>{[["STALE", "Updated 4h ago — Refresh"], ["DELETED", "This record no longer exists"]].map(([t, m]) => <div key={t} className="d-card" style={{ padding: 10, opacity: 0.8 }}><div style={{ ...mono10, fontSize: 8, marginBottom: 4 }}>{t}</div><span style={{ fontSize: 11, ...muted }}>{m}</span></div>)}</div></Zone>);
    /* ═══ IA ═══ */
    case "blk:tool-trace":
      return v === 1 ? (<Zone col>{[["✓", "read panel acc:acme", "42ms"], ["✓", "query deals.byAccount", "118ms"], ["⏳", "compose answer…", ""]].map(([s, l, t]) => <div key={l as string} className="d-row" style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--ink-2)" }}><span style={{ color: s === "✓" ? "var(--foreground)" : "var(--accent-3)", width: 14 }}>{s as string}</span><span style={{ flex: 1 }}>{l as string}</span><span style={muted}>{t as string}</span></div>)}</Zone>)
        : v === 2 ? (<Zone col><div style={{ border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", fontFamily: "var(--font-mono)", fontSize: 10 }}><div style={{ padding: "5px 10px", background: "var(--secondary)", ...mono10, fontSize: 8.5 }}>tool · stacks.resolve</div><div style={{ padding: "6px 10px", color: "var(--ink-2)" }}>in&nbsp;: {"{ stack: 4 panels }"}<br />out: {"{ acme, jo, refonte, … }"}</div></div></Zone>)
        : (<Zone><div style={{ display: "flex", alignItems: "center", gap: 0 }}>{["read", "query", "answer"].map((s, i) => <div key={s} className="d-row" style={{ gap: 0 }}><span className="tag" style={{ background: i < 2 ? "var(--secondary)" : "var(--accent-soft)", color: i < 2 ? "var(--foreground)" : "var(--accent)" }}>{s.toUpperCase()}</span>{i < 2 && <span style={{ width: 16, height: 1, background: "var(--border)" }} />}</div>)}</div></Zone>);
    case "blk:agent-presence":
      return v === 1 ? (<Zone col><div style={{ border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}><div className="d-row" style={{ height: 34, padding: "0 12px", justifyContent: "space-between", borderBottom: "1px solid var(--border)" }}><span style={mono10}>opportunity</span><span className="d-row" style={{ gap: 5 }}><span style={{ color: "var(--accent)", fontSize: 12 }}>✶</span><span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--accent)", animation: "pulse 1.4s ease infinite" }} /></span></div><div style={{ padding: 10, fontSize: 11, ...muted }}>L'agent lit ce panneau…</div></div></Zone>)
        : v === 2 ? (<Zone><div className="d-row" style={{ fontSize: 12.5, ...muted }}><span style={{ color: "var(--accent)" }}>✶</span> agent is typing<span className="d-row" style={{ gap: 3 }}>{[0, 1, 2].map((i) => <span key={i} className="d-skel" style={{ width: 5, height: 5, borderRadius: "50%", animationDelay: i * 0.2 + "s" }} />)}</span></div></Zone>)
        : (<Zone><div style={{ display: "flex" }}><span className="d-avatar" style={{ width: 26, height: 26, fontSize: 9 }}>JL</span><span className="d-avatar" style={{ width: 26, height: 26, fontSize: 11, marginLeft: -7, border: "2px solid var(--card)", background: "var(--accent)", color: "var(--accent-foreground)" }}>✶</span></div><span style={{ fontSize: 11.5, ...muted }}>Jo + the agent, same panel</span></Zone>);
    case "blk:voice-input":
      return <VoiceDemo v={v} />;
    /* ═══ NATIFS ═══ */
    case "blk:canvas":
      return v === 1 ? (<Zone><svg width="230" height="100"><line x1="50" y1="30" x2="120" y2="60" stroke="var(--border)" strokeWidth="1.5" /><line x1="120" y1="60" x2="190" y2="28" stroke="var(--border)" strokeWidth="1.5" /><rect x="20" y="16" width="60" height="26" rx="7" fill="var(--card)" stroke="var(--border)" /><rect x="92" y="48" width="60" height="26" rx="7" fill="var(--card)" stroke="var(--accent)" strokeWidth="1.5" /><rect x="164" y="14" width="56" height="26" rx="7" fill="var(--card)" stroke="var(--border)" /><text x="50" y="32" textAnchor="middle" style={{ font: "9px var(--font-mono)", fill: "var(--ink-2)" }}>ingest</text><text x="122" y="64" textAnchor="middle" style={{ font: "9px var(--font-mono)", fill: "var(--accent)" }}>enrich</text><text x="192" y="30" textAnchor="middle" style={{ font: "9px var(--font-mono)", fill: "var(--ink-2)" }}>notify</text></svg></Zone>)
        : v === 2 ? (<Zone><div className="d-row" style={{ alignItems: "stretch", gap: 8 }}><svg width="120" height="86"><rect x="8" y="30" width="50" height="24" rx="6" fill="var(--card)" stroke="var(--accent)" strokeWidth="1.5" /><line x1="58" y1="42" x2="86" y2="42" stroke="var(--border)" /><rect x="86" y="30" width="26" height="24" rx="6" fill="var(--card)" stroke="var(--border)" /></svg><div style={{ width: 100, border: "1px solid var(--border)", borderRadius: 8, padding: 8 }}><div style={{ ...mono10, fontSize: 8 }}>node-inspector</div><div style={{ fontSize: 10.5, fontWeight: 600, margin: "3px 0" }}>enrich</div><Ph h={5} /><div style={{ height: 3 }} /><Ph w="70%" h={5} /></div></div></Zone>)
        : (<Zone><div style={{ position: "relative", width: 220, height: 90, border: "1px solid var(--border)", borderRadius: 10, background: "var(--card)" }}><svg width="220" height="90"><circle cx="70" cy="40" r="9" fill="var(--secondary)" stroke="var(--border)" /><circle cx="140" cy="58" r="9" fill="var(--secondary)" stroke="var(--border)" /><line x1="79" y1="43" x2="131" y2="55" stroke="var(--border)" /></svg><div style={{ position: "absolute", right: 6, bottom: 6, width: 48, height: 30, border: "1px solid var(--border)", borderRadius: 5, background: "var(--secondary)", opacity: 0.9 }}><span style={{ position: "absolute", left: 12, top: 8, width: 12, height: 8, border: "1px solid var(--accent)", borderRadius: 2 }} /></div></div></Zone>);
    case "blk:stack-minimap":
      return v === 1 ? (<Zone><div className="d-row" style={{ gap: 5 }}>{["L", "M", "M", "S"].map((s, i) => <div key={i} style={{ width: s === "L" ? 34 : s === "M" ? 26 : 20, height: 44, borderRadius: 4, border: i === 3 ? "1.5px solid var(--accent)" : "1px solid var(--border)", background: "var(--card)" }}><div style={{ height: 7, borderBottom: "1px solid var(--border)" }} /></div>)}</div></Zone>)
        : v === 2 ? (<Zone col><div className="d-row" style={{ ...mono10 }}>CRM › ACME › <span style={{ color: "var(--accent)" }}>JO</span></div><div className="d-row" style={{ gap: 4, marginTop: 4 }}>{[1, 2, 3].map((i) => <div key={i} style={{ width: 40, height: 26, borderRadius: 4, border: "1px solid var(--border)", background: i === 3 ? "var(--accent-soft)" : "var(--secondary)" }} />)}</div></Zone>)
        : (<Zone><div style={{ display: "grid", gridTemplateColumns: "repeat(3, 56px)", gap: 6 }}>{["Comptes", "Acme", "Jo"].map((l, i) => <div key={l} style={{ border: i === 2 ? "1.5px solid var(--accent)" : "1px solid var(--border)", borderRadius: 6, padding: 5, background: "var(--card)" }}><div style={{ ...mono10, fontSize: 7 }}>{l}</div><Ph h={4} /><div style={{ height: 3 }} /><Ph w="60%" h={4} /></div>)}</div></Zone>);
    case "blk:saved-stacks":
      return v === 1 ? (<Zone col>{[["Q3 pipeline review", "4 panneaux · CRM"], ["Onboarding client", "3 panneaux · CRM"]].map(([l, s]) => <div key={l} className="drill" style={{ cursor: "default" }}><span className="no">▶</span><span className="bd"><span className="tt" style={{ display: "block" }}>{l}</span><span className="ss" style={{ display: "block" }}>{s}</span></span><span className="arr">→</span></div>)}</Zone>)
        : v === 2 ? (<Zone><div className="d-pop" style={{ maxWidth: 250 }}><b style={{ fontSize: 12.5, color: "var(--foreground)" }}>Save this stack</b><input className="d-input" defaultValue="Q3 pipeline review" style={{ width: "100%", margin: "8px 0" }} readOnly /><div style={{ fontSize: 10.5, ...muted, marginBottom: 8 }}>4 panels · references included</div><button className="d-btn sm" style={{ width: "100%" }}>Save workspace</button></div></Zone>)
        : (<Zone><div className="d-row" style={{ flexWrap: "wrap" }}>{["⭐ Pipeline Q3", "⭐ Onboarding", "＋ Save current"].map((l, i) => <span key={l} className="att-chip" style={i === 2 ? { color: "var(--accent)", borderStyle: "dashed" } : undefined}>{l}</span>)}</div></Zone>);
    default:
      return <Zone><span style={{ fontSize: 12, ...muted }}>Demo à venir.</span></Zone>;
  }
}
