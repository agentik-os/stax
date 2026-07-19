/**
 * The full shadcn/ui gallery — for EVERY component, three structurally
 * different versions of THE COMPONENT ITSELF (not a reskin): V1 · V2 · V3.
 * One single demo background. Styled by the WhitePaper tokens.
 */
import { useState, type ReactNode } from "react";

const Zone = ({ children, col }: { children: ReactNode; col?: boolean }) => (
  <div className="demo-zone" style={col ? { flexDirection: "column", alignItems: "stretch" } : undefined}>{children}</div>
);
const Note = ({ children }: { children: ReactNode }) => (
  <div className="card" style={{ marginBottom: 0 }}>
    <div className="lab"><span className="sig">✶</span> In the panel grammar</div>
    <p>{children}</p>
  </div>
);
const Ph = ({ w = "100%", h = 8, r = 3, o = 1 }: { w?: number | string; h?: number; r?: number; o?: number }) => (
  <span style={{ display: "block", width: w, height: h, borderRadius: r, background: "var(--border)", opacity: o }} />
);
const muted = { color: "var(--muted-foreground)" } as const;
const mono10 = { fontFamily: "var(--font-mono)", fontSize: "var(--fz-mono, 10px)" as string | number, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)" } as const;

export function ComponentDemo({ name }: { name: string }) {
  const [v, setV] = useState<1 | 2 | 3>(1);
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
      <DemoBody name={name} v={v} />
    </>
  );
}

