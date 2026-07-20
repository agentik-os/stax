#!/usr/bin/env node
/**
 * stax-migrate — migration engine: any legacy web app → the Stax
 * panels-inside-panels grammar, with a mechanical guarantee that
 * NO FEATURE OR SUB-FEATURE IS EVER LOST.
 *
 * The guarantee is not vibes: stax-migration/feature-matrix.csv is the
 * single source of truth, every phase reads/writes it, and the coverage
 * gate refuses completion while a single row is unmigrated.
 *
 * Zero dependencies. Plain ESM. node >= 18.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const CLI_PATH = fileURLToPath(import.meta.url);
const PKG_DIR = path.dirname(CLI_PATH);
const TPL_DIR = path.join(PKG_DIR, "templates");
const WS = "stax-migration";
const CSV_HEADER = ["id", "area", "feature", "subfeature", "source", "ui_kind", "mapping", "size", "status", "evidence"];

const PHASES = [
  { n: 1, file: "01-recon.md",          name: "Recon",           does: "forensic inventory of every surface",  out: "inventory.md" },
  { n: 2, file: "02-feature-matrix.md", name: "Feature matrix",  does: "one row per capability, sub-rows too", out: "feature-matrix.csv rows" },
  { n: 3, file: "03-mapping.md",        name: "Mapping",         does: "deterministic grammar rules, no taste", out: "mapping + size on every row" },
  { n: 4, file: "04-scaffold.md",       name: "Scaffold",        does: "panel shell beside the old app",       out: "registry, spaces, URL sync" },
  { n: 5, file: "05-migrate-batch.md",  name: "Migrate batches", does: "<=5 rows per run, running code only",  out: "status=migrated + evidence" },
  { n: 6, file: "06-coverage-gate.md",  name: "Coverage gate",   does: "adversarial re-crawl of the OLD app",  out: "zero gaps, 100% migrated" },
  { n: 7, file: "07-acceptance.md",     name: "Acceptance",      does: "laws audit, redirects, purge legacy",  out: "REPORT.md" },
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

function readMatrix(target) {
  const p = wsPath(target, "feature-matrix.csv");
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

function renderTemplate(file, target, stack) {
  const p = path.join(TPL_DIR, file);
  if (!fs.existsSync(p)) die(`template missing from the stax-migrate package: ${p}`);
  return fs.readFileSync(p, "utf8")
    .replaceAll("{{TARGET}}", target)
    .replaceAll("{{STACK}}", stack)
    .replaceAll("{{CLI}}", CLI_PATH);
}

function phasePrompt(target, n) {
  const ph = PHASES.find((p) => p.n === n);
  if (!ph) die(`no phase ${n} — phases are 1..7`);
  const local = wsPath(target, ph.file);
  if (fs.existsSync(local)) return fs.readFileSync(local, "utf8");
  return renderTemplate(ph.file, target, sniffStack(target));
}

/* ────────────────────────── exit gates ────────────────────────── */

const unmigrated = (rows) => rows.filter((r) => (r.status || "").toLowerCase() !== "migrated");

function idList(rows, cap = 20) {
  const ids = rows.map((r) => r.id || "(no id)");
  return ids.slice(0, cap).join(", ") + (ids.length > cap ? ` … +${ids.length - cap} more` : "");
}

function checkPhase(target, n) {
  const problems = [];
  const rows = readMatrix(target);
  if (n === 1) {
    const p = wsPath(target, "inventory.md");
    if (!fs.existsSync(p) || fs.readFileSync(p, "utf8").trim().length < 40)
      problems.push(`${WS}/inventory.md is missing or empty — phase 1 must produce the forensic inventory`);
  } else if (n === 2) {
    if (rows.length === 0)
      problems.push("feature-matrix.csv has 0 rows — phase 2 must convert inventory.md into one row per capability");
  } else if (n === 3) {
    if (rows.length === 0) problems.push("feature-matrix.csv has 0 rows — run phase 2 first");
    const empty = rows.filter((r) => !r.mapping);
    if (empty.length) problems.push(`${empty.length} row(s) with an empty mapping: ${idList(empty)}`);
  } else if (n === 5 || n === 6) {
    if (rows.length === 0)
      problems.push("feature-matrix.csv has 0 rows — the guarantee has nothing to guarantee; run phases 1-3 first");
    const un = unmigrated(rows);
    if (un.length) problems.push(`${un.length} row(s) with status != migrated: ${idList(un)}`);
  } else if (n === 7) {
    if (!fs.existsSync(wsPath(target, "REPORT.md")))
      problems.push(`${WS}/REPORT.md is missing — phase 7 must write the final before/after report`);
  }
  return problems;
}

/* ────────────────────────── commands ────────────────────────── */

