#!/usr/bin/env node
/**
 * stax-migrate — migration engine: any legacy web app → the Stax
 * panels-inside-panels grammar, with a mechanical guarantee that
 * NO FEATURE, ELEMENT, TABLE, OR SERVER FUNCTION IS EVER SILENTLY LOST.
 *
 * The guarantee is not vibes — it is an INTEGRATION CONTRACT:
 *  · a LEVEL chosen at init (full | standard | starter | shell) recorded in
 *    contract.json — the gates enforce THAT level, so "10% integrated and
 *    quietly done" is impossible: every row must reach a terminal status the
 *    level accepts, and every non-migrated terminal status needs a cited reason.
 *  · THREE CSVs are the source of truth — feature-matrix.csv (behavior,
 *    F-NNN), element-matrix.csv (every icon/button/margin, E-NNN, vs
 *    design-spec.md), and data-matrix.csv (every table/collection AND every
 *    server function/endpoint, D-NNN, each bound to the panel that reads it
 *    and the foot action that writes it).
 *
 * Zero dependencies. Plain ESM. node >= 18.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { countDrift } from "./verify/drift.mjs";
import readline from "node:readline/promises";

const CLI_PATH = fileURLToPath(import.meta.url);
const PKG_DIR = path.dirname(CLI_PATH);
const TPL_DIR = path.join(PKG_DIR, "templates");
const WS = "stax-migration";
const CSV_HEADER = ["id", "area", "feature", "subfeature", "source", "ui_kind", "mapping", "size", "status", "evidence"];
const ELEM_HEADER = ["id", "area", "element", "kind", "count", "source", "stax_target", "tokens", "spacing", "status", "evidence"];
const DATA_HEADER = ["id", "layer", "name", "kind", "source", "ops", "panel_binding", "write_path", "status", "evidence"];
const LAST_PHASE = 9;

/* ── integration levels — the contract the gates enforce ──────────────────
 * Terminal statuses: migrated · wrapped (legacy embedded inside a panel) ·
 * deferred (postponed, reason cited) · out-of-scope (starter only, reason
 * cited). An empty / todo status ALWAYS blocks, at every level — and any
 * terminal status other than "migrated" blocks unless `evidence` carries
 * the reason. Nothing is ever skipped silently. */
const LEVELS = {
  full: {
    label: "FULL — 100% integrated",
    accept: ["migrated"],
    desc: "every feature, element, table and function migrated into the grammar; the old UI is purged. Nothing may be wrapped or deferred — drops are row deletions logged in decision-log.md.",
  },
  standard: {
    label: "STANDARD — everything terminal",
    accept: ["migrated", "wrapped", "deferred"],
    desc: "every row terminal: migrated, wrapped (legacy surface embedded in a panel), or deferred — wrapped/deferred REQUIRE the reason in the evidence column.",
  },
  starter: {
    label: "STARTER — core spaces at 100%",
    accept: ["migrated", "out-of-scope"],
    desc: "the chosen core areas fully migrated; every other row explicitly out-of-scope with its reason. In-scope means 100%.",
  },
  shell: {
    label: "SHELL — panels around the app",
    accept: ["migrated", "wrapped"],
    desc: "the Stax shell hosts the existing app; every legacy route/surface wrapped as a panel (reason = the mount point). Conversion is optional, coverage is not.",
  },
};
const LEVEL_KEYS = Object.keys(LEVELS);

const PHASES = [
  { n: 1, file: "01-recon.md",          name: "Recon",           does: "forensic feature inventory",            out: "inventory.md" },
  { n: 2, file: "02-feature-matrix.md", name: "Feature matrix",  does: "one row per capability, sub-rows too",  out: "feature-matrix.csv rows" },
  { n: 3, file: "03-ui-inventory.md",   name: "UI inventory",    does: "pixel crawl: icons, hex, margins",      out: "element-matrix.csv rows" },
  { n: 4, file: "04-mapping.md",        name: "Feature mapping", does: "features → grammar, deterministic",     out: "mapping + size on F rows" },
  { n: 5, file: "05-design-mapping.md", name: "Design mapping",  does: "elements → design-spec targets",        out: "stax_target/tokens/spacing" },
  { n: 6, file: "06-scaffold.md",       name: "Scaffold",        does: "panel shell beside the old app",        out: "registry, spaces, URL sync" },
  { n: 7, file: "07-migrate-batch.md",  name: "Migrate batches", does: "<=5 F rows + their E/D rows, run code",  out: "all matrices terminal" },
  { n: 8, file: "08-coverage-gate.md",  name: "Coverage gate",   does: "re-crawl old app + design audit sweep", out: "zero gaps, both at 100%" },
  { n: 9, file: "09-acceptance.md",     name: "Acceptance",      does: "laws, six states, redirects, purge",    out: "REPORT.md" },
];

/* ────────────────────────── ANSI (NO_COLOR-aware) ────────────────────────── */

const tty = Boolean(process.stdout.isTTY) && !("NO_COLOR" in process.env);
const paint = (open, close) => (s) => (tty ? `\x1b[${open}m${s}\x1b[${close}m` : String(s));
const bold = paint(1, 22);
const dim = paint(2, 22);
const cyan = paint(36, 39);
const green = paint(32, 39);
const yellow = paint(33, 39);
const red = paint(31, 39);
const mag = paint(35, 39);

/** Fatal CLI error — thrown, caught at dispatch, exits via process.exitCode
 *  (natural exit; process.exit() races Node's teardown and can segfault on some builds). */
class CliError extends Error {}
function die(msg) {
  throw new CliError(msg);
}

/* ────────────────────────── tiny CSV (quoted commas OK) ────────────────────────── */

function parseCSV(text) {
  const out = [];
  let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQ = false;
      } else field += c;
    } else if (c === '"') {
      inQ = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field.replace(/\r$/, "")); out.push(row); row = []; field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) { row.push(field.replace(/\r$/, "")); out.push(row); }
  return out;
}

