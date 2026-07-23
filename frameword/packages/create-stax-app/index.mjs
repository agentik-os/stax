#!/usr/bin/env node
/**
 * create-stax-app <dir> [--from <path|repo-url>]
 *
 * Scaffolds a Stax app: the starter template + the vendored panel engine
 * (panels-core, panels-react) + the design contract. Sources come from the
 * stax repo — a local checkout via --from, or a fresh shallow clone.
 */
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve, basename } from "node:path";

const REPO = "https://github.com/agentik-os/stax";
const args = process.argv.slice(2);
const fromIdx = args.indexOf("--from");
const from = fromIdx !== -1 ? args.splice(fromIdx, 2)[1] : null;
const dir = args[0];
if (!dir) {
  console.log("Usage: create-stax-app <dir> [--from <path|repo-url>]");
  process.exit(1);
}
const target = resolve(dir);
if (existsSync(target) && readdirSync(target).length > 0) {
  console.error(`✗ ${target} exists and is not empty`);
  process.exit(1);
}
const name = basename(target).toLowerCase().replace(/[^a-z0-9-]+/g, "-");

// 1 — locate the stax sources
let src = from ? resolve(from) : null;
let tmp = null;
if (!src || !existsSync(join(src, "frameword"))) {
  tmp = mkdtempSync(join(tmpdir(), "stax-"));
  console.log(`· cloning ${from ?? REPO} (shallow)…`);
  execFileSync("git", ["clone", "--depth=1", from ?? REPO, tmp], { stdio: "pipe" });
  src = tmp;
}
const fw = join(src, "frameword");
for (const p of ["templates/starter", "packages/panels-core", "packages/panels-react", "packages/stax-migrate/templates/design-spec.md"])
  if (!existsSync(join(fw, p))) { console.error(`✗ missing ${p} in the stax sources`); process.exit(1); }

// 2 — copy the starter + the engine (sources only, no node_modules/dist)
const skip = (p) => /node_modules|\/dist\/|\/dist$|\.vercel/.test(p);
mkdirSync(target, { recursive: true });
cpSync(join(fw, "templates/starter"), target, { recursive: true, filter: (p) => !skip(p) });
for (const pkg of ["panels-core", "panels-react"])
  cpSync(join(fw, "packages", pkg), join(target, "packages", pkg), { recursive: true, filter: (p) => !skip(p) });
cpSync(join(fw, "packages/stax-migrate/templates/design-spec.md"), join(target, "DESIGN-SPEC.md"));

// 3 — stamp the app name
for (const f of ["package.json", "index.html", "README.md", "src/App.tsx", "src/App.jsx"]) {
  const p = join(target, f);
  if (existsSync(p) && statSync(p).isFile())
    writeFileSync(p, readFileSync(p, "utf8").replaceAll("__APP_NAME__", name));
}
if (tmp) rmSync(tmp, { recursive: true, force: true });

console.log(`✓ ${name} scaffolded at ${target}

Next:
  cd ${dir}
  bun install     (or npm install)
  bun dev         → http://localhost:5800

The design contract lives in DESIGN-SPEC.md; your content graph in src/domain.ts.`);
