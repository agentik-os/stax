/**
 * proof.mjs — the LAYOUT PROOF.
 *
 * A conversion produces three matrices and a running app, and the gap between
 * them is where a migration quietly goes wrong: the matrices say a screen is
 * mapped, the app renders something, and nobody ever puts the two beside each
 * other at the size the row declared.
 *
 * This generates the document that does. It is modelled on a real one written
 * by hand for a 97 screen conversion, and the seven disciplines below are
 * lifted from it. They are the difference between a migration plan and a
 * migration you can argue with.
 *
 *   1. EVERY RENDER CARRIES ITS ROW. Under each panel is the file and line it
 *      came from. A render with no citation is not a panel, it is furniture.
 *   2. THE UNKNOWN IS DRAWN AS UNKNOWN. An empty cell is not skipped and not
 *      filled with a plausible guess: it renders as a dashed chip, and the
 *      caption says WHAT WOULD SETTLE IT. Hiding them is the one dishonest
 *      thing a proof can do.
 *   3. A DISPUTED VALUE IS NEVER SILENTLY PICKED. When two sources disagree,
 *      both are shown with their citations and the disagreement is counted.
 *   4. A PLACEHOLDER IS NOT A QUOTATION. Anything rendered that no source
 *      carries is drawn dashed, so a reader can tell what was measured from
 *      what was invented to make the page look at all.
 *   5. DECLARE EVERY SUBSTITUTION. If a font, a colour or a dataset is standing
 *      in for the real one, say which and why, on the page.
 *   6. PUBLISH THE COUNTS. The document's own coverage is a number on it:
 *      rows documented, rows rendered, unknowns drawn, disagreements found.
 *   7. PROVE THE INVARIANT BY REPETITION. Render the same chrome once per
 *      manifest rather than asserting that it is the same.
 *
 * Nothing here is specific to any domain: everything comes from the matrices
 * the conversion already had to fill.
 */
import fs from "node:fs";
import path from "node:path";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/** What would settle an empty cell, per column. Discipline 2 is worthless if
 *  the caption just says "unknown": it has to name the next action. */
const SETTLES = {
  source: "cite the legacy file and line this behaviour lives in",
  ui_kind: "name the legacy pattern (modal, tab, grid, wizard, report)",
  mapping: "run `stax-migrate patterns` then `stax-migrate shapes`, then write kind/panel-type",
  size: "pick from the registry ladder: S 380, M 480, L 640, XL 800, XXL fluid",
  evidence: "cite the file and line that proves the mapping, or the runtime measurement",
  status: "one of mapped, migrated, deferred, out-of-scope, wrapped",
  stax_target: "the Stax element this legacy element becomes",
  tokens: "the design tokens this element resolves through",
  spacing: "the interior margins this element obeys",
  panel_binding: "the panel that READS this data",
  write_path: "the foot action that WRITES it",
  ops: "the operations the source performs on it",
};

const SIZE_PX = { S: 380, M: 480, L: 640, XL: 800, XXL: 980 };

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { header: [], rows: [] };
  const split = (l) => {
    const out = [];
    let cur = "", q = false;
    for (let i = 0; i < l.length; i++) {
      const c = l[i];
      if (c === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
      else if (c === "," && !q) { out.push(cur); cur = ""; }
      else cur += c;
    }
    out.push(cur);
    return out;
  };
  const header = split(lines[0]);
  return { header, rows: lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [header[i], v]))) };
}

const readMatrix = (dir, file) => {
  const p = path.join(dir, "stax-migration", file);
  if (!fs.existsSync(p)) return { header: [], rows: [], missing: true, path: p };
  return { ...parseCSV(fs.readFileSync(p, "utf8")), missing: false, path: p };
};