function csvField(v) {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function serializeCSV(rows, header = CSV_HEADER) {
  const lines = [header.map(csvField).join(",")];
  for (const r of rows) lines.push(header.map((h) => csvField(r[h])).join(","));
  return lines.join("\n") + "\n";
}

/* ────────────────────────── workspace IO ────────────────────────── */

function resolveTarget(arg) {
  const t = path.resolve(process.cwd(), arg || ".");
  let st;
  try { st = fs.statSync(t); } catch { die(`target directory not found: ${t}`); }
  if (!st.isDirectory()) die(`target is not a directory: ${t}`);
  return t;
}

const wsPath = (target, ...p) => path.join(target, WS, ...p);

function requireWorkspace(target) {
  if (!fs.existsSync(wsPath(target, "state.json")))
    die(`no ${WS}/ workspace in ${target}\n  start with: stax-migrate init ${target}`);
}

function readState(target) {
  try { return JSON.parse(fs.readFileSync(wsPath(target, "state.json"), "utf8")); }
  catch { return { phase: 1 }; }
}

function writeState(target, s) {
  fs.writeFileSync(wsPath(target, "state.json"), JSON.stringify(s, null, 2) + "\n");
}

function readCSVRows(p) {
  if (!fs.existsSync(p)) return [];
  const cells = parseCSV(fs.readFileSync(p, "utf8"));
  if (cells.length < 2) return [];
  const header = cells[0].map((h) => h.trim());
  return cells
    .slice(1)
    .filter((r) => r.some((f) => String(f).trim() !== ""))
    .map((r) => {
      const o = {};
      header.forEach((h, i) => { o[h] = String(r[i] ?? "").trim(); });
      return o;
    });
}
const readFeatures = (target) => readCSVRows(wsPath(target, "feature-matrix.csv"));
const readElements = (target) => readCSVRows(wsPath(target, "element-matrix.csv"));
const readData = (target) => readCSVRows(wsPath(target, "data-matrix.csv"));

/* ── integration contract IO ──
 * Legacy v0.2 workspaces have no contract.json → they behave as FULL with the
 * data matrix waived (they never inventoried one); new inits always write it. */
function readContract(target) {
  try {
    const c = JSON.parse(fs.readFileSync(wsPath(target, "contract.json"), "utf8"));
    const scope = Array.isArray(c.scope) ? c.scope.map((s) => String(s).trim()).filter(Boolean) : [];
    if (!LEVELS[c.level]) return { level: "full", data: c.data !== false, scope, legacy: false };
    return { level: c.level, data: c.data !== false, scope, legacy: false };
  } catch {
    return { level: "full", data: false, scope: [], legacy: true };
  }
}
function writeContract(target, c) {
  fs.writeFileSync(
    wsPath(target, "contract.json"),
    JSON.stringify({
      level: c.level,
      data: c.data !== false,
      scope: Array.isArray(c.scope) ? c.scope : [],
      created: c.created ?? new Date().toISOString().slice(0, 10),
    }, null, 2) + "\n",
  );
}

/* ── upgrade catalog — layout/design updates for ALREADY-STAX projects ──
 * The catalog ships with the package (upgrades/manifest.json + one brief per
 * unit). Applied units are recorded per-project in stax-migration/upgrades.json
 * — `upgrade` works standalone: it never requires the full migration workspace. */
const UPG_DIR = path.join(PKG_DIR, "upgrades");
function upgradeCatalog() {
  try { return JSON.parse(fs.readFileSync(path.join(UPG_DIR, "manifest.json"), "utf8")).catalog; }
  catch { return []; }
}
function readApplied(target) {
  try { return JSON.parse(fs.readFileSync(wsPath(target, "upgrades.json"), "utf8")).applied ?? []; }
  catch { return []; }
}
function recordApplied(target, id) {
  fs.mkdirSync(wsPath(target), { recursive: true });
  const applied = readApplied(target);
  if (!applied.some((a) => a.id === id))
    applied.push({ id, date: new Date().toISOString().slice(0, 10) });
  fs.writeFileSync(wsPath(target, "upgrades.json"), JSON.stringify({ applied }, null, 2) + "\n");
}
function upgradeBrief(target, id) {
  const unit = upgradeCatalog().find((u) => u.id === id);
  if (!unit) die(`unknown upgrade "${id}" — see: stax-migrate upgrade ${target}`);
  const p = path.join(UPG_DIR, id + ".md");
  if (!fs.existsSync(p)) die(`brief missing from the package: ${p}`);
  return fs.readFileSync(p, "utf8").replaceAll("{{TARGET}}", target).replaceAll("{{CLI}}", CLI_PATH);
}

/** Union the CURRENT matrix ids into state.json — the gates' memory. A row
 *  that was ever seen can never silently vanish: deletion must be logged. */
function noteSeen(target) {
  const st = readState(target);
  const seen = st.seen ?? {};
  const union = (k, rows) => [...new Set([...(seen[k] ?? []), ...rows.map((r) => r.id).filter(Boolean)])];
  st.seen = { f: union("f", readFeatures(target)), e: union("e", readElements(target)), d: union("d", readData(target)) };
  writeState(target, st);
}

/* ────────────────────────── stack sniff + templates ────────────────────────── */

function sniffStack(target) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf8"));
    const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
    if (deps.next) return "Next.js";
    if (deps["@angular/core"]) return "Angular";
    if (deps.nuxt) return "Vue (Nuxt)";
    if (deps.vue) return "Vue";
    if (deps.svelte || deps["@sveltejs/kit"]) return "Svelte";
    if (deps.react || deps["react-dom"]) return "React";
    if (deps.express) return "Express";
  } catch { /* no package.json or unparsable — fall through */ }
  if (fs.existsSync(path.join(target, "Gemfile"))) return "Rails-ish";
  return "unknown";
}

function renderTemplate(file, target, stack, contract) {
  const p = path.join(TPL_DIR, file);
  if (!fs.existsSync(p)) die(`template missing from the stax-migrate package: ${p}`);
  const c = contract ?? readContract(target);
  const lv = LEVELS[c.level];
  return fs.readFileSync(p, "utf8")
    .replaceAll("{{TARGET}}", target)
    .replaceAll("{{STACK}}", stack)
    .replaceAll("{{CLI}}", CLI_PATH)
    .replaceAll("{{LEVEL}}", c.level)
    .replaceAll("{{LEVEL_LABEL}}", lv.label)
    .replaceAll("{{LEVEL_DESC}}", lv.desc)
    .replaceAll("{{LEVEL_ACCEPT}}", lv.accept.join(" | "))
    .replaceAll("{{DATA_ON}}", c.data ? "yes" : "no (waived at init)");
}

function phasePrompt(target, n) {
  const ph = PHASES.find((p) => p.n === n);
  if (!ph) die(`no phase ${n} — phases are 1..${LAST_PHASE}`);
  const local = wsPath(target, ph.file);
  if (fs.existsSync(local)) return fs.readFileSync(local, "utf8");
  return renderTemplate(ph.file, target, sniffStack(target));
}

/* ────────────────────────── exit gates ────────────────────────── */

const unmigrated = (rows) => rows.filter((r) => (r.status || "").toLowerCase() !== "migrated");

/** Rows that BLOCK the gate at `level`:
 *  status empty / not accepted by the level; ANY terminal status without
 *  `evidence` (migrated rows must cite their file:line/runtime proof — a
 *  bulk status-flip with no citations is the cheapest way to fake a
 *  migration); and at starter, out-of-scope on a DECLARED in-scope area. */
function blockingRows(rows, level, scope = []) {
  const accept = LEVELS[level].accept;
  return rows
    .map((r) => {
      const s = (r.status || "").toLowerCase();
      if (!accept.includes(s))
        return { row: r, why: s ? `status "${s}" not accepted at level ${level} (accepted: ${accept.join("|")})` : "empty status" };
      if (!(r.evidence || "").trim())
        return {
          row: r,
          why: s === "migrated"
            ? "migrated without evidence — cite the file:line (or runtime proof) that serves it"
            : `${s} without a cited reason in evidence`,
        };
      if (level === "starter" && s === "out-of-scope" && scope.length && scope.includes((r.area || "").trim()))
        return { row: r, why: `area "${r.area}" is DECLARED IN SCOPE — out-of-scope is not allowed on it` };
      return null;
    })
    .filter(Boolean);
}

function idList(rows, cap = 20) {
  const ids = rows.map((r) => (r.row ? r.row.id : r.id) || "(no id)");
  return ids.slice(0, cap).join(", ") + (ids.length > cap ? ` … +${ids.length - cap} more` : "");
}

function blockList(blocks, cap = 12) {
  return blocks.slice(0, cap).map((b) => `${b.row.id || "(no id)"} — ${b.why}`);
}

/** A row that is skipped at mapping time (deferred/out-of-scope/wrapped WITH
 *  a reason) is exempt from mapping-completeness checks. */
const skippedWithReason = (r) =>
  ["deferred", "out-of-scope", "wrapped"].includes((r.status || "").toLowerCase()) && (r.evidence || "").trim() !== "";

