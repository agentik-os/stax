/**
 * Backend-continuity scanner — the 80% PROGRAMMATIC half of the data matrix.
 *
 * Reads the target's SOURCE (never the network) and extracts, mechanically:
 *   - which backend layers exist (convex · supabase · prisma · rest · trpc)
 *   - every table/collection, server function, rpc, route, realtime channel
 *   - every READ and WRITE call site in the app that touches them
 * Each row carries file:line evidence. The AI's 20% is ONLY the mapping
 * (panel_binding, write_path); `data check` then re-verifies mechanically.
 * Zero dependencies, line-based parsing: what it cannot prove it lists as a
 * warning instead of guessing.
 */
import fs from "node:fs";
import path from "node:path";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "build", ".next", ".vercel", "_generated", "coverage", ".turbo"]);
const CODE_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

function walk(dir, exts, out = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(p, exts, out); }
    else if (exts.has(path.extname(e.name))) out.push(p);
  }
  return out;
}

const rel = (root, p) => path.relative(root, p);

/** every `pattern` match in `file`, with 1-based line numbers */
function grepFile(file, re) {
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch { return []; }
  const hits = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue; // comment lines don't count
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(line)) !== null) {
      hits.push({ line: i + 1, m, text: line.trim().slice(0, 160) });
      if (!re.global) break;
    }
  }
  return hits;
}

/* ─────────────────────────── CONVEX ─────────────────────────── */

