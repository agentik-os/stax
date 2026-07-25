/**
 * MoonbaseApp.tsx — five panels an investment firm actually needs, and five
 * shapes Stax could not previously demonstrate.
 *
 * These come from a real conversion manifest (97 screens of a fund's operating
 * system mapped onto the Stax grammar). That manifest rendered 1675 identical
 * key/value rows, which is the sameness problem one level up: a manifest can
 * declare a panel's width, head layout and foot contract and still say nothing
 * about what the panel LOOKS like inside.
 *
 * So each of these five answers a different question with a different layout,
 * and each honours the contract its manifest row declared:
 *
 *   scorecard    XL 800 · dense-bar · AI/Manual segments · "Save scorecard"
 *   match        L 640  · dense-bar · Top matches/All    · "Accept match"
 *   allocation   L 640  · dense-bar · no segments        · "Build capital call"
 *   gate         S 380  · dense-bar · no segments        · "Run kill check"
 *   cadence      L 640  · dense-bar · read only, NO primary
 *
 * Every figure is derived from the line items, never typed twice, and no state
 * colour is hardcoded: the sign and the state resolve through tokens.
 */
import { useState } from "react";

/* ── the fixtures, small and honest ───────────────────────────────────── */

type Criterion = { id: string; band: string; label: string; weight: number; score: number; max: number; note: string };
const SCORECARD: Criterion[] = [
  { id: "mkt", band: "Market", label: "Fragmentation", weight: 15, score: 4, max: 5, note: "Top 5 hold 11% share" },
  { id: "grw", band: "Market", label: "Organic growth", weight: 10, score: 3, max: 5, note: "6.2% CAGR, GDP plus 2" },
  { id: "rev", band: "Economics", label: "Revenue quality", weight: 20, score: 4, max: 5, note: "84% contracted, 3 yr terms" },
  { id: "mar", band: "Economics", label: "Gross margin", weight: 15, score: 5, max: 5, note: "61%, up 400bps in 2 yrs" },
  { id: "cus", band: "Economics", label: "Customer concentration", weight: 10, score: 2, max: 5, note: "Top client is 24% of revenue" },
  { id: "mgt", band: "People", label: "Owner dependency", weight: 15, score: 2, max: 5, note: "Founder holds every key account" },
  { id: "suc", band: "People", label: "Second line", weight: 10, score: 3, max: 5, note: "Ops lead strong, no CFO" },
  { id: "exi", band: "Exit", label: "Buyer universe", weight: 5, score: 4, max: 5, note: "9 strategics, 2 sponsors circling" },
];

type Candidate = { id: string; invoice: string; supplier: string; amount: number; line: string; bank: string; bankAmount: number; date: string; confidence: number; why: string };
const CANDIDATES: Candidate[] = [
  { id: "c1", invoice: "INV-2291", supplier: "Northgate Logistics", amount: 48250, line: "SEPA CT NORTHGATE LOG", bank: "BNP 4417", bankAmount: 48250, date: "Jun 28", confidence: 0.98, why: "exact amount, supplier in the label" },
  { id: "c2", invoice: "INV-2288", supplier: "Helios Cloud", amount: 12400, line: "CARD HELIOS*CLOUD", bank: "JPM 5521", bankAmount: 12400, date: "Jun 27", confidence: 0.94, why: "exact amount, merchant descriptor" },
  { id: "c3", invoice: "INV-2274", supplier: "Marchand & Fils", amount: 7890, line: "VIR MARCHAND FILS SARL", bank: "BNP 4417", bankAmount: 7890.5, date: "Jun 24", confidence: 0.71, why: "0.50 short, likely a rounding on the wire" },
  { id: "c4", invoice: "INV-2265", supplier: "Atlas Recruit", amount: 22000, line: "SEPA CT ATLAS RECR PARTIAL", bank: "JPM 5521", bankAmount: 11000, date: "Jun 21", confidence: 0.46, why: "half the amount: a part payment, or a different invoice" },
];

type Investor = { id: string; name: string; commitment: number; calledToDate: number; state: "wired" | "pending" | "late" };
const INVESTORS: Investor[] = [
  { id: "i1", name: "Everline Pension", commitment: 25_000_000, calledToDate: 8_750_000, state: "wired" },
  { id: "i2", name: "Kessler Family Office", commitment: 12_000_000, calledToDate: 4_200_000, state: "wired" },
  { id: "i3", name: "Brightwater Endowment", commitment: 10_000_000, calledToDate: 3_500_000, state: "pending" },
  { id: "i4", name: "Nordvik Capital", commitment: 8_000_000, calledToDate: 2_800_000, state: "pending" },
  { id: "i5", name: "Tessera Partners", commitment: 5_000_000, calledToDate: 1_750_000, state: "late" },
];
const CALL_AMOUNT = 6_000_000;