function checkPhase(target, n) {
  const problems = [];
  const contract = readContract(target);
  const { level } = contract;
  const fRows = readFeatures(target);
  const eRows = readElements(target);
  const dRows = readData(target);
  // deletion guard — a row the gates have seen can only leave the matrix with
  // a decision-log entry naming its id. Silent deletion is the one move that
  // would defeat the whole guarantee.
  if (n >= 2) {
    const seen = readState(target).seen ?? {};
    let dlog = "";
    try { dlog = fs.readFileSync(wsPath(target, "decision-log.md"), "utf8"); } catch { /* no log yet */ }
    for (const [k, label, rows] of [["f", "feature", fRows], ["e", "element", eRows], ["d", "data", dRows]]) {
      const cur = new Set(rows.map((r) => r.id));
      const missing = (seen[k] ?? []).filter((id) => !cur.has(id) && !dlog.includes(id));
      if (missing.length)
        problems.push(`${missing.length} previously-seen ${label} row(s) DELETED without a decision-log entry: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? " …" : ""} — restore them, or log the drop with the row id`);
    }
  }
  // a starter contract without a declared scope is unfalsifiable — refuse to
  // map or migrate until the in-scope areas are named
  if (level === "starter" && contract.scope.length === 0 && [4, 7, 8, 9].includes(n))
    problems.push(`starter contract has no declared scope — name the in-scope areas first: stax-migrate scope <area1,area2> ${target}`);
  if (n === 1) {
    const p = wsPath(target, "inventory.md");
    if (!fs.existsSync(p) || fs.readFileSync(p, "utf8").trim().length < 40)
      problems.push(`${WS}/inventory.md is missing or empty — phase 1 must produce the forensic inventory (features AND schema/functions)`);
  } else if (n === 2) {
    if (fRows.length === 0)
      problems.push("feature-matrix.csv has 0 rows — phase 2 must convert inventory.md into one row per capability");
    if (contract.data && dRows.length === 0)
      problems.push("data-matrix.csv has 0 rows — phase 2 must inventory every table/collection AND every server function/endpoint (D-NNN). No backend at all? waive it: stax-migrate level " + level + " --no-data");
  } else if (n === 3) {
    if (eRows.length === 0)
      problems.push("element-matrix.csv has 0 rows — phase 3 must crawl the design down to icons, hex values, and margins");
  } else if (n === 4) {
    if (fRows.length === 0) problems.push("feature-matrix.csv has 0 rows — run phase 2 first");
    const empty = fRows.filter((r) => !r.mapping && !skippedWithReason(r));
    if (empty.length) problems.push(`${empty.length} feature row(s) with an empty mapping (and no reasoned skip status): ${idList(empty)}`);
    const dEmpty = dRows.filter((r) => !r.panel_binding && !skippedWithReason(r));
    if (dEmpty.length) problems.push(`${dEmpty.length} data row(s) with an empty panel_binding — every table/function must name the panel that reads it (or carry a reasoned skip status): ${idList(dEmpty)}`);
  } else if (n === 5) {
    if (eRows.length === 0) problems.push("element-matrix.csv has 0 rows — run phase 3 first");
    const empty = eRows.filter((r) => !r.stax_target && !skippedWithReason(r));
    if (empty.length) problems.push(`${empty.length} element row(s) with an empty stax_target: ${idList(empty)}`);
  } else if (n === 7 || n === 8) {
    if (fRows.length === 0)
      problems.push("feature-matrix.csv has 0 rows — the guarantee has nothing to guarantee; run phases 1-2 first");
    if (eRows.length === 0)
      problems.push("element-matrix.csv has 0 rows — the pixel guarantee has nothing to guarantee; run phase 3 first");
    if (contract.data && dRows.length === 0)
      problems.push("data-matrix.csv has 0 rows — the data guarantee has nothing to guarantee; run phase 2 first");
    for (const [label, rows] of [["feature", fRows], ["element", eRows], ["data", dRows]]) {
      const blocks = blockingRows(rows, level, contract.scope);
      if (blocks.length) {
        problems.push(`${blocks.length} ${label} row(s) block the ${level.toUpperCase()} gate:`);
        for (const line of blockList(blocks)) problems.push(`    ${line}`);
      }
    }
    // phase 8 is the ADVERSARIAL pass — it must leave an artifact, or a second
    // `done` right after phase 7 would skip the audit entirely
    if (n === 8) {
      const auditP = wsPath(target, "audit-8.md");
      if (!fs.existsSync(auditP) || fs.readFileSync(auditP, "utf8").trim().length < 200)
        problems.push(`${WS}/audit-8.md is missing or trivial — phase 8 must WRITE its re-crawl + design sweep + data re-crawl findings (even "zero gaps found", with the protocols and counts) before the gate advances`);
    }
    // a migrated data source that can WRITE must name its write path — the
    // foot action / composer that mutates it. Reads without writes are fine.
    // ops vocabulary: c/r/u/d (and legacy "w") — anything beyond pure read is a write.
    const writable = dRows.filter((r) =>
      (r.status || "").toLowerCase() === "migrated" && /[cudw]/i.test(r.ops || "") && !(r.write_path || "").trim());
    if (writable.length)
      problems.push(`${writable.length} migrated WRITABLE data row(s) with no write_path — a table you can write needs the foot action that writes it: ${idList(writable)}`);
  } else if (n === 9) {
    if (!fs.existsSync(wsPath(target, "REPORT.md")))
      problems.push(`${WS}/REPORT.md is missing — phase 9 must write the final before/after report`);
    else if (!fs.readFileSync(wsPath(target, "REPORT.md"), "utf8").toLowerCase().includes("integration contract"))
      problems.push(`${WS}/REPORT.md has no "Integration contract" section — the report must attest the level (${level}) and the three coverage numbers, and list every wrapped/deferred/out-of-scope row with its reason`);
  }
  return problems;
}

/* ────────────────────────── commands ────────────────────────── */

async function askLevel() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  console.log();
  console.log("  " + bold("INTEGRATION LEVEL") + dim(" — the contract every gate will enforce. Nothing below it ever passes."));
  LEVEL_KEYS.forEach((k, i) => {
    console.log(`    ${bold(i + 1)}) ${cyan(k.padEnd(9))} ${LEVELS[k].label}${k === "full" ? green("  (recommended)") : ""}`);
    console.log(`       ${dim(LEVELS[k].desc)}`);
  });
  const a = (await rl.question(`  select 1-${LEVEL_KEYS.length} or name [1 = full]: `)).trim().toLowerCase();
  rl.close();
  if (LEVELS[a]) return a;
  const i = Number(a);
  if (Number.isInteger(i) && i >= 1 && i <= LEVEL_KEYS.length) return LEVEL_KEYS[i - 1];
  return "full";
}