function scanConvex(root, appFiles) {
  const dir = path.join(root, "convex");
  if (!fs.existsSync(dir)) return null;
  const files = walk(dir, CODE_EXT).filter((f) => !f.includes("_generated"));
  const rows = [];
  const warnings = [];

  // tables: key: defineTable(  (schema.ts, any depth of chaining after)
  const schemaFile = files.find((f) => /schema\.(ts|js|mjs)$/.test(f));
  const tables = new Map();
  if (schemaFile) {
    for (const h of grepFile(schemaFile, /(\w+)\s*:\s*defineTable\s*\(/g)) {
      tables.set(h.m[1], { source: `${rel(root, schemaFile)}:${h.line}`, ops: new Set() });
    }
  } else warnings.push("convex/ present but no schema.(ts|js) found — tables cannot be extracted");

  // functions: export const name = query|mutation|action|httpAction|internal*(
  const FN_RE = /export\s+const\s+(\w+)\s*=\s*(internalQuery|internalMutation|internalAction|query|mutation|action|httpAction)\s*[(<]/g;
  const fns = [];
  for (const f of files) {
    const mod = path.basename(f).replace(/\.(ts|js|mjs|tsx|jsx)$/, "");
    for (const h of grepFile(f, FN_RE)) {
      fns.push({ mod, name: h.m[1], kind: h.m[2], source: `${rel(root, f)}:${h.line}`, file: f });
    }
    // db ops attribute r/c to tables by string literal
    for (const h of grepFile(f, /ctx\.db\.(query|insert)\s*\(\s*["'`](\w+)["'`]/g)) {
      const t = tables.get(h.m[2]);
      if (t) t.ops.add(h.m[1] === "query" ? "r" : "c");
    }
    for (const h of grepFile(f, /ctx\.db\.(patch|replace|delete)\s*\(/g)) {
      // patch/replace/delete take ids, not table names: attribute a generic write
      // to every table this module also references by string (honest approximation)
      for (const [name, t] of tables) {
        const txt = fs.readFileSync(f, "utf8");
        if (new RegExp(`["'\`]${name}["'\`]`).test(txt)) t.ops.add("w");
      }
      break; // one pass per file is enough
    }
  }

  // app call sites: useQuery/useMutation/useAction/fetchQuery/fetchMutation(api.mod.fn
  const sites = { read: new Map(), write: new Map() };
  const SITE_RE = /(useQuery|usePaginatedQuery|fetchQuery|preloadQuery|useMutation|useAction|fetchMutation|fetchAction)\s*\(\s*api\.(\w+)\.(\w+)/g;
  for (const f of appFiles) {
    for (const h of grepFile(f, SITE_RE)) {
      const key = `${h.m[2]}.${h.m[3]}`;
      const isRead = /Query$|^useQuery|^usePaginatedQuery|^preloadQuery/.test(h.m[1]);
      const map = isRead ? sites.read : sites.write;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(`${rel(root, f)}:${h.line}`);
    }
  }

  for (const [name, t] of tables) {
    rows.push({ layer: "convex", name, kind: "table", source: t.source,
      ops: [...t.ops].sort().join("") || "r", evidence: `defineTable in ${t.source}` });
  }
  for (const fn of fns) {
    const key = `${fn.mod}.${fn.name}`;
    const internal = fn.kind.startsWith("internal");
    const reads = sites.read.get(key) ?? [];
    const writes = sites.write.get(key) ?? [];
    const kind = internal ? "internal" : fn.kind === "httpAction" ? "route" : fn.kind;
    rows.push({ layer: "convex", name: key, kind, source: fn.source,
      ops: kind === "query" ? "r" : kind === "internal" ? "-" : "w",
      evidence: `${fn.kind} · ${reads.length + writes.length} app call site(s)` +
        (reads[0] ? ` e.g. ${reads[0]}` : writes[0] ? ` e.g. ${writes[0]}` : internal ? "" : " — UNUSED by the app"),
    });
  }
  return { layer: "convex", rows, warnings, detected: `convex/ (${files.length} files${schemaFile ? ", schema" : ""})` };
}

/* ────────────────────────── SUPABASE ────────────────────────── */

function scanSupabase(root, appFiles) {
  const dir = path.join(root, "supabase");
  const usesClient = appFiles.some((f) => /@supabase\/supabase-js/.test(fs.readFileSync(f, "utf8")));
  if (!fs.existsSync(dir) && !usesClient) return null;
  const rows = [];
  const warnings = [];

  // tables + RLS from migrations SQL
  const tables = new Map();
  const migDir = path.join(dir, "migrations");
  const sqlFiles = fs.existsSync(migDir) ? walk(migDir, new Set([".sql"])) : [];
  for (const f of sqlFiles) {
    for (const h of grepFile(f, /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?\w+"?\.)?"?(\w+)"?/gi))
      if (!tables.has(h.m[1])) tables.set(h.m[1], { source: `${rel(root, f)}:${h.line}`, rls: false, policies: 0, ops: new Set() });
    for (const h of grepFile(f, /alter\s+table\s+(?:"?\w+"?\.)?"?(\w+)"?\s+enable\s+row\s+level\s+security/gi)) {
      const t = tables.get(h.m[1]); if (t) t.rls = true;
    }
    for (const h of grepFile(f, /create\s+policy\s+.*?\bon\s+(?:"?\w+"?\.)?"?(\w+)"?/gi)) {
      const t = tables.get(h.m[1]); if (t) t.policies++;
    }
  }
  if (!sqlFiles.length && usesClient) warnings.push("supabase-js used but no supabase/migrations/*.sql — tables inferred from .from() sites only");

  // app call sites: .from("t").select/insert/update/upsert/delete — storage.from excluded
  const FROM_RE = /(?<!storage)\s*\.from\s*\(\s*["'`](\w+)["'`]\s*\)\s*\.\s*(select|insert|update|upsert|delete)/g;
  const RPC_RE = /\.rpc\s*\(\s*["'`](\w+)["'`]/g;
  const RT_RE = /\.channel\s*\(\s*["'`]([\w:.-]+)["'`]/g;
  const STORAGE_RE = /storage\s*\.from\s*\(\s*["'`]([\w-]+)["'`]/g;
  const VAR_FROM_RE = /\.from\s*\(\s*[^"'`)\s][^)]*\)/g; // .from(variable) — unprovable
  const rpcs = new Map(); const channels = new Map(); const buckets = new Map();
  for (const f of appFiles) {
    for (const h of grepFile(f, FROM_RE)) {
      let t = tables.get(h.m[1]);
      if (!t) { t = { source: `${rel(root, f)}:${h.line}`, rls: null, policies: 0, ops: new Set(), inferred: true }; tables.set(h.m[1], t); }
      t.ops.add(h.m[2] === "select" ? "r" : h.m[2] === "insert" ? "c" : h.m[2] === "delete" ? "d" : "u");
      (t.sites ??= []).push(`${rel(root, f)}:${h.line}`);
    }
    for (const h of grepFile(f, RPC_RE)) { if (!rpcs.has(h.m[1])) rpcs.set(h.m[1], []); rpcs.get(h.m[1]).push(`${rel(root, f)}:${h.line}`); }
    for (const h of grepFile(f, RT_RE)) { if (!channels.has(h.m[1])) channels.set(h.m[1], []); channels.get(h.m[1]).push(`${rel(root, f)}:${h.line}`); }
    for (const h of grepFile(f, STORAGE_RE)) { if (!buckets.has(h.m[1])) buckets.set(h.m[1], []); buckets.get(h.m[1]).push(`${rel(root, f)}:${h.line}`); }
    for (const h of grepFile(f, VAR_FROM_RE)) {
      if (!/["'`]/.test(h.m[0]) && !/storage/.test(h.text))
        warnings.push(`dynamic .from(<expr>) at ${rel(root, f)}:${h.line} — table not statically provable, verify by hand`);
    }
  }

  // edge functions
  const fnDir = path.join(dir, "functions");
  if (fs.existsSync(fnDir)) {
    for (const e of fs.readdirSync(fnDir, { withFileTypes: true })) {
      if (e.isDirectory() && !e.name.startsWith("_"))
        rows.push({ layer: "supabase", name: e.name, kind: "edge-function", source: rel(root, path.join(fnDir, e.name)), ops: "w", evidence: "supabase/functions/ entry" });
    }
  }

  for (const [name, t] of tables) {
    if (t.rls === true && t.policies === 0)
      warnings.push(`table "${name}" has RLS ENABLED and ZERO policies — the new front end cannot read it until a policy ships`);
    rows.push({ layer: "supabase", name, kind: "table", source: t.source,
      ops: [...t.ops].sort().join("") || "r",
      evidence: (t.inferred ? "inferred from client sites" : "migration DDL") +
        (t.rls === true ? ` · RLS on, ${t.policies} policy(ies)` : "") +
        (t.sites?.[0] ? ` · e.g. ${t.sites[0]}` : ""),
    });
  }
  for (const [name, s] of rpcs) rows.push({ layer: "supabase", name, kind: "rpc", source: s[0], ops: "w", evidence: `${s.length} .rpc() site(s)` });
  for (const [name, s] of channels) rows.push({ layer: "supabase", name, kind: "realtime", source: s[0], ops: "r", evidence: `${s.length} .channel() site(s)` });
  for (const [name, s] of buckets) rows.push({ layer: "supabase", name, kind: "storage", source: s[0], ops: "rw", evidence: `${s.length} storage site(s)` });
  return { layer: "supabase", rows, warnings, detected: `${sqlFiles.length} migration(s)${usesClient ? " + supabase-js client" : ""}` };
}

/* ─────────────────── PRISMA · REST · tRPC (breadth) ─────────────────── */

function scanPrisma(root, appFiles) {
  const schema = path.join(root, "prisma", "schema.prisma");
  if (!fs.existsSync(schema)) return null;
  const rows = [];
  for (const h of grepFile(schema, /^model\s+(\w+)\s*\{/g)) {
    const model = h.m[1];
    const client = model[0].toLowerCase() + model.slice(1);
    const ops = new Set();
    for (const f of appFiles) {
      for (const s of grepFile(f, new RegExp(`prisma\\.${client}\\.(findMany|findUnique|findFirst|count|aggregate|create|createMany|update|updateMany|upsert|delete|deleteMany)`, "g")))
        ops.add(/^find|^count|^aggregate/.test(s.m[1]) ? "r" : /^create/.test(s.m[1]) ? "c" : /^delete/.test(s.m[1]) ? "d" : "u");
    }
    rows.push({ layer: "prisma", name: model, kind: "table", source: `${rel(root, schema)}:${h.line}`, ops: [...ops].sort().join("") || "r", evidence: "prisma model" });
  }
  return rows.length ? { layer: "prisma", rows, warnings: [], detected: "prisma/schema.prisma" } : null;
}

function scanRest(root) {
  const rows = [];
  const roots = [path.join(root, "app"), path.join(root, "src", "app")];
  for (const r of roots) {
    for (const f of walk(r, CODE_EXT)) {
      if (!/route\.(ts|js|mjs)$/.test(f)) continue;
      const methods = grepFile(f, /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g).map((h) => h.m[1]);
      if (!methods.length) continue;
      const route = "/" + rel(path.dirname(r) === root ? r : path.join(root, "src"), path.dirname(f)).replace(/^app\//, "").replace(/\\/g, "/");
      rows.push({ layer: "rest", name: route, kind: "route", source: rel(root, f),
        ops: methods.every((m) => m === "GET") ? "r" : "rw", evidence: methods.join("/") });
    }
  }
  const pagesApi = [path.join(root, "pages", "api"), path.join(root, "src", "pages", "api")];
  for (const r of pagesApi) {
    for (const f of walk(r, CODE_EXT)) {
      const route = "/api/" + rel(r, f).replace(/\.(ts|js|mjs|tsx|jsx)$/, "").replace(/\\/g, "/").replace(/\/index$/, "");
      rows.push({ layer: "rest", name: route, kind: "route", source: rel(root, f), ops: "rw", evidence: "pages/api handler" });
    }
  }
  return rows.length ? { layer: "rest", rows, warnings: [], detected: `${rows.length} route file(s)` } : null;
}

function scanTrpc(root, appFiles) {
  const rows = [];
  for (const f of appFiles) {
    const text = fs.readFileSync(f, "utf8");
    if (!/(publicProcedure|protectedProcedure|t\.procedure)/.test(text)) continue;
    for (const h of grepFile(f, /(\w+)\s*:\s*(?:publicProcedure|protectedProcedure|t\.procedure)/g)) {
      const tail = text.slice(text.indexOf(h.m[0]));
      const q = tail.indexOf(".query("), mu = tail.indexOf(".mutation(");
      const kind = mu !== -1 && (q === -1 || mu < q) ? "mutation" : "query";
      rows.push({ layer: "trpc", name: h.m[1], kind, source: `${rel(root, f)}:${h.line}`, ops: kind === "query" ? "r" : "w", evidence: "trpc procedure" });
    }
  }
  return rows.length ? { layer: "trpc", rows, warnings: [], detected: `${rows.length} procedure(s)` } : null;
}

/* ─────────────────────────── the scan ─────────────────────────── */

export function scanBackend(root) {
  const appFiles = walk(root, CODE_EXT).filter((f) => !f.includes(path.sep + "convex" + path.sep));
  const layers = [scanConvex(root, appFiles), scanSupabase(root, appFiles), scanPrisma(root, appFiles), scanRest(root), scanTrpc(root, appFiles)]
    .filter(Boolean);
  return {
    layers: layers.map((l) => ({ layer: l.layer, detected: l.detected })),
    rows: layers.flatMap((l) => l.rows),
    warnings: layers.flatMap((l) => l.warnings),
  };
}

/** merge scanned rows into existing data-matrix rows: existing (layer,name,kind)
 *  keep their id, panel_binding, write_path, status; new rows get fresh ids. */
export function mergeDataRows(existing, scanned) {
  const key = (r) => `${r.layer}|${r.name}|${r.kind}`;
  const byKey = new Map(existing.map((r) => [key(r), r]));
  let max = 0;
  for (const r of existing) { const m = /^D-(\d+)$/.exec(r.id || ""); if (m) max = Math.max(max, +m[1]); }
  const out = [];
  const seen = new Set();
  for (const s of scanned) {
    const k = key(s);
    seen.add(k);
    const prev = byKey.get(k);
    out.push(prev
      ? { ...prev, source: s.source, ops: s.ops, evidence: s.evidence } // scan refreshes the facts, keeps the mapping
      : { id: `D-${String(++max).padStart(3, "0")}`, layer: s.layer, name: s.name, kind: s.kind, source: s.source, ops: s.ops, panel_binding: "", write_path: "", status: "pending", evidence: s.evidence });
  }
  const stale = existing.filter((r) => !seen.has(key(r)));
  return { rows: [...out, ...stale], stale };
}

/** the mechanical gate over a (possibly AI-mapped) matrix */
export function checkDataRows(rows) {
  const problems = [];
  const skippable = /^(skipped|out-of-scope|wrapped|deferred|internal)/i;
  for (const r of rows) {
    if (r.kind === "internal") continue;
    const status = (r.status || "").trim();
    const reasoned = skippable.test(status) && status.length > 12; // a skip NEEDS its reason
    if (!String(r.panel_binding || "").trim() && !reasoned)
      problems.push(`${r.id} ${r.layer}/${r.name} (${r.kind}) has NO panel_binding and no reasoned skip`);
    if (/[cudw]/.test(r.ops || "") && !String(r.write_path || "").trim() && !reasoned)
      problems.push(`${r.id} ${r.layer}/${r.name} is WRITABLE (${r.ops}) with no write_path — a table you can write needs the foot action that writes it`);
  }
  return problems;
}
