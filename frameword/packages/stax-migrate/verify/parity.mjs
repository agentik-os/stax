/**
 * The 100% TRANSFER gate: node parity.mjs <url> <parity.csv>
 * Every row of the parity contract is DRIVEN against the live rebuilt app:
 *   id,capability,probe,expect
 *   - probe: the deep-link hash (with or without leading #; empty = the root)
 *   - expect: panel            → at least one .panel renders, console clean
 *             action:<id>      → the focused panel's registry lists the action
 *             text:<needle>    → the page contains the text
 * Exit 0 ONLY at 100%: a migration that loses one capability is a failed
 * migration, not a partial success.
 */
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { readFileSync } from "node:fs";

const [, , urlArg, csvArg] = process.argv;
if (!urlArg || !csvArg) { console.error("usage: parity.mjs <url> <parity.csv>"); process.exit(2); }

async function loadPlaywright() {
  for (const base of [process.cwd() + "/package.json", import.meta.url]) {
    for (const name of ["@playwright/test", "playwright", "playwright-core"]) {
      try {
        const req = createRequire(base);
        const mod = await import(pathToFileURL(req.resolve(name)).href);
        const m = mod.chromium ? mod : (mod.default ?? mod);
        if (m.chromium) return m;
      } catch { /* next */ }
    }
  }
  console.error("playwright not found in this project: `bun add -d playwright`");
  process.exit(2);
}
const { chromium } = await loadPlaywright();

const rows = readFileSync(csvArg, "utf8").split("\n").map((l) => l.trim()).filter(Boolean)
  .filter((l, i) => !(i === 0 && l.toLowerCase().startsWith("id,")))
  .map((l) => {
    const first = l.indexOf(",");
    const last = l.lastIndexOf(",");
    const mid = l.slice(first + 1, last);
    const probeSplit = mid.lastIndexOf(",");
    return {
      id: l.slice(0, first).trim(),
      capability: mid.slice(0, probeSplit).trim(),
      probe: mid.slice(probeSplit + 1).trim().replace(/^#/, ""),
      expect: l.slice(last + 1).trim(),
    };
  });

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
const results = [];
for (const r of rows) {
  const errors = [];
  const onErr = (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); };
  pg.on("console", onErr);
  try {
    await pg.goto(urlArg + (r.probe ? "#" + r.probe : ""), { waitUntil: "networkidle", timeout: 20000 });
    await pg.reload({ waitUntil: "networkidle", timeout: 20000 });
    await pg.waitForTimeout(700);
    let ok = false, why = "";
    if (r.expect === "panel") {
      const n = await pg.locator(".panel").count();
      ok = n > 0 && errors.length === 0;
      why = n === 0 ? "no panel rendered" : errors.length ? "console errors: " + errors[0] : "";
    } else if (r.expect.startsWith("action:")) {
      const want = r.expect.slice(7);
      const acts = await pg.evaluate(() => {
        const sx = window.stax;
        return sx ? sx.actions().map((a) => a.id) : null;
      });
      ok = Array.isArray(acts) && acts.includes(want);
      why = acts === null ? "bridge absent" : ok ? "" : `action "${want}" not in [${(acts ?? []).join(", ")}]`;
    } else if (r.expect.startsWith("text:")) {
      const needle = r.expect.slice(5);
      ok = ((await pg.evaluate(() => document.body.innerText)) ?? "").includes(needle);
      why = ok ? "" : `text "${needle}" not found`;
    } else { why = `unknown expect "${r.expect}"`; }
    results.push({ ...r, ok, why });
  } catch (e) {
    results.push({ ...r, ok: false, why: String(e).slice(0, 120) });
  }
  pg.off("console", onErr);
}
await b.close();
const failed = results.filter((r) => !r.ok);
console.log(JSON.stringify({ url: urlArg, total: results.length, passed: results.length - failed.length, failed, pass: failed.length === 0 }, null, 1));
process.exit(failed.length === 0 ? 0 : 1);