async function cmdInit(target, flags) {
  const stack = sniffStack(target);
  fs.mkdirSync(wsPath(target), { recursive: true });
  const fresh = !fs.existsSync(wsPath(target, "state.json"));

  // the integration contract — flag wins; else interactive; else full
  let level = flags.level;
  if (level !== undefined && !LEVELS[level])
    die(`unknown --level "${level}" — levels: ${LEVEL_KEYS.join(" | ")}`);
  const hadContract = fs.existsSync(wsPath(target, "contract.json"));
  if (!level) {
    if (hadContract) level = readContract(target).level; // re-init keeps the contract
    else if (process.stdin.isTTY && process.stdout.isTTY) level = await askLevel();
    else level = "full";
  }
  const contract = { level, data: !flags["no-data"], scope: flags.scope ? String(flags.scope).split(",").map((s) => s.trim()).filter(Boolean) : (hadContract ? readContract(target).scope : []) };
  writeContract(target, contract);

  for (const ph of PHASES)
    fs.writeFileSync(wsPath(target, ph.file), renderTemplate(ph.file, target, stack, contract));
  // design-spec.md is the canonical pixel contract — always refreshed, like the briefs
  fs.writeFileSync(wsPath(target, "design-spec.md"), fs.readFileSync(path.join(TPL_DIR, "design-spec.md"), "utf8"));
  if (!fs.existsSync(wsPath(target, "feature-matrix.csv")))
    fs.writeFileSync(wsPath(target, "feature-matrix.csv"), serializeCSV([], CSV_HEADER));
  if (!fs.existsSync(wsPath(target, "element-matrix.csv")))
    fs.writeFileSync(wsPath(target, "element-matrix.csv"), serializeCSV([], ELEM_HEADER));
  if (!fs.existsSync(wsPath(target, "data-matrix.csv")))
    fs.writeFileSync(wsPath(target, "data-matrix.csv"), serializeCSV([], DATA_HEADER));
  if (!fs.existsSync(wsPath(target, "decision-log.md")))
    fs.writeFileSync(
      wsPath(target, "decision-log.md"),
      "# Decision log — Stax migration\n\n" +
      "Every ambiguous mapping call gets one line:\n" +
      "`YYYY-MM-DD · F-NNN · the call made · the rule that decided it`\n\n" +
      "Phase 3 writes here; phases 5-7 read it. An undocumented judgment call is a bug.\n"
    );
  if (fresh) writeState(target, { phase: 1 });

  const line = (s = "") => console.log("  " + s);
  const rows = PHASES.map((ph) => `${ph.n}  ${ph.name.padEnd(16)} ${ph.does.padEnd(42)} → ${ph.out}`);
  const inner = Math.max("THE 9 PHASES".length, ...rows.map((r) => r.length));
  const rule = (l, r) => line(l + "─".repeat(inner + 2) + r);
  const boxRow = (s, style = (x) => x) => line("│ " + style(s.padEnd(inner)) + " │");

  line();
  line(bold(mag("STAX-MIGRATE")) + dim(" · panels-inside-panels refonte engine"));
  line(dim("target    ") + target);
  line(dim("stack     ") + cyan(stack));
  line(dim("contract  ") + bold(mag(level.toUpperCase())) + dim(" — " + LEVELS[level].desc));
  line(dim("data      ") + (contract.data ? "tables + server functions gated (data-matrix.csv)" : yellow("WAIVED (--no-data) — no data matrix will be required")));
  line(dim("workspace ") + `${WS}/  ` + dim(fresh ? "(created)" : "(already existed — templates refreshed, matrices/contract/state/log preserved)"));
  line();
  rule("┌", "┐");
  boxRow("THE 9 PHASES", bold);
  rule("├", "┤");
  for (const r of rows) boxRow(r);
  rule("└", "┘");
  line();
  line(bold("THE CONTRACT") + ` — level ${bold(level)}: gates accept only [${LEVELS[level].accept.join(" | ")}],`);
  line("and every non-migrated terminal status must cite its reason in the evidence");
  line("column — an uncited skip BLOCKS. Three matrices are law: features (F-NNN),");
  line("elements (E-NNN vs design-spec.md), and data (D-NNN — every table and server");
  line("function, bound to the panel that reads it and the foot action that writes it).");
  line(green("No feature, pixel, table, or function is ever lost silently. Mechanically."));
  line();
  line(dim("files: ") + PHASES.map((p) => p.file).join(" ") + dim(" · design-spec.md · feature/element/data-matrix.csv · contract.json · decision-log.md · state.json"));
  line();
  line(bold("next → ") + cyan(`stax-migrate next ${target}`) + dim("   (phase 1 brief + how to run it)"));
  line();
}

function matrixBlock(label, rows, level, scope) {
  const total = rows.length;
  const counts = {};
  for (const r of rows) { const s = r.status || "(empty)"; counts[s] = (counts[s] || 0) + 1; }
  const migrated = counts.migrated || 0;
  const pct = total ? Math.round((migrated / total) * 100) : 0;
  const barLen = 24;
  const fill = total ? Math.round((migrated / total) * barLen) : 0;
  const bar = "█".repeat(fill) + "░".repeat(barLen - fill);
  const byStatus = Object.entries(counts).map(([k, v]) => `${k} ${bold(v)}`).join(" · ") || dim("—");
  console.log("  " + dim(label.padEnd(10)) + `${bold(total)} row(s)   ${byStatus}`);
  const blocks = blockingRows(rows, level, scope);
  console.log("  " + " ".repeat(10) + `[${blocks.length === 0 && total > 0 ? green(bar) : cyan(bar)}] ${bold(pct + "%")} migrated` +
    dim(` · gate(${level}): `) + (total === 0 ? dim("no rows yet") : blocks.length === 0 ? green("green") : red(`${blocks.length} blocking`)));
  if (blocks.length) console.log("  " + " ".repeat(10) + dim("blocking: ") + yellow(idList(blocks, 8)));
}

function cmdStatus(target) {
  requireWorkspace(target);
  const st = readState(target);
  const contract = readContract(target);
  console.log();
  console.log("  " + bold(mag("STAX-MIGRATE")) + dim(" · status — ") + target);
  console.log("  " + dim("contract  ") + bold(mag(contract.level.toUpperCase())) + dim(` — accepts [${LEVELS[contract.level].accept.join(" | ")}] · non-migrated needs a cited reason`) + (contract.legacy ? yellow(" · legacy workspace (no contract.json — re-run init to choose a level)") : ""));
  if (contract.level === "starter")
    console.log("  " + dim("scope     ") + (contract.scope.length ? contract.scope.join(" · ") : yellow("NOT DECLARED — required before phase 4: stax-migrate scope <areas>")));
  if (st.phase > LAST_PHASE) {
    console.log("  " + green(bold(`phase     COMPLETE — all ${LAST_PHASE} phases passed`)));
  } else {
    const ph = PHASES[st.phase - 1];
    console.log("  " + dim("phase     ") + bold(`${st.phase}/${LAST_PHASE} — ${ph.name}`) + dim(` (${ph.does})`));
  }
  matrixBlock("features", readFeatures(target), contract.level, contract.scope);
  matrixBlock("elements", readElements(target), contract.level, contract.scope);
  if (contract.data) matrixBlock("data", readData(target), contract.level, contract.scope);
  else console.log("  " + dim("data      waived (--no-data) — no tables/functions gated"));
  console.log();
}

/** The one-shot honesty check: the contracted level vs live coverage, all three matrices. */
function cmdContract(target) {
  requireWorkspace(target);
  const c = readContract(target);
  const lv = LEVELS[c.level];
  console.log();
  console.log("  " + bold(mag("INTEGRATION CONTRACT")) + dim(" — ") + target);
  console.log("  " + dim("level     ") + bold(mag(c.level.toUpperCase())) + " — " + lv.label);
  console.log("  " + dim("          ") + dim(lv.desc));
  console.log("  " + dim("accepts   ") + lv.accept.join(" · ") + dim("  (anything else — or an uncited skip — blocks)"));
  console.log("  " + dim("data      ") + (c.data ? "tables + server functions gated" : yellow("waived")));
  if (c.level === "starter")
    console.log("  " + dim("scope     ") + (c.scope.length ? c.scope.join(" · ") : yellow("NOT DECLARED — the contract is unfalsifiable until areas are named")));
  const sets = [["features", readFeatures(target)], ["elements", readElements(target)]];
  if (c.data) sets.push(["data", readData(target)]);
  let allGreen = true;
  for (const [label, rows] of sets) {
    const blocks = blockingRows(rows, c.level, c.scope);
    const skipped = rows.filter((r) => (r.status || "").toLowerCase() !== "migrated" && !blocks.some((b) => b.row === r));
    if (blocks.length) allGreen = false;
    if (rows.length === 0) { allGreen = false; console.log("  " + dim(label.padEnd(10)) + yellow("no rows yet")); continue; }
    console.log("  " + dim(label.padEnd(10)) + (blocks.length === 0 ? green(`HONORED — ${rows.length} row(s) terminal`) : red(`${blocks.length}/${rows.length} row(s) in breach`)) +
      (skipped.length ? dim(` · ${skipped.length} reasoned skip(s)`) : ""));
    for (const line of blockList(blocks, 8)) console.log("      " + red("· ") + line);
  }
  console.log("  " + (allGreen ? green(bold("CONTRACT HONORED — the integration is what it claims to be.")) : red(bold("CONTRACT IN BREACH — this is NOT a " + c.level.toUpperCase() + " integration yet."))));
  console.log();
  if (!allGreen) process.exitCode = 1;
}

