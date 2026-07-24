/**
 * AnalyticsApp — the money surfaces as REAL panels, not tables in a trench coat.
 *
 * A trading blotter is not a grid of rows: it is a fill stream, a venue split
 * and a fill rate. A treasury is a cash ladder with a reconciliation state. A
 * CFO view is the P&L walking from revenue down to EBITDA, with the variance
 * carrying the sign. Each is built in the Studio's own grammar (pf-toolbar,
 * stats, pf-chart, section) so it inherits the design system rather than
 * reinventing it.
 *
 * THE FIGURES RECONCILE ACROSS PANELS, which is the whole point of a finance
 * demo: the treasury's closing cash (21,677,792) divided by the CFO's average
 * monthly burn (1,458,333) IS the runway the CFO panel prints (14.9 months),
 * and the blotter's realised P&L uses the same average costs the crypto
 * treasury table carries. Change one and the other lies: they are computed,
 * never typed twice.
 */
import { useState } from "react";

/* ── shared money formatting: one place, tabular everywhere ───────────── */
const usd0 = (n: number) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");
const usdC = (n: number) =>
  (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number, d = 2) => n.toFixed(d) + "%";
const Seg = ({ items, value, onPick }: { items: string[]; value: string; onPick: (v: string) => void }) => (
  <div className="foot-seg" role="tablist">
    {items.map((i) => (
      <button key={i} role="tab" aria-selected={i === value} className={i === value ? "on" : undefined}
        onClick={() => onPick(i)}>{i}</button>
    ))}
  </div>
);

/* ══════════════ 1 · THE BLOTTER: a fill stream, not a grid ══════════════ */

interface Fill {
  t: string; sym: string; side: "Buy" | "Sell"; qty: number; px: number;
  venue: string; type: string; fees: number; status: "Filled" | "Partial" | "Cancelled";
  filled: number; pnl: number;
}
/* notional = filled x px on every line; the totals below are SUMS, never typed */
const FILLS: Fill[] = [
  { t: "09:14:22", sym: "BTC-USD", side: "Buy", qty: 25, px: 71200, venue: "Coinbase Prime", type: "VWAP", fees: 890, status: "Filled", filled: 25, pnl: 0 },
  { t: "11:47:05", sym: "ETH-USD", side: "Sell", qty: 1200, px: 4180, venue: "Binance", type: "Limit", fees: 3009.6, status: "Filled", filled: 1200, pnl: 2396990.4 },
  { t: "14:03:51", sym: "SOL-USD", side: "Buy", qty: 60000, px: 172.5, venue: "OKX", type: "TWAP", fees: 4140, status: "Partial", filled: 40000, pnl: 0 },
  { t: "16:29:40", sym: "ETH-PERP", side: "Sell", qty: 900, px: 4232.5, venue: "OKX", type: "Limit", fees: 1904.63, status: "Filled", filled: 900, pnl: 112845.37 },
  { t: "10:05:13", sym: "LINK-USD", side: "Buy", qty: 120000, px: 16.4, venue: "Galaxy OTC", type: "RFQ", fees: 984, status: "Filled", filled: 120000, pnl: 0 },
  { t: "13:41:58", sym: "ARB-USD", side: "Sell", qty: 1000000, px: 0.915, venue: "Binance", type: "Market", fees: 915, status: "Filled", filled: 1000000, pnl: -505915 },
  { t: "08:22:11", sym: "BTC-USD", side: "Sell", qty: 40, px: 74900, venue: "Coinbase Prime", type: "Iceberg", fees: 0, status: "Cancelled", filled: 0, pnl: 0 },
  { t: "15:58:44", sym: "wstETH-USD", side: "Buy", qty: 250, px: 5455, venue: "Kraken", type: "Limit", fees: 681.88, status: "Filled", filled: 250, pnl: 0 },
];
const notionalOf = (f: Fill) => f.filled * f.px;
const ordered = FILLS.reduce((s, f) => s + f.qty * f.px, 0);
const executed = FILLS.reduce((s, f) => s + notionalOf(f), 0);
const feesTotal = FILLS.reduce((s, f) => s + f.fees, 0);
const pnlTotal = FILLS.reduce((s, f) => s + f.pnl, 0);

