/* The console/analytics pattern catalog: shipped as data, queryable, and it
   must never drift from the spec table it was generated from. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const PKG = dirname(dirname(fileURLToPath(import.meta.url)));
const CLI = join(PKG, "index.mjs");
const run = (...args) => {
  let r = spawnSync("node", [CLI, ...args], { encoding: "utf8", timeout: 30000 });
  if (r.status === null) r = spawnSync("node", [CLI, ...args], { encoding: "utf8", timeout: 30000 });
  return r;
};
const cat = JSON.parse(readFileSync(join(PKG, "patterns.json"), "utf8"));

test("the catalog carries every console and analytics screen, each with a live reference", () => {
  assert.equal(cat.patterns.length, 20);
  for (const p of cat.patterns) {
    assert.ok(p.legacy.length > 8, p.legacy);
    assert.match(p.reference, /^\/#\/[\w-]+\/section~[\w:-]+\/\w+~[\w:-]+$/, p.reference);
    assert.ok(p.grammar.includes(p.panelType), `${p.panelType} absent from its own grammar`);
  }
});

test("the catalog cannot drift from the spec table it came from", () => {
  const spec = readFileSync(join(PKG, "templates", "design-spec.md"), "utf8");
  for (const p of cat.patterns) {
    assert.ok(spec.includes(p.reference), `${p.reference} is in the catalog but not in the spec table`);
    assert.ok(spec.includes(p.legacy), `"${p.legacy}" is in the catalog but not in the spec table`);
  }
});

test("a query finds its screen and prints the live reference", () => {
  const r = run("patterns", "api", "key");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /API keys/);
  assert.match(r.stdout, /pfkeys~pf:keys/);
});

test("an unknown screen exits 1 and sends the agent to the view grammar", () => {
  const r = run("patterns", "quantum teleporter");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /view grammar/);
});

test("--json is machine readable and the bare command lists everything", () => {
  const r = run("patterns", "--json");
  assert.equal(r.status, 0);
  const out = JSON.parse(r.stdout);
  assert.equal(out.count, 20);
  assert.equal(out.query, null);
});