function cmdLevel(target, name, flags) {
  requireWorkspace(target);
  const c = readContract(target);
  if (!name) {
    console.log(bold(mag(c.level.toUpperCase())) + " — " + LEVELS[c.level].desc + (c.data ? "" : yellow("  [data waived]")));
    return;
  }
  if (!LEVELS[name]) die(`unknown level "${name}" — levels: ${LEVEL_KEYS.join(" | ")}`);
  const st = readState(target);
  const loosening = LEVEL_KEYS.indexOf(name) > LEVEL_KEYS.indexOf(c.level);
  const waivingData = c.data && flags["no-data"];
  if (loosening && st.phase > 1 && !flags.force)
    die(`refusing to LOWER the contract from ${c.level} to ${name} mid-migration — that is how 10% integrations happen.\n  if this is a deliberate re-scope: stax-migrate level ${name} ${target} --force  (the change is logged)`);
  if (waivingData && !flags.force)
    die(`refusing to WAIVE the data matrix mid-migration — dropping the database/functions guarantee is a contract loosening.\n  if the project truly has no backend: stax-migrate level ${name} ${target} --no-data --force  (the change is logged)`);
  const next = { level: name, data: flags["no-data"] ? false : (flags.data ? true : c.data), scope: c.scope };
  writeContract(target, next);
  const logLine = (msg) => fs.appendFileSync(wsPath(target, "decision-log.md"), `${new Date().toISOString().slice(0, 10)} · CONTRACT · ${msg}\n`);
  if (loosening && st.phase > 1) logLine(`level lowered ${c.level} → ${name} (--force) — every gate now accepts [${LEVELS[name].accept.join("|")}]`);
  if (waivingData) logLine(`data matrix WAIVED (--no-data --force) — tables and server functions are no longer gated`);
  console.log(green(`✓ contract level: ${c.level} → ${bold(name)}`) + dim(" — gates now enforce ") + LEVELS[name].label + (waivingData ? yellow("  [data waived — logged]") : ""));
}

/** Declare (or amend) the STARTER in-scope areas — the falsifiability anchor:
 *  in-scope rows must migrate; out-of-scope is only legal outside the scope. */
function cmdScope(target, list, flags) {
  requireWorkspace(target);
  const c = readContract(target);
  if (!list) {
    console.log(c.scope.length ? c.scope.join(" · ") : dim("no scope declared") + (c.level === "starter" ? yellow("  — required before phase 4") : ""));
    return;
  }
  const next = [...new Set(String(list).split(",").map((s) => s.trim()).filter(Boolean))];
  if (next.length === 0) die("empty scope — pass a comma-separated area list: stax-migrate scope deals,contacts " + target);
  if (c.scope.length && !flags.force)
    die(`a scope is already declared (${c.scope.join(", ")}) — changing it mid-migration re-scopes the contract.\n  deliberate? stax-migrate scope ${list} ${target} --force  (the change is logged)`);
  writeContract(target, { ...c, scope: next });
  if (c.scope.length)
    fs.appendFileSync(wsPath(target, "decision-log.md"),
      `${new Date().toISOString().slice(0, 10)} · CONTRACT · scope changed [${c.scope.join(",")}] → [${next.join(",")}] (--force)\n`);
  console.log(green("✓ scope declared: ") + next.join(" · ") + dim("  — these areas must reach 100% migrated; out-of-scope is only legal outside them"));
}

function cmdPrompt(n, target) {
  process.stdout.write(phasePrompt(target, n));
}

function cmdNext(target) {
  requireWorkspace(target);
  const st = readState(target);
  if (st.phase > LAST_PHASE) {
    console.log(green(`✓ migration complete — all ${LAST_PHASE} phases passed. Nothing left to run.`));
    return;
  }
  const ph = PHASES[st.phase - 1];
  console.log(dim("─".repeat(78)));
  console.log(bold(mag(`PHASE ${st.phase}/${LAST_PHASE} — ${ph.name.toUpperCase()}`)) + dim(` · produces ${ph.out}`));
  console.log(dim("─".repeat(78)));
  process.stdout.write(phasePrompt(target, st.phase));
  console.log(dim("─".repeat(78)));
  console.log(bold("RUN IT"));
  console.log("  " + cyan(`stax-migrate run ${target} --agent claude`) + dim("   (or --agent codex)"));
  console.log("  " + dim("or copy the brief above into any coding agent, cwd = ") + target);
  console.log(bold("THEN") + "  " + cyan(`stax-migrate done ${target}`) + dim("   — the exit gate decides, not the agent"));
  if (st.phase === 7) console.log(dim("  phase 7 loops: re-run it (<=5 F rows + their E/D rows per run) until every matrix meets the contract."));
  console.log(dim("─".repeat(78)));
}

function cmdDone(target) {
  requireWorkspace(target);
  noteSeen(target); // the gate's memory: every current row id, forever
  const st = readState(target);
  if (st.phase > LAST_PHASE) {
    console.log(green(`✓ migration already complete — all ${LAST_PHASE} phases passed.`));
    return;
  }
  const ph = PHASES[st.phase - 1];
  const problems = checkPhase(target, st.phase);
  if (problems.length) {
    console.log(red(bold(`✗ REFUSED — phase ${st.phase} (${ph.name}) exit criteria not met:`)));
    for (const p of problems) console.log(red("  · ") + p);
    if (st.phase === 7)
      console.log(dim("  loop phase 7 (each run migrates <=5 F rows + their E/D rows) until every matrix meets the contract, then retry."));
    if (st.phase === 8)
      console.log(dim("  gaps and design findings go back through phase 7: stax-migrate run --phase 7, then re-run the gate."));
    process.exitCode = 1;
    return;
  }
  if (st.phase === 6)
    console.log(dim("phase 6 has no mechanical gate — advancing on your word that the shell builds and the old app still runs."));
  st.phase += 1;
  writeState(target, st);
  if (st.phase > LAST_PHASE) {
    const lvl = readContract(target).level;
    console.log(green(bold("✓ MIGRATION COMPLETE")) + green(` — ${LAST_PHASE}/${LAST_PHASE} phases passed at level ${bold(lvl.toUpperCase())}: every row of all`));

    // BASELINE: a fresh adoption is born current — every existing catalog unit
    // is part of the migration itself, so doctor/upgrade start from zero pending
    for (const u of upgradeCatalog()) recordApplied(target, u.id, "baseline at adoption");
    console.log(green(`  matrices terminal, every skip cited, report at ${WS}/REPORT.md. The contract is honored, to the pixel.`));
  } else {
    console.log(green(`✓ phase ${st.phase - 1} (${ph.name}) passed`) + ` → now at phase ${bold(`${st.phase}/${LAST_PHASE}`)} — ${PHASES[st.phase - 1].name}`);
    console.log(dim(`  next: stax-migrate next ${target}`));
  }
}