type Check = { id: string; label: string; verdict: "pass" | "fail" | "open"; detail: string; blocking: boolean };
const KILLCHECKS: Check[] = [
  { id: "k1", label: "Revenue above floor", verdict: "pass", detail: "EUR 14.2M against a 8M floor", blocking: true },
  { id: "k2", label: "Owner will stay 24 months", verdict: "fail", detail: "Founder wants out at closing", blocking: true },
  { id: "k3", label: "No customer above 30%", verdict: "pass", detail: "Largest is 24%", blocking: true },
  { id: "k4", label: "Clean cap table", verdict: "pass", detail: "Two holders, no options", blocking: false },
  { id: "k5", label: "Sector in mandate", verdict: "open", detail: "Industrial services, edge of mandate", blocking: false },
];

type Slot = { day: string; items: { at: string; what: string; who: string; kind: "standing" | "review" | "external" }[] };
const RHYTHM: Slot[] = [
  { day: "Mon", items: [{ at: "09:00", what: "Pipeline stand up", who: "Investment team", kind: "standing" }] },
  { day: "Tue", items: [{ at: "10:00", what: "Deal committee", who: "Partners", kind: "review" }, { at: "16:00", what: "Searcher office hours", who: "Open", kind: "external" }] },
  { day: "Wed", items: [{ at: "11:00", what: "Portfolio check in", who: "Ops", kind: "standing" }] },
  { day: "Thu", items: [{ at: "09:30", what: "Diligence review", who: "Deal leads", kind: "review" }, { at: "14:00", what: "LP touchpoints", who: "IR", kind: "external" }] },
  { day: "Fri", items: [{ at: "16:00", what: "Weekly write up", who: "Everyone", kind: "standing" }] },
];

/* ── helpers ──────────────────────────────────────────────────────────── */

const eur = (n: number) => "€" + Math.round(n).toLocaleString("en-US");
const eurM = (n: number) => "€" + (n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2) + "M";
const pct = (n: number) => (n * 100).toFixed(0) + "%";

/* ── 1. SCORECARD: weighted criteria rolling to a verdict band ────────── */

