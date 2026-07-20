import { describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  checkPhase,
  blockingRows,
  serializeCSV,
  LEVELS,
  CSV_HEADER,
  ELEM_HEADER,
  DATA_HEADER,
  WS,
} from "../index.mjs";

/** scratch workspace with a contract + the three matrices */
function ws(level: string, opts: { data?: boolean; f?: object[]; e?: object[]; d?: object[]; report?: string } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "staxm-"));
  fs.mkdirSync(path.join(dir, WS), { recursive: true });
  fs.writeFileSync(path.join(dir, WS, "state.json"), JSON.stringify({ phase: 7 }));
  fs.writeFileSync(path.join(dir, WS, "contract.json"), JSON.stringify({ level, data: opts.data !== false }));
  fs.writeFileSync(path.join(dir, WS, "feature-matrix.csv"), serializeCSV(opts.f ?? [], CSV_HEADER));
  fs.writeFileSync(path.join(dir, WS, "element-matrix.csv"), serializeCSV(opts.e ?? [], ELEM_HEADER));
  fs.writeFileSync(path.join(dir, WS, "data-matrix.csv"), serializeCSV(opts.d ?? [], DATA_HEADER));
  if (opts.report !== undefined) fs.writeFileSync(path.join(dir, WS, "REPORT.md"), opts.report);
  return dir;
}
const F = (id: string, status: string, evidence = "") => ({ id, area: "a", feature: "f", status, evidence });
const E = (id: string, status: string, evidence = "") => ({ id, area: "a", element: "e", status, evidence });
const D = (id: string, status: string, over: object = {}) => ({ id, layer: "db", name: "t", kind: "table", ops: "r", status, ...over });

describe("blockingRows — the anti-10% rule", () => {
  test("empty status blocks at EVERY level", () => {
    for (const level of Object.keys(LEVELS))
      expect(blockingRows([F("F-001", "")], level).length).toBe(1);
  });
  test("full accepts only migrated", () => {
    expect(blockingRows([F("F-001", "migrated")], "full")).toEqual([]);
    expect(blockingRows([F("F-002", "deferred", "reason")], "full").length).toBe(1);
    expect(blockingRows([F("F-003", "wrapped", "reason")], "full").length).toBe(1);
  });
  test("a skip WITHOUT a cited reason blocks even where the status is accepted", () => {
    expect(blockingRows([F("F-001", "deferred")], "standard").length).toBe(1);
    expect(blockingRows([F("F-001", "deferred", "admin-only, 3 users")], "standard")).toEqual([]);
    expect(blockingRows([F("F-001", "out-of-scope")], "starter").length).toBe(1);
    expect(blockingRows([F("F-001", "out-of-scope", "phase 2 scope")], "starter")).toEqual([]);
    expect(blockingRows([F("F-001", "wrapped")], "shell").length).toBe(1);
    expect(blockingRows([F("F-001", "wrapped", "mounted at /legacy")], "shell")).toEqual([]);
  });
  test("statuses foreign to the level block (out-of-scope at standard, deferred at shell)", () => {
    expect(blockingRows([F("F-001", "out-of-scope", "r")], "standard").length).toBe(1);
    expect(blockingRows([F("F-001", "deferred", "r")], "shell").length).toBe(1);
  });
});

describe("phase 7/8 gate — level-aware across all three matrices", () => {
  test("full: one deferred feature refuses the gate", () => {
    const dir = ws("full", { f: [F("F-001", "migrated"), F("F-002", "deferred", "later")], e: [E("E-001", "migrated")], d: [D("D-001", "migrated")] });
    expect(checkPhase(dir, 7).join("\n")).toContain("F-002");
  });
  test("full: all migrated passes", () => {
    const dir = ws("full", { f: [F("F-001", "migrated")], e: [E("E-001", "migrated")], d: [D("D-001", "migrated")] });
    expect(checkPhase(dir, 7)).toEqual([]);
  });
  test("standard: reasoned wrapped/deferred pass; unreasoned block", () => {
    const ok = ws("standard", { f: [F("F-001", "migrated"), F("F-002", "wrapped", "iframe /admin"), F("F-003", "deferred", "Q4")], e: [E("E-001", "migrated")], d: [D("D-001", "migrated")] });
    expect(checkPhase(ok, 7)).toEqual([]);
    const bad = ws("standard", { f: [F("F-001", "wrapped")], e: [E("E-001", "migrated")], d: [D("D-001", "migrated")] });
    expect(checkPhase(bad, 7).join("\n")).toContain("without a cited reason");
  });
  test("data matrix gates like the others — an unbound table refuses full", () => {
    const dir = ws("full", { f: [F("F-001", "migrated")], e: [E("E-001", "migrated")], d: [D("D-001", "migrated"), D("D-002", "inventoried")] });
    expect(checkPhase(dir, 7).join("\n")).toContain("D-002");
  });
  test("a migrated WRITABLE data row without a write_path refuses the gate", () => {
    const dir = ws("full", { f: [F("F-001", "migrated")], e: [E("E-001", "migrated")], d: [D("D-001", "migrated", { ops: "crud", panel_binding: "drill/deal", write_path: "" })] });
    expect(checkPhase(dir, 7).join("\n")).toContain("write_path");
    const ok = ws("full", { f: [F("F-001", "migrated")], e: [E("E-001", "migrated")], d: [D("D-001", "migrated", { ops: "crud", panel_binding: "drill/deal", write_path: "foot/new-deal" })] });
    expect(checkPhase(ok, 7)).toEqual([]);
  });
  test("empty data matrix refuses when gated, passes when waived (--no-data)", () => {
    const gated = ws("full", { f: [F("F-001", "migrated")], e: [E("E-001", "migrated")] });
    expect(checkPhase(gated, 7).join("\n")).toContain("data-matrix.csv has 0 rows");
    const waived = ws("full", { data: false, f: [F("F-001", "migrated")], e: [E("E-001", "migrated")] });
    expect(checkPhase(waived, 7)).toEqual([]);
  });
  test("legacy workspace without contract.json behaves as FULL with data waived", () => {
    const dir = ws("full", { f: [F("F-001", "migrated")], e: [E("E-001", "migrated")] });
    fs.rmSync(path.join(dir, WS, "contract.json"));
    expect(checkPhase(dir, 7)).toEqual([]);
    fs.writeFileSync(path.join(dir, WS, "feature-matrix.csv"), serializeCSV([F("F-001", "deferred", "r")], CSV_HEADER));
    expect(checkPhase(dir, 7).join("\n")).toContain("F-001"); // still strict full
  });
});

describe("phase 2 and phase 9 gates", () => {
  test("phase 2 requires D rows when data is gated", () => {
    const dir = ws("full", { f: [F("F-001", "inventoried")] });
    expect(checkPhase(dir, 2).join("\n")).toContain("data-matrix.csv has 0 rows");
    const ok = ws("full", { f: [F("F-001", "inventoried")], d: [D("D-001", "inventoried")] });
    expect(checkPhase(ok, 2)).toEqual([]);
  });
  test("phase 9 refuses a REPORT without the Integration contract section", () => {
    const bare = ws("full", { report: "# Report\nall done" });
    expect(checkPhase(bare, 9).join("\n")).toContain("Integration contract");
    const ok = ws("full", { report: "# Report\n## Integration contract\nlevel full — honored" });
    expect(checkPhase(ok, 9)).toEqual([]);
  });
});