function which(bin) {
  const r = spawnSync("sh", ["-c", `command -v ${bin}`], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}

const INSTALL_HINTS = {
  claude: "npm install -g @anthropic-ai/claude-code    (or: curl -fsSL https://claude.ai/install.sh | bash)",
  codex: "npm install -g @openai/codex",
};

function cmdRun(target, agent, phaseFlag) {
  requireWorkspace(target);
  noteSeen(target);
  const st = readState(target);
  if (st.phase > LAST_PHASE && !phaseFlag) {
    console.log(green("✓ migration already complete — nothing to run."));
    return;
  }
  if (!agent) die("missing --agent — usage: stax-migrate run [dir] --agent claude|codex [--phase n]");
  if (!["claude", "codex"].includes(agent)) die(`unknown agent "${agent}" — supported: claude, codex`);
  const n = phaseFlag !== undefined ? Number(phaseFlag) : st.phase;
  if (!Number.isInteger(n) || n < 1 || n > LAST_PHASE) die(`invalid --phase ${phaseFlag} — phases are 1..${LAST_PHASE}`);

  if (!which(agent)) {
    console.log(red(`✗ "${agent}" CLI not found on PATH.`));
    console.log("  install: " + INSTALL_HINTS[agent]);
    console.log("  fallback — print the brief and paste it into any agent yourself:");
    console.log("    " + cyan(`stax-migrate prompt ${n} ${target}`));
    process.exitCode = 1;
    return;
  }

  const prompt = phasePrompt(target, n);
  const ph = PHASES[n - 1];
  console.log(bold(mag(`▶ phase ${n}/${LAST_PHASE} — ${ph.name}`)) + dim(` · agent: ${agent} · cwd: ${target}`));
  console.log(dim("  one phase per invocation — you advance with `stax-migrate done`, never the agent."));
  const args = agent === "claude"
    ? ["-p", prompt, "--permission-mode", "acceptEdits"]
    : ["exec", prompt];
  const r = spawnSync(agent, args, { cwd: target, stdio: "inherit" });
  if (r.status !== 0) console.log(yellow(`agent exited with status ${r.status} — inspect before trusting anything.`));

  const problems = checkPhase(target, n);
  console.log();
  if (problems.length === 0) {
    console.log(green(`✓ phase ${n} exit criteria look green.`));
    console.log("  advance with: " + cyan(`stax-migrate done ${target}`));
  } else {
    console.log(yellow(bold(`phase ${n} is NOT complete — still missing:`)));
    for (const p of problems) console.log(yellow("  · ") + p);
    if (n === 7) console.log(dim("  re-run this exact command — each run migrates <=5 more F rows + their E rows."));
    else console.log(dim("  re-run the phase (or finish by hand), then: stax-migrate done " + target));
  }
}

/* upgrade — bring an ALREADY-STAX project up to the latest layout/design grammar */
function walkSrc(dir, exts, out = [], depth = 0) {
  if (depth > 6 || !fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === "dist" || e.name.startsWith(".")) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkSrc(p, exts, out, depth + 1);
    else if (exts.some((x) => e.name.endsWith(x))) out.push(p);
  }
  return out;
}

/** doctor: the adoption health report — contract, pending upgrades, design drift. */
export function cmdDoctor(target) {
  const mig = path.join(target, "stax-migration");
  console.log(`stax doctor · ${target}\n`);
  if (!fs.existsSync(mig)) {
    console.log("NOT ADOPTED: no stax-migration/ here. Start with: stax-migrate init");
    process.exitCode = 1;
    return;
  }
  // 1 — the contract
  let level = "?", scope = null;
  const cPath = path.join(mig, "contract.json");
  if (fs.existsSync(cPath)) {
    try { const c = JSON.parse(fs.readFileSync(cPath, "utf8")); level = c.level ?? "?"; scope = c.scope ?? null; } catch { /* unreadable */ }
  }
  console.log(`CONTRACT   level ${level}${scope ? " · scope " + scope.join(",") : ""}`);
  // 2 — upgrades: applied vs catalog
  const applied = new Set(readApplied(target).map((u) => u.id));
  const catalog = upgradeCatalog();
  const pending = catalog.filter((u) => !applied.has(u.id));
  console.log(`UPGRADES   ${applied.size}/${catalog.length} applied${pending.length ? " · PENDING: " + pending.map((u) => u.id).join(" ") : " · up to date"}`);
  // 3 — design drift: hardcoded values outside the token file
  const files = walkSrc(path.join(target, "src"), [".css", ".tsx", ".ts", ".jsx", ".js"]);
  let hex = 0, fz = 0;
  const offenders = new Map();
  for (const p of files) {
    if (/tokens?\.css$/.test(p)) continue;
    const t = fs.readFileSync(p, "utf8");
    const { hex: h, fz: z } = countDrift(t);
    if (h + z > 0) offenders.set(path.relative(target, p), h + z);
    hex += h; fz += z;
  }
  console.log(`DRIFT      ${hex} hex literal(s) · ${fz} hardcoded font-size(s) outside tokens${offenders.size ? "\n           worst: " + [...offenders.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([p, n]) => `${p} (${n})`).join(" · ") : ""}`);
  // 4 — the spec
  const specHere = fs.existsSync(path.join(target, "DESIGN-SPEC.md"));
  console.log(`SPEC       DESIGN-SPEC.md ${specHere ? "present" : "MISSING (copy it from the stax repo templates)"}`);
  // 5 — prescription
  const rx = [];
  if (pending.length) rx.push(`stax-migrate upgrade run        # applies ${pending[0].id}${pending.length > 1 ? " (+" + (pending.length - 1) + " more)" : ""}`);
  if (hex + fz > 0) rx.push("re-run the M7 token sweep       # zero hardcoded hex/font-size is the bar");
  if (!specHere) rx.push("restore DESIGN-SPEC.md          # the contract must live in the repo");
  rx.push("stax-migrate verify --url <live> --themes light,dark");
  console.log(`\nPRESCRIPTION\n  ${rx.join("\n  ")}`);
  if (pending.length || hex + fz > 0 || !specHere) process.exitCode = 1;
}

async function cmdTheme(flags) {
  const from = flags.from;
  if (!from) {
    console.log("Usage: stax-migrate theme --from \"#e11d48\"");
    console.log("Emits the full OKLCH accent ramp (both themes) for your brand color.");
    process.exit(2);
  }
  const { themeBlock } = await import(new URL("./theme.mjs", import.meta.url).href);
  const block = themeBlock(String(from));
  if (!block) { console.error(`theme: "${from}" is not a #rrggbb color`); process.exit(2); }
  console.log(block);
}

function cmdParity(target, flags) {
  const url = flags.url;
  const file = flags.file ? path.resolve(process.cwd(), String(flags.file)) : path.join(target, "stax-migration", "parity.csv");
  if (!url || !fs.existsSync(file)) {
    console.log("Usage: stax-migrate parity --url <live-url> [--file stax-migration/parity.csv]");
    console.log("The parity contract: id,capability,probe,expect — every SOURCE capability");
    console.log("gets a row; the gate DRIVES each against the rebuilt app. 100% or exit 1:");
    console.log("a migration that loses one capability is a failed migration.");
    if (url && !fs.existsSync(file)) console.log(`\n(no contract at ${file})`);
    process.exit(2);
  }
  const scan = new URL("./verify/parity.mjs", import.meta.url).pathname;
  const r = spawnSync("node", [scan, url, file], { encoding: "utf8" });
  if (r.status === 2 || !r.stdout.trim()) { process.stderr.write(r.stderr || "parity: scan failed\n"); process.exit(2); }
  const rep = JSON.parse(r.stdout);
  console.log(`stax parity · ${rep.url} · contract ${file.split("/").pop()}`);
  if (rep.pass) { console.log(green(bold(`PARITY 100% — ${rep.passed}/${rep.total} capabilities proven live.`))); return; }
  console.log(`PARITY ${rep.passed}/${rep.total} — the transfer is NOT done:\n`);
  for (const f2 of rep.failed) console.log(`  ✗ [${f2.id}] ${f2.capability}: ${f2.why}`);
  process.exitCode = 1;
}

function cmdVerify(flags) {
  const url = flags.url;
  if (!url) {
    console.log("Usage: stax-migrate verify --url <url> [--drills N] [--themes light,dark]");
    console.log("Runs the design-law gate on the LIVE app: L-ALIGN (separator bounds),");
    console.log("L-RHYTHM (edge-to-edge stacking), L-FOOT (one primary), L-FLOW (no x-overflow).");
    process.exit(2);
  }
  const scan = new URL("./verify/scan.mjs", import.meta.url).pathname;
  const r = spawnSync("node", [scan, url, String(flags.drills ?? 4), String(flags.themes ?? "light")], { encoding: "utf8" });
  if (r.status === 2 || !r.stdout.trim()) {
    process.stderr.write(r.stderr || r.stdout || "verify: scan failed\n");
    process.exit(2);
  }
  const rep = JSON.parse(r.stdout);
  console.log(`stax verify · ${rep.url} · ${rep.checked} view(s) · themes: ${(rep.themes ?? ["light"]).join("+")}`);
  if (rep.pass) { console.log("PASS: every scanned view honors the design laws."); return; }
  console.log(`FAIL: ${rep.violations.length} violation(s)\n`);
  for (const v of rep.violations) console.log(`  [${v.law}] ${v.where}: ${v.detail}`);
  console.log("\nLaws: DESIGN-SPEC.md (separator alignment, vertical rhythm, foot hierarchy).");
  process.exitCode = 1;
}

