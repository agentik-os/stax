/**
 * The starter shell: WorkspaceProvider + a horizontal stage of panels.
 * Panel anatomy: bar (eyebrow · pin · close) — body (title, subtitle, KPIs,
 * drills) — foot (the ONLY action zone). See DESIGN-SPEC.md for the contract.
 */
import {
  WorkspaceProvider,
  useWorkspace,
  panelWidth,
  type PanelRegistry,
} from "@frameword/panels-react";
import { DOMAIN } from "./domain";

const REGISTRY: PanelRegistry = {
  section: { size: "L" },
  doc: { size: "M" },
};

const targetOf = (key: string) => ({ panelType: DOMAIN[key].panelType, resourceKey: key });

function Panel({ id }: { id: string }) {
  const ws = useWorkspace();
  const p = ws.state.panelsById[id];
  if (!p) return null;
  const n = DOMAIN[p.target.resourceKey];
  const isRef = p.placement === "reference";
  const retained = p.role === "root" ? !!p.pinned : p.retention === "retained";
  const kids = n.children ?? [];
  return (
    <section
      className={"panel" + (isRef ? " ref" : "") + (id === ws.state.focusedPanelId ? " focused" : "")}
      style={{ width: panelWidth(REGISTRY, p, isRef ? "S" : undefined) }}
      onMouseDown={() => { if (!isRef && ws.state.focusedPanelId !== id) ws.focusPanel(id); }}>
      <div className="panel-bar">
        <span className="eyebrow">{n.eyebrow ?? n.panelType}</span>
        <div style={{ flex: 1 }} />
        {!isRef && (
          <button className={"pin-btn" + (retained ? " on" : "")}
            onClick={() => (retained ? ws.unpinPanel(id) : ws.pinPanel(id))}>PIN</button>
        )}
        <button className="bar-btn" title="Close" onClick={() => ws.closePanel(id)}>×</button>
      </div>
      <div className="panel-body">
        <h2 className="panel-title">{n.title}</h2>
        {n.subtitle && <p className="panel-sub">{n.subtitle}</p>}
        {n.kpis && (
          <div className="stats">
            {n.kpis.map((k) => (
              <div key={k.l} className="stat"><div className="lab">{k.l}</div><div className="val">{k.v}</div></div>
            ))}
          </div>
        )}
        {n.body && <p>{n.body}</p>}
        {kids.length > 0 && (
          <div className="drills">
            {kids.map((key, i) => (
              <button key={key} className="drill"
                onClick={() => (isRef ? undefined : ws.openDetail(id, targetOf(key)))}>
                <span className="no">{String(i + 1).padStart(2, "0")}</span>
                <span className="bd">
                  <span className="tt">{DOMAIN[key].title}</span>
                  {DOMAIN[key].subtitle && <span className="ss">{DOMAIN[key].subtitle}</span>}
                </span>
                <span className="arr">→</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="panel-foot">
        {n.composer
          ? <button className="foot-cta">{n.composer.replace("…", "")}</button>
          : <span className="foot-note">Read-only</span>}
      </div>
    </section>
  );
}

function Shell() {
  const ws = useWorkspace();
  return (
    <div className="app">
      <header className="topbar">
        <strong>__APP_NAME__</strong>
        <span className="tb-hint">a Stax panels app</span>
        <div style={{ flex: 1 }} />
        {!ws.state.rootInstanceId && (
          <button className="foot-cta" onClick={() => ws.openSpace("home", targetOf("sec:home"))}>Open Home</button>
        )}
      </header>
      <main className="stage">
        {ws.path.map((id) => <Panel key={id} id={id} />)}
        {ws.state.referenceRailOrder.map((id) => <Panel key={id} id={id} />)}
      </main>
    </div>
  );
}

function AutoOpen() {
  const ws = useWorkspace();
  if (!ws.state.rootInstanceId && typeof location !== "undefined" && location.hash.length <= 1)
    queueMicrotask(() => ws.openSpace("home", targetOf("sec:home")));
  return null;
}

export function App() {
  return (
    <WorkspaceProvider registry={REGISTRY} urlSync="push" storageKey="__APP_NAME__-ws">
      <AutoOpen />
      <Shell />
    </WorkspaceProvider>
  );
}
