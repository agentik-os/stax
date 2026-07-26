/**
 * audit.mjs — the mechanical half of a Stax audit.
 *
 * An audit protocol written as prose produces performative phases: an agent
 * reasons plausibly, scores itself, and never runs a command against the actual
 * target. Stax is unusual in having real gates already (verify, parity,
 * contract, data check, proof, doctor, the e2e suite), so its audit should not
 * re-derive them in prose. It should RUN them, capture what they actually
 * printed, and hand the forensic half a file of evidence it cannot fake.
 *
 * Three modes, because a Stax project is audited at three different moments and
 * each asks a different question:
 *
 *   transfer   BEFORE. Is the legacy app ready to move, and what would be lost?
 *              Hinge: the capability whose loss makes the transfer a failure.
 *   stax       DURING. Does this Stax app obey its own laws?
 *              Hinge: the law with the widest blast radius across surfaces.
 *   cohesion   AFTER, and continuously. Do the matrices and the running app
 *              still describe the same product?
 *              Hinge: the row whose declaration and render have drifted apart.
 *
 * Every probe records the command, its exit code and its output. A probe that
 * could not run is recorded as SKIPPED with the reason, never as a pass: a
 * blocked surface is an abort, not a green light.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const WS = "stax-migration";
const here = path.dirname(new URL(import.meta.url).pathname);
const CLI = path.join(here, "index.mjs");

/** Run a probe and record what actually happened. Never throws: a failed probe
 *  is evidence, and an unrunnable one is a recorded gap. */
function probe(id, question, cmd, args, opts = {}) {
  const started = Date.now();
  let out = "", code = 0, skipped = null;
  try {
    out = execFileSync(cmd, args, {
      encoding: "utf8",
      cwd: opts.cwd,
      timeout: opts.timeout ?? 240000,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...(opts.env || {}) },
    });
  } catch (e) {
    code = typeof e.status === "number" ? e.status : 1;
    out = (e.stdout || "") + (e.stderr || "");
    if (e.code === "ENOENT") skipped = `${cmd} is not installed on this machine`;
    if (e.signal === "SIGTERM") skipped = "the probe timed out";
    // A surface nobody could reach is UNREACHABLE, never FAIL. Scoring an
    // unreachable app as a law breach slanders it and buries the real problem,
    // which is that the thing under audit was not running.
    if (/ERR_CONNECTION_REFUSED|ECONNREFUSED|ERR_NAME_NOT_RESOLVED|net::ERR/.test(out))
      skipped = `the target was not reachable at the URL given. Start it, then re-run: an unreachable app is an ABORT, never a score.`;
  }
  return {
    id,
    question,
    command: [cmd, ...args].join(" "),
    exit: code,
    ms: Date.now() - started,
    skipped,
    // keep it readable in the artefact but never truncate an error away
    output: out.length > 6000 ? out.slice(0, 3000) + "\n…\n" + out.slice(-3000) : out,
  };
}

const has = (dir, ...p) => fs.existsSync(path.join(dir, ...p));
const readCsvCount = (dir, f) => {
  const p = path.join(dir, WS, f);
  if (!fs.existsSync(p)) return null;
  return Math.max(0, fs.readFileSync(p, "utf8").split(/\r?\n/).filter((l) => l.trim()).length - 1);
};

/* ── mode: transfer ───────────────────────────────────────────────────── */

function transferProbes(dir, flags) {
  const P = [];
  P.push(probe("workspace", "Has a migration contract been declared at all?",
    "node", [CLI, "status", dir]));
  P.push(probe("contract", "Does the declared integration level match the live coverage?",
    "node", [CLI, "contract", dir]));
  P.push(probe("data-scan", "What does the backend actually contain, extracted programmatically?",
    "node", [CLI, "data", "scan", dir, "--json"]));
  P.push(probe("data-check", "Is every non-internal data row bound to a panel and a write path?",
    "node", [CLI, "data", "check", dir, "--json"]));
  P.push(probe("proof", "Rendered against its own matrices, what does this conversion not yet know?",
    "node", [CLI, "proof", dir, "--json"]));
  if (flags.legacyUrl)
    P.push(probe("parity", "Is every source capability still reachable right now?",
      "node", [CLI, "parity", dir, "--url", flags.legacyUrl]));
  return P;
}

/* ── mode: stax ───────────────────────────────────────────────────────── */

function staxProbes(dir, flags) {
  const P = [];
  if (flags.url) {
    P.push(probe("design-gate", "Does the live app honour the design laws in BOTH themes?",
      "node", [CLI, "verify", "--url", flags.url, "--themes", "light,dark"]));
  } else {
    P.push({ id: "design-gate", question: "Does the live app honour the design laws?",
      command: `${CLI} verify --url <url>`, exit: 0, ms: 0,
      skipped: "no --url given, so the design gate could not run. A design audit without it is not an audit.",
      output: "" });
  }
  // doctor asks "has this project adopted Stax", which is a MIGRATION question.
  // On a native Stax app it answers NOT ADOPTED forever, and a permanent red
  // that means nothing trains a reader to ignore the report.
  if (has(dir, WS))
    P.push(probe("doctor", "What has drifted or was never wired?", "node", [CLI, "doctor", dir]));
  else
    P.push({ id: "doctor", question: "What has drifted or was never wired?",
      command: `${CLI} doctor`, exit: 0, ms: 0,
      skipped: "not applicable: this project is native Stax, not a migration target, so adoption health has nothing to report",
      output: "" });
  P.push(probe("shapes", "How many shapes does the catalog offer, and do they all resolve?",
    "node", [CLI, "shapes", "--json"]));
  const e2e = path.join(dir, "e2e", "playwright.config.ts");
  if (fs.existsSync(e2e) && flags.url)
    P.push(probe("e2e", "Does the committed behaviour suite pass against the running app?",
      "bunx", ["playwright", "test", "-c", "e2e/playwright.config.ts"],
      { cwd: dir, env: { BASE: flags.url }, timeout: 600000 }));
  else
    P.push({ id: "e2e", question: "Does the committed behaviour suite pass?",
      command: "bunx playwright test", exit: 0, ms: 0,
      skipped: fs.existsSync(e2e) ? "no --url given" : "no e2e/playwright.config.ts in this project",
      output: "" });
  return P;
}