function cmdUpgrade(target, pos, flags) {
  const catalog = upgradeCatalog();
  if (catalog.length === 0) die("the package ships no upgrade catalog — reinstall stax-migrate");
  const applied = readApplied(target);
  const isApplied = (id) => applied.some((a) => a.id === id);
  const pending = catalog.filter((u) => !isApplied(u.id));
  const sub = pos[0];

  if (sub === "plan") {
    const id = pos[1] === undefined || pos[1] === "next" ? pending[0]?.id : pos[1];
    if (!id) { console.log(green("✓ nothing pending — the project speaks the latest grammar.")); return; }
    process.stdout.write(upgradeBrief(target, id));
    console.log(dim("\n── apply it (agent-driven): ") + cyan(`stax-migrate upgrade run ${target} --agent claude --id ${id}`));
    console.log(dim("── then record it:          ") + cyan(`stax-migrate upgrade done ${id} ${target}`));
    return;
  }
  if (sub === "done") {
    const id = pos[1];
    if (!id) die("usage: stax-migrate upgrade done <U-00X> [dir]");
    if (!catalog.some((u) => u.id === id)) die(`unknown upgrade "${id}"`);
    if (isApplied(id)) { console.log(green(`✓ ${id} already recorded.`)); return; }
    recordApplied(target, id);
    console.log(green(`✓ ${id} recorded`) + dim(` — ${catalog.find((u) => u.id === id).title}`));
    const left = catalog.filter((u) => !readApplied(target).some((a) => a.id === u.id));
    console.log(left.length ? dim(`  ${left.length} pending — next: `) + cyan(`stax-migrate upgrade plan ${target}`) : green("  all upgrades applied."));
    return;
  }
  if (sub === "run") {
    const agent = flags.agent;
    if (!agent || !["claude", "codex"].includes(agent)) die("usage: stax-migrate upgrade run [dir] --agent claude|codex [--id U-00X]");
    const id = flags.id ?? pending[0]?.id;
    if (!id) { console.log(green("✓ nothing pending.")); return; }
    if (!which(agent)) {
      console.log(red(`✗ "${agent}" CLI not found on PATH.`));
      console.log("  fallback: " + cyan(`stax-migrate upgrade plan ${id} ${target}`) + dim("  (paste the brief into any agent yourself)"));
      process.exitCode = 1;
      return;
    }
    const brief = upgradeBrief(target, id) +
      "\n\nSTANDING RULES: evidence for every VERIFY item (grep output, rect dumps, screenshots) — prose is not proof. Do NOT record the upgrade yourself: the operator runs `stax-migrate upgrade done " + id + "` after checking the evidence.";
    console.log(bold(mag(`▶ upgrade ${id}`)) + dim(` · agent: ${agent} · cwd: ${target}`));
    const args = agent === "claude" ? ["-p", brief, "--permission-mode", "acceptEdits"] : ["exec", brief];
    const r = spawnSync(agent, args, { cwd: target, stdio: "inherit" });
    if (r.status !== 0) console.log(yellow(`agent exited with status ${r.status} — inspect before trusting anything.`));
    console.log(dim("check the evidence, then record: ") + cyan(`stax-migrate upgrade done ${id} ${target}`));
    return;
  }

  // default: status table
  console.log();
  console.log("  " + bold(mag("STAX UPGRADES")) + dim(" — layout/design updates for an adopted project · ") + target);
  for (const u of catalog) {
    const on = isApplied(u.id);
    const mark = on ? green("✓") : yellow("○");
    const when = on ? dim("  applied " + applied.find((a) => a.id === u.id).date) : "";
    console.log(`  ${mark} ${bold(u.id)}  ${dim("[" + u.area + "]")} ${u.title}${when}`);
  }
  console.log();
  if (pending.length) {
    console.log("  " + bold(`${pending.length} pending`) + dim(" — next: ") + cyan(`stax-migrate upgrade plan ${target}`));
  } else {
    console.log("  " + green(bold("all upgrades applied — the project speaks the latest grammar.")));
  }
  console.log();
}

async function cmdData(target, sub, flags) {
  const { scanBackend, mergeDataRows, checkDataRows } = await import(new URL("./datascan.mjs", import.meta.url).href);
  const scan = scanBackend(target);
  if (!scan.layers.length && sub !== "check")
    console.log(yellow("no backend layer detected") + " (convex/ · supabase/ · prisma/ · app/api routes · trpc procedures all absent)");

  if (sub === "check") {
    requireWorkspace(target);
    const rows = readData(target);
    const problems = checkDataRows(rows);
    // drift: what the CODE has that the matrix does not
    const key = (r) => `${r.layer}|${r.name}|${r.kind}`;
    const have = new Set(rows.map(key));
    const missing = scan.rows.filter((r) => r.kind !== "internal" && !have.has(key(r)));
    console.log(`stax data check · ${rows.length} matrix row(s) vs ${scan.rows.length} scanned`);
    for (const p of problems) console.log(red("  ✗ ") + p);
    for (const m of missing) console.log(red("  ✗ ") + `code has ${m.layer}/${m.name} (${m.kind}, ${m.source}) — NOT in the matrix: re-run data scan --write`);
    for (const w of scan.warnings) console.log(yellow("  ⚠ ") + w);
    if (!problems.length && !missing.length) { console.log(green(bold(`DATA 100% — every backend surface bound to the new front end.`))); return; }
    console.log(`\n${problems.length + missing.length} problem(s) — the backend is NOT fully carried over.`);
    process.exitCode = 1;
    return;
  }

  // scan (default): programmatic extraction, evidence-cited
  console.log(bold("stax data scan") + ` · ${target}`);
  for (const l of scan.layers) console.log(`  ${green("✓")} ${bold(l.layer)} — ${l.detected}`);
  const byKind = {};
  for (const r of scan.rows) byKind[`${r.layer}:${r.kind}`] = (byKind[`${r.layer}:${r.kind}`] ?? 0) + 1;
  for (const [k, n] of Object.entries(byKind)) console.log(`      ${k} × ${n}`);
  for (const w of scan.warnings) console.log(yellow("  ⚠ ") + w);
  if (flags.write) {
    requireWorkspace(target);
    const existing = readData(target);
    const { rows, stale } = mergeDataRows(existing, scan.rows);
    fs.writeFileSync(wsPath(target, "data-matrix.csv"), serializeCSV(rows, DATA_HEADER));
    const fresh = rows.length - existing.length + stale.length ? rows.filter((r) => r.status === "pending" && !existing.some((e) => e.id === r.id)).length : 0;
    console.log(`\n  wrote data-matrix.csv: ${rows.length} row(s) (${fresh} new · ${existing.length - stale.length} refreshed · ${stale.length} kept-manual)`);
    if (stale.length) console.log(yellow("  ⚠ ") + `${stale.length} row(s) not re-found by the scan (manual or removed): ${stale.map((r) => r.id).join(" ")}`);
    console.log(dim("  the AI's 20%: fill panel_binding + write_path (phase 4), then: stax-migrate data check"));
  } else {
    console.log(dim("\n  dry run — add --write to merge into stax-migration/data-matrix.csv (ids and mappings are preserved)"));
  }
  console.log(dim("  80% programmatic / 20% AI: the scanner extracts and gates; the agent only maps."));
}