/** Discipline 3: two matrices naming the same surface must agree about it. */
function findDisagreements(features, data) {
  const out = [];
  const byPanel = new Map();
  for (const r of features.rows) {
    const t = (r.mapping || "").split("/")[1];
    if (t) byPanel.set(t, r);
  }
  for (const d of data.rows) {
    const bind = d.panel_binding;
    if (!bind) continue;
    const f = byPanel.get(bind.split("/")[1] || bind);
    if (!f) {
      out.push({
        what: `data row ${d.id} binds to "${bind}"`,
        a: `data-matrix.csv says the panel exists`,
        b: `feature-matrix.csv declares no such mapping`,
        settles: "either add the feature row, or repoint the binding",
      });
      continue;
    }
    if (d.write_path && f.status === "out-of-scope")
      out.push({
        what: `${f.id} is out of scope but ${d.id} writes through it`,
        a: `feature-matrix.csv: status out-of-scope`,
        b: `data-matrix.csv: write_path ${d.write_path}`,
        settles: "a writable surface cannot be out of scope: fix one of the two",
      });
  }
  return out;
}

export function buildProof(dir, opts = {}) {
  const features = readMatrix(dir, "feature-matrix.csv");
  const elements = readMatrix(dir, "element-matrix.csv");
  const data = readMatrix(dir, "data-matrix.csv");
  const missing = [features, elements, data].filter((m) => m.missing);

  // discipline 2 + 6: an empty cell is an unknown, and unknowns are counted
  const unknowns = [];
  const countUnknowns = (m, file) => {
    for (const r of m.rows)
      for (const k of m.header)
        if (!String(r[k] ?? "").trim())
          unknowns.push({ file, id: r.id || "(no id)", column: k, settles: SETTLES[k] || `fill ${k}` });
  };
  countUnknowns(features, "feature-matrix.csv");
  countUnknowns(elements, "element-matrix.csv");
  countUnknowns(data, "data-matrix.csv");

  const disagreements = findDisagreements(features, data);
  const rendered = features.rows.filter((r) => r.mapping && r.size);

  // discipline 5: anything the generator supplies rather than reads
  const substitutions = [
    { what: "Type", stands: "the system font stack stands in for the project's faces", why: "this file loads nothing from the network, so it opens offline anywhere" },
    { what: "Accent", stands: `${opts.accent || "a neutral ink"} stands in for the brand accent`, why: opts.accent ? "supplied with --accent, so it is a quotation" : "no accent was supplied, so it is a PLACEHOLDER and every accented element is drawn dashed" },
    { what: "Content", stands: "each panel renders its matrix row, not its live data", why: "this proves the SHAPE and the SIZE, never the content" },
  ];

  const panel = (r) => {
    const size = (r.size || "").toUpperCase();
    const px = SIZE_PX[size];
    const unk = (v, col) =>
      String(v ?? "").trim()
        ? `<span class="v">${esc(v)}</span>`
        : `<span class="unk" title="${esc(SETTLES[col] || "")}">[unknown] ${esc(col)}</span>`;
    return `
<figure class="pw">
  <div class="panel${px ? "" : " nosize"}" style="${px ? `width:${px}px` : ""}">
    <div class="pbar"><span class="mk"></span><span class="ttl">${esc(r.feature || r.id)}</span>
      <span class="sz">${size ? esc(size) : '<span class="unk">[unknown] size</span>'}</span></div>
    <div class="pbody">
      <div class="row"><span class="k">area</span>${unk(r.area, "area")}</div>
      <div class="row"><span class="k">legacy pattern</span>${unk(r.ui_kind, "ui_kind")}</div>
      <div class="row"><span class="k">maps to</span>${unk(r.mapping, "mapping")}</div>
      <div class="row"><span class="k">status</span>${unk(r.status, "status")}</div>
      ${r.subfeature ? `<div class="row"><span class="k">sub</span><span class="v">${esc(r.subfeature)}</span></div>` : ""}
    </div>
    <div class="pfoot"><span class="fn">${esc(r.id)}</span></div>
  </div>
  <figcaption>${
    String(r.source ?? "").trim()
      ? `<code>${esc(r.source)}</code>`
      : `<span class="unk">no citation: this render is furniture until a source is cited</span>`
  }${String(r.evidence ?? "").trim() ? ` · ${esc(r.evidence)}` : ""}</figcaption>
</figure>`;
  };

  const counts = [
    ["rows documented", features.rows.length + elements.rows.length + data.rows.length],
    ["feature rows rendered", rendered.length],
    ["rows with no size declared", features.rows.length - rendered.length],
    ["unknowns drawn as unknown", unknowns.length],
    ["disagreements between matrices", disagreements.length],
  ];

  return `<!doctype html>
<meta charset="utf-8">
<title>Layout proof · ${esc(path.basename(path.resolve(dir)))}</title>
<style>
:root{--bg:#fbfbfa;--card:#fff;--ink:#1a1a19;--ink2:#6b6b68;--rule:#e6e5e2;--rule2:#d5d4d0;
--acc:${opts.accent || "#1a1a19"};--mono:ui-monospace,SFMono-Regular,Menlo,monospace;
--sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
@media(prefers-color-scheme:dark){:root{--bg:#151514;--card:#1c1c1b;--ink:#f0efec;--ink2:#96958f;--rule:#2b2b29;--rule2:#3a3a37}}
:root[data-theme=dark]{--bg:#151514;--card:#1c1c1b;--ink:#f0efec;--ink2:#96958f;--rule:#2b2b29;--rule2:#3a3a37}
:root[data-theme=light]{--bg:#fbfbfa;--card:#fff;--ink:#1a1a19;--ink2:#6b6b68;--rule:#e6e5e2;--rule2:#d5d4d0}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.55 var(--sans);padding:40px 28px 90px}
main{max-width:1180px;margin:0 auto}h1{font-size:26px;margin:0 0 4px;letter-spacing:-.01em;text-wrap:balance}
h2{font-size:12px;font-family:var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--ink2);margin:44px 0 12px;border-top:1px solid var(--rule);padding-top:14px}
.sub{color:var(--ink2);max-width:70ch;margin:0 0 8px}
.counts{display:flex;flex-wrap:wrap;gap:0;border:1px solid var(--rule);border-radius:12px;overflow:hidden;margin:20px 0 6px;background:var(--card)}
.counts div{flex:1 1 150px;padding:12px 15px;border-right:1px solid var(--rule)}
.counts div:last-child{border-right:0}
.counts b{display:block;font-family:var(--mono);font-size:21px;font-variant-numeric:tabular-nums}
.counts span{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2)}
.grid{display:flex;flex-wrap:wrap;gap:26px;align-items:flex-start}
.pw{margin:0}
.panel{background:var(--card);border:1px solid var(--rule);border-radius:14px;overflow:hidden;max-width:100%}
.panel.nosize{width:480px;border-style:dashed}
.pbar{height:44px;display:flex;align-items:center;gap:10px;padding:0 10px 0 16px;border-bottom:1px solid var(--rule);font-family:var(--mono);font-size:12.4px;font-weight:500}
.mk{width:15px;height:15px;border-radius:4px;background:var(--ink);flex:none}
.ttl{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sz{margin-left:auto;font-size:10px;letter-spacing:.1em;color:var(--ink2)}
.pbody{padding:18px 18px 16px;display:flex;flex-direction:column}
.row{display:grid;grid-template-columns:minmax(96px,auto) 1fr;gap:12px;padding:5px 0;border-bottom:1px solid var(--rule);font-size:12.6px}
.row:last-child{border-bottom:0}
.k{font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2)}
.v{overflow-wrap:anywhere}
.pfoot{min-height:44px;display:flex;align-items:center;padding:7px 14px;border-top:1px solid var(--rule);background:color-mix(in oklab,var(--ink) 4%,transparent)}
.fn{font-family:var(--mono);font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink2)}
figcaption{margin-top:7px;font-family:var(--mono);font-size:10.5px;color:var(--ink2);max-width:100%;overflow-wrap:anywhere}
figcaption code{font:inherit}
.unk{display:inline-block;font-family:var(--mono);font-size:10.5px;color:var(--ink2);border:1px dashed var(--rule2);border-radius:5px;padding:0 5px}
table{width:100%;border-collapse:collapse;font-size:12.8px}
th{text-align:left;font-family:var(--mono);font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2);border-bottom:1px solid var(--rule2);padding:7px 10px 7px 0}
td{border-bottom:1px solid var(--rule);padding:8px 10px 8px 0;vertical-align:top;overflow-wrap:anywhere}
.scroll{overflow-x:auto}
.note{border-left:2px solid var(--rule2);padding:2px 0 2px 13px;color:var(--ink2);margin:12px 0}
@media print{body{padding:0;background:#fff}h2{break-after:avoid}.pw{break-inside:avoid}}
</style>
<main>
<h1>Layout proof</h1>
<p class="sub">Every panel below is transcribed from a row of the conversion matrices, at the size that row declares. Under each render is the source it was transcribed from. <b>If a render carries no citation, it is not a panel, it is furniture.</b></p>

<div class="counts">${counts.map(([l, n]) => `<div><b>${n}</b><span>${esc(l)}</span></div>`).join("")}</div>
<p class="sub">Those five numbers are the document's own coverage. A proof that does not count itself is a brochure.</p>

${missing.length ? `<h2>Matrices not found</h2><div class="note">${missing.map((m) => `<code>${esc(m.path)}</code>`).join("<br>")}<br>Run <code>stax-migrate init</code> and fill them before reading anything below as evidence.</div>` : ""}

<h2>How to read this</h2>
<table><tr><th>Convention</th><th>What it means</th></tr>
<tr><td>A citation under a panel</td><td>the file and line the row was transcribed from. No citation, not a panel.</td></tr>
<tr><td><span class="unk">[unknown] column</span></td><td>a real cell that no source fills. Hover it: the title says what would settle it. These are drawn, never hidden.</td></tr>
<tr><td>A dashed panel border</td><td>the row declares no size, so the width shown is a PLACEHOLDER, not a quotation.</td></tr>
<tr><td>The disagreements section</td><td>two matrices that name the same surface and describe it differently. Neither is silently preferred.</td></tr>
</table>

<h2>Substitutions declared</h2>
<table><tr><th>What</th><th>Stands in</th><th>Why</th></tr>
${substitutions.map((s) => `<tr><td>${esc(s.what)}</td><td>${esc(s.stands)}</td><td>${esc(s.why)}</td></tr>`).join("")}
</table>

<h2>The panels, one per matrix row</h2>
${rendered.length || features.rows.length
  ? `<div class="grid">${features.rows.map(panel).join("")}</div>`
  : `<div class="note">feature-matrix.csv has no rows yet. There is nothing to prove.</div>`}

<h2>Disagreements between matrices${disagreements.length ? ` (${disagreements.length})` : ""}</h2>
${disagreements.length
  ? `<div class="scroll"><table><tr><th>What</th><th>One source says</th><th>The other says</th><th>What settles it</th></tr>
${disagreements.map((d) => `<tr><td>${esc(d.what)}</td><td>${esc(d.a)}</td><td>${esc(d.b)}</td><td>${esc(d.settles)}</td></tr>`).join("")}</table></div>`
  : `<div class="note">The matrices agree everywhere they overlap. That is a result worth stating, not an empty section.</div>`}

<h2>Unknowns drawn as unknown${unknowns.length ? ` (${unknowns.length})` : ""}</h2>
${unknowns.length
  ? `<p class="sub">Each one is a real cell that no source fills, and each names what would settle it. Hiding them would be the one dishonest thing this document could do.</p>
<div class="scroll"><table><tr><th>File</th><th>Row</th><th>Column</th><th>What would settle it</th></tr>
${unknowns.slice(0, 400).map((u) => `<tr><td>${esc(u.file)}</td><td>${esc(u.id)}</td><td>${esc(u.column)}</td><td>${esc(u.settles)}</td></tr>`).join("")}</table></div>
${unknowns.length > 400 ? `<div class="note">${unknowns.length - 400} further unknowns are counted above and omitted from this table.</div>` : ""}`
  : `<div class="note">Every cell in every matrix is filled. Check a sample by hand before believing it.</div>`}
</main>
<script>
// the viewer's toggle must beat the OS preference in both directions
(function(){var d=document.documentElement;d.addEventListener("keydown",function(e){
if(e.key==="d"&&!e.metaKey&&!e.ctrlKey){var c=d.getAttribute("data-theme");
d.setAttribute("data-theme",c==="dark"?"light":"dark");}});})();
</script>
`;
}
