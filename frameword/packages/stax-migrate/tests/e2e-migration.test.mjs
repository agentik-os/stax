/**
 * THE 100% LOOP, guarded forever: init → programmatic scan → gate refuses →
 * the AI's mapping → gate passes → code drifts → gate refuses again.
 * Runs the REAL CLI on a temp copy of the supabase fixture — no network.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync, appendFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(PKG, "index.mjs");
const run = (...args) => spawnSync("node", [CLI, ...args], { encoding: "utf8", timeout: 60000 });

test("the full backend-continuity loop on a real CLI run", () => {
  const dir = mkdtempSync(join(tmpdir(), "stax-loop-"));
  try {
    cpSync(join(PKG, "tests", "fixtures", "supabase-app"), dir, { recursive: true });

    // 1 — adopt
    assert.equal(run("init", dir, "--level", "full").status, 0);

    // 2 — the 80%: programmatic extraction
    const scan = run("data", "scan", dir, "--write");
    assert.equal(scan.status, 0);
    assert.match(scan.stdout, /supabase/);
    const csv = readFileSync(join(dir, "stax-migration", "data-matrix.csv"), "utf8");
    assert.match(csv, /invoices/);
    assert.match(csv, /payments/);

    // 3 — the gate REFUSES an unmapped backend, naming rows
    const red = run("data", "check", dir, "--json");
    assert.equal(red.status, 1);
    const redRep = JSON.parse(red.stdout);
    assert.equal(redRep.pass, false);
    assert.ok(redRep.problems.length >= 5);

    // 4 — the AI's 20%: map every row (simulated deterministically)
    const p = join(dir, "stax-migration", "data-matrix.csv");
    const lines = readFileSync(p, "utf8").trim().split("\n");
    const header = lines[0].split(",");
    const bi = header.indexOf("panel_binding"), wi = header.indexOf("write_path"), si = header.indexOf("status"), oi = header.indexOf("ops");
    const mapped = [lines[0], ...lines.slice(1).map((l) => {
      const c = l.split(","); // fixture rows carry no embedded commas
      c[bi] = "space:billing/panel:x";
      if (/[cudw]/.test(c[oi])) c[wi] = "foot:write-x";
      c[si] = "migrated";
      return c.join(",");
    })].join("\n");
    writeFileSync(p, mapped + "\n");

    // 5 — the gate PASSES: DATA 100%
    const green = run("data", "check", dir, "--json");
    assert.equal(green.status, 0, green.stdout + green.stderr);
    assert.equal(JSON.parse(green.stdout).pass, true);

    // 6 — the code drifts (a new table appears) → the gate refuses again, naming it
    appendFileSync(join(dir, "src", "data.ts"), '\nexport const y = () => supabase.from("drifted").select("*");\n');
    const drift = run("data", "check", dir, "--json");
    assert.equal(drift.status, 1);
    const driftRep = JSON.parse(drift.stdout);
    assert.ok(driftRep.drift.some((d) => d.name === "drifted"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