function cmdInit(target) {
  const stack = sniffStack(target);
  fs.mkdirSync(wsPath(target), { recursive: true });
  const fresh = !fs.existsSync(wsPath(target, "state.json"));

  for (const ph of PHASES)
    fs.writeFileSync(wsPath(target, ph.file), renderTemplate(ph.file, target, stack));
  if (!fs.existsSync(wsPath(target, "feature-matrix.csv")))
    fs.writeFileSync(wsPath(target, "feature-matrix.csv"), serializeCSV([]));
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
  const rows = PHASES.map((ph) => `${ph.n}  ${ph.name.padEnd(16)} ${ph.does.padEnd(40)} → ${ph.out}`);
  const inner = Math.max("THE 7 PHASES".length, ...rows.map((r) => r.length));
  const rule = (l, r) => line(l + "─".repeat(inner + 2) + r);
  const boxRow = (s, style = (x) => x) => line("│ " + style(s.padEnd(inner)) + " │");

  line();
  line(bold(mag("STAX-MIGRATE")) + dim(" · panels-inside-panels refonte engine"));
  line(dim("target    ") + target);
  line(dim("stack     ") + cyan(stack));
  line(dim("workspace ") + `${WS}/  ` + dim(fresh ? "(created)" : "(already existed — templates refreshed, matrix/state/log preserved)"));
  line();
  rule("┌", "┐");
  boxRow("THE 7 PHASES", bold);
  rule("├", "┤");
  for (const r of rows) boxRow(r);
  rule("└", "┘");
  line();
  line(bold("THE GUARANTEE") + " — feature-matrix.csv is law: every capability is a row, every");
  line("phase reads/writes it, and `stax-migrate done` refuses to advance while any row");
  line("is unmigrated. " + green("No feature or sub-feature is ever lost — mechanically."));
  line();
  line(dim("files: ") + PHASES.map((p) => p.file).join(" ") + dim(" · feature-matrix.csv · decision-log.md · state.json"));
  line();
  line(bold("next → ") + cyan(`stax-migrate next ${target}`) + dim("   (phase 1 brief + how to run it)"));
  line();
}

function cmdStatus(target) {
  requireWorkspace(target);
  const st = readState(target);
  const rows = readMatrix(target);
  const total = rows.length;
  const counts = {};
  for (const r of rows) { const s = r.status || "(empty)"; counts[s] = (counts[s] || 0) + 1; }
  const migrated = counts.migrated || 0;
  const pct = total ? Math.round((migrated / total) * 100) : 0;
  const barLen = 24;
  const fill = total ? Math.round((migrated / total) * barLen) : 0;
  const bar = "█".repeat(fill) + "░".repeat(barLen - fill);

  console.log();
  console.log("  " + bold(mag("STAX-MIGRATE")) + dim(" · status — ") + target);
  if (st.phase > 7) {
    console.log("  " + green(bold("phase     COMPLETE — all 7 phases passed")));
  } else {
    const ph = PHASES[st.phase - 1];
    console.log("  " + dim("phase     ") + bold(`${st.phase}/7 — ${ph.name}`) + dim(` (${ph.does})`));
  }
  const byStatus = Object.entries(counts).map(([k, v]) => `${k} ${bold(v)}`).join(" · ") || dim("—");
  console.log("  " + dim("matrix    ") + `${bold(total)} row(s)   ${byStatus}`);
  console.log("  " + dim("coverage  ") + `[${pct === 100 && total > 0 ? green(bar) : cyan(bar)}] ${bold(pct + "%")} migrated`);
  const un = unmigrated(rows);
  if (un.length) console.log("  " + dim("next unmigrated  ") + yellow(idList(un, 10)));
  else if (total > 0) console.log("  " + green("  every row migrated — the gate is green"));
  console.log();
}

function cmdPrompt(n, target) {
  process.stdout.write(phasePrompt(target, n));
}

function cmdNext(target) {
  requireWorkspace(target);
  const st = readState(target);
  if (st.phase > 7) {
    console.log(green("✓ migration complete — all 7 phases passed. Nothing left to run."));
    return;
  }
  const ph = PHASES[st.phase - 1];
  console.log(dim("─".repeat(78)));
  console.log(bold(mag(`PHASE ${st.phase}/7 — ${ph.name.toUpperCase()}`)) + dim(` · produces ${ph.out}`));
  console.log(dim("─".repeat(78)));
  process.stdout.write(phasePrompt(target, st.phase));
  console.log(dim("─".repeat(78)));
  console.log(bold("RUN IT"));
  console.log("  " + cyan(`stax-migrate run ${target} --agent claude`) + dim("   (or --agent codex)"));
  console.log("  " + dim("or copy the brief above into any coding agent, cwd = ") + target);
  console.log(bold("THEN") + "  " + cyan(`stax-migrate done ${target}`) + dim("   — the exit gate decides, not the agent"));
  if (st.phase === 5) console.log(dim("  phase 5 loops: re-run it (<=5 rows per run) until the gate passes."));
  console.log(dim("─".repeat(78)));
}