/* ── mode: cohesion ───────────────────────────────────────────────────── */

function cohesionProbes(dir, flags) {
  const P = [];
  P.push(probe("proof", "Do the matrices and the app still describe the same product?",
    "node", [CLI, "proof", dir, "--json"]));
  P.push(probe("contract", "Is the contracted level still what the coverage shows?",
    "node", [CLI, "contract", dir]));
  P.push(probe("data-check", "Has a binding drifted since it was declared?",
    "node", [CLI, "data", "check", dir, "--json"]));
  if (flags.url)
    P.push(probe("design-gate", "Does the built product still obey the laws its spec declares?",
      "node", [CLI, "verify", "--url", flags.url, "--themes", "light,dark"]));
  if (flags.url && has(dir, "stax-migration", "parity.csv"))
    P.push(probe("parity", "Is every capability the contract lists still reachable?",
      "node", [CLI, "parity", dir, "--url", flags.url]));
  return P;
}

/* ── the shared reading: what the evidence says before anyone interprets ─ */

function readOut(P) {
  const byId = Object.fromEntries(P.map((p) => [p.id, p]));
  const num = (id, re) => {
    const m = (byId[id]?.output || "").match(re);
    return m ? Number(m[1]) : null;
  };
  return {
    unknowns: num("proof", /"unknowns":\s*(\d+)/),
    disagreements: num("proof", /"disagreements":\s*(\d+)/),
    designGate: byId["design-gate"]?.skipped ? "unreachable" : byId["design-gate"]?.exit === 0 ? "pass" : "fail",
    dataGate: byId["data-check"] ? (byId["data-check"].exit === 0 ? "pass" : "fail") : "absent",
    contractGate: byId["contract"] ? (byId["contract"].exit === 0 ? "pass" : "breach") : "absent",
    e2e: byId["e2e"]?.skipped ? "unreachable" : byId["e2e"] ? (byId["e2e"].exit === 0 ? "pass" : "fail") : "absent",
    // an audit that could not look at the thing has no verdict to give
    unrunnable: P.filter((p) => p.skipped).map((p) => p.id),
    shapes: num("shapes", /"count":\s*(\d+)/),
  };
}

const MODES = {
  transfer: {
    probes: transferProbes,
    asks: "Is the legacy app ready to move, and what would be lost if we moved it today?",
    hinge: "the capability whose loss would make the transfer a failure, not an inconvenience",
    hingeHow: "Read the parity contract and the data matrix together. The hinge is usually a write path that only one legacy screen exposes, or a report someone runs monthly that no route reaches.",
  },
  stax: {
    probes: staxProbes,
    asks: "Does this Stax app obey its own laws, on every surface, in both themes?",
    hinge: "the law with the widest blast radius: the one whose breach shows on the most surfaces at once",
    hingeHow: "Count the surfaces each failing law touches. A foot defect on eight spaces outranks a unique panel's misalignment, however ugly the latter is.",
  },
  cohesion: {
    probes: cohesionProbes,
    asks: "Do the matrices and the running product still describe the same thing?",
    hinge: "the row whose declaration and render have drifted furthest apart",
    hingeHow: "The layout proof is the instrument. A row declaring size L whose panel opens at M is drift you can measure; a row with no citation is drift nobody can even check.",
  },
};

export function runAudit(mode, dir, flags = {}) {
  const spec = MODES[mode];
  if (!spec) throw new Error(`unknown audit mode "${mode}". Use: ${Object.keys(MODES).join(", ")}`);
  const probes = spec.probes(dir, flags);
  const reading = readOut(probes);
  const skipped = probes.filter((p) => p.skipped);

  const outDir = path.join(dir, ".stax-audit");
  fs.mkdirSync(outDir, { recursive: true });
  const evidence = {
    mode,
    asks: spec.asks,
    target: path.resolve(dir),
    // no Date.now(): the caller stamps it, so a rerun diffs cleanly
    workspace: has(dir, WS) ? "present" : "absent",
    matrixRows: {
      feature: readCsvCount(dir, "feature-matrix.csv"),
      element: readCsvCount(dir, "element-matrix.csv"),
      data: readCsvCount(dir, "data-matrix.csv"),
    },
    reading,
    probes,
  };
  const jsonPath = path.join(outDir, `${mode}-evidence.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(evidence, null, 1));

  return { evidence, jsonPath, spec, skipped };
}

export { MODES };