function DemoBody({ name, v }: { name: string; v: 1 | 2 | 3 }) {
  switch (name) {

    case "Accordion":
      return (<>{v === 1 ? (
        <Zone col><div className="d-col">
          {["Is it accessible?", "Is it styled?", "Is it animated?"].map((q, i) => (
            <div key={q} style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
              <div className="d-row" style={{ justifyContent: "space-between", fontWeight: 500, color: "var(--foreground)" }}>{q}<span style={muted}>{i === 0 ? "⌄" : "›"}</span></div>
              {i === 0 && <div style={{ fontSize: 12, ...muted, paddingTop: 6 }}>Yes — WAI-ARIA disclosure pattern.</div>}
            </div>))}
        </div></Zone>
      ) : v === 2 ? (
        <Zone col>
          {["Billing", "Team members", "Integrations"].map((q, i) => (
            <div key={q} className="d-card" style={{ maxWidth: "none", padding: "11px 14px" }}>
              <div className="d-row" style={{ justifyContent: "space-between", fontWeight: 500, color: "var(--foreground)" }}>{q}<span style={muted}>{i === 1 ? "−" : "+"}</span></div>
              {i === 1 && <div style={{ fontSize: 12, ...muted, paddingTop: 6 }}>Each section is its own card — heavier separation, calmer scan.</div>}
            </div>))}
        </Zone>
      ) : (
        <Zone col><div className="d-col" style={{ gap: 0 }}>
          {["What ships in the box?", "Can I self-host?", "Is there an API?"].map((q, i) => (
            <div key={q} style={{ padding: "10px 2px", borderTop: i ? "1px solid var(--rule-1)" : "none" }}>
              <div className="d-row" style={{ justifyContent: "space-between", fontSize: 13 }}>
                <span style={{ ...mono10, color: i === 2 ? "var(--accent)" : "var(--muted-foreground)" }}>0{i + 1}</span>
                <span style={{ flex: 1, fontWeight: 500, color: "var(--foreground)" }}>{q}</span><span style={muted}>{i === 2 ? "⌄" : "›"}</span>
              </div>
              {i === 2 && <div style={{ fontSize: 12, ...muted, paddingTop: 6, paddingLeft: 30 }}>Flush list with numbered mono index — document rhythm, zero chrome.</div>}
            </div>))}
        </div></Zone>
      )}<Note>V1 classic dividers · V2 one card per item · V3 flush numbered list. If each item has real depth, prefer a drill — depth deserves a column.</Note></>);

    case "Alert":
      return (<>{v === 1 ? (
        <Zone col>
          <div className="notif"><span className="dot ok" /><span className="nb"><b className="nt">Deployment complete</b><p>All 4 panels prefetched — the stack link is live.</p></span><span className="time">2m</span></div>
          <div className="notif"><span className="dot err" /><span className="nb"><b className="nt">Payment failed</b><p>The card on file expired — update it in Billing.</p></span><span className="time">3h</span></div>
        </Zone>
      ) : v === 2 ? (
        <Zone col>
          <div style={{ borderLeft: "3px solid var(--foreground)", background: "var(--card)", padding: "10px 13px", borderRadius: "0 10px 10px 0", boxShadow: "var(--shadow-2xs)" }}><b style={{ fontSize: 12.5, color: "var(--foreground)" }}>Saved</b><p style={{ margin: 0, fontSize: 12, ...muted }}>Contact updated across 2 open panels.</p></div>
          <div style={{ borderLeft: "3px solid var(--accent)", background: "var(--card)", padding: "10px 13px", borderRadius: "0 10px 10px 0", boxShadow: "var(--shadow-2xs)" }}><b style={{ fontSize: 12.5, color: "var(--accent)" }}>Action needed</b><p style={{ margin: 0, fontSize: 12, ...muted }}>Two references point at a deleted record.</p></div>
        </Zone>
      ) : (
        <Zone col>
          <div style={{ background: "var(--foreground)", color: "var(--background)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, display: "flex", gap: 10, alignItems: "center" }}><span>◆</span><span style={{ flex: 1 }}>Maintenance window Sunday 02:00–03:00 UTC.</span><span style={{ opacity: 0.6 }}>×</span></div>
          <div style={{ background: "var(--accent)", color: "var(--accent-foreground)", borderRadius: 10, padding: "10px 14px", fontSize: 12.5, display: "flex", gap: 10, alignItems: "center" }}><span>⚠</span><span style={{ flex: 1 }}>Your trial ends in 2 days — export or upgrade.</span><b style={{ textDecoration: "underline" }}>Upgrade</b></div>
        </Zone>
      )}<Note>V1 notification card + status dot · V2 left-border callout · V3 solid banner. Severity reads at a glance in all three.</Note></>);

    case "Alert Dialog":
      return (<>{v === 1 ? (
        <Zone><div className="d-pop" style={{ maxWidth: 280 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--foreground)" }}>Delete this account?</div>
          <div style={{ marginBottom: 12 }}>This cannot be undone. Every contract goes with it.</div>
          <div className="d-row" style={{ justifyContent: "flex-end" }}><button className="d-btn outline sm">Cancel</button><button className="d-btn destructive sm">Delete</button></div>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-pop" style={{ maxWidth: 250, textAlign: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--accent-soft)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 16, marginBottom: 8 }}>!</div>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--foreground)" }}>Close 3 pinned panels?</div>
          <div style={{ marginBottom: 12, fontSize: 12 }}>References are device-local — they won't come back.</div>
          <button className="d-btn destructive sm" style={{ width: "100%", marginBottom: 6 }}>Close them</button>
          <button className="d-btn ghost sm" style={{ width: "100%" }}>Keep</button>
        </div></Zone>
      ) : (
        <Zone><div className="d-pop" style={{ display: "flex", alignItems: "center", gap: 12, maxWidth: 330 }}>
          <span style={{ flex: 1, fontSize: 12.5 }}>Discard unsaved changes?</span>
          <button className="d-btn ghost sm">Keep</button><button className="d-btn sm">Discard</button>
        </div></Zone>
      )}<Note>V1 classic two-action card · V2 centered icon + stacked buttons · V3 one-line inline confirm for small stakes.</Note></>);

    case "Aspect Ratio":
      return (<>{v === 1 ? (
        <Zone><div style={{ width: 240, aspectRatio: "16/9", border: "1px solid var(--border)", borderRadius: 10, background: "var(--secondary)", display: "grid", placeItems: "center", ...mono10 }}>16 : 9</div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ width: 240 }}>
          <div style={{ aspectRatio: "16/9", background: "var(--secondary)", border: "1px solid var(--border)", borderRadius: 10, position: "relative", display: "grid", placeItems: "center" }}>
            <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--foreground)", color: "var(--background)", display: "grid", placeItems: "center", fontSize: 10 }}>▶</span>
            <span className="tag" style={{ position: "absolute", bottom: 6, right: 6 }}>02:14</span>
          </div>
          <div style={{ ...mono10, marginTop: 5 }}>demo-walkthrough.mp4</div>
        </div></Zone>
      ) : (
        <Zone><div style={{ width: 260 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {["AK", "JL", "MV"].map((a) => (
              <div key={a} style={{ flex: 1, aspectRatio: "1", border: "1px solid var(--border)", borderRadius: 8, background: "var(--secondary)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted-foreground)" }}>{a}</div>))}
          </div>
          <div style={{ ...mono10, marginTop: 5 }}>1:1 grid — cells keep shape as the panel narrows</div>
        </div></Zone>
      )}<Note>V1 the bare 16:9 frame · V2 a video player keeps its ratio · V3 1:1 grid tiles survive panel resize. Media keeps its shape while the panel's width obeys the size grammar.</Note></>);

    case "Attachment":
      return (<>{v === 1 ? (
        <Zone col>
          <span className="d-attach"><span className="ico">PDF</span><span><b style={{ color: "var(--foreground)", fontWeight: 500 }}>proposal-v3.pdf</b><br />1.2 MB</span><span style={muted}>↓</span></span>
          <span className="d-attach"><span className="ico">IMG</span><span><b style={{ color: "var(--foreground)", fontWeight: 500 }}>maquette.png</b><br />640 KB</span><span style={muted}>↓</span></span>
        </Zone>
      ) : v === 2 ? (
        <Zone>
          {["PDF", "IMG", "ZIP"].map((t) => (
            <div key={t} style={{ width: 86, textAlign: "center" }}>
              <div style={{ height: 64, border: "1px solid var(--border)", borderRadius: 10, background: "var(--secondary)", display: "grid", placeItems: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted-foreground)", marginBottom: 5 }}>{t}</div>
              <div style={{ fontSize: 10.5, ...muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.toLowerCase()}-export</div>
            </div>))}
        </Zone>
      ) : (
        <Zone><div className="d-row" style={{ flexWrap: "wrap" }}>
          {["contract.pdf", "logo.svg", "notes.md"].map((f) => (
            <span key={f} className="att-chip">📎 {f}<button>×</button></span>))}
        </div></Zone>
      )}<Note>V1 detail rows · V2 grid tiles for galleries · V3 removable chips in a composer. Drilling one opens a preview panel.</Note></>);

    case "Avatar":
      return (<>{v === 1 ? (
        <Zone><span className="d-avatar">AK</span><span className="d-avatar soft">JL</span><span className="d-avatar" style={{ background: "var(--secondary)", color: "var(--muted-foreground)" }}>+3</span></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ display: "flex" }}>
          {["AK", "JL", "MV", "+4"].map((a, i) => (
            <span key={a} className="d-avatar" style={{ marginLeft: i ? -8 : 0, border: "2px solid var(--card)", background: i === 3 ? "var(--secondary)" : undefined, color: i === 3 ? "var(--muted-foreground)" : undefined }}>{a}</span>))}
        </div></Zone>
      ) : (
        <Zone>
          {[["AK", "var(--foreground)"], ["JL", "var(--accent-3)"], ["MV", "var(--ink-4)"]].map(([a, c]) => (
            <span key={a} style={{ position: "relative" }}>
              <span className="d-avatar" style={{ borderRadius: 9 }}>{a}</span>
              <span style={{ position: "absolute", bottom: -1, right: -1, width: 9, height: 9, borderRadius: "50%", background: c as string, border: "2px solid var(--card)" }} />
            </span>))}
        </Zone>
      )}<Note>V1 singles · V2 overlapping presence group · V3 squared avatars with status dots — presence on panel bars uses these at 8px.</Note></>);

    case "Badge":
      return (<>{v === 1 ? (
        <Zone><span className="d-badge">Default</span><span className="d-badge soft">Accent</span><span className="d-badge outline">Outline</span></Zone>
      ) : v === 2 ? (
        <Zone>
          {[["Active", "var(--foreground)"], ["Pending", "var(--accent-3)"], ["Blocked", "var(--accent)"]].map(([l, c]) => (
            <span key={l} className="d-badge outline" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: c as string }} />{l}</span>))}
        </Zone>
      ) : (
        <Zone><span className="tag">2 CONTACTS</span><span className="tag accent">LIVE</span><span className="tag success">WON</span><span className="tag" style={{ borderRadius: 4, border: "1px solid var(--border)", background: "transparent" }}>V2.1</span></Zone>
      )}<Note>V1 filled/soft/outline · V2 status-dot badges · V3 mono uppercase tags (our drill metas) with the optical-centering fix.</Note></>);

    case "Breadcrumb":
      return (<>{v === 1 ? (
        <Zone><div className="d-row" style={{ ...mono10, letterSpacing: "0.08em" }}><span>CRM</span><span style={{ color: "var(--border)" }}>›</span><span>Acme</span><span style={{ color: "var(--border)" }}>›</span><span style={{ color: "var(--accent)" }}>Jo Lambert</span></div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-row" style={{ fontSize: 12.5 }}><span style={muted}>Dashboard</span><span style={{ color: "var(--ink-4)" }}>/</span><span style={muted}>Accounts</span><span style={{ color: "var(--ink-4)" }}>/</span><b style={{ color: "var(--foreground)" }}>Acme SARL</b></div></Zone>
      ) : (
        <Zone><div className="d-row" style={{ gap: 4 }}>
          {["CRM", "Acme", "Jo"].map((c, i) => (
            <span key={c} style={{ fontSize: 11.5, padding: "4px 10px 3px", borderRadius: 9999, background: i === 2 ? "var(--accent-soft)" : "var(--secondary)", color: i === 2 ? "var(--accent)" : "var(--ink-2)", fontWeight: 500 }}>{c}</span>))}
        </div></Zone>
      )}<Note>V1 mono uppercase (our crumbbar) · V2 slash path · V3 pill chips. Always derived from the ContextPath — never stored.</Note></>);

    case "Bubble":
      return (<>{v === 1 ? (
        <Zone col>
          <div className="d-msg">Can you resend the contract?</div>
          <div className="d-msg me" style={{ alignSelf: "flex-end" }}>Done — check the attachments panel.</div>
        </Zone>
      ) : v === 2 ? (
        <Zone col>
          <div style={{ alignSelf: "flex-start", maxWidth: "75%", background: "var(--secondary)", borderRadius: "16px 16px 16px 4px", padding: "9px 13px", fontSize: 12.5, color: "var(--ink-2)" }}>On signe quand ?</div>
          <div style={{ alignSelf: "flex-end", maxWidth: "75%", background: "var(--primary)", color: "var(--primary-foreground)", borderRadius: "16px 16px 4px 16px", padding: "9px 13px", fontSize: 12.5 }}>Vendredi. Le devis part ce soir.</div>
        </Zone>
      ) : (
        <Zone col><div className="d-col" style={{ gap: 4, fontSize: 12.5 }}>
          <div><b style={{ color: "var(--accent)" }}>jo</b> <span style={{ color: "var(--ink-2)" }}>le devis est validé côté finance</span></div>
          <div><b style={{ color: "var(--accent-3)" }}>max</b> <span style={{ color: "var(--ink-2)" }}>parfait, je préviens le client</span></div>
          <div style={{ ...mono10 }}>14:32 · #ventes</div>
        </div></Zone>
      )}<Note>V1 bordered · V2 filled with directional corners · V3 IRC-flat for dense logs. Chat panels are full-height, input in the foot.</Note></>);

    case "Button":
      return (<>{v === 1 ? (
        <Zone>
          <button className="d-btn">Default</button>
          <button className="d-btn secondary">Secondary</button>
          <button className="d-btn outline">Outline</button>
          <button className="d-btn destructive">Destructive</button>
          <button className="d-btn ghost">Ghost</button>
          <button className="d-btn link">Link</button>
        </Zone>
      ) : v === 2 ? (
        <Zone>
          <button className="d-btn sm">Small</button>
          <button className="d-btn">Default</button>
          <button className="d-btn lg">Large</button>
          <button className="d-btn outline" style={{ display: "inline-flex", gap: 7, alignItems: "center" }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            With icon
          </button>
          <button className="d-btn outline icon" title="Icon button">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          </button>
        </Zone>
      ) : (
        <Zone>
          <button className="d-btn" style={{ display: "inline-flex", gap: 8, alignItems: "center", opacity: 0.85 }}><span className="d-spin" style={{ width: 12, height: 12, borderTopColor: "var(--primary-foreground)" }} />Loading…</button>
          <button className="d-btn outline" style={{ display: "inline-flex", gap: 8, alignItems: "center" }}><span className="d-spin" style={{ width: 12, height: 12 }} />Saving</button>
          <button className="d-btn secondary" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>Disabled</button>
        </Zone>
      )}<Note>V1 all six intents (default · secondary · outline · destructive · ghost · link) · V2 sizes + with-icon + icon-only · V3 loading & disabled. One atomic .d-btn base, modifier classes only — the same atom the panel foot CTAs are built from.</Note></>);

    case "Button Group":
      return (<>{v === 1 ? (
        <Zone><div style={{ display: "inline-flex" }}>
          {["Day", "Week", "Month"].map((l, i) => (
            <button key={l} className="d-btn outline sm" style={{ borderRadius: i === 0 ? "7px 0 0 7px" : i === 2 ? "0 7px 7px 0" : 0, marginLeft: i ? -1 : 0, background: i === 1 ? "var(--secondary)" : undefined }}>{l}</button>))}
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ display: "inline-flex" }}>
          {["↺", "↻", "⋯"].map((ic, i) => (
            <button key={ic} className="d-btn outline sm" style={{ borderRadius: i === 0 ? "7px 0 0 7px" : i === 2 ? "0 7px 7px 0" : 0, marginLeft: i ? -1 : 0, background: i === 0 ? "var(--secondary)" : undefined }}>{ic}</button>))}
        </div></Zone>
      ) : (
        <Zone><div style={{ display: "inline-flex" }}>
          <button className="d-btn sm" style={{ borderRadius: "7px 0 0 7px" }}>Save</button>
          <button className="d-btn sm" style={{ borderRadius: "0 7px 7px 0", borderLeft: "1px solid color-mix(in oklab, var(--primary-foreground) 25%, var(--primary))", padding: "5px 8px" }}>⌄</button>
        </div></Zone>
      )}<Note>V1 attached segments · V2 fused icon toolbar — undo pressed, redo, more · V3 split-button (action + dropdown). View switchers change representation, never navigation.</Note></>);

    case "Calendar":
      return (<>{v === 1 ? (
        <Zone><div className="d-cal">
          <div className="head"><span>‹</span>Juillet 2026<span>›</span></div>
          <div className="grid7">
            {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i} className="dow">{d}</span>)}
            {Array.from({ length: 28 }, (_, i) => (<span key={i} className={"day" + (i + 1 === 19 ? " sel" : "") + (i < 2 ? " mut" : "")}>{i + 1}</span>))}
          </div>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-cal">
          <div className="head"><span>‹</span>July 2026<span>›</span></div>
          <div className="grid7">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="dow">{d}</span>)}
            {Array.from({ length: 28 }, (_, i) => {
              const inR = i + 1 >= 8 && i + 1 <= 15;
              return <span key={i} className="day" style={inR ? { background: i + 1 === 8 || i + 1 === 15 ? "var(--primary)" : "var(--secondary)", color: i + 1 === 8 || i + 1 === 15 ? "var(--primary-foreground)" : "var(--foreground)", borderRadius: i + 1 === 8 ? "6px 0 0 6px" : i + 1 === 15 ? "0 6px 6px 0" : 0 } : undefined}>{i + 1}</span>;
            })}
          </div>
          <div style={{ ...mono10, fontSize: 8.5, padding: "6px 4px 0" }}>Range · Jul 8 → Jul 15</div>
        </div></Zone>
      ) : (
        <Zone><div className="d-cal">
          <div className="head"><span>‹</span>July 2026<span>›</span></div>
          <div className="grid7">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="dow">{d}</span>)}
            {Array.from({ length: 28 }, (_, i) => {
              const sel = [3, 9, 12, 17].includes(i + 1);
              return <span key={i} className={"day" + (sel ? " sel" : "")}>{i + 1}</span>;
            })}
          </div>
          <div style={{ ...mono10, fontSize: 8.5, padding: "6px 4px 0" }}>Multiple · 4 dates selected</div>
        </div></Zone>
      )}<Note>V1 default single date · V2 date-range selection · V3 multiple date selection. Serif numerals, hairlines — pure token inheritance. For time, see Date Picker's clock version.</Note></>);

    case "Card":
      return (<>{v === 1 ? (
        <Zone><div className="d-card">
          <b style={{ fontSize: 13.5, color: "var(--foreground)" }}>Default card</b>
          <p style={{ margin: "3px 0 10px", fontSize: 12, ...muted }}>Header, content and one action — the plain workhorse.</p>
          <button className="d-btn sm">Open</button>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-card" style={{ position: "relative" }}>
          <span className="d-badge soft" style={{ position: "absolute", top: 10, right: 10 }}>New</span>
          <div style={{ ...mono10, marginBottom: 4 }}>Pipeline</div>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 30 }}>46k€</div>
          <div style={{ fontSize: 12, color: "var(--foreground)" }}>▲ +12% vs June</div>
        </div></Zone>
      ) : (
        <Zone><div style={{ width: "100%", maxWidth: 280, border: "1.5px dashed var(--ink-4)", borderRadius: 12, padding: "18px 16px", textAlign: "center" }}>
          <div style={{ fontSize: 18, color: "var(--muted-foreground)", marginBottom: 2 }}>＋</div>
          <b style={{ fontSize: 12.5, color: "var(--foreground)" }}>Dashed card</b>
          <p style={{ margin: "2px 0 0", fontSize: 11.5, ...muted }}>Create-new affordance — drop or click.</p>
        </div></Zone>
      )}<Note>V1 default card · V2 card with badge · V3 dashed card (create-new affordance). A panel is a card promoted to a navigation unit.</Note></>);

    case "Carousel":
      return (<>{v === 1 ? (
        <Zone><div className="d-row"><button className="d-btn outline sm">‹</button>
          {[1, 2, 3].map((i) => <div key={i} style={{ width: 64, height: 44, border: "1px solid var(--border)", borderRadius: 8, background: i === 2 ? "var(--secondary)" : "var(--card)", display: "grid", placeItems: "center", ...mono10 }}>{i}</div>)}
          <button className="d-btn outline sm">›</button></div></Zone>
      ) : v === 2 ? (
        <Zone col>
          <div style={{ width: "100%", maxWidth: 260, height: 90, margin: "0 auto", border: "1px solid var(--border)", borderRadius: 12, background: "var(--secondary)", display: "grid", placeItems: "center", ...mono10 }}>Slide 2 / 5</div>
          <div className="d-row" style={{ justifyContent: "center", gap: 5 }}>
            {[0, 1, 2, 3, 4].map((i) => <span key={i} style={{ width: i === 1 ? 16 : 6, height: 6, borderRadius: 9999, background: i === 1 ? "var(--foreground)" : "var(--border)", transition: "width 160ms" }} />)}
          </div>
        </Zone>
      ) : (
        <Zone><div className="d-row" style={{ gap: 6 }}>
          {[1, 2, 3, 4, 5].map((i) => <div key={i} style={{ width: 46, height: 34, border: i === 3 ? "2px solid var(--accent)" : "1px solid var(--border)", borderRadius: 6, background: "var(--secondary)", display: "grid", placeItems: "center", fontSize: 9, fontFamily: "var(--font-mono)", color: "var(--muted-foreground)" }}>{i}</div>)}
        </div></Zone>
      )}<Note>V1 arrows · V2 dot pagination · V3 filmstrip thumbnails. Only the carousel's content scrolls — the stage keeps its own axis.</Note></>);

    case "Chart":
      return (<>{v === 1 ? (
        <Zone><div className="d-chart">{[38, 62, 45, 80, 55, 70].map((h, i) => <div key={i} className={"bar" + (i % 3 === 1 ? " b2" : i % 3 === 2 ? " b3" : "")} style={{ height: h + "%" }} />)}</div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ width: 240 }}>
          <svg width="240" height="90" viewBox="0 0 240 90">
            <polyline points="0,70 40,55 80,60 120,30 160,42 200,18 240,26" fill="none" stroke="var(--accent)" strokeWidth="2" />
            <polygon points="0,70 40,55 80,60 120,30 160,42 200,18 240,26 240,90 0,90" fill="var(--accent)" opacity="0.12" />
            <circle cx="200" cy="18" r="3.5" fill="var(--accent)" />
          </svg>
          <div className="d-row" style={{ justifyContent: "space-between", marginTop: 4 }}><span style={{ ...mono10 }}>Pipeline · last 7 weeks</span><b style={{ fontVariantNumeric: "tabular-nums", color: "var(--foreground)", fontSize: 12 }}>46k</b></div>
        </div></Zone>
      ) : (
        <Zone>
          <svg width="90" height="90" viewBox="0 0 42 42">
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--secondary)" strokeWidth="6" />
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--accent)" strokeWidth="6" strokeDasharray="44 56" strokeDashoffset="25" strokeLinecap="round" />
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--accent-2)" strokeWidth="6" strokeDasharray="31 69" strokeDashoffset="81" strokeLinecap="round" />
            <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--accent-3)" strokeWidth="6" strokeDasharray="25 75" strokeDashoffset="50" strokeLinecap="round" />
          </svg>
          <div className="d-col" style={{ width: "auto", gap: 5 }}>
            {[["Organic", "var(--accent)", "44%"], ["Outbound", "var(--accent-2)", "31%"], ["Referral", "var(--accent-3)", "25%"]].map(([l, c, p]) => (
              <div key={l} className="d-row" style={{ fontSize: 11.5 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: c as string }} /><span style={{ flex: 1, ...muted }}>{l}</span><b style={{ fontVariantNumeric: "tabular-nums", color: "var(--foreground)" }}>{p}</b></div>))}
          </div>
        </Zone>
      )}<Note>V1 bars · V2 line + area fill with emphasized endpoint · V3 donut + legend. Colors come from --chart-1…5, never the accent.</Note></>);

    case "Checkbox":
      return (<>{v === 1 ? (
        <Zone col>
          <label className="d-row"><span className="d-check">✓</span>Accept terms</label>
          <label className="d-row"><span className="d-check off" />Send me updates</label>
        </Zone>
      ) : v === 2 ? (
        <Zone>
          {[["Starter", true], ["Pro", false]].map(([l, on]) => (
            <div key={l as string} style={{ width: 120, border: on ? "2px solid var(--primary)" : "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", position: "relative", background: "var(--card)" }}>
              <b style={{ fontSize: 12.5, color: "var(--foreground)" }}>{l as string}</b>
              <div style={{ fontSize: 11, ...muted }}>{l === "Starter" ? "2 spaces" : "Unlimited"}</div>
              {!!on && <span className="d-check" style={{ position: "absolute", top: 8, right: 8 }}>✓</span>}
            </div>))}
        </Zone>
      ) : (
        <Zone col>
          <label className="d-row"><span className="d-check">✓</span><s style={{ ...muted }}>Send the deck</s></label>
          <label className="d-row"><span className="d-check">✓</span><s style={{ ...muted }}>Book the demo</s></label>
          <label className="d-row"><span className="d-check off" />Sign the contract</label>
        </Zone>
      )}<Note>V1 form checks · V2 selectable cards · V3 task list with strikethrough — three jobs, one control.</Note></>);

    case "Collapsible":
      return (<>{v === 1 ? (
        <Zone col>
          <div className="d-row" style={{ justifyContent: "space-between", fontWeight: 500, color: "var(--foreground)" }}>3 more contracts<span className="d-btn ghost sm">⌄</span></div>
          <Ph w="88%" h={12} /><Ph w="72%" h={12} />
        </Zone>
      ) : v === 2 ? (
        <Zone col>
          <p style={{ margin: 0, fontSize: 12.5, color: "var(--ink-2)" }}>Le compte-rendu valide le périmètre et le budget. La suite dépend du choix d'hébergement et…</p>
          <button style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600, textAlign: "left" }}>Show more ⌄</button>
        </Zone>
      ) : (
        <Zone col><div className="d-card" style={{ maxWidth: "none", padding: "10px 14px" }}>
          <div className="d-row" style={{ justifyContent: "space-between" }}>
            <b style={{ fontSize: 12.5, color: "var(--foreground)" }}>Archived opportunities</b>
            <span className="d-row" style={{ gap: 6 }}><span className="tag">12</span><span className="d-btn ghost sm">−</span></span>
          </div>
          <div className="d-sep" style={{ margin: "8px 0" }} />
          <div className="d-row" style={{ fontSize: 12, ...muted }}>Refonte v1 — lost</div>
          <div className="d-row" style={{ fontSize: 12, ...muted, marginTop: 4 }}>Audit RGPD — won</div>
        </div></Zone>
      )}<Note>V1 chevron header · V2 “show more” text fade · V3 open card revealing its rows. If the hidden part deserves a title, it deserves a panel.</Note></>);

    case "Combobox":
      return (<>{v === 1 ? (
        <Zone col>
          <input className="d-input" defaultValue="acm" style={{ width: 200 }} readOnly />
          <div className="d-menu"><div className="it" style={{ background: "var(--secondary)" }}>Acme SARL<span className="k">↵</span></div><div className="it">Acme Nord</div></div>
        </Zone>
      ) : v === 2 ? (
        <Zone col>
          <div className="d-row" style={{ border: "1px solid var(--input)", borderRadius: 7, padding: "8px 11px", width: 200, justifyContent: "space-between", background: "var(--card)", fontSize: 12.5 }}>Assignee<span style={muted}>⌄</span></div>
          <div className="d-menu" style={{ width: 200 }}>
            <div className="it">Jo Lambert<span style={{ color: "var(--accent)" }}>✓</span></div>
            <div className="it">Max Verne</div>
            <div className="it">Léa Fontaine<span style={{ color: "var(--accent)" }}>✓</span></div>
          </div>
        </Zone>
      ) : (
        <Zone><div style={{ display: "flex", flexWrap: "wrap", gap: 5, border: "1px solid var(--input)", borderRadius: 8, padding: 6, width: 250, background: "var(--card)" }}>
          <span className="att-chip">design<button>×</button></span>
          <span className="att-chip">urgent<button>×</button></span>
          <input className="d-input" placeholder="Add tag…" style={{ border: "none", flex: 1, minWidth: 60, padding: "4px 6px" }} readOnly />
        </div></Zone>
      )}<Note>V1 type-ahead · V2 multi-check assignee picker · V3 tag input. Selecting a record can openDetail it beside the form.</Note></>);

    case "Command":
      return (<>{v === 1 ? (
        <Zone col><div style={{ border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", width: "100%", maxWidth: 320, boxShadow: "var(--shadow-md)" }}>
          <div style={{ display: "flex", gap: 8, padding: "10px 12px", borderBottom: "1px solid var(--border)", alignItems: "center" }}>
            <span style={{ color: "var(--accent)", fontFamily: "var(--font-mono)", fontSize: 10 }}>⌘</span>
            <span style={{ fontSize: 13, ...muted }}>Go to panel, section, action…</span>
          </div>
          <div style={{ padding: 5 }}><div className="d-menu" style={{ border: "none", boxShadow: "none", padding: 0 }}>
            <div className="it" style={{ background: "var(--secondary)" }}>Kickoff technique<span className="k">↵</span></div>
            <div className="it">Theme — dark</div>
          </div></div>
        </div></Zone>
      ) : v === 2 ? (
        <Zone col><div style={{ fontFamily: "var(--font-mono)", fontSize: 12, border: "1px solid var(--border)", borderRadius: 8, padding: "9px 12px", background: "var(--card)", width: "100%", maxWidth: 300 }}>
          <span style={{ color: "var(--accent)" }}>›</span> open acme<span style={{ opacity: 0.4 }}>|</span>
          <div style={{ marginTop: 6, fontSize: 11, ...muted }}>↳ Acme SARL · Acme Nord · acme-export.pdf</div>
        </div></Zone>
      ) : (
        <Zone col><div className="d-menu" style={{ width: "100%", maxWidth: 300 }}>
          <div style={{ ...mono10, padding: "5px 9px 3px" }}>Panels</div>
          <div className="it" style={{ background: "var(--secondary)" }}>Refonte e-commerce<span className="k">↵</span></div>
          <div style={{ ...mono10, padding: "8px 9px 3px" }}>Actions</div>
          <div className="it">Copy stack link<span className="k">⌘C</span></div>
          <div className="it">Toggle sidebar<span className="k">⌘B</span></div>
        </div></Zone>
      )}<Note>V1 the ⌘K palette · V2 terminal-prompt command line · V3 grouped results. It reads the panel registry — everything is typeable.</Note></>);

    case "Context Menu":
      return (<>{v === 1 ? (
        <Zone><div className="d-menu"><div className="it">Open beside<span className="k">↵</span></div><div className="it">Pin<span className="k">P</span></div><div className="d-sep" style={{ margin: "4px 0" }} /><div className="it" style={{ color: "var(--accent)" }}>Close branch</div></div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ position: "relative" }}>
          <div className="d-card" style={{ width: 230, padding: "10px 14px", fontSize: 12.5, fontWeight: 500, color: "var(--foreground)" }}>Refonte — 18 000 €</div>
          <span style={{ position: "absolute", top: 32, left: 38, width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
          <div className="d-menu" style={{ marginLeft: 40, marginTop: -6, position: "relative" }}>
            {[["↗", "Open beside", "↵"], ["⧉", "Copy link", "⌘C"], ["×", "Close", "⌫"]].map(([ic, l, k]) => (
              <div key={l} className="it"><span style={{ width: 14, textAlign: "center" }}>{ic}</span><span style={{ flex: 1 }}>{l}</span><span className="k">{k}</span></div>))}
          </div>
        </div></Zone>
      ) : (
        <Zone><div className="d-row" style={{ alignItems: "flex-start" }}>
          <div className="d-menu"><div className="it">Rename</div><div className="it" style={{ background: "var(--secondary)" }}>Move to<span className="k">›</span></div><div className="it">Delete</div></div>
          <div className="d-menu" style={{ minWidth: 120 }}><div className="it">Comptes</div><div className="it">Rapports</div></div>
        </div></Zone>
      )}<Note>V1 intent verbs + shortcuts · V2 anchored at the right-click point · V3 nested submenu. The engine commands ARE the menu.</Note></>);

    case "Data Table":
      return (<>{v === 1 ? (
        <Zone col><table className="d-table"><thead><tr><th>Deal ↓</th><th>Stage</th><th style={{ textAlign: "right" }}>€</th></tr></thead>
          <tbody><tr><td>Refonte</td><td><span className="tag accent">PROPOSAL</span></td><td style={{ textAlign: "right" }}>18 000</td></tr>
            <tr><td>Migration</td><td><span className="tag">DISCOVERY</span></td><td style={{ textAlign: "right" }}>13 500</td></tr></tbody></table></Zone>
      ) : v === 2 ? (
        <Zone col>
          <div className="d-row" style={{ background: "var(--secondary)", borderRadius: 8, padding: "7px 10px", fontSize: 12 }}><b>2 selected</b><span style={{ flex: 1 }} /><button className="d-btn ghost sm">Export</button><button className="d-btn destructive sm">Delete</button></div>
          <table className="d-table"><tbody>
            <tr><td style={{ width: 26 }}><span className="d-check">✓</span></td><td>Refonte</td><td style={{ textAlign: "right" }}>18 000</td></tr>
            <tr><td><span className="d-check">✓</span></td><td>Migration</td><td style={{ textAlign: "right" }}>13 500</td></tr>
            <tr><td><span className="d-check off" /></td><td>Équipement</td><td style={{ textAlign: "right" }}>6 500</td></tr>
          </tbody></table>
        </Zone>
      ) : (
        <Zone col><table className="d-table">
          <tbody>
            <tr><td colSpan={3} style={{ ...mono10, background: "var(--secondary)" }}>Q3 2026 — 2 deals · 31 500 €</td></tr>
            <tr><td>Refonte</td><td><span className="tag accent">PROPOSAL</span></td><td style={{ textAlign: "right" }}>18 000</td></tr>
            <tr><td>Migration</td><td><span className="tag">DISCOVERY</span></td><td style={{ textAlign: "right" }}>13 500</td></tr>
            <tr><td colSpan={2} style={{ fontWeight: 600, color: "var(--foreground)" }}>Subtotal</td><td style={{ textAlign: "right", fontWeight: 600, color: "var(--foreground)" }}>31 500</td></tr>
            <tr><td colSpan={3} style={{ ...mono10, background: "var(--secondary)" }}>Q4 2026 — 2 deals · 14 500 €</td></tr>
            <tr><td>Équipement</td><td><span className="tag">DISCOVERY</span></td><td style={{ textAlign: "right" }}>6 500</td></tr>
            <tr><td>Maintenance</td><td><span className="tag">DISCOVERY</span></td><td style={{ textAlign: "right" }}>8 000</td></tr>
            <tr><td colSpan={2} style={{ fontWeight: 600, color: "var(--foreground)" }}>Subtotal</td><td style={{ textAlign: "right", fontWeight: 600, color: "var(--foreground)" }}>14 500</td></tr>
          </tbody>
        </table></Zone>
      )}<Note>V1 sortable · V2 selection + bulk bar · V3 grouped with subtotal rows. A row click is a DrillTrigger — the record opens beside the table.</Note></>);

    case "Date Picker":
      return (<>{v === 1 ? (
        <Zone><div className="d-row"><input className="d-input" defaultValue="19 juil. 2026" readOnly style={{ width: 130 }} /><button className="d-btn outline sm">📅</button></div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-row" style={{ gap: 0 }}>
          <input className="d-input" defaultValue="8 juil." readOnly style={{ width: 90, borderRadius: "7px 0 0 7px" }} />
          <span style={{ border: "1px solid var(--input)", borderInline: "none", padding: "8px 8px", fontSize: 12, ...muted, background: "var(--card)" }}>→</span>
          <input className="d-input" defaultValue="15 juil." readOnly style={{ width: 90, borderRadius: "0 7px 7px 0" }} />
        </div></Zone>
      ) : (
        <Zone>
          <svg width="64" height="64" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="var(--card)" stroke="var(--border)" strokeWidth="1.5" />
            {Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return <circle key={i} cx={32 + 22 * Math.sin(a)} cy={32 - 22 * Math.cos(a)} r="1.2" fill="var(--ink-4)" />; })}
            <line x1="32" y1="32" x2="32" y2="16" stroke="var(--foreground)" strokeWidth="2.4" strokeLinecap="round" />
            <line x1="32" y1="32" x2="44" y2="36" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="32" cy="32" r="2" fill="var(--foreground)" />
          </svg>
          <div className="d-col" style={{ width: "auto", gap: 5 }}>
            <div className="d-row" style={{ gap: 4 }}>
              <input className="d-input" defaultValue="12" readOnly style={{ width: 44, textAlign: "center", fontFamily: "var(--font-mono)" }} />
              <span style={{ fontWeight: 700 }}>:</span>
              <input className="d-input" defaultValue="20" readOnly style={{ width: 44, textAlign: "center", fontFamily: "var(--font-mono)" }} />
            </div>
            <div className="d-tabs"><span className="d-tab on">AM</span><span className="d-tab">PM</span></div>
          </div>
        </Zone>
      )}<Note>V1 single date · V2 range with joined inputs · V3 clock / time picker (analog + digital, AM/PM). Date and time share the same tokens.</Note></>);

    case "Dialog":
      return (<>{v === 1 ? (
        <Zone><div className="d-pop" style={{ maxWidth: 280 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, color: "var(--foreground)" }}>Rename workspace</div>
          <input className="d-input" defaultValue="Q3 pipeline" style={{ width: "100%", marginBottom: 10 }} readOnly />
          <div className="d-row" style={{ justifyContent: "flex-end" }}><button className="d-btn outline sm">Cancel</button><button className="d-btn sm">Save</button></div>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-pop" style={{ maxWidth: 240, textAlign: "center" }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--secondary)", color: "var(--foreground)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15, marginBottom: 8 }}>✓</div>
          <b style={{ color: "var(--foreground)", fontSize: 13 }}>Invitation sent</b>
          <p style={{ margin: "4px 0 12px", fontSize: 12 }}>max@acme.fr will get an email.</p>
          <button className="d-btn sm" style={{ width: "100%" }}>Done</button>
        </div></Zone>
      ) : (
        <Zone><div style={{ width: 280, border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-lg)", background: "var(--card)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border)" }}><b style={{ fontSize: 12.5 }}>Import contacts</b><span style={muted}>×</span></div>
          <div style={{ padding: "12px 14px", fontSize: 12, ...muted }}>CSV, vCard or from another workspace.</div>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: "1px solid var(--border)", background: "var(--secondary)" }}><button className="d-btn ghost sm">Back</button><button className="d-btn sm">Continue</button></div>
        </div></Zone>
      )}<Note>V1 one-field edit · V2 success confirmation · V3 header/body/footer structure. One section more and it should be a panel.</Note></>);

    case "Direction":
      return (<>{v === 1 ? (
        <Zone>
          <div style={{ width: 100, textAlign: "center" }}>
            <div style={{ height: 70, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--secondary)", display: "flex" }}>
              <div style={{ width: 16, background: "var(--card)", borderInlineStart: "1px solid var(--border)" }} />
              <div style={{ width: 26, background: "var(--card)", borderInlineStart: "1px solid var(--border)" }} />
              <div style={{ flex: 1, background: "var(--card)", borderInlineStart: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }} />
            </div>
            <div style={{ ...mono10, marginTop: 4 }}>LTR</div>
          </div>
          <div style={{ width: 100, textAlign: "center" }}>
            <div style={{ height: 70, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--secondary)", display: "flex", direction: "rtl" }}>
              <div style={{ width: 16, background: "var(--card)", borderInlineStart: "1px solid var(--border)" }} />
              <div style={{ width: 26, background: "var(--card)", borderInlineStart: "1px solid var(--border)" }} />
              <div style={{ flex: 1, background: "var(--card)", borderInlineStart: "1px solid var(--border)", boxShadow: "var(--shadow-md)" }} />
            </div>
            <div style={{ ...mono10, marginTop: 4 }}>RTL</div>
          </div>
        </Zone>
      ) : v === 2 ? (
        <Zone col>
          <div className="d-row" style={{ ...mono10 }}>CRM<span style={{ color: "var(--border)" }}>›</span>ACME<span style={{ color: "var(--border)" }}>›</span><span style={{ color: "var(--accent)" }}>JO</span></div>
          <div className="d-row" style={{ ...mono10, justifyContent: "flex-end" }}><span style={{ color: "var(--accent)" }}>جو</span><span style={{ color: "var(--border)" }}>‹</span>أكمي<span style={{ color: "var(--border)" }}>‹</span>CRM</div>
        </Zone>
      ) : (
        <Zone col>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-2)", textAlign: "left" }}>Panels open to the right; the peek edge sits left.</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--ink-2)", textAlign: "right", direction: "rtl" }}>تفتح اللوحات إلى اليسار؛ الحافة على اليمين.</p>
        </Zone>
      )}<Note>Under RTL the whole stack mirrors — logical inline-start/end everywhere, never hardcoded left/right.</Note></>);

    case "Drawer":
      return (<>{v === 1 ? (
        <Zone><div style={{ width: 210, border: "1px solid var(--border)", borderRadius: "12px 12px 0 0", borderBottom: "none", background: "var(--card)", boxShadow: "var(--shadow-lg)", padding: "10px 14px 22px" }}>
          <div style={{ width: 34, height: 4, borderRadius: 9999, background: "var(--border)", margin: "0 auto 10px" }} />
          <b style={{ fontSize: 13, color: "var(--foreground)" }}>Quick filters</b>
          <div style={{ fontSize: 12, ...muted }}>Bottom sheet on mobile.</div>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ width: 200, height: 110, border: "1px solid var(--border)", borderRadius: 10, position: "relative", overflow: "hidden", background: "var(--background)" }}>
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 84, background: "var(--card)", borderLeft: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", padding: 8 }}><Ph w="70%" h={6} /><div style={{ height: 5 }} /><Ph h={5} /><div style={{ height: 4 }} /><Ph w="80%" h={5} /></div>
        </div></Zone>
      ) : (
        <Zone><div style={{ width: 200, height: 110, border: "1px solid var(--border)", borderRadius: 10, position: "relative", overflow: "hidden", background: "var(--background)" }}>
          <div style={{ position: "absolute", left: "6%", right: "6%", bottom: 0, height: 54, background: "var(--card)", opacity: 0.55, border: "1px solid var(--border)", borderRadius: "8px 8px 0 0", transform: "translateY(-6px)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 48, background: "var(--card)", borderTop: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ width: 34, height: 4, borderRadius: 9999, background: "var(--border)", margin: "6px auto 0" }} />
          </div>
        </div></Zone>
      )}<Note>V1 bottom sheet · V2 right utility (our ✶ drawer) · V3 stacked nested sheets — depth reads at the peeking edge. Overlays never join the stack.</Note></>);

    case "Dropdown Menu":
      return (<>{v === 1 ? (
        <Zone><div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
          <button className="d-btn outline sm">Account ⌄</button>
          <div className="d-menu"><div className="it">Settings</div><div className="it">Documentation</div><div className="d-sep" style={{ margin: "4px 0" }} /><div className="it" style={{ color: "var(--accent)" }}>Sign out</div></div>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-menu">
          <div className="it"><span style={{ width: 15, ...muted }}>⚙</span>Settings<span className="k">⌘,</span></div>
          <div className="it"><span style={{ width: 15, ...muted }}>◐</span>Theme<span className="k">⌘T</span></div>
          <div className="it"><span style={{ width: 15, ...muted }}>⧉</span>Copy link<span className="k">⌘C</span></div>
        </div></Zone>
      ) : (
        <Zone><div className="d-menu" style={{ minWidth: 190 }}>
          <div style={{ ...mono10, padding: "5px 9px 3px" }}>View</div>
          <div className="it"><span className="d-check" style={{ width: 13, height: 13 }}>✓</span>Show breadcrumb</div>
          <div className="it"><span className="d-check off" style={{ width: 13, height: 13 }} />Compact rows</div>
          <div className="d-sep" style={{ margin: "4px 0" }} />
          <div className="it" style={{ color: "var(--accent)" }}>Reset layout</div>
        </div></Zone>
      )}<Note>V1 trigger + anchored open menu · V2 icons + shortcuts · V3 sections + checkbox items + destructive. Same surface as our theme/account menus.</Note></>);

    case "Empty":
      return (<>{v === 1 ? (
        <Zone col><div style={{ textAlign: "center", padding: "10px 0" }}>
          <div style={{ color: "var(--ink-4)", marginBottom: 4 }}><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="3" y="4" width="8" height="16" rx="2" /><rect x="14" y="4" width="7" height="16" rx="2" opacity="0.45" /></svg></div>
          <b style={{ fontSize: 13, color: "var(--foreground)" }}>No contacts yet</b>
          <div style={{ fontSize: 12, ...muted, marginBottom: 10 }}>Every account starts empty.</div>
          <button className="d-btn sm">Add contact</button>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ width: "100%", maxWidth: 300, border: "1.5px dashed var(--ink-4)", borderRadius: 12, padding: "22px 16px", textAlign: "center", color: "var(--muted-foreground)", fontSize: 12.5 }}>
          Drop a CSV here or <b style={{ color: "var(--accent)" }}>browse</b>
        </div></Zone>
      ) : (
        <Zone><div className="d-row" style={{ fontSize: 12.5, ...muted }}>Nothing matches “zzz”. <b style={{ color: "var(--accent)", cursor: "pointer" }}>Clear filters</b></div></Zone>
      )}<Note>V1 icon + CTA · V2 dropzone empty · V3 inline no-results. An empty state always says what WOULD be here.</Note></>);

    case "Field":
      return (<>{v === 1 ? (
        <Zone col><div className="d-col" style={{ maxWidth: 260 }}>
          <label style={{ fontSize: 12.5, fontWeight: 500 }}>Company name</label>
          <input className="d-input" defaultValue="Acme SARL" readOnly />
          <span style={{ fontSize: 11, ...muted }}>Shown on invoices and contracts.</span>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ position: "relative", width: 240 }}>
          <span style={{ position: "absolute", top: -7, left: 10, background: "var(--card)", padding: "0 5px", fontSize: 10, color: "var(--muted-foreground)" }}>Email</span>
          <input className="d-input" defaultValue="jo@acme.fr" style={{ width: "100%" }} readOnly />
        </div></Zone>
      ) : (
        <Zone col>
          <div className="d-row" style={{ width: "100%", maxWidth: 300 }}><label style={{ width: 90, fontSize: 12, ...muted }}>SIRET</label><input className="d-input" defaultValue="123 456 789" style={{ flex: 1, borderColor: "var(--accent)" }} readOnly /></div>
          <div style={{ fontSize: 11, color: "var(--accent)", paddingLeft: 98 }}>14 digits expected — 9 given.</div>
        </Zone>
      )}<Note>V1 stacked label + help · V2 floating label · V3 horizontal + error state. Form panels are S-width by grammar.</Note></>);

    case "Form":
      return (<>{v === 1 ? (
        <Zone col><div style={{ width: "100%", maxWidth: 300 }}>
          <div className="d-row"><input className="d-input" placeholder="jo@acme.fr" style={{ flex: 1 }} readOnly /><button className="d-btn sm">Invite</button></div>
          <div style={{ fontSize: 11, ...muted, marginTop: 5 }}>They join the Q3 workspace instantly.</div>
        </div></Zone>
      ) : v === 2 ? (
        <Zone col><div style={{ width: "100%", maxWidth: 260 }}>
          <div className="d-col" style={{ marginBottom: 8 }}><label style={{ fontSize: 12.5, fontWeight: 500 }}>Email</label><input className="d-input" defaultValue="alex@" readOnly style={{ borderColor: "var(--accent)" }} /><span style={{ fontSize: 11, color: "var(--accent)" }}>Enter a valid email address.</span></div>
          <div className="d-col" style={{ marginBottom: 10 }}><label style={{ fontSize: 12.5, fontWeight: 500 }}>Company</label><input className="d-input" defaultValue="Acme SARL" readOnly style={{ borderColor: "var(--foreground)" }} /><span style={{ fontSize: 11, color: "var(--foreground)" }}>✓ Looks good.</span></div>
          <button className="d-btn sm" disabled style={{ opacity: 0.5 }}>Submit</button>
        </div></Zone>
      ) : (
        <Zone col><div style={{ width: "100%" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div className="d-col"><label style={{ fontSize: 12, fontWeight: 500 }}>First name</label><input className="d-input" defaultValue="Jo" readOnly /></div>
            <div className="d-col"><label style={{ fontSize: 12, fontWeight: 500 }}>Last name</label><input className="d-input" defaultValue="Lambert" readOnly /></div>
          </div>
          <div className="d-col" style={{ marginBottom: 8 }}><label style={{ fontSize: 12, fontWeight: 500 }}>Role</label><div className="d-row" style={{ border: "1px solid var(--input)", borderRadius: 7, padding: "8px 11px", fontSize: 12.5, justifyContent: "space-between", background: "var(--card)" }}>Operations<span style={{ color: "var(--muted-foreground)" }}>⌄</span></div></div>
          <div className="d-col" style={{ marginBottom: 10 }}><label style={{ fontSize: 12, fontWeight: 500 }}>Notes</label><textarea className="d-input" readOnly style={{ height: 44, resize: "none" }} defaultValue="Prefers morning calls." /></div>
          <div className="d-row" style={{ justifyContent: "flex-end" }}><button className="d-btn ghost sm">Cancel</button><button className="d-btn sm">Save contact</button></div>
        </div></Zone>
      )}<Note>V1 inline single-row submit · V2 validation (error + success + blocked submit) · V3 multiple fields with grid, select and textarea. Form panels are S-width; the real submit lives in the panel foot.</Note></>);

    case "Hover Card":
      return (<>{v === 1 ? (
        <Zone><div className="d-pop"><div className="d-row"><span className="d-avatar">JL</span><span><b style={{ color: "var(--foreground)", fontWeight: 500 }}>Jo Lambert</b><br /><span style={{ fontSize: 11, ...muted }}>Directrice des opérations · 2 opps</span></span></div></div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-pop" style={{ maxWidth: 260 }}>
          <div className="d-row" style={{ marginBottom: 6 }}><span style={{ width: 16, height: 16, borderRadius: 4, background: "var(--secondary)", display: "inline-grid", placeItems: "center", fontSize: 9 }}>🌐</span><b style={{ fontSize: 12, color: "var(--foreground)" }}>stax.dev</b></div>
          <b style={{ fontSize: 12.5, color: "var(--foreground)" }}>Panels inside panels</b>
          <p style={{ margin: "3px 0 0", fontSize: 11.5 }}>The context-preserving workspace framework…</p>
        </div></Zone>
      ) : (
        <Zone><div className="d-pop" style={{ maxWidth: 220 }}>
          <div style={{ ...mono10, marginBottom: 4 }}>Refonte · 30 days</div>
          <div className="d-chart" style={{ height: 40 }}>{[30, 55, 45, 70, 90].map((h, i) => <div key={i} className="bar" style={{ height: h + "%", width: 14 }} />)}</div>
          <div style={{ fontSize: 11, ...muted, marginTop: 4 }}>18 000 € · closes in 12d</div>
        </div></Zone>
      )}<Note>V1 person peek · V2 link preview · V3 metric peek with mini chart — hover previews; the click still opens the real panel.</Note></>);

    case "Input":
      return (<>{v === 1 ? (
        <Zone><input className="d-input" placeholder="Search accounts…" style={{ width: 200 }} readOnly /><input className="d-input" defaultValue="alex@stax.dev" style={{ width: 180 }} readOnly /></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ position: "relative", width: 220 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", ...muted }}>⌕</span>
          <input className="d-input" defaultValue="acme" style={{ width: "100%", paddingLeft: 28, paddingRight: 26 }} readOnly />
          <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", ...muted, cursor: "pointer" }}>×</span>
        </div></Zone>
      ) : (
        <Zone col>
          <input defaultValue="Acme SARL" readOnly style={{ border: "none", borderBottom: "1.5px solid var(--foreground)", background: "transparent", fontSize: 14, padding: "6px 2px", outline: "none", width: 220, fontFamily: "var(--font-sans)", color: "var(--foreground)" }} />
          <input placeholder="Add a note…" readOnly style={{ border: "none", borderBottom: "1px solid var(--border)", background: "transparent", fontSize: 13, padding: "6px 2px", outline: "none", width: 220, fontFamily: "var(--font-sans)", color: "var(--foreground)" }} />
        </Zone>
      )}<Note>V1 boxed · V2 leading icon + clear · V3 underline-only for editorial forms.</Note></>);

    case "Input Group":
      return (<>{v === 1 ? (
        <Zone><div style={{ display: "inline-flex", alignItems: "stretch" }}>
          <span style={{ border: "1px solid var(--input)", borderRight: "none", borderRadius: "7px 0 0 7px", padding: "8px 10px", fontSize: 12, ...muted, background: "var(--secondary)" }}>https://</span>
          <input className="d-input" defaultValue="stax.dev" style={{ borderRadius: "0 7px 7px 0", width: 120 }} readOnly />
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ display: "inline-flex", alignItems: "stretch" }}>
          <input className="d-input" defaultValue="https://stax.dev/s/8fj2k" style={{ borderRadius: "7px 0 0 7px", width: 190 }} readOnly />
          <button className="d-btn sm" style={{ borderRadius: "0 7px 7px 0" }}>Copy</button>
        </div></Zone>
      ) : (
        <Zone><div style={{ width: 250 }}>
          <input className="d-input" defaultValue="Objet : proposition" style={{ width: "100%", borderRadius: "8px 8px 0 0" }} readOnly />
          <textarea className="d-input" defaultValue="Bonjour Jo, voici la V3…" readOnly style={{ width: "100%", height: 56, borderTop: "none", borderRadius: "0 0 8px 8px", resize: "none" }} />
        </div></Zone>
      )}<Note>V1 prefix affix · V2 input + action button · V3 stacked attached group — one control to the eye.</Note></>);

    case "Input OTP":
      return (<>{v === 1 ? (
        <Zone><div className="d-row" style={{ gap: 5 }}>{["4", "2", "0", "9", "1", ""].map((d, i) => <span key={i} className={"d-otp" + (i === 5 ? " active" : "")}>{d}</span>)}</div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-row" style={{ gap: 5 }}>
          {["4", "2", "0"].map((d, i) => <span key={i} className="d-otp">{d}</span>)}
          <span style={{ ...muted, margin: "0 2px" }}>—</span>
          {["9", "", ""].map((d, i) => <span key={i} className={"d-otp" + (i === 1 ? " active" : "")}>{d}</span>)}
        </div></Zone>
      ) : (
        <Zone><div className="d-row" style={{ gap: 10 }}>
          {["4", "2", "0", "", "", ""].map((d, i) => (
            <span key={i} style={{ width: 24, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 16, color: "var(--foreground)", borderBottom: i === 3 ? "2px solid var(--accent)" : "2px solid var(--border)", paddingBottom: 3 }}>{d}</span>))}
        </div></Zone>
      )}<Note>V1 six boxes · V2 grouped 3–3 · V3 underline slots. Mono digits, tabular width, ring on the active cell.</Note></>);

    case "Item":
      return (<>{v === 1 ? (
        <Zone col><div className="drill" style={{ cursor: "default" }}><span className="no">01</span><span className="bd"><span className="tt" style={{ display: "block" }}>Refonte e-commerce</span><span className="ss" style={{ display: "block" }}>18 000 € · proposition envoyée</span></span><span className="tag">2 ACTS</span><span className="arr">→</span></div></Zone>
      ) : v === 2 ? (
        <Zone col><div className="drill" style={{ cursor: "default" }}>
          <span className="d-check">✓</span>
          <span className="bd"><span className="tt" style={{ display: "block" }}>Relancer le devis</span><span className="ss" style={{ display: "block" }}>due vendredi · Jo</span></span>
          <span className="tag accent">P1</span>
        </div></Zone>
      ) : (
        <Zone col><div className="drill" style={{ cursor: "grab" }}>
          <span style={{ ...muted, letterSpacing: 2 }}>⋮⋮</span>
          <span className="bd"><span className="tt" style={{ display: "block" }}>Écrans clés</span><span className="ss" style={{ display: "block" }}>drag to reorder — references only</span></span>
          <span style={muted}>⋯</span>
        </div></Zone>
      )}<Note>V1 our drill row (the signature interaction) · V2 checkable task item · V3 draggable item with a grip.</Note></>);

    case "Kbd":
      return (<>{v === 1 ? (
        <Zone><span className="kbd">⌘K</span><span className="kbd">⌘B</span><span className="kbd">esc</span><span className="kbd">↵</span></Zone>
      ) : v === 2 ? (
        <Zone><span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Press <span className="kbd" style={{ minWidth: 0 }}>⌘</span> <span className="kbd" style={{ minWidth: 0 }}>K</span> then type <b>laws</b></span></Zone>
      ) : (
        <Zone><div className="d-col" style={{ width: 190 }}>
          {[["Command palette", "⌘K"], ["Toggle sidebar", "⌘B"], ["Close panel", "esc"]].map(([a, k]) => (
            <div key={a} className="d-row" style={{ justifyContent: "space-between" }}><span style={{ fontSize: 12, color: "var(--ink-2)" }}>{a}</span><span className="kbd">{k}</span></div>))}
        </div></Zone>
      )}<Note>V1 keycaps · V2 inline in a sentence · V3 cheat-sheet rows pairing action and combo. Border-bottom 2px gives the cap its depth.</Note></>);

    case "Label":
      return (<>{v === 1 ? (
        <Zone><label className="d-row" style={{ fontWeight: 500 }}><span className="d-check">✓</span>Notify the owner</label></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-col" style={{ maxWidth: 240 }}>
          <label style={{ fontSize: 12.5, fontWeight: 500 }}>Legal name <span style={{ color: "var(--accent)" }}>*</span> <span style={{ ...muted, cursor: "help" }} title="As registered">ⓘ</span></label>
          <input className="d-input" readOnly />
        </div></Zone>
      ) : (
        <Zone col>
          <div style={{ ...mono10, letterSpacing: "0.14em" }}>Billing details</div>
          <Ph h={10} w="80%" /><Ph h={10} w="65%" />
        </Zone>
      )}<Note>V1 binds a control · V2 required + help affordance · V3 mono section label structuring a form.</Note></>);

    case "Marker":
      return (<>{v === 1 ? (
        <Zone><div className="d-card" style={{ width: 220, height: 70, position: "relative", padding: "14px 16px" }}>
          <Ph w="70%" h={7} /><div style={{ height: 6 }} /><Ph w="45%" h={7} />
          <span className="d-marker" style={{ position: "absolute", top: 6, left: 10 }} />
          <span style={{ position: "absolute", top: 10, left: 36, ...mono10 }}>1</span>
          <span className="d-marker" style={{ position: "absolute", top: 24, right: 34 }} />
          <span style={{ position: "absolute", top: 28, right: 16, ...mono10 }}>2</span>
          <span className="d-marker" style={{ position: "absolute", bottom: 4, left: 96 }} />
          <span style={{ position: "absolute", bottom: 8, left: 122, ...mono10 }}>3</span>
        </div></Zone>
      ) : v === 2 ? (
        <Zone>{[1, 2, 3].map((n) => (
          <span key={n} style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: n === 2 ? "var(--accent)" : "var(--foreground)", color: "var(--background)", display: "grid", placeItems: "center", fontSize: 11, fontFamily: "var(--font-mono)" }}>{n}</span>
            <span style={{ width: 2, height: 8, background: n === 2 ? "var(--accent)" : "var(--foreground)" }} />
          </span>))}</Zone>
      ) : (
        <Zone><span style={{ position: "relative", display: "inline-grid", placeItems: "center", width: 34, height: 34 }}>
          <span style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid var(--accent)", opacity: 0.35 }} />
          <span style={{ position: "absolute", inset: 7, borderRadius: "50%", border: "2px solid var(--accent)", opacity: 0.7 }} />
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />
        </span></Zone>
      )}<Note>V1 annotation pins on a canvas · V2 numbered stops · V3 pulse locus. On a canvas panel, clicking one drills its inspector.</Note></>);

    case "Menubar":
      return (<>{v === 1 ? (
        <Zone><div style={{ display: "inline-flex", gap: 2, border: "1px solid var(--border)", borderRadius: 8, padding: 3 }}>
          {["File", "Edit", "View", "Help"].map((m, i) => <span key={m} className="d-tab" style={i === 0 ? { background: "var(--secondary)", color: "var(--foreground)", borderRadius: 6 } : undefined}>{m}</span>)}
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div style={{ display: "inline-flex", gap: 2, border: "1px solid var(--border)", borderRadius: 8, padding: 3 }}>
            {["File", "Edit", "View", "Help"].map((m, i) => <span key={m} className="d-tab" style={i === 0 ? { background: "var(--secondary)", color: "var(--foreground)", borderRadius: 6 } : undefined}>{m}</span>)}
          </div>
          <div className="d-menu" style={{ width: 150, marginTop: 4 }}>
            <div className="it">New deal<span className="k">⌘N</span></div>
            <div className="it">Duplicate<span className="k">⌘D</span></div>
            <div className="d-sep" style={{ margin: "4px 0" }} />
            <div className="it">Export…<span className="k">⇧⌘E</span></div>
          </div>
        </div></Zone>
      ) : (
        <Zone><div className="d-row" style={{ width: "100%", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 10px" }}>
          <span style={{ ...mono10 }}>STAX</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12.5 }}>File</span><span style={{ fontSize: 12.5 }}>Edit</span><span style={{ fontSize: 12.5 }}>View</span>
          <span style={{ flex: 1 }} />
          <span className="kbd">⌘K</span>
        </div></Zone>
      )}<Note>V1 desktop menus · V2 open File menu with shortcuts · V3 app-bar chrome with palette hint. In this shell the CommandBar + palette replace most of it.</Note></>);

    case "Message":
      return (<>{v === 1 ? (
        <Zone col>
          <div className="d-msg"><span style={{ color: "var(--accent)" }}>✶</span> I can see your open stack — it is my working memory.</div>
          <div className="d-msg me" style={{ alignSelf: "flex-end" }}>What are the laws?</div>
        </Zone>
      ) : v === 2 ? (
        <Zone col>
          <div className="d-row" style={{ alignItems: "flex-start" }}>
            <span className="d-avatar" style={{ width: 24, height: 24, fontSize: 9 }}>JL</span>
            <div><div className="d-row" style={{ gap: 6 }}><b style={{ fontSize: 12, color: "var(--foreground)" }}>Jo</b><span style={{ ...mono10, fontSize: 9 }}>14:02</span></div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Le client valide la proposition 🎉</div></div>
          </div>
        </Zone>
      ) : (
        <Zone col>
          <div style={{ alignSelf: "center", fontSize: 10.5, ...muted, background: "var(--secondary)", borderRadius: 9999, padding: "3px 10px" }}>Jo pinned “Refonte e-commerce”</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", color: "var(--ink-2)" }}>agent.ask(&#123; stack &#125;) → 4 panels resolved</div>
        </Zone>
      )}<Note>V1 chat bubbles · V2 avatar + name + time rows · V3 system events + tool-call trace.</Note></>);

    case "Message Scroller":
      return (<>{v === 1 ? (
        <Zone col><div style={{ height: 90, overflow: "hidden", position: "relative", width: "100%" }}>
          <div className="d-col">
            <div className="d-msg" style={{ opacity: 0.4 }}>…earlier</div>
            <div className="d-msg me" style={{ alignSelf: "flex-end" }}>And pinning?</div>
            <div className="d-msg">Pin detaches instead of lying — law 4.</div>
          </div>
          <div style={{ position: "absolute", bottom: 6, right: 6 }} className="d-btn outline sm">↓ 3 new</div>
        </div></Zone>
      ) : v === 2 ? (
        <Zone col>
          <div className="d-row" style={{ gap: 8 }}><span className="d-sep" style={{ flex: 1 }} /><span style={{ ...mono10, fontSize: 9 }}>Today</span><span className="d-sep" style={{ flex: 1 }} /></div>
          <div className="d-msg">On signe vendredi.</div>
          <div className="d-row" style={{ gap: 8 }}><span className="d-sep" style={{ flex: 1 }} /><span style={{ ...mono10, fontSize: 9 }}>Yesterday</span><span className="d-sep" style={{ flex: 1 }} /></div>
          <div className="d-msg me" style={{ alignSelf: "flex-end" }}>Devis renvoyé ✓</div>
        </Zone>
      ) : (
        <Zone col><div style={{ height: 90, overflow: "hidden", position: "relative", width: "100%" }}>
          <div className="d-col" style={{ paddingTop: 20 }}>
            <div className="d-msg">The contract is ready.</div>
            <div className="d-msg me" style={{ alignSelf: "flex-end" }}>Signing it now.</div>
          </div>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 26, background: "linear-gradient(var(--background), transparent)" }} />
          <span style={{ position: "absolute", top: 4, left: "50%", transform: "translateX(-50%)", ...mono10, background: "var(--secondary)", borderRadius: 9999, padding: "3px 10px" }}>Today</span>
        </div></Zone>
      )}<Note>V1 stick-to-bottom + unread jump · V2 date separators · V3 sticky date chip over the scroll fade. Chat panels get all three free.</Note></>);

    case "Native Select":
      return (<>{v === 1 ? (
        <Zone><div className="d-row" style={{ border: "1px solid var(--input)", borderRadius: 7, padding: "8px 11px", fontSize: 12.5, background: "var(--card)" }}>Négociation<span style={{ ...muted, marginLeft: 14 }}>⌄</span></div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-row">
          <span style={{ ...mono10 }}>Sort by</span>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: "var(--foreground)" }}>Amount <span style={{ color: "var(--muted-foreground)" }}>⌄</span></span>
          <span style={{ fontSize: 12, ...muted }}>12 deals</span>
        </div></Zone>
      ) : (
        <Zone><div style={{ border: "1px solid var(--input)", borderRadius: 7, width: 180, overflow: "hidden", background: "var(--card)", fontSize: 12.5 }}>
          {["Découverte", "Proposition", "Négociation"].map((o, i) => (
            <div key={o} style={{ padding: "7px 11px", background: i === 1 ? "var(--primary)" : "transparent", color: i === 1 ? "var(--primary-foreground)" : "var(--ink-2)" }}>{o}</div>))}
        </div></Zone>
      )}<Note>V1 closed trigger · V2 inline ghost sort control in a list header · V3 size=3 listbox. The OS picker wins on mobile PushHost.</Note></>);

    case "Navigation Menu":
      return (<>{v === 1 ? (
        <Zone><div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <div className="d-row" style={{ gap: 14, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: "var(--foreground)" }}>Product <span style={muted}>⌃</span></span>
            <span style={muted}>Pricing</span><span style={muted}>Docs</span>
          </div>
          <div className="d-pop" style={{ marginTop: 6 }}>
            <div style={{ marginBottom: 8 }}><b style={{ fontSize: 12, color: "var(--foreground)" }}>Panels</b><div style={{ fontSize: 10.5, ...muted }}>Navigation grammar</div></div>
            <div><b style={{ fontSize: 12, color: "var(--foreground)" }}>Canvas</b><div style={{ fontSize: 10.5, ...muted }}>Node graphs</div></div>
          </div>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-row" style={{ gap: 2 }}>
          {["Home", "Blocks", "Charts"].map((m, i) => <span key={m} className={"d-tab" + (i === 1 ? " on" : "")} style={{ borderRadius: 7 }}>{m}</span>)}
        </div></Zone>
      ) : (
        <Zone col><div className="d-pop" style={{ maxWidth: 300, width: "100%" }}>
          <div style={{ ...mono10, marginBottom: 8 }}>Product</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["Panels", "Navigation grammar"], ["Canvas", "Node graphs"], ["Agent", "Stack context"], ["Registry", "Copy-paste UI"]].map(([t, s]) => (
              <div key={t}><b style={{ fontSize: 12, color: "var(--foreground)" }}>{t}</b><div style={{ fontSize: 10.5, ...muted }}>{s}</div></div>))}
          </div>
        </div></Zone>
      )}<Note>V1 open trigger + compact viewport · V2 pill nav · V3 mega-menu grid. Inside the app, the dock + palette own navigation.</Note></>);

    case "Pagination":
      return (<>{v === 1 ? (
        <Zone><div className="d-row"><button className="d-btn ghost sm">‹ Prev</button>{["1", "2", "3"].map((p, i) => <button key={p} className={"d-btn sm " + (i === 1 ? "" : "ghost")}>{p}</button>)}<button className="d-btn ghost sm">Next ›</button></div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-row" style={{ fontVariantNumeric: "tabular-nums" }}><button className="d-btn outline sm">‹</button><span style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Page <b style={{ color: "var(--foreground)" }}>2</b> / 12</span><button className="d-btn outline sm">›</button></div></Zone>
      ) : (
        <Zone col>
          <button className="d-btn outline" style={{ alignSelf: "center" }}>Load 20 more</button>
          <div style={{ textAlign: "center", fontSize: 10.5, ...muted, marginTop: 6 }}>40 / 128 loaded</div>
        </Zone>
      )}<Note>V1 numbered · V2 compact stepper · V3 load-more. Collections paginate INSIDE their panel — the stage axis belongs to depth.</Note></>);

    case "Popover":
      return (<>{v === 1 ? (
        <Zone><div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
          <button className="d-btn outline sm">◷ Remind me</button>
          <div style={{ position: "relative", marginTop: 9 }}>
            <div className="d-pop">
              Set a reminder for this deal — one small decision, anchored.
              <div className="d-row" style={{ marginTop: 8 }}><span className="tag">Tomorrow</span><span className="tag">Next week</span></div>
            </div>
            <span style={{ position: "absolute", top: -5, left: 24, width: 10, height: 10, background: "var(--card)", borderLeft: "1px solid var(--border)", borderTop: "1px solid var(--border)", transform: "rotate(45deg)" }} />
          </div>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ position: "relative" }}>
          <div className="d-pop" style={{ maxWidth: 230 }}>
            <b style={{ fontSize: 12.5, color: "var(--foreground)" }}>Share this stack</b>
            <p style={{ margin: "4px 0 10px", fontSize: 11.5 }}>Anyone with the link lands on these exact panels.</p>
            <div className="d-row"><button className="d-btn sm">Copy link</button><button className="d-btn ghost sm">Later</button></div>
          </div>
          <span style={{ position: "absolute", top: -5, left: 24, width: 10, height: 10, background: "var(--card)", borderLeft: "1px solid var(--border)", borderTop: "1px solid var(--border)", transform: "rotate(45deg)" }} />
        </div></Zone>
      ) : (
        <Zone><div className="d-pop" style={{ maxWidth: 190 }}>
          <div style={{ ...mono10, marginBottom: 6 }}>Accent</div>
          <div className="d-row" style={{ gap: 6 }}>
            {["oklch(0.578 0.245 27)", "#3452D9", "#7C3AED", "#0F7B4D", "#D97706"].map((c) => <span key={c} style={{ width: 18, height: 18, borderRadius: "50%", background: c, border: c.startsWith("o") ? "2px solid var(--foreground)" : "none" }} />)}
          </div>
        </div></Zone>
      )}<Note>V1 trigger-anchored with arrow + quick options · V2 titled with arrow + actions · V3 picker popover. First in the Escape precedence chain.</Note></>);

    case "Progress":
      return (<>{v === 1 ? (
        <Zone col><div className="d-prog"><div className="fill" /></div><div className="usage-track" style={{ width: 180 }}><div className="usage-fill" style={{ width: "62%" }} /></div></Zone>
      ) : v === 2 ? (
        <Zone><svg width="64" height="64" viewBox="0 0 42 42">
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--secondary)" strokeWidth="5" />
          <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--accent)" strokeWidth="5" strokeDasharray="62 38" strokeDashoffset="25" strokeLinecap="round" />
          <text x="21" y="24" textAnchor="middle" style={{ font: "600 9px var(--font-sans)", fill: "var(--foreground)" }}>62%</text>
        </svg></Zone>
      ) : (
        <Zone><div className="d-row" style={{ gap: 4 }}>
          {[1, 1, 1, 0, 0].map((on, i) => <span key={i} style={{ width: 30, height: 6, borderRadius: 3, background: on ? "var(--accent)" : "var(--secondary)", border: "1px solid var(--border)" }} />)}
          <span style={{ fontSize: 11, ...muted, marginLeft: 6 }}>Step 3 / 5</span>
        </div></Zone>
      )}<Note>V1 linear bars · V2 ring with value · V3 segmented steps. The sidebar PIPELINE bar is V1 with the accent fill.</Note></>);

    case "Radio Group":
      return (<>{v === 1 ? (
        <Zone col><label className="d-row"><span className="d-radio on" />Last writer wins</label><label className="d-row"><span className="d-radio" />Manual merge</label></Zone>
      ) : v === 2 ? (
        <Zone>{[["Monthly", "12€", true], ["Yearly", "120€", false]].map(([l, p, on]) => (
          <div key={l as string} style={{ width: 120, border: on ? "2px solid var(--primary)" : "1px solid var(--border)", borderRadius: 10, padding: "10px 12px", background: "var(--card)" }}>
            <div className="d-row" style={{ justifyContent: "space-between" }}><b style={{ fontSize: 12.5, color: "var(--foreground)" }}>{l as string}</b><span className={"d-radio" + (on ? " on" : "")} /></div>
            <div style={{ fontSize: 11, ...muted }}>{p as string} / mois</div>
          </div>))}</Zone>
      ) : (
        <Zone><div className="d-tabs">{["Low", "Medium", "High"].map((l, i) => <span key={l} className={"d-tab" + (i === 2 ? " on" : "")}>{l}</span>)}</div></Zone>
      )}<Note>V1 classic dots · V2 selectable plan cards · V3 button-radio group. One choice among few, inline in the body.</Note></>);

    case "Resizable":
      return (<>{v === 1 ? (
        <Zone><div style={{ display: "flex", width: 240, height: 70, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ flex: 1, background: "var(--card)", display: "grid", placeItems: "center", ...mono10 }}>PANEL A</div>
          <div style={{ width: 5, background: "var(--secondary)", borderInline: "1px solid var(--border)", cursor: "col-resize", position: "relative" }}><span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 8, color: "var(--muted-foreground)" }}>⋮</span></div>
          <div style={{ flex: 1, background: "var(--card)", display: "grid", placeItems: "center", ...mono10 }}>PANEL B</div>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ display: "flex", width: 240, height: 90, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ flex: 1, background: "var(--card)", display: "grid", placeItems: "center", ...mono10 }}>LIST</div>
          <div style={{ width: 5, background: "var(--secondary)", borderInline: "1px solid var(--border)", cursor: "col-resize", position: "relative" }}><span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 8, color: "var(--muted-foreground)" }}>⋮</span></div>
          <div style={{ width: 96, display: "flex", flexDirection: "column" }}>
            <div style={{ flex: 1, background: "var(--card)", display: "grid", placeItems: "center", ...mono10 }}>DETAIL</div>
            <div style={{ height: 5, background: "var(--secondary)", borderBlock: "1px solid var(--border)", cursor: "row-resize", position: "relative" }}><span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 8, color: "var(--muted-foreground)" }}>⋯</span></div>
            <div style={{ flex: 1, background: "var(--card)", display: "grid", placeItems: "center", ...mono10 }}>LOG</div>
          </div>
        </div></Zone>
      ) : (
        <Zone><div style={{ display: "flex", width: 260, height: 70, border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ width: 60, background: "var(--secondary)", display: "grid", placeItems: "center", ...mono10 }}>NAV</div>
          <div style={{ width: 5, background: "var(--card)", borderInline: "1px solid var(--border)", cursor: "col-resize", position: "relative" }}><span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 8, color: "var(--muted-foreground)" }}>⋮</span></div>
          <div style={{ flex: 1, background: "var(--card)", display: "grid", placeItems: "center", ...mono10 }}>MAIN</div>
          <div style={{ width: 5, background: "var(--card)", borderInline: "1px solid var(--border)", cursor: "col-resize", position: "relative" }}><span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: 8, color: "var(--muted-foreground)" }}>⋮</span></div>
          <div style={{ width: 70, background: "var(--secondary)", display: "grid", placeItems: "center", ...mono10 }}>AUX</div>
        </div></Zone>
      )}<Note>V1 two-pane with grip handle · V2 nested L-split — list, detail, log · V3 three panes. INSIDE one panel resize freely; between panels the size grammar rules.</Note></>);

    case "Scroll Area":
      return (<>{v === 1 ? (
        <Zone><div style={{ width: 220, height: 80, overflow: "hidden", position: "relative", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", fontSize: 12, color: "var(--ink-2)" }}>
          Panel bodies scroll alone — the bar and the foot never move…
          <div style={{ position: "absolute", right: 3, top: 10, width: 4, height: 30, borderRadius: 9999, background: "var(--border)" }} />
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ width: 240, position: "relative", overflow: "hidden" }}>
          <div className="d-row" style={{ gap: 6 }}>
            {["design", "urgent", "q3", "legal", "won", "churn"].map((t) => <span key={t} className="tag" style={{ flex: "none" }}>{t.toUpperCase()}</span>)}
          </div>
          <span style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 34, background: "linear-gradient(90deg, transparent, var(--background))" }} />
        </div></Zone>
      ) : (
        <Zone><div style={{ width: 200, height: 80, border: "1px solid var(--border)", borderRadius: 10, position: "relative", background: "var(--card)", overflow: "hidden" }}>
          <div style={{ width: 320, padding: "8px 10px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--muted-foreground)" }}>
            <div style={{ display: "flex", gap: 18, textTransform: "uppercase", letterSpacing: "0.08em", borderBottom: "1px solid var(--border)", paddingBottom: 4 }}><span style={{ width: 80 }}>Deal</span><span style={{ width: 70 }}>Stage</span><span style={{ width: 60 }}>Amount</span><span>Owner</span></div>
            <div style={{ display: "flex", gap: 18, paddingTop: 6, color: "var(--ink-2)" }}><span style={{ width: 80 }}>Refonte</span><span style={{ width: 70 }}>Proposal</span><span style={{ width: 60 }}>18 000</span><span>JL</span></div>
            <div style={{ display: "flex", gap: 18, paddingTop: 5, color: "var(--ink-2)" }}><span style={{ width: 80 }}>Migration</span><span style={{ width: 70 }}>Discovery</span><span style={{ width: 60 }}>13 500</span><span>MV</span></div>
          </div>
          <div style={{ position: "absolute", right: 3, top: 8, width: 4, height: 26, borderRadius: 9999, background: "var(--border)" }} />
          <div style={{ position: "absolute", bottom: 3, left: 8, height: 4, width: 60, borderRadius: 9999, background: "var(--border)" }} />
        </div></Zone>
      )}<Note>V1 vertical · V2 horizontal chips with fade edge · V3 both axes clipping a wide table slice. The body is the only vertical scroller in a column.</Note></>);

    case "Select":
      return (<>{v === 1 ? (
        <Zone col>
          <div className="d-row" style={{ border: "1px solid var(--input)", borderRadius: 7, padding: "8px 11px", fontSize: 12.5, background: "var(--card)", width: 180, justifyContent: "space-between" }}>Proposition<span style={muted}>⌄</span></div>
          <div className="d-menu" style={{ width: 180 }}><div className="it">Découverte</div><div className="it" style={{ background: "var(--secondary)" }}>Proposition ✓</div><div className="it">Négociation</div></div>
        </Zone>
      ) : v === 2 ? (
        <Zone><div className="d-menu" style={{ width: 200 }}>
          <div style={{ ...mono10, padding: "5px 9px 3px" }}>Open</div>
          <div className="it">Découverte</div><div className="it" style={{ background: "var(--secondary)" }}>Proposition ✓</div>
          <div style={{ ...mono10, padding: "8px 9px 3px" }}>Closed</div>
          <div className="it">Won</div><div className="it">Lost</div>
        </div></Zone>
      ) : (
        <Zone><div className="d-menu" style={{ width: 210 }}>
          {[["JL", "Jo Lambert", true], ["MV", "Max Verne", false], ["LF", "Léa Fontaine", false]].map(([a, nm, on]) => (
            <div key={nm as string} className="it" style={on ? { background: "var(--secondary)" } : undefined}>
              <span className="d-avatar" style={{ width: 20, height: 20, fontSize: 8 }}>{a as string}</span><span style={{ flex: 1 }}>{nm as string}</span>{!!on && <span style={{ color: "var(--accent)" }}>✓</span>}
            </div>))}
        </div></Zone>
      )}<Note>V1 trigger + menu · V2 grouped options · V3 rich options with avatars. Data change, never navigation.</Note></>);

    case "Separator":
      return (<>{v === 1 ? (
        <Zone col><div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Contacts</div><div className="d-sep" /><div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>Opportunities</div></Zone>
      ) : v === 2 ? (
        <Zone col><div className="d-row" style={{ gap: 10 }}><span className="d-sep" style={{ flex: 1 }} /><span style={{ ...mono10 }}>or</span><span className="d-sep" style={{ flex: 1 }} /></div></Zone>
      ) : (
        <Zone><div className="d-row" style={{ fontSize: 12.5, color: "var(--ink-2)", gap: 10 }}>Docs<span style={{ width: 1, height: 14, background: "var(--border)" }} />API<span style={{ width: 1, height: 14, background: "var(--border)" }} />Support</div></Zone>
      )}<Note>V1 horizontal · V2 labeled "or" · V3 vertical between inline items. Always 1px of --border.</Note></>);

    case "Sheet":
      return (<>{v === 1 ? (
        <Zone><div style={{ width: 150, height: 100, border: "1px solid var(--border)", borderRadius: 10, position: "relative", overflow: "hidden", background: "var(--background)" }}>
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: 64, background: "var(--card)", borderLeft: "1px solid var(--border)", boxShadow: "var(--shadow-lg)", padding: 6, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}>
              <span style={{ flex: 1 }}><Ph h={5} w="60%" /></span>
              <span style={{ fontSize: 9, color: "var(--muted-foreground)", lineHeight: 1 }}>×</span>
            </div>
            <Ph h={4} /><div style={{ height: 4 }} /><Ph h={4} w="80%" />
            <div style={{ marginTop: "auto", borderTop: "1px solid var(--border)", paddingTop: 5 }}><Ph h={5} w="45%" /></div>
          </div>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ width: 150, height: 100, border: "1px solid var(--border)", borderRadius: 10, position: "relative", overflow: "hidden", background: "var(--background)" }}>
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 44, background: "var(--card)", borderTop: "1px solid var(--border)", boxShadow: "var(--shadow-lg)" }}>
            <div style={{ width: 26, height: 3, borderRadius: 9999, background: "var(--border)", margin: "5px auto" }} />
          </div>
        </div></Zone>
      ) : (
        <Zone><div style={{ width: 150, height: 100, border: "1px solid var(--border)", borderRadius: 10, position: "relative", overflow: "hidden", background: "var(--background)" }}>
          <div style={{ position: "absolute", inset: 0, background: "oklch(0.145 0 0 / 0.3)" }} />
          <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: 70, background: "var(--card)", borderRight: "1px solid var(--border)", padding: 6 }}><Ph h={5} w="70%" /><div style={{ height: 4 }} /><Ph h={5} /></div>
        </div></Zone>
      )}<Note>V1 right utility with header, fields and pinned footer · V2 bottom with handle · V3 left with scrim. shadcn's Sheet = our UtilityDrawer — never an in-page panel.</Note></>);

    case "Sidebar":
      return (<>{v === 1 ? (
        <Zone><div style={{ width: 130, border: "1px solid var(--border)", borderRadius: 10, background: "var(--card)", padding: "10px 6px" }}>
          <div style={{ ...mono10, fontSize: 8.5, padding: "0 6px 6px" }}>Framework</div>
          {["Overview", "The laws"].map((l, i) => <div key={l} style={{ padding: "6px 8px", borderRadius: 7, fontSize: 11.5, fontWeight: 500, background: i === 0 ? "var(--secondary)" : "transparent", color: i === 0 ? "var(--foreground)" : "var(--ink-2)" }}>{l}</div>)}
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ width: 44, border: "1px solid var(--border)", borderRadius: 10, background: "var(--card)", padding: "8px 6px", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          {["◧", "◪", "▤", "⚙"].map((ic, i) => <span key={i} style={{ width: 30, height: 30, borderRadius: 7, display: "grid", placeItems: "center", background: i === 0 ? "var(--secondary)" : "transparent", color: i === 0 ? "var(--foreground)" : "var(--muted-foreground)", fontSize: 13 }}>{ic}</span>)}
        </div></Zone>
      ) : (
        <Zone><div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: 10, overflow: "hidden", background: "var(--card)" }}>
          <div style={{ width: 38, borderRight: "1px solid var(--border)", padding: "8px 5px", display: "flex", flexDirection: "column", gap: 6, alignItems: "center", background: "var(--secondary)" }}>
            {["◧", "▤"].map((ic, i) => <span key={i} style={{ fontSize: 12, color: i === 0 ? "var(--foreground)" : "var(--muted-foreground)" }}>{ic}</span>)}
          </div>
          <div style={{ width: 96, padding: "8px 8px" }}><div style={{ ...mono10, fontSize: 8 }}>CRM</div><div style={{ fontSize: 11, fontWeight: 500, marginTop: 4 }}>Comptes</div><div style={{ fontSize: 11, ...muted }}>Rapports</div></div>
        </div></Zone>
      )}<Note>V1 our dock · V2 icon rail collapsed · V3 double sidebar (rail + panel). It launches Spaces; it never holds content.</Note></>);

    case "Skeleton":
      return (<>{v === 1 ? (
        <Zone col><div className="d-row"><div className="d-skel" style={{ width: 30, height: 30, borderRadius: "50%" }} /><div className="d-col" style={{ gap: 6 }}><div className="d-skel" style={{ height: 11, width: 130 }} /><div className="d-skel" style={{ height: 9, width: 90 }} /></div></div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ width: 200 }}>
          <div className="d-skel" style={{ height: 72, borderRadius: 10, marginBottom: 8 }} />
          <div className="d-skel" style={{ height: 11, width: "75%", marginBottom: 5 }} />
          <div className="d-skel" style={{ height: 9, width: "50%" }} />
        </div></Zone>
      ) : (
        <Zone col>{[1, 2, 3].map((r) => (
          <div key={r} className="d-row" style={{ gap: 10 }}>
            <div className="d-skel" style={{ height: 9, width: 60 }} /><div className="d-skel" style={{ height: 9, flex: 1 }} /><div className="d-skel" style={{ height: 9, width: 40 }} />
          </div>))}</Zone>
      )}<Note>V1 list row · V2 card · V3 table rows. A panel opens INSTANTLY with its skeleton while load(params) resolves.</Note></>);

    case "Slider":
      return (<>{v === 1 ? (
        <Zone><div className="d-slider"><div className="fill" /><div className="thumb" /></div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-slider" style={{ width: 180 }}>
          <div className="fill" style={{ inset: "0 30% 0 20%" }} />
          <div className="thumb" style={{ left: "20%" }} /><div className="thumb" style={{ left: "70%" }} />
        </div></Zone>
      ) : (
        <Zone><div style={{ width: 180, position: "relative", paddingTop: 16 }}>
          <span style={{ position: "absolute", top: -4, left: "55%", transform: "translateX(-50%)", background: "var(--foreground)", color: "var(--background)", fontSize: 10, borderRadius: 5, padding: "2px 6px", fontVariantNumeric: "tabular-nums" }}>55</span>
          <div className="d-slider" style={{ width: "100%" }}>
            {[0, 25, 50, 75, 100].map((t) => <span key={t} style={{ position: "absolute", left: t + "%", top: 7, width: 1, height: 4, background: "var(--ink-4)" }} />)}
            <div className="fill" /><div className="thumb" />
          </div>
        </div></Zone>
      )}<Note>V1 single value · V2 range (two thumbs) · V3 ticks + value bubble. Discrete presets prefer a Toggle Group.</Note></>);

    case "Sonner":
      return (<>{v === 1 ? (
        <Zone>
          <div className="d-pop" style={{ maxWidth: 260, display: "flex", gap: 10, alignItems: "center" }}>
            <span className="d-spin" style={{ width: 12, height: 12 }} />Exporting 128 rows…
          </div>
          <div className="d-pop" style={{ maxWidth: 260 }}>✓ deals-q3.csv ready</div>
        </Zone>
      ) : v === 2 ? (
        <Zone><div style={{ position: "relative", width: 230, height: 74 }}>
          {[2, 1, 0].map((i) => (
            <div key={i} className="d-pop" style={{ position: "absolute", top: i * 8, left: i * 4, right: i * 4, padding: "9px 12px", fontSize: 12, opacity: 1 - i * 0.25 }}>{i === 0 ? "Contact saved" : "…"}</div>))}
        </div></Zone>
      ) : (
        <Zone><div style={{ display: "flex", flexDirection: "column", gap: 6, width: 230 }}>
          <button className="d-btn ghost sm" style={{ alignSelf: "flex-end" }}>Clear all</button>
          {["Contact saved", "Panel pinned", "Export ready"].map((t) => (
            <div key={t} className="d-pop" style={{ maxWidth: "none", padding: "9px 12px", fontSize: 12 }}>{t}</div>))}
        </div></Zone>
      )}<Note>V1 promise toast — loading resolves into its result · V2 collapsed stack · V3 expanded queue with Clear all. Transient — state lives in the panels.</Note></>);

    case "Spinner":
      return (<>{v === 1 ? (
        <Zone><span className="d-spin" /><button className="d-btn outline sm" style={{ display: "inline-flex", gap: 7, alignItems: "center" }}><span className="d-spin" style={{ width: 12, height: 12 }} />Saving…</button></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-row" style={{ gap: 4 }}>
          {[0, 1, 2].map((i) => <span key={i} className="d-skel" style={{ width: 7, height: 7, borderRadius: "50%", animationDelay: i * 0.18 + "s" }} />)}
        </div></Zone>
      ) : (
        <Zone><div style={{ width: 180, height: 4, borderRadius: 9999, background: "var(--secondary)", overflow: "hidden", position: "relative" }}>
          <span style={{ position: "absolute", left: "30%", width: "35%", top: 0, bottom: 0, background: "var(--foreground)", borderRadius: 9999 }} />
        </div></Zone>
      )}<Note>V1 ring · V2 pulsing dots · V3 indeterminate bar. For whole panels prefer the Skeleton — shape beats motion.</Note></>);

    case "Switch":
      return (<>{v === 1 ? (
        <Zone><label className="d-row"><span className="d-switch on" />Realtime sync</label><label className="d-row"><span className="d-switch" />Compact spacing</label></Zone>
      ) : v === 2 ? (
        <Zone>
          <label className="d-row">
            <span style={{ width: 56, height: 26, borderRadius: 9999, background: "var(--primary)", position: "relative", display: "inline-block", flex: "none" }}>
              <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", left: 9, fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--background)" }}>ON</span>
              <span style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "var(--card)" }} />
            </span>
            Autosave
          </label>
          <label className="d-row">
            <span style={{ width: 56, height: 26, borderRadius: 9999, background: "var(--border)", position: "relative", display: "inline-block", flex: "none" }}>
              <span style={{ position: "absolute", top: 3, left: 3, width: 20, height: 20, borderRadius: "50%", background: "var(--card)" }} />
              <span style={{ position: "absolute", top: "50%", transform: "translateY(-50%)", right: 9, fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted-foreground)" }}>OFF</span>
            </span>
            Public link
          </label>
        </Zone>
      ) : (
        <Zone><div className="d-card" style={{ display: "flex", gap: 12, alignItems: "center", maxWidth: 300 }}>
          <span style={{ flex: 1 }}><b style={{ fontSize: 12.5, color: "var(--foreground)" }}>Presence</b><br /><span style={{ fontSize: 11, ...muted }}>Show who is viewing each panel.</span></span>
          <span className="d-switch on" />
        </div></Zone>
      )}<Note>V1 inline toggles · V2 labeled-track anatomy — state text lives inside the control · V3 setting-row card. Device-local preference, never navigation state.</Note></>);

    case "Table":
      return (<>{v === 1 ? (
        <Zone col><table className="d-table"><thead><tr><th>Contact</th><th>Role</th></tr></thead>
          <tbody><tr><td>Jo Lambert</td><td>Head of operations</td></tr><tr><td>Max Verne</td><td>Procurement</td></tr></tbody></table></Zone>
      ) : v === 2 ? (
        <Zone col>
          <div style={{ fontSize: 11, color: "var(--muted-foreground)", fontStyle: "italic" }}>Open opportunities — July 2026</div>
          <table className="d-table"><thead><tr><th>Deal</th><th style={{ textAlign: "right" }}>€</th></tr></thead>
            <tbody><tr><td>Refonte</td><td style={{ textAlign: "right" }}>18 000</td></tr><tr><td>Migration</td><td style={{ textAlign: "right" }}>13 500</td></tr>
              <tr><td style={{ fontWeight: 600, color: "var(--foreground)" }}>Total</td><td style={{ textAlign: "right", fontWeight: 600, color: "var(--foreground)", borderTop: "2px solid var(--foreground)" }}>31 500</td></tr></tbody></table>
        </Zone>
      ) : (
        <Zone col><table className="d-table" style={{ fontSize: 12 }}>
          <thead><tr><th style={{ width: 24 }} /><th>Name</th><th>Tags</th><th>Owner</th><th>Status</th></tr></thead>
          <tbody>
            {[[1, "Refonte e-commerce", ["design", "q3"], "JL", ["In progress", "var(--accent-3)"]], [0, "Migration cloud", ["infra"], "LF", ["Done", "var(--foreground)"]]].map(([chk, nm, tags, av, st]) => (
              <tr key={nm as string}>
                <td><span className={"d-check" + (chk ? "" : " off")} style={{ width: 13, height: 13 }}>{chk ? "✓" : ""}</span></td>
                <td style={{ fontWeight: 500, color: "var(--foreground)" }}>◆ {nm as string}</td>
                <td><span className="d-row" style={{ gap: 3 }}>{(tags as string[]).map((t) => <span key={t} className="tag" style={{ fontSize: 8 }}>{t.toUpperCase()}</span>)}</span></td>
                <td><span className="d-avatar" style={{ width: 18, height: 18, fontSize: 7 }}>{av as string}</span></td>
                <td><span className="d-badge outline" style={{ display: "inline-flex", gap: 5, alignItems: "center", fontSize: 10 }}><span style={{ width: 6, height: 6, borderRadius: 9999, background: (st as string[])[1] }} />{(st as string[])[0]}</span></td>
              </tr>))}
          </tbody>
        </table></Zone>
      )}<Note>V1 basic · V2 caption + totals footer · V3 Notion-style composed table — checkbox, icon+name, tag pills, avatar, status column. Every row stays a DrillTrigger.</Note></>);

    case "Tabs":
      return (<>{v === 1 ? (
        <Zone><div className="d-tabs"><span className="d-tab on">List</span><span className="d-tab">Kanban</span><span className="d-tab">Timeline</span></div></Zone>
      ) : v === 2 ? (
        <Zone><div className="d-row" style={{ gap: 16, borderBottom: "1px solid var(--border)", width: "100%", maxWidth: 280, paddingBottom: 0 }}>
          {["Details", "Activity", "Files"].map((t, i) => (
            <span key={t} style={{ paddingBottom: 8, fontSize: 12.5, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? "var(--foreground)" : "var(--muted-foreground)", borderBottom: i === 0 ? "2px solid var(--accent)" : "2px solid transparent", marginBottom: -1 }}>{t}</span>))}
        </div></Zone>
      ) : (
        <Zone><div style={{ display: "flex", alignItems: "flex-end" }}>
          {["Deals", "Won", "Lost"].map((t, i) => (
            <span key={t} style={{ padding: "7px 14px", fontSize: 12, border: "1px solid var(--border)", borderBottom: i === 0 ? "1px solid var(--card)" : "1px solid var(--border)", borderRadius: "8px 8px 0 0", marginLeft: i ? -1 : 0, background: i === 0 ? "var(--card)" : "var(--secondary)", color: i === 0 ? "var(--foreground)" : "var(--muted-foreground)", fontWeight: i === 0 ? 600 : 500 }}>{t}</span>))}
        </div></Zone>
      )}<Note>V1 segmented well · V2 underline with accent · V3 folder tabs. They switch REPRESENTATION — never navigation.</Note></>);

    case "Textarea":
      return (<>{v === 1 ? (
        <Zone><textarea className="d-input" style={{ width: "100%", maxWidth: 280, height: 70, resize: "none" }} defaultValue="Compte-rendu : périmètre validé…" readOnly /></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ width: "100%", maxWidth: 280 }}>
          <div className="d-row" style={{ gap: 4, marginBottom: 5 }}>{["B", "I", "🔗", "≡"].map((t) => <button key={t} className="d-toggle" style={{ padding: "3px 8px", fontSize: 11 }}>{t}</button>)}</div>
          <textarea className="d-input" style={{ width: "100%", height: 60, resize: "none" }} defaultValue="**Périmètre** validé avec Jo…" readOnly />
          <div style={{ textAlign: "right", fontSize: 10, ...muted, marginTop: 3 }}>142 / 500</div>
        </div></Zone>
      ) : (
        <Zone><div style={{ display: "flex", gap: 8, alignItems: "flex-end", width: "100%", maxWidth: 300, border: "1px solid var(--input)", borderRadius: 12, padding: 8, background: "var(--card)" }}>
          <textarea style={{ flex: 1, border: "none", outline: "none", resize: "none", height: 38, fontSize: 12.5, fontFamily: "var(--font-sans)", background: "transparent", color: "var(--foreground)" }} defaultValue="Ask about the framework…" readOnly />
          <button className="d-btn sm">↑</button>
        </div></Zone>
      )}<Note>V1 plain · V2 toolbar + counter · V3 chat composer. The save action still belongs to the panel foot.</Note></>);

    case "Toast":
      return (<>{v === 1 ? (
        <Zone><div className="d-pop" style={{ display: "flex", gap: 10, alignItems: "center", maxWidth: 280 }}>
          <span style={{ color: "var(--foreground)" }}>✓</span><span style={{ flex: 1 }}>Contact saved.</span><button className="d-btn ghost sm">Undo</button>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div className="toast" style={{ position: "static", transform: "none" }}>Pinned — survives every page</div></Zone>
      ) : (
        <Zone><div className="d-pop" style={{ maxWidth: 290, display: "flex", gap: 10 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: "var(--accent-soft)", color: "var(--accent)", display: "grid", placeItems: "center", flex: "none" }}>↧</span>
          <span style={{ flex: 1 }}><b style={{ fontSize: 12.5, color: "var(--foreground)" }}>Export ready</b><br /><span style={{ fontSize: 11.5, ...muted }}>128 rows → deals-q3.csv</span></span>
          <span style={{ ...muted, cursor: "pointer" }}>×</span>
        </div></Zone>
      )}<Note>V1 action toast · V2 the minimal mono pill · V3 rich icon + title + description. All transient.</Note></>);

    case "Toggle":
      return (<>{v === 1 ? (
        <Zone><button className="d-toggle on">B</button><button className="d-toggle" style={{ fontStyle: "italic" }}>I</button><button className="d-toggle" style={{ textDecoration: "underline" }}>U</button></Zone>
      ) : v === 2 ? (
        <Zone><button className="d-toggle on" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>📌 Pinned</button><button className="d-toggle" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>◐ Dark</button></Zone>
      ) : (
        <Zone>
          <div style={{ width: 210, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--input)", background: "var(--card)", borderRadius: 7, padding: "5px 6px 5px 10px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--foreground)" }}>
            sk_live_ ••••••••
            <button className="d-toggle on" style={{ padding: "3px 8px", fontSize: 10 }}>REVEAL</button>
          </div>
          <div style={{ width: 210, display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--input)", background: "var(--card)", borderRadius: 7, padding: "5px 6px 5px 10px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--foreground)" }}>
            whsec_ ••••••••
            <button className="d-toggle" style={{ padding: "3px 8px", fontSize: 10 }}>REVEAL</button>
          </div>
        </Zone>
      )}<Note>V1 formatting trio · V2 labeled state toggles (our PIN pill) · V3 toggle embedded inside another control. aria-pressed carries the state.</Note></>);

    case "Toggle Group":
      return (<>{v === 1 ? (
        <Zone><div className="d-row" style={{ gap: 5 }}>
          {[["M", true], ["T", true], ["W", false], ["T", false], ["F", false], ["S", false], ["S", false]].map(([d, on], i) => (
            <button key={i} style={{ width: 24, height: 24, borderRadius: "50%", fontSize: 10, fontFamily: "var(--font-mono)", display: "grid", placeItems: "center", background: on ? "var(--foreground)" : "var(--card)", color: on ? "var(--background)" : "var(--muted-foreground)", border: on ? "1px solid var(--foreground)" : "1px solid var(--border)" }}>{d}</button>))}
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ display: "inline-flex", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
          {["⇤", "≡", "⇥"].map((ic, i) => <button key={ic} style={{ padding: "6px 12px", fontSize: 12, background: i === 1 ? "var(--foreground)" : "var(--card)", color: i === 1 ? "var(--background)" : "var(--muted-foreground)", borderLeft: i ? "1px solid var(--border)" : "none" }}>{ic}</button>)}
        </div></Zone>
      ) : (
        <Zone><div className="d-row" style={{ flexWrap: "wrap" }}>
          {[["design", true], ["urgent", true], ["q3", false], ["legal", false]].map(([t, on]) => (
            <button key={t as string} className="att-chip" style={on ? { background: "var(--accent-soft)", color: "var(--accent)", borderColor: "color-mix(in oklab, var(--accent) 45%, var(--border))" } : undefined}>{t as string}</button>))}
        </div></Zone>
      )}<Note>V1 weekday multi-select circles · V2 icon alignment group · V3 multi-select filter chips.</Note></>);

    case "Tooltip":
      return (<>{v === 1 ? (
        <Zone><div style={{ textAlign: "center" }}>
          <div className="d-tooltip" style={{ display: "inline-block", marginBottom: 6 }}>Pin — keep this panel when drilling elsewhere</div>
          <div><button className="d-btn outline sm">PIN</button></div>
        </div></Zone>
      ) : v === 2 ? (
        <Zone><div style={{ textAlign: "center", position: "relative" }}>
          <div className="d-pop" style={{ padding: "6px 10px", fontSize: 11.5, display: "inline-block", marginBottom: 8 }}>Copies the ContextPath URL</div>
          <span style={{ position: "absolute", left: "50%", bottom: 26, width: 8, height: 8, background: "var(--card)", borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", transform: "translateX(-50%) rotate(45deg)" }} />
          <div><button className="d-btn outline sm">⧉ Link</button></div>
        </div></Zone>
      ) : (
        <Zone><div className="d-tooltip" style={{ display: "flex", gap: 10, alignItems: "center" }}>Open the palette<span className="kbd" style={{ background: "transparent", color: "var(--background)", borderColor: "color-mix(in oklab, var(--background) 40%, transparent)", minWidth: 0 }}>⌘K</span></div></Zone>
      )}<Note>V1 dark plain · V2 light with arrow · V3 rich with shortcut. Every bar control ships one.</Note></>);

    case "Typography":
      return (<>{v === 1 ? (
        <Zone col>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 26, letterSpacing: "-0.02em" }}>Newsreader for display</div>
          <div style={{ fontSize: 13.5 }}>Inter for the interface — quiet, legible, unremarkable on purpose.</div>
          <div style={{ ...mono10, fontSize: 11 }}>Geist Mono for labels & data</div>
        </Zone>
      ) : v === 2 ? (
        <Zone col>
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, letterSpacing: "-0.02em" }}>The stack keeps the thread</div>
          <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)", maxWidth: "46ch" }}>Open the detail beside its source; investigate; never lose how you got there.</p>
          <blockquote style={{ margin: 0, paddingLeft: 12, borderLeft: "3px solid var(--accent)", fontSize: 12.5, fontStyle: "italic", color: "var(--muted-foreground)" }}>"A panel is a modal that respects its parent."</blockquote>
        </Zone>
      ) : (
        <Zone col>
          <div className="d-row" style={{ justifyContent: "space-between" }}><span style={{ ...mono10 }}>MRR</span><span style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontVariantNumeric: "tabular-nums" }}>8 214 €</span></div>
          <div className="d-row" style={{ justifyContent: "space-between" }}><span style={{ ...mono10 }}>Win rate</span><span style={{ fontFamily: "var(--font-serif)", fontSize: 24, fontVariantNumeric: "tabular-nums" }}>37,2 %</span></div>
        </Zone>
      )}<Note>V1 the three voices · V2 article rhythm · V3 data typography. Serif speaks, sans works, mono measures.</Note></>);

    default:
      return <Note>Demo coming — the token map already covers it.</Note>;
  }
}