function cmdHelp() {
  console.log(`
${bold(mag("stax-migrate"))} — any legacy web app → the Stax panels-inside-panels grammar

${bold("USAGE")}
  stax-migrate ${cyan("init")}   [dir] [--level full|standard|starter|shell] [--no-data]
                                        create ${WS}/ — asks the integration level (TTY) and writes contract.json
  stax-migrate ${cyan("status")} [dir]                  contract + phase + three matrices: counts, coverage bars, blocking ids
  stax-migrate ${cyan("contract")} [dir]                the honesty check: contracted level vs live coverage (exit 1 on breach)
  stax-migrate ${cyan("level")}  [name] [dir] [--force] show or change the level — LOWERING mid-migration needs --force and is logged
  stax-migrate ${cyan("scope")}  [a,b,c] [dir] [--force] declare the STARTER in-scope areas — in-scope rows must reach 100%
  stax-migrate ${cyan("prompt")} [n] [dir]              print phase n's brief (default: current phase) — pipe anywhere
  stax-migrate ${cyan("next")}   [dir]                  print the current phase brief + how to run it
  stax-migrate ${cyan("done")}   [dir]                  validate the phase exit gate, then advance (or refuse)
  stax-migrate ${cyan("upgrade")} [dir]                     ALREADY-STAX project: applied/pending layout+design updates
  stax-migrate ${cyan("upgrade")} plan [id] · run --agent … · done <id>
                                        print a unit's brief · drive an agent to apply it · record it
  stax-migrate ${cyan("run")}    [dir] --agent claude|codex [--phase n]
                                        drive ONE phase via an agent CLI, then re-check the gate
  stax-migrate ${cyan("data")}   scan [dir] [--write]    PROGRAMMATIC backend extraction: Convex, Supabase,
                                        Prisma, REST routes, tRPC — tables, functions, rpc, realtime,
                                        every read/write call site, file:line evidence → data-matrix.csv
  stax-migrate ${cyan("data")}   check [dir]             the mechanical gate: every non-internal row bound,
                                        every writable row has its write_path, zero code-vs-matrix drift

${bold("THE INTEGRATION CONTRACT")}
  ${cyan("full")}      100% integrated — everything migrated, old UI purged. Nothing deferred.  ${green("(recommended)")}
  ${cyan("standard")}  everything terminal — migrated, or wrapped/deferred WITH a cited reason.
  ${cyan("starter")}   chosen core spaces at 100% — the rest explicitly out-of-scope, with reasons.
  ${cyan("shell")}     the Stax shell wraps the app — every route reachable as a (wrapped) panel.

${bold("PHILOSOPHY")}
  1. Three matrices are the truth — features (F-NNN), elements (E-NNN, down to one icon),
     and data (D-NNN — every table AND every server function, bound to the panel that
     reads it and the foot action that writes it).
  2. The LEVEL is a contract, not a mood: gates enforce it, and lowering it mid-migration
     is loud, forced, and logged. "10% integrated and quietly done" cannot happen.
  3. An empty status always blocks; a skip without a cited reason always blocks.
  4. Agents do the work; the human advances phases — one phase per run, never a loop.
  5. The old app keeps running until every row has proof it lives in the new grammar.
`);
}

/* ────────────────────────── dispatch ────────────────────────── */

function parseFlags(args) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--")) {
      const eq = a.indexOf("=");
      if (eq !== -1) flags[a.slice(2, eq)] = a.slice(eq + 1);
      else if (i + 1 < args.length && !args[i + 1].startsWith("--")) flags[a.slice(2)] = args[++i];
      else flags[a.slice(2)] = true;
    } else pos.push(a);
  }
  return { flags, pos };
}

/* main-guard: only dispatch when executed as a CLI (direct node call or a bin
 * shim symlink) — importing this module for tests/embedding stays silent. */
function isMain() {
  const entry = process.argv[1];
  if (!entry) return false;
  try { return fs.realpathSync(entry) === CLI_PATH; } catch { return false; }
}

async function main() {
  const [cmd, ...restArgs] = process.argv.slice(2);
  const { flags, pos } = parseFlags(restArgs);
  try {
    switch (cmd) {
      case "init":
        await cmdInit(resolveTarget(pos[0]), flags);
        break;
      case "status":
        cmdStatus(resolveTarget(pos[0]));
        break;
      case "verify":
        cmdVerify(flags);
        break;
      case "parity":
        cmdParity(resolveTarget(pos[0]), flags);
        break;
      case "theme":
        await cmdTheme(flags);
        break;
      case "doctor":
        cmdDoctor(resolveTarget(pos[0]));
        break;
      case "contract":
        cmdContract(resolveTarget(pos[0]));
        break;
      case "upgrade": {
      // positional shapes: upgrade [dir] · upgrade plan [id] [dir] · upgrade done <id> [dir] · upgrade run [dir]
      const subs = ["plan", "done", "run"];
      let sub, a1, dirArg;
      if (subs.includes(pos[0])) { sub = pos[0]; 
        if (pos[1] !== undefined && /^U-\d+$|^next$/.test(pos[1])) { a1 = pos[1]; dirArg = pos[2]; }
        else { dirArg = pos[1]; }
      } else { dirArg = pos[0]; }
      cmdUpgrade(resolveTarget(dirArg), [sub, a1].filter((x) => x !== undefined), flags);
      break;
    }
    case "scope": {
        let list, dirArg;
        if (pos[0] !== undefined && (pos[0].includes(",") || (!fs.existsSync(path.resolve(process.cwd(), pos[0])) && pos[1] !== undefined))) { list = pos[0]; dirArg = pos[1]; }
        else if (pos.length === 1 && pos[0] !== undefined && !fs.existsSync(path.resolve(process.cwd(), pos[0]))) { list = pos[0]; }
        else { dirArg = pos[0]; if (pos[1] !== undefined) list = pos[1]; }
        cmdScope(resolveTarget(dirArg), list, flags);
        break;
      }
      case "level": {
        let name, dirArg;
        if (pos[0] !== undefined && LEVELS[pos[0]]) { name = pos[0]; dirArg = pos[1]; }
        else { dirArg = pos[0]; }
        cmdLevel(resolveTarget(dirArg), name, flags);
        break;
      }
      case "prompt": {
        let n, dirArg;
        if (pos[0] !== undefined && /^\d+$/.test(pos[0])) { n = Number(pos[0]); dirArg = pos[1]; }
        else { dirArg = pos[0]; }
        const target = resolveTarget(dirArg);
        if (n === undefined) {
          const st = readState(target);
          n = Math.min(st.phase || 1, LAST_PHASE);
        }
        cmdPrompt(n, target);
        break;
      }
      case "next":
        cmdNext(resolveTarget(pos[0]));
        break;
      case "done":
        cmdDone(resolveTarget(pos[0]));
        break;
      case "run":
        cmdRun(resolveTarget(pos[0]), flags.agent, flags.phase);
        break;
      case "data": {
        const sub = ["scan", "check"].includes(pos[0]) ? pos[0] : "scan";
        const dirArg = ["scan", "check"].includes(pos[0]) ? pos[1] : pos[0];
        await cmdData(resolveTarget(dirArg), sub, flags);
        break;
      }
      case undefined:
      case "help":
      case "--help":
      case "-h":
        cmdHelp();
        break;
      default:
        console.error(red(`unknown command "${cmd}"`));
        cmdHelp();
        process.exitCode = 1;
    }
  } catch (e) {
    if (e instanceof CliError) {
      console.error(red("✗ ") + e.message);
      process.exitCode = 1;
    } else {
      throw e;
    }
  }
}

if (isMain()) await main();

export { parseCSV, serializeCSV, sniffStack, checkPhase, blockingRows, readContract, writeContract, noteSeen, upgradeCatalog, readApplied, recordApplied, LEVELS, CSV_HEADER, ELEM_HEADER, DATA_HEADER, WS }; // for tests / embedding
