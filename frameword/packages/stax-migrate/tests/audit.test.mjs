import { test, expect } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = resolve(dirname(fileURLToPath(import.meta.url)), "../index.mjs");
const run = (...a) => {
  try { return { out: execFileSync("node", [CLI, ...a], { encoding: "utf8" }), code: 0 }; }
  catch (e) { return { out: (e.stdout || "") + (e.stderr || ""), code: e.status ?? 1 }; }
};

/**
 * The audit's whole value is that it cannot report a pass it did not earn.
 * These pin the three ways a self-scoring protocol lies: calling an unreachable
 * target a failure, calling an inapplicable probe a failure, and calling a
 * probe it never ran a pass.
 */
function bare() {
  const d = mkdtempSync(join(tmpdir(), "staxaudit-"));
  mkdirSync(join(d, "stax-migration"));
  writeFileSync(join(d, "stax-migration", "state.json"), '{"phase":4,"level":"full"}');
  writeFileSync(join(d, "stax-migration", "feature-matrix.csv"),
    "id,area,feature,subfeature,source,ui_kind,mapping,size,status,evidence\nF-1,a,Board,,src/D.tsx:4,kanban,view/board,XL,mapped,at :4\n");
  writeFileSync(join(d, "stax-migration", "data-matrix.csv"),
    "id,layer,name,kind,source,ops,panel_binding,write_path,status,evidence\n");
  writeFileSync(join(d, "stax-migration", "element-matrix.csv"),
    "id,area,element,kind,count,source,stax_target,tokens,spacing,status,evidence\n");
  return d;
}

test("with no mode it lists the three moments and their questions", () => {
  const r = run("audit");
  for (const m of ["transfer", "stax", "cohesion"]) expect(r.out).toContain(m);
  expect(r.out).toContain("what would be lost");
  expect(r.code).toBe(0);
});

test("an unknown mode fails loudly rather than guessing", () => {
  const r = run("audit", "sécurité");
  expect(r.code).toBe(1);
});

test("an UNREACHABLE target is never scored as a failure", () => {
  const d = bare();
  // nothing is listening on this port, which is the everyday case
  run("audit", "stax", d, "--url", "http://127.0.0.1:9");
  const ev = JSON.parse(readFileSync(join(d, ".stax-audit", "stax-evidence.json"), "utf8"));
  expect(ev.reading.designGate).toBe("unreachable");
  const g = ev.probes.find((p) => p.id === "design-gate");
  expect(g.skipped).toContain("ABORT");
  expect(g.skipped).not.toContain("pass");
});

test("an inapplicable probe is recorded as such, not as a red", () => {
  const d = mkdtempSync(join(tmpdir(), "staxaudit-native-"));
  // a NATIVE Stax app has no migration workspace, and doctor has nothing to say
  const r = run("audit", "stax", d);
  expect(r.out).toContain("not applicable");
  expect(r.out).toContain("neither a pass nor a fail");
});

test("a probe that never ran is never reported as a pass", () => {
  const d = bare();
  run("audit", "stax", d); // no --url at all
  const ev = JSON.parse(readFileSync(join(d, ".stax-audit", "stax-evidence.json"), "utf8"));
  const g = ev.probes.find((p) => p.id === "design-gate");
  expect(g.skipped).toContain("not an audit");
  expect(ev.reading.designGate).toBe("unreachable");
  expect(ev.reading.unrunnable).toContain("design-gate");
});

test("every probe records the exact command it ran, so a phase cannot be faked", () => {
  const d = bare();
  run("audit", "cohesion", d);
  const ev = JSON.parse(readFileSync(join(d, ".stax-audit", "cohesion-evidence.json"), "utf8"));
  expect(ev.probes.length).toBeGreaterThan(2);
  for (const p of ev.probes) {
    expect(p.command, `${p.id} has no command`).toBeTruthy();
    expect(p.question, `${p.id} asks nothing`).toBeTruthy();
    // a probe either ran (has output) or is explicitly not-run (has a reason)
    expect(Boolean(p.output) || Boolean(p.skipped), `${p.id} neither ran nor explained itself`).toBe(true);
  }
});

test("transfer mode reads the matrices it is meant to audit", () => {
  const d = bare();
  run("audit", "transfer", d);
  const ev = JSON.parse(readFileSync(join(d, ".stax-audit", "transfer-evidence.json"), "utf8"));
  expect(ev.matrixRows.feature).toBe(1);
  expect(ev.probes.map((p) => p.id)).toContain("proof");
  expect(ev.asks).toContain("legacy");
});

test("the skill exists at the path the CLI points readers to", () => {
  const skill = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../skills/staxaudit/SKILL.md");
  expect(existsSync(skill), "skills/staxaudit/SKILL.md is missing").toBe(true);
  const s = readFileSync(skill, "utf8");
  for (const m of ["transfer", "stax", "cohesion"]) expect(s).toContain(`mode \`${m}\``.replace("mode ", "")); 
  expect(s).toContain("PHASE 0");
  expect(s).toContain("before-after");
});

test("the Stax lens exists and tells a generic audit what to STOP asking", () => {
  const lens = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../skills/staxaudit/STAX-LENS.md");
  expect(existsSync(lens), "skills/staxaudit/STAX-LENS.md is missing").toBe(true);
  const s = readFileSync(lens, "utf8");
  // the detector, or an audit cannot know the lens applies
  expect(s).toContain("@frameword/panels-core");
  // the four readings, because collapsing them is how a report loses its reader
  for (const r of ["unreachable", "not applicable"]) expect(s).toContain(r);
  // the three blind assertions, spelled out: this is the part a generic audit cannot know
  expect(s).toContain("line boxes by distinct vertical position");
  expect(s).toContain("elementFromPoint");
  // what to stop asking, which is half the value
  expect(s).toContain("There are no modals");
});
