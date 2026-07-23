
import { oklchFromHex, themeBlock } from "../theme.mjs";

test("oklchFromHex: pure red lands on the known OKLCH point", () => {
  const c = oklchFromHex("#ff0000")!;
  expect(Math.abs(c.L - 0.6279)).toBeLessThan(0.01);
  expect(Math.abs(c.C - 0.2577)).toBeLessThan(0.01);
  expect(Math.abs(c.H - 29.23)).toBeLessThan(0.5);
});

test("themeBlock emits both themes with a computed foreground", () => {
  const b = themeBlock("#e11d48")!;
  expect(b).toContain(":root");
  expect(b).toContain(".dark");
  expect(b).toContain("--accent-soft");
  expect(b.match(/--accent:/g)?.length).toBe(2);
});

test("themeBlock rejects garbage", () => {
  expect(themeBlock("red")).toBeNull();
});

import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("doctor reports pending upgrades and drift on a fixture", () => {
  const dir = mkdtempSync(join(tmpdir(), "stax-doc-"));
  mkdirSync(join(dir, "stax-migration"), { recursive: true });
  writeFileSync(join(dir, "stax-migration/contract.json"), JSON.stringify({ level: "standard" }));
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src/app.css"), ".x { color: #ff0000; font-size: 13px; }");
  const r = Bun.spawnSync(["node", join(import.meta.dir, "../index.mjs"), "doctor", dir]);
  const out = r.stdout.toString();
  expect(out).toContain("level standard");
  expect(out).toContain("PENDING");
  expect(out).toContain("1 hex literal");
  expect(out).toContain("1 hardcoded font-size");
  expect(out).toContain("PRESCRIPTION");
  expect(r.exitCode).toBe(1);
});

test("doctor on a non-adopted dir says init", () => {
  const dir = mkdtempSync(join(tmpdir(), "stax-doc2-"));
  const r = Bun.spawnSync(["node", join(import.meta.dir, "../index.mjs"), "doctor", dir]);
  expect(r.stdout.toString()).toContain("NOT ADOPTED");
});

test("doctor catches alpha-hex drift (4- and 8-digit)", () => {
  const dir = mkdtempSync(join(tmpdir(), "stax-doc3-"));
  mkdirSync(join(dir, "stax-migration"), { recursive: true });
  writeFileSync(join(dir, "stax-migration/contract.json"), JSON.stringify({ level: "standard" }));
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src/overlay.css"), ".s { box-shadow: 0 2px 8px #00000040; border-color: #f008; }");
  const r = Bun.spawnSync(["node", join(import.meta.dir, "../index.mjs"), "doctor", dir]);
  expect(r.stdout.toString()).toContain("2 hex literal");
});