export function ScorecardBody() {
  const [mode, setMode] = useState<"ai" | "manual">("ai");
  const [scores, setScores] = useState<Record<string, number>>(
    Object.fromEntries(SCORECARD.map((c) => [c.id, c.score])),
  );
  const weighted = SCORECARD.reduce((s, c) => s + (scores[c.id] / c.max) * c.weight, 0);
  const bands = [...new Set(SCORECARD.map((c) => c.band))];
  // the verdict is DERIVED from the total, never stored beside it
  const verdict = weighted >= 75 ? "advance" : weighted >= 55 ? "watch" : "decline";

  return (
    <>
      <div className="pf-toolbar">
        <div className="pf-seg">
          {(["ai", "manual"] as const).map((m) => (
            <button key={m} className={"aseg" + (mode === m ? " on" : "")} onClick={() => setMode(m)}>
              {m === "ai" ? "AI" : "Manual"}
            </button>
          ))}
        </div>
        <span className="foot-note" style={{ marginLeft: "auto" }}>
          {SCORECARD.length} criteria · {SCORECARD.reduce((s, c) => s + c.weight, 0)} pts
        </span>
      </div>

      <div className="stats">
        <div className="stat"><div className="lab">weighted score</div><div className="val">{weighted.toFixed(1)}</div></div>
        <div className="stat"><div className="lab">verdict</div><div className="val">{verdict}</div></div>
        <div className="stat"><div className="lab">weakest band</div>
          <div className="val">{bands.map((b) => ({ b, v: SCORECARD.filter((c) => c.band === b).reduce((s, c) => s + scores[c.id] / c.max, 0) / SCORECARD.filter((c) => c.band === b).length })).sort((a, b2) => a.v - b2.v)[0].b}</div>
        </div>
      </div>

      <div className="section">
        <div className="lab">SCORING</div>
        {bands.map((band) => (
          <div key={band} className="mb-band">
            <div className="mb-bandlab">{band}</div>
            {SCORECARD.filter((c) => c.band === band).map((c) => {
              const filled = scores[c.id];
              return (
                <div key={c.id} className="mb-crit">
                  <span className="nm">{c.label}</span>
                  <span className="w">{c.weight}pt</span>
                  <span className="dots" role="group" aria-label={`${c.label}: ${filled} of ${c.max}`}>
                    {Array.from({ length: c.max }, (_, i) => (
                      <button
                        key={i}
                        className={"dot" + (i < filled ? " on" : "")}
                        disabled={mode === "ai"}
                        title={`${i + 1} of ${c.max}`}
                        onClick={() => setScores((s) => ({ ...s, [c.id]: i + 1 }))}
                      />
                    ))}
                  </span>
                  <span className="note">{c.note}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
}

/* ── 2. MATCH: two sides, a proposed pairing, a confidence ────────────── */

export function MatchBody() {
  const [only, setOnly] = useState(true);
  const [done, setDone] = useState<Record<string, "accepted" | "rejected">>({});
  const rows = only ? CANDIDATES.filter((c) => c.confidence >= 0.7) : CANDIDATES;
  const open = CANDIDATES.filter((c) => !done[c.id]);

  return (
    <>
      <div className="pf-toolbar">
        <div className="pf-seg">
          <button className={"aseg" + (only ? " on" : "")} onClick={() => setOnly(true)}>Top matches</button>
          <button className={"aseg" + (!only ? " on" : "")} onClick={() => setOnly(false)}>All</button>
        </div>
        <span className="foot-note" style={{ marginLeft: "auto" }}>{open.length} open · {eur(open.reduce((s, c) => s + c.amount, 0))}</span>
      </div>

      <div className="section">
        <div className="lab">PROPOSED PAIRINGS</div>
        {rows.map((c) => {
          const gap = c.bankAmount - c.amount;
          const state = done[c.id];
          return (
            <div key={c.id} className={"mb-match" + (state ? " " + state : "")}>
              <div className="side">
                <span className="ref">{c.invoice}</span>
                <span className="who">{c.supplier}</span>
                <span className="amt">{eur(c.amount)}</span>
              </div>
              <div className="link">
                <span className="conf" style={{ ["--c" as string]: c.confidence }} title={`${pct(c.confidence)} confidence`}>
                  {pct(c.confidence)}
                </span>
                <span className="hair" />
              </div>
              <div className="side right">
                <span className="ref">{c.bank} · {c.date}</span>
                <span className="who mono">{c.line}</span>
                <span className={"amt" + (gap ? " off" : "")}>{eur(c.bankAmount)}{gap ? ` (${gap > 0 ? "+" : ""}${gap.toFixed(2)})` : ""}</span>
              </div>
              <div className="why">{state ? (state === "accepted" ? "matched" : "left unmatched") : c.why}</div>
              <div className="acts">
                <button className="d-btn" disabled={!!state} onClick={() => setDone((d) => ({ ...d, [c.id]: "accepted" }))}>Accept</button>
                <button className="d-btn" disabled={!!state} onClick={() => setDone((d) => ({ ...d, [c.id]: "rejected" }))}>Unmatched</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ── 3. ALLOCATION: one total split by an ownership key ───────────────── */

export function AllocationBody() {
  const totalCommitted = INVESTORS.reduce((s, i) => s + i.commitment, 0);
  const calledBefore = INVESTORS.reduce((s, i) => s + i.calledToDate, 0);
  const share = (i: Investor) => i.commitment / totalCommitted;
  const max = Math.max(...INVESTORS.map((i) => share(i) * CALL_AMOUNT));

  return (
    <>
      <div className="stats">
        <div className="stat"><div className="lab">this call</div><div className="val">{eurM(CALL_AMOUNT)}</div></div>
        <div className="stat"><div className="lab">called to date</div><div className="val">{eurM(calledBefore + CALL_AMOUNT)}</div></div>
        <div className="stat"><div className="lab">of commitments</div><div className="val">{pct((calledBefore + CALL_AMOUNT) / totalCommitted)}</div></div>
      </div>

      <div className="section">
        <div className="lab">ALLOCATION BY COMMITMENT</div>
        {INVESTORS.map((i) => {
          const amount = share(i) * CALL_AMOUNT;
          return (
            <div key={i.id} className="mb-alloc">
              <span className={"dot " + i.state} title={i.state} />
              <span className="nm">{i.name}</span>
              <span className="sh">{pct(share(i))}</span>
              <span className="bar"><span style={{ width: (amount / max) * 100 + "%" }} /></span>
              <span className="amt">{eur(amount)}</span>
            </div>
          );
        })}
      </div>

      <div className="section">
        <div className="lab">AFTER THIS CALL</div>
        <div className="anat-row"><span className="a-lab">Undrawn</span><span className="a-val">{eurM(totalCommitted - calledBefore - CALL_AMOUNT)}</span></div>
        <div className="anat-row"><span className="a-lab">Late on the previous call</span><span className="a-val">{INVESTORS.filter((i) => i.state === "late").length} investor</span></div>
      </div>
    </>
  );
}

/* ── 4. GATE: an ordered checklist where one failure stops the thing ──── */

export function GateBody() {
  const blocked = KILLCHECKS.filter((c) => c.blocking && c.verdict === "fail");
  const open = KILLCHECKS.filter((c) => c.verdict === "open");
  return (
    <>
      <div className={"mb-verdict " + (blocked.length ? "stop" : open.length ? "hold" : "go")}>
        <span className="w">{blocked.length ? "Killed" : open.length ? "On hold" : "Cleared"}</span>
        <span className="r">
          {blocked.length ? blocked[0].label.toLowerCase() : open.length ? `${open.length} unanswered` : "every gate passed"}
        </span>
      </div>
      <div className="section">
        <div className="lab">GATES</div>
        {KILLCHECKS.map((c) => (
          <div key={c.id} className={"mb-gate " + c.verdict}>
            <span className="mk" aria-hidden="true">{c.verdict === "pass" ? "✓" : c.verdict === "fail" ? "✕" : "·"}</span>
            <span className="nm">{c.label}{c.blocking && <span className="bl">blocking</span>}</span>
            <span className="dt">{c.detail}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── 5. CADENCE: the week as a shape, not as a list ───────────────────── */

export function CadenceBody() {
  const total = RHYTHM.reduce((s, d) => s + d.items.length, 0);
  return (
    <>
      <div className="stats">
        <div className="stat"><div className="lab">commitments</div><div className="val">{total}</div></div>
        <div className="stat"><div className="lab">heaviest day</div><div className="val">{[...RHYTHM].sort((a, b) => b.items.length - a.items.length)[0].day}</div></div>
        <div className="stat"><div className="lab">external</div><div className="val">{RHYTHM.reduce((s, d) => s + d.items.filter((i) => i.kind === "external").length, 0)}</div></div>
      </div>
      <div className="section">
        <div className="lab">THE WEEK</div>
        <div className="mb-week">
          {RHYTHM.map((d) => (
            <div key={d.day} className="mb-day">
              <div className="dl">{d.day}</div>
              {d.items.map((it) => (
                <div key={it.at + it.what} className={"mb-slot " + it.kind}>
                  <span className="at">{it.at}</span>
                  <span className="wt">{it.what}</span>
                  <span className="wh">{it.who}</span>
                </div>
              ))}
              {!d.items.length && <div className="mb-slot empty">clear</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/* ── the foot: each panel's declared contract, nothing invented ───────── */

export function MoonbaseFoot({ kind }: { kind: string }) {
  switch (kind) {
    case "mbscore":
      return (
        <>
          <button className="foot-cta">Save scorecard</button>
          <button className="d-btn ai"><span className="sig">✶</span> Re-run AI scorecard</button>
          <span className="foot-note">{SCORECARD.length} criteria weighted to 100</span>
        </>
      );
    case "mbmatch":
      return (
        <>
          <button className="foot-cta">Accept match</button>
          <button className="d-btn">Mark unmatched</button>
          <span className="foot-note">{CANDIDATES.length} candidates · {eur(CANDIDATES.reduce((s, c) => s + c.amount, 0))}</span>
        </>
      );
    case "mbcall":
      return (
        <>
          <button className="foot-cta">Build capital call</button>
          <span className="foot-note">{eurM(CALL_AMOUNT)} across {INVESTORS.length} investors · sending is never a foot action</span>
        </>
      );
    case "mbgate":
      return (
        <>
          <button className="d-btn ai"><span className="sig">✶</span> Run kill check</button>
          <span className="foot-note">{KILLCHECKS.filter((c) => c.blocking).length} blocking gates</span>
        </>
      );
    // the manifest says read only, no primary. An empty foot is a real answer.
    case "mbweek":
      return <span className="foot-note">Read only · the rhythm is set in the fund calendar</span>;
    default:
      return null;
  }
}

export function MoonbaseBody({ kind }: { kind: string }) {
  switch (kind) {
    case "mbscore": return <ScorecardBody />;
    case "mbmatch": return <MatchBody />;
    case "mbcall": return <AllocationBody />;
    case "mbgate": return <GateBody />;
    case "mbweek": return <CadenceBody />;
    default: return null;
  }
}
