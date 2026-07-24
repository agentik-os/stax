import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const CLI = resolve(HERE, "../index.mjs");
const SRC = readFileSync(CLI, "utf8");
const run = (...a) => execFileSync("node", [CLI, ...a], { encoding: "utf8" });

/**
 * A command that exists but is not in the banner is a command nobody runs.
 * Four of them hid this way for months, and they were the QUALITY GATES:
 * verify, parity, theme and doctor. A migrating agent reading `stax-migrate`
 * with no arguments concluded the framework had no design gate.
 */
test("every dispatched command appears in the help banner", () => {
  const dispatched = [...SRC.matchAll(/^\s+case "([a-z-]+)":/gm)]
    .map((m) => m[1])
    .filter((c) => !["help", "--help", "-h"].includes(c));
  const help = run();
  const hidden = [...new Set(dispatched)].filter((c) => !new RegExp(`\\b${c}\\b`).test(help));
  expect(hidden, `commands missing from the banner: ${hidden.join(", ")}`).toEqual([]);
});

test("the shape router answers, and refuses unknown data honestly", () => {
  const walk = run("shapes", "walk");
  expect(walk).toContain("A computation that DESCENDS");
  expect(walk).toContain("/#/analytics/cfo");
  // the anti-pattern is the point of the catalog: it must be printed
  expect(walk).toContain("NOT");

  const json = JSON.parse(run("shapes", "--json"));
  expect(json.count).toBeGreaterThanOrEqual(19);
  for (const s of json.shapes) {
    expect(s.reference, `${s.id} has no reference`).toMatch(/^\/#\//);
    // the modern URL form only: no type~key, no percent-encoded JSON
    expect(s.reference, `${s.id} publishes a stale URL form`).not.toContain("~");
    expect(s.antiPattern.length, `${s.id} states no anti-pattern`).toBeGreaterThan(20);
  }
});

test("a table is not the default answer: the catalog says so out loud", () => {
  const all = run("shapes");
  expect(all).toContain("correct only when the user EDITS the rows");
  const grid = JSON.parse(run("shapes", "grid", "--json")).shapes[0];
  expect(grid.antiPattern).toContain("Do NOT reach here first");
});

test("every pattern reference uses the readable URL form", () => {
  const cat = JSON.parse(readFileSync(resolve(HERE, "../patterns.json"), "utf8"));
  const stale = cat.patterns.filter((p) => p.reference.includes("~"));
  expect(stale.map((p) => p.reference)).toEqual([]);
});