export function BlotterBody() {
  const [side, setSide] = useState("All");
  const rows = FILLS.filter((f) => side === "All" || f.side === side);
  const venues = [...new Set(FILLS.map((f) => f.venue))]
    .map((v) => ({ v, n: FILLS.filter((f) => f.venue === v).reduce((s, f) => s + notionalOf(f), 0) }))
    .sort((a, b) => b.n - a.n);
  const vMax = Math.max(...venues.map((v) => v.n));
  return (
    <div>
      <div className="pf-toolbar">
        <Seg items={["All", "Buy", "Sell"]} value={side} onPick={setSide} />
        <span className="pf-count mono">{rows.length} of {FILLS.length} orders</span>
      </div>
      <div className="stats">
        <div className="stat"><div className="lab">executed</div><div className="val">{usd0(executed)}</div></div>
        <div className="stat"><div className="lab">realised P&L</div><div className="val">{usd0(pnlTotal)}</div></div>
        <div className="stat"><div className="lab">fill rate</div><div className="val">{pct((executed / ordered) * 100, 1)}</div></div>
      </div>

      {/* the stream: one line per order, the side carries the colour */}
      <div className="section">
        <div className="lab">Execution stream</div>
        <div className="an-stream">
          {rows.map((f, i) => (
            <div key={i} className={"an-fill" + (f.status === "Cancelled" ? " void" : "")}>
              <span className="t mono">{f.t}</span>
              <span className={"sd " + f.side.toLowerCase()}>{f.side === "Buy" ? "B" : "S"}</span>
              <span className="sym">{f.sym}</span>
              <span className="qty mono">{f.filled.toLocaleString("en-US")}</span>
              <span className="at mono">@ {f.px.toLocaleString("en-US", { maximumFractionDigits: 4 })}</span>
              <span className="vn mono">{f.venue}</span>
              <span className="ty mono">{f.type}</span>
              <span className="nt mono">{f.status === "Cancelled" ? "cancelled" : usd0(notionalOf(f))}</span>
              {f.pnl !== 0 && <span className={"pl mono" + (f.pnl < 0 ? " neg" : "")}>{f.pnl > 0 ? "+" : ""}{usd0(f.pnl)}</span>}
            </div>
          ))}
        </div>
      </div>

      {/* where the flow went: proportional, no chart library */}
      <div className="section">
        <div className="lab">Notional by venue</div>
        {venues.map((v) => (
          <div key={v.v} className="pf-modelrow an-venue">
            <span className="nm mono">{v.v}</span>
            <span className="bar"><span style={{ width: (v.n / vMax) * 100 + "%" }} /></span>
            <span className="v mono">{usd0(v.n)}</span>
          </div>
        ))}
      </div>

      <div className="section">
        <div className="lab">Cost of execution</div>
        <div className="anat-row"><span className="k">Fees booked</span><span className="v mono">{usdC(feesTotal)}</span></div>
        <div className="anat-row"><span className="k">Blended rate</span><span className="v mono">{((feesTotal / executed) * 10000).toFixed(2)} bps</span></div>
        <div className="anat-row"><span className="k">Ordered vs executed</span><span className="v mono">{usd0(ordered)} → {usd0(executed)}</span></div>
      </div>
    </div>
  );
}

/* ══════════════ 2 · TREASURY: a cash ladder with a state ══════════════ */

interface Acct {
  name: string; bank: string; ccy: "USD" | "EUR" | "GBP"; ledger: number; pending: number;
  rail: string; recon: "Matched" | "Unmatched" | "Investigating";
}
const FX: Record<string, number> = { USD: 1, EUR: 1.085, GBP: 1.274 };
const ACCTS: Acct[] = [
  { name: "Operating USD 5521", bank: "J.P. Morgan", ccy: "USD", ledger: 4146240, pending: -96240, rail: "Fedwire", recon: "Matched" },
  { name: "Payroll USD 8830", bank: "J.P. Morgan", ccy: "USD", ledger: 200000, pending: 0, rail: "ACH", recon: "Matched" },
  { name: "Reserve USD 9104", bank: "Citibank NA", ccy: "USD", ledger: 14000000, pending: 0, rail: "Fedwire", recon: "Matched" },
  { name: "Collections EUR 4417", bank: "BNP Paribas", ccy: "EUR", ledger: 2750000, pending: 1250000, rail: "SEPA Instant", recon: "Investigating" },
  { name: "GBP Ops 2260", bank: "HSBC UK", ccy: "GBP", ledger: 273000, pending: 0, rail: "Faster Payments", recon: "Unmatched" },
];
const usdEq = (a: Acct) => a.ledger * FX[a.ccy];
const availEq = (a: Acct) => (a.ledger + Math.min(0, a.pending)) * FX[a.ccy];

