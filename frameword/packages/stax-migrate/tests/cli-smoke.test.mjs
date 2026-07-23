/* CLI contract smoke: usage paths, exit codes, and clean error text. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const CLI = join(dirname(dirname(fileURLToPath(import.meta.url))), "index.mjs");
const run = (...args) => spawnSync("node", [CLI, ...args], { encoding: "utf8", timeout: 30000 });

test("parity without a contract file exits 2 with usage", () => {
  const r = run("parity", "--url", "http://localhost:1", "--file", "/nonexistent/parity.csv");
  assert.equal(r.status, 2);
  assert.match(r.stdout, /Usage: stax-migrate parity/);
  assert.match(r.stdout, /no contract at/);
});

test("theme rejects a non-hex color with exit 2", () => {
  const r = run("theme", "--from", "#zzzzzz");
  assert.equal(r.status, 2);
  assert.match(r.stderr + r.stdout, /not a #rrggbb color/);
});

test("theme emits an OKLCH ramp for a valid hex", () => {
  const r = run("theme", "--from", "#e11d48");
  assert.equal(r.status, 0);
  assert.match(r.stdout, /--accent/);
  assert.match(r.stdout, /oklch\(/);
});

test("verify without --url exits 2 with usage", () => {
  const r = run("verify");
  assert.equal(r.status, 2);
  assert.match(r.stdout, /Usage: stax-migrate verify --url/);
});