function cmdDone(target) {
  requireWorkspace(target);
  const st = readState(target);
  if (st.phase > 7) {
    console.log(green("✓ migration already complete — all 7 phases passed."));
    return;
  }
  const ph = PHASES[st.phase - 1];
  const problems = checkPhase(target, st.phase);
  if (problems.length) {
    console.log(red(bold(`✗ REFUSED — phase ${st.phase} (${ph.name}) exit criteria not met:`)));
    for (const p of problems) console.log(red("  · ") + p);
    if (st.phase === 5)
      console.log(dim("  loop phase 5 (each run migrates <=5 rows) until every row is migrated, then retry."));
    if (st.phase === 6)
      console.log(dim("  gaps found by the gate go back through phase 5: stax-migrate run --phase 5, then re-run the gate."));
    process.exitCode = 1;
    return;
  }
  if (st.phase === 4)
    console.log(dim("phase 4 has no mechanical gate — advancing on your word that the shell builds and the old app still runs."));
  st.phase += 1;
  writeState(target, st);
  if (st.phase > 7) {
    console.log(green(bold("✓ MIGRATION COMPLETE")) + green(" — 7/7 phases passed, every matrix row migrated,"));
    console.log(green(`  coverage gate green, report at ${WS}/REPORT.md. The grammar holds.`));
  } else {
    console.log(green(`✓ phase ${st.phase - 1} (${ph.name}) passed`) + ` → now at phase ${bold(`${st.phase}/7`)} — ${PHASES[st.phase - 1].name}`);
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
  const st = readState(target);
  if (st.phase > 7 && !phaseFlag) {
    console.log(green("✓ migration already complete — nothing to run."));
    return;
  }
  if (!agent) die("missing --agent — usage: stax-migrate run [dir] --agent claude|codex [--phase n]");
  if (!["claude", "codex"].includes(agent)) die(`unknown agent "${agent}" — supported: claude, codex`);
  const n = phaseFlag !== undefined ? Number(phaseFlag) : st.phase;
  if (!Number.isInteger(n) || n < 1 || n > 7) die(`invalid --phase ${phaseFlag} — phases are 1..7`);

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
  console.log(bold(mag(`▶ phase ${n}/7 — ${ph.name}`)) + dim(` · agent: ${agent} · cwd: ${target}`));
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
    if (n === 5) console.log(dim("  re-run this exact command — each run migrates <=5 more rows."));
    else console.log(dim("  re-run the phase (or finish by hand), then: stax-migrate done " + target));
  }
}

function cmdHelp() {
  console.log(`
${bold(mag("stax-migrate"))} — any legacy web app → the Stax panels-inside-panels grammar

${bold("USAGE")}
  stax-migrate ${cyan("init")}   [dir]                  create ${WS}/ (7 phase briefs, matrix, log, state)
  stax-migrate ${cyan("status")} [dir]                  phase, matrix counts, coverage %, next unmigrated ids
  stax-migrate ${cyan("prompt")} [n] [dir]              print phase n's brief (default: current phase) — pipe anywhere
  stax-migrate ${cyan("next")}   [dir]                  print the current phase brief + how to run it
  stax-migrate ${cyan("done")}   [dir]                  validate the phase exit gate, then advance (or refuse)
  stax-migrate ${cyan("run")}    [dir] --agent claude|codex [--phase n]
                                        drive ONE phase via an agent CLI, then re-check the gate

${bold("PHILOSOPHY")}
  1. The feature matrix is the single source of truth — a feature not in it does not exist.
  2. Every phase reads and writes the matrix; nothing lives outside it.
  3. The coverage gate blocks "done" while one row is unmigrated — mechanical, not vibes.
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

const [cmd, ...restArgs] = process.argv.slice(2);
const { flags, pos } = parseFlags(restArgs);

try {
  switch (cmd) {
    case "init":
      cmdInit(resolveTarget(pos[0]));
      break;
    case "status":
      cmdStatus(resolveTarget(pos[0]));
      break;
    case "prompt": {
      let n, dirArg;
      if (pos[0] !== undefined && /^\d+$/.test(pos[0])) { n = Number(pos[0]); dirArg = pos[1]; }
      else { dirArg = pos[0]; }
      const target = resolveTarget(dirArg);
      if (n === undefined) {
        const st = readState(target);
        n = Math.min(st.phase || 1, 7);
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

export { parseCSV, serializeCSV, sniffStack, checkPhase }; // for tests / embedding