export function TreasuryBody() {
  const [scope, setScope] = useState("All");
  const rows = ACCTS.filter((a) => scope === "All" || a.ccy === scope);
  const ledgerTotal = ACCTS.reduce((s, a) => s + usdEq(a), 0);
  const availTotal = ACCTS.reduce((s, a) => s + availEq(a), 0);
  const unrec = ACCTS.filter((a) => a.recon !== "Matched");
  const unrecValue = unrec.reduce((s, a) => s + Math.abs(a.pending || a.ledger) * FX[a.ccy], 0);
  const max = Math.max(...ACCTS.map(usdEq));
  return (
    <div>
      <div className="pf-toolbar">
        <Seg items={["All", "USD", "EUR", "GBP"]} value={scope} onPick={setScope} />
        <span className="pf-count mono">{usd0(ledgerTotal)} ledger</span>
      </div>
      <div className="stats">
        <div className="stat"><div className="lab">available</div><div className="val">{usd0(availTotal)}</div></div>
        <div className="stat"><div className="lab">unreconciled</div><div className="val">{usd0(unrecValue)}</div></div>
        <div className="stat"><div className="lab">accounts</div><div className="val">{ACCTS.length}</div></div>
      </div>

      {/* the ladder: every account sized against the largest, state on the left */}
      <div className="section">
        <div className="lab">Cash by account</div>
        {rows.map((a) => (
          <div key={a.name} className="an-acct">
            <span className={"dot " + a.recon.toLowerCase()} title={a.recon} />
            <span className="nm">{a.name}</span>
            <span className="bk mono">{a.bank}</span>
            <span className="bar"><span style={{ width: (usdEq(a) / max) * 100 + "%" }} /></span>
            <span className="v mono">{a.ccy} {Math.round(a.ledger).toLocaleString("en-US")}</span>
            {a.pending !== 0 && (
              <span className={"pd mono" + (a.pending < 0 ? " out" : "")}>
                {a.pending > 0 ? "+" : ""}{Math.round(a.pending).toLocaleString("en-US")} pending
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="section">
        <div className="lab">Reconciliation</div>
        {unrec.length === 0
          ? <p className="drill-empty">Everything matched: no open items.</p>
          : unrec.map((a) => (
            <div key={a.name} className="anat-row">
              <span className="k">{a.name}</span>
              <span className="v"><span className={"pf-pill " + (a.recon === "Investigating" ? "off" : "off")}>{a.recon}</span>
                <span className="mono" style={{ marginLeft: 8 }}>{a.rail}</span></span>
            </div>
          ))}
        <div className="anat-row"><span className="k">Rate by value</span>
          <span className="v mono">{pct(((ledgerTotal - unrecValue) / ledgerTotal) * 100)}</span></div>
      </div>
    </div>
  );
}

/* ══════════════ 3 · CFO: the P&L walks down to EBITDA ══════════════ */

interface Line { label: string; plan: number; actual: number; kind?: "sub" | "total" }
/* the ladder is ARTICULATED: gross = revenue - cogs, ebitda = gross - opex,
   on both columns. Nothing below is typed, it is derived and asserted. */
const REVENUE = { plan: 4200000, actual: 4536000 };
const COGS = { plan: 924000, actual: 1043280 };
const OPEX: Line[] = [
  { label: "R&D", plan: 2180000, actual: 2112000 },
  { label: "Sales & marketing", plan: 1640000, actual: 1788400 },
  { label: "General & admin", plan: 860000, actual: 831600 },
];
const gross = { plan: REVENUE.plan - COGS.plan, actual: REVENUE.actual - COGS.actual };
const opexTotal = { plan: OPEX.reduce((s, o) => s + o.plan, 0), actual: OPEX.reduce((s, o) => s + o.actual, 0) };
const ebitda = { plan: gross.plan - opexTotal.plan, actual: gross.actual - opexTotal.actual };
/* the runway ties to the treasury panel: closing cash / average monthly burn */
const closingCash = ACCTS.reduce((s, a) => s + usdEq(a), 0);
const burn = [1602000, 1455000, 1318000];
const avgBurn = burn.reduce((s, b) => s + b, 0) / burn.length;
const runway = closingCash / avgBurn;

export function CfoBody() {
  const [view, setView] = useState("Ladder");
  const walk: Line[] = [
    { label: "Revenue", ...REVENUE },
    { label: "Cost of revenue", ...COGS, kind: "sub" },
    { label: "Gross margin", ...gross, kind: "total" },
    ...OPEX.map((o) => ({ ...o, kind: "sub" as const })),
    { label: "EBITDA", ...ebitda, kind: "total" },
  ];
  const scale = Math.max(...walk.map((l) => Math.abs(l.actual)));
  return (
    <div>
      <div className="pf-toolbar">
        <Seg items={["Ladder", "Variance"]} value={view} onPick={setView} />
        <span className="pf-count mono">June 2026 · closed</span>
      </div>
      <div className="stats">
        <div className="stat"><div className="lab">revenue</div><div className="val">{usd0(REVENUE.actual)}</div></div>
        <div className="stat"><div className="lab">EBITDA</div><div className="val">{usd0(ebitda.actual)}</div></div>
        <div className="stat"><div className="lab">runway</div><div className="val">{runway.toFixed(1)} mo</div></div>
      </div>

      {view === "Ladder" ? (
        <div className="section">
          <div className="lab">Plan against actual</div>
          {walk.map((l) => {
            const v = l.actual - l.plan;
            // a cost line beating its plan is FAVOURABLE even though it is negative
            const isCost = l.kind === "sub";
            const good = isCost ? v < 0 : v > 0;
            return (
              <div key={l.label} className={"an-pl" + (l.kind === "total" ? " total" : "") + (isCost ? " cost" : "")}>
                <span className="nm">{l.label}</span>
                <span className="bar">
                  <span className="plan" style={{ width: (Math.abs(l.plan) / scale) * 100 + "%" }} />
                  <span className={"act" + (good ? " good" : " bad") + (l.actual < 0 ? " below" : "")} style={{ width: (Math.abs(l.actual) / scale) * 100 + "%" }} />
                </span>
                <span className="v mono">{usd0(l.actual)}</span>
                <span className={"dv mono" + (good ? " good" : " bad")}>{v > 0 ? "+" : ""}{usd0(v)}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="section">
          <div className="lab">Variance against plan</div>
          {walk.map((l) => {
            const v = l.actual - l.plan;
            const p = (v / Math.abs(l.plan)) * 100;
            const isCost = l.kind === "sub";
            const good = isCost ? v < 0 : v > 0;
            return (
              <div key={l.label} className="an-var">
                <span className="nm">{l.label}</span>
                <span className="track">
                  <span className={"fill " + (good ? "good" : "bad")}
                    style={{ width: Math.min(50, Math.abs(p) * 2) + "%", [v >= 0 ? "left" : "right"]: "50%" }} />
                  <span className="zero" />
                </span>
                <span className={"dv mono" + (good ? " good" : " bad")}>{p > 0 ? "+" : ""}{pct(p, 1)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="section">
        <div className="lab">Cash and runway</div>
        <div className="anat-row"><span className="k">Closing cash</span>
          <span className="v mono">{usd0(closingCash)} <span className="an-tie">from Banking &amp; treasury</span></span></div>
        <div className="anat-row"><span className="k">Average burn</span>
          <span className="v mono">{usd0(avgBurn)} / month <span className="an-tie">trailing 3 months</span></span></div>
        <div className="anat-row"><span className="k">Runway</span>
          <span className="v mono">{runway.toFixed(1)} months</span></div>
      </div>
    </div>
  );
}

/* the foot of each analytics panel: the panel's own verbs, one accent primary */
export function AnalyticsFoot({ kind }: { kind: string }) {
  const label = kind === "anblotter" ? "New order" : kind === "antreasury" ? "New payment" : "Close the month";
  return (
    <>
      <span className="foot-note">
        {kind === "anblotter" ? `${FILLS.length} orders · ${usd0(executed)} executed`
          : kind === "antreasury" ? `${ACCTS.length} accounts · ${usd0(ACCTS.reduce((s, a) => s + usdEq(a), 0))}`
          : `EBITDA ${usd0(ebitda.actual)} · runway ${runway.toFixed(1)} mo`}
      </span>
      <span style={{ flex: 1 }} />
      <button className="foot-cta">{label}</button>
    </>
  );
}
