/**
 * Backend-continuity scanner v2 — the 80% PROGRAMMATIC half of the data matrix.
 *
 * Reads the target's SOURCE (never the network) and extracts, mechanically:
 *   - which backend layers exist (convex · supabase · prisma · rest · trpc)
 *   - every table/collection, server function, rpc, route, realtime channel
 *   - every READ and WRITE call site in the app that touches them
 * Each row carries file:line evidence. The AI's 20% is ONLY the mapping
 * (panel_binding, write_path); `data check` then re-verifies mechanically.
 *
 * v2 core: WHOLE-TEXT matching over comment-stripped source with an offset→line
 * map, so Prettier-formatted chains (`supabase\n  .from("x")\n  .select()`) and
 * multi-line SQL (`create policy ...\n  on invoices`) are first-class — the v1
 * line-by-line grep silently missed them. What it cannot prove it lists as a
 * warning instead of guessing. Zero dependencies.
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

/* ── the whole-text core ────────────────────────────────────────────── */

/** blank a span but keep every newline so offsets→lines stay true */
const blank = (s) => s.replace(/[^\n]/g, " ");

/** JS/TS comments out; `//` is kept when preceded by `:` (protects http://) */
export function stripJsComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, pre) => pre + blank(m.slice(pre.length)));
}

/** SQL comments out: `-- to EOL` and block comments */
export function stripSqlComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/--[^\n]*/g, blank);
}

/** precomputed offset→line lookup */
function lineMap(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === "\n") starts.push(i + 1);
  return (idx) => {
    let lo = 0, hi = starts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= idx) lo = mid; else hi = mid - 1; }
    return lo + 1;
  };
}

/** every match of `re` (must be /g) in whole `text`, with 1-based lines */
export function scanAll(text, re) {
  const at = lineMap(text);
  const hits = [];
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    hits.push({ m, line: at(m.index), index: m.index });
    if (m.index === re.lastIndex) re.lastIndex++; // zero-width guard
  }
  return hits;
}

/** blank every span matched by `re` (used to keep storage.from out of the table pass) */
function maskMatches(text, re) {
  return text.replace(re, blank);
}

/** cached comment-stripped file texts */
function loadTexts(files, strip = stripJsComments) {
  const out = new Map();
  for (const f of files) {
    try { out.set(f, strip(fs.readFileSync(f, "utf8"))); } catch { /* unreadable */ }
  }
  return out;
}

/* ─────────────────────────── CONVEX ─────────────────────────── */

const CONVEX_BUILDERS = new Set(["query", "mutation", "action", "httpAction", "internalQuery", "internalMutation", "internalAction"]);

function scanConvex(root, appTexts) {
  const dir = path.join(root, "convex");
  if (!fs.existsSync(dir)) return null;
  const files = walk(dir, CODE_EXT).filter((f) => !f.includes("_generated"));
  const texts = loadTexts(files);
  const rows = [];
  const warnings = [];

  // tables: `key: defineTable(` — whole-text, so the key may sit on its own line
  const schemaFile = files.find((f) => /schema\.(ts|js|mjs)$/.test(f));
  const tables = new Map();
  for (const tf of files) {
    // `key: defineTable(` in the schema AND `export const key = defineTable(`
    // in split-schema helper files (feature-owned tables spread into defineSchema)
    for (const h of scanAll(texts.get(tf) ?? "", /(\w+)\s*[:=]\s*defineTable\s*\(/g))
      if (!tables.has(h.m[1])) tables.set(h.m[1], { source: `${rel(root, tf)}:${h.line}`, ops: new Set() });
  }
  if (schemaFile) {
    const block = /defineSchema\s*\(\s*\{([\s\S]*?)\}\s*\)/.exec(texts.get(schemaFile) ?? "");
    if (block) for (const sp of block[1].matchAll(/\.\.\.(\w+)/g))
      warnings.push(`convex schema spreads ...${sp[1]} — an external table pack (e.g. authTables) is not statically resolvable; add its tables by hand`);
  } else warnings.push("convex/ present but no schema.(ts|js) found — tables cannot be extracted");

  // functions: known builders + CUSTOM WRAPPERS (convex-helpers style: authedQuery,
  // adminMutation… any ident containing query/mutation/action) — wrappers are rows
  // too, kind-guessed, and named in a warning so a human confirms the guess.
  const FN_RE = /export\s+(?:const|default)\s*(\w*)\s*=?\s*(\w*(?:[Qq]uery|[Mm]utation|[Aa]ction))\s*[(<]/g;
  const fns = [];
  const customBuilders = new Set();
  for (const f of files) {
    const text = texts.get(f) ?? "";
    const mod = rel(dir, f).replace(/\.(ts|js|mjs|tsx|jsx)$/, "").split(path.sep).join(".");
    for (const h of scanAll(text, FN_RE)) {
      const name = h.m[1] || "default";
      const builder = h.m[2];
      // a wrapper DEFINITION (`export const authedQuery = customQuery(...)`) is a
      // builder, not an endpoint: skip defs whose body is customQuery/customMutation
      if (/custom/i.test(builder)) { customBuilders.add(name); continue; }
      const known = CONVEX_BUILDERS.has(builder);
      fns.push({ mod, name, builder, known, source: `${rel(root, f)}:${h.line}` });
      if (!known) customBuilders.add(builder);
    }
    // db ops: reads/creates by table literal; patch/replace/delete → 'w' on tables
    // this module references by string (honest approximation, ids carry no table)
    for (const h of scanAll(text, /ctx\.db\s*\.\s*(query|insert)\s*\(\s*["'`](\w+)["'`]/g)) {
      const t = tables.get(h.m[2]);
      if (t) t.ops.add(h.m[1] === "query" ? "r" : "c");
    }
    if (/ctx\.db\s*\.\s*(patch|replace|delete)\s*\(/.test(text)) {
      for (const [name, t] of tables)
        if (new RegExp(`["'\`]${name}["'\`]`).test(text)) t.ops.add("w");
    }
  }
  // http router: http.route({ path, method, handler }) — inline handlers and
  // both key orders; an external webhook is exactly what a migration must carry
  for (const hf of files) {
    const text = texts.get(hf) ?? "";
    for (const h of scanAll(text, /\.route\s*\(\s*\{[\s\S]{0,400}?path\s*:\s*["'`]([^"'`]+)["'`][\s\S]{0,240}?method\s*:\s*["'`](\w+)["'`]/g))
      rows.push({ layer: "convex", name: `${h.m[2]} ${h.m[1]}`, kind: "route", source: `${rel(root, hf)}:${h.line}`, ops: h.m[2] === "GET" ? "r" : "w", evidence: "convex http.route" });
    for (const h of scanAll(text, /\.route\s*\(\s*\{[\s\S]{0,240}?method\s*:\s*["'`](\w+)["'`][\s\S]{0,400}?path\s*:\s*["'`]([^"'`]+)["'`]/g))
      if (!rows.some((r) => r.layer === "convex" && r.name === `${h.m[1]} ${h.m[2]}`))
        rows.push({ layer: "convex", name: `${h.m[1]} ${h.m[2]}`, kind: "route", source: `${rel(root, hf)}:${h.line}`, ops: h.m[1] === "GET" ? "r" : "w", evidence: "convex http.route" });
  }
  if (customBuilders.size)
    warnings.push(`convex custom function builder(s) detected: ${[...customBuilders].join(", ")} — rows extracted with kind GUESSED from the name; confirm by hand`);

  // app call sites — whole-text, so `useQuery(\n  api.deals.list` binds too
  const sites = { read: new Map(), write: new Map() };
  const SITE_RE = /(useQuery|usePaginatedQuery|fetchQuery|preloadQuery|convexQuery|useMutation|useAction|fetchMutation|fetchAction|convexAction)\s*\(\s*api\.([\w.]+)\.(\w+)\b(?!\s*\.)/g;
  for (const [f, text] of appTexts) {
    for (const h of scanAll(text, SITE_RE)) {
      const key = `${h.m[2]}.${h.m[3]}`;
      const isRead = /^(useQuery|usePaginatedQuery|fetchQuery|preloadQuery|convexQuery)$/.test(h.m[1]);
      const map = isRead ? sites.read : sites.write;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(`${rel(root, f)}:${h.line}`);
    }
  }

  for (const [name, t] of tables)
    rows.push({ layer: "convex", name, kind: "table", source: t.source,
      ops: [...t.ops].sort().join("") || "r", evidence: `defineTable in ${t.source}` });
  for (const fn of fns) {
    const key = `${fn.mod}.${fn.name}`;
    const b = fn.builder;
    const internal = /^internal/.test(b);
    const guessedKind = /[Qq]uery/.test(b) ? "query" : /[Mm]utation/.test(b) ? "mutation" : "action";
    const kind = internal ? "internal" : b === "httpAction" ? "route" : guessedKind;
    const reads = sites.read.get(key) ?? [];
    const writes = sites.write.get(key) ?? [];
    rows.push({ layer: "convex", name: key, kind, source: fn.source,
      ops: kind === "query" ? "r" : kind === "internal" ? "-" : "w",
      evidence: `${b}${fn.known ? "" : " (custom builder, kind guessed)"} · ${reads.length + writes.length} app call site(s)` +
        (reads[0] ? ` e.g. ${reads[0]}` : writes[0] ? ` e.g. ${writes[0]}` : internal ? "" : " — no direct api.* call site found (aliases/wrappers not traceable)"),
    });
  }
  return { layer: "convex", rows, warnings, detected: `convex/ (${files.length} files${schemaFile ? ", schema" : ""})` };
}

/* ────────────────────────── SUPABASE ────────────────────────── */

function scanSupabase(root, appTexts) {
  const dir = path.join(root, "supabase");
  const usesClient = [...appTexts.values()].some((t) => /@supabase\/(supabase-js|ssr|auth-helpers)|create(Server|Browser)Client\s*\(/.test(t));
  if (!fs.existsSync(dir) && !usesClient) return null;
  const rows = [];
  const warnings = [];

  // tables + RLS from migrations SQL — whole-text (multi-line DDL is the norm)
  const tables = new Map();
  const migDir = path.join(dir, "migrations");
  const sqlFiles = fs.existsSync(migDir) ? walk(migDir, new Set([".sql"])) : [];
  for (const f of sqlFiles.sort()) {
    const sql = stripSqlComments(fs.readFileSync(f, "utf8"));
    for (const h of scanAll(sql, /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:"?\w+"?\.)?"?(\w+)"?/gi))
      if (!tables.has(h.m[1])) tables.set(h.m[1], { source: `${rel(root, f)}:${h.line}`, rls: false, policies: 0, ops: new Set() });
    for (const h of scanAll(sql, /create\s+(?:or\s+replace\s+)?view\s+(?:"?\w+"?\.)?"?(\w+)"?/gi))
      if (!tables.has(h.m[1])) tables.set(h.m[1], { source: `${rel(root, f)}:${h.line}`, rls: false, policies: 0, ops: new Set(), view: true });
    // migrations are append-only history: a later `drop table` tombstones the surface
    for (const h of scanAll(sql, /drop\s+(?:table|view)\s+(?:if\s+exists\s+)?(?:"?\w+"?\.)?"?(\w+)"?/gi))
      tables.delete(h.m[1]);
    for (const h of scanAll(sql, /alter\s+table\s+(?:"?\w+"?\.)?"?(\w+)"?\s+enable\s+row\s+level\s+security/gi)) {
      const t = tables.get(h.m[1]); if (t) t.rls = true;
    }
    // the policy NAME may itself contain " on ": skip the quoted name explicitly
    for (const h of scanAll(sql, /create\s+policy\s+(?:"[^"]*"|\w+)\s+on\s+(?:"?\w+"?\.)?"?(\w+)"?/gi)) {
      const t = tables.get(h.m[1]); if (t) t.policies++;
    }
  }
  if (!sqlFiles.length && usesClient) warnings.push("supabase-js used but no supabase/migrations/*.sql — tables inferred from .from() sites only");

  // client sites — storage buckets FIRST, then their spans are masked so the
  // table pass can never confuse `storage.from("bucket")` with a table read
  const STORAGE_RE = /\bstorage\s*\.\s*from\s*\(\s*["'`]([\w-]+)["'`]\s*\)/g;
  const FROM_RE = /\.from\s*(?:<[^>]{0,120}>)?\s*\(\s*["'`](\w+)["'`]\s*\)\s*\.\s*(select|insert|update|upsert|delete)/g;
  const RPC_RE = /\.rpc\s*\(\s*["'`](\w+)["'`]/g;
  const RT_RE = /\.channel\s*\(\s*["'`]([\w:.-]+)["'`]/g;
  const DYN_FROM_RE = /\.from\s*(?:<[^>]{0,120}>)?\s*\(\s*(?!["'`])[^)]{1,120}\)/g;
  const rpcs = new Map(); const channels = new Map(); const buckets = new Map();
  for (const [f, raw] of appTexts) {
    for (const h of scanAll(raw, STORAGE_RE)) {
      if (!buckets.has(h.m[1])) buckets.set(h.m[1], []);
      buckets.get(h.m[1]).push(`${rel(root, f)}:${h.line}`);
    }
    const text = maskMatches(raw, STORAGE_RE);
    for (const h of scanAll(text, FROM_RE)) {
      let t = tables.get(h.m[1]);
      if (!t) { t = { source: `${rel(root, f)}:${h.line}`, rls: null, policies: 0, ops: new Set(), inferred: true }; tables.set(h.m[1], t); }
      t.ops.add(h.m[2] === "select" ? "r" : h.m[2] === "insert" ? "c" : h.m[2] === "delete" ? "d" : "u");
      (t.sites ??= []).push(`${rel(root, f)}:${h.line}`);
    }
    for (const h of scanAll(text, RPC_RE)) { if (!rpcs.has(h.m[1])) rpcs.set(h.m[1], []); rpcs.get(h.m[1]).push(`${rel(root, f)}:${h.line}`); }
    for (const h of scanAll(text, RT_RE)) { if (!channels.has(h.m[1])) channels.set(h.m[1], []); channels.get(h.m[1]).push(`${rel(root, f)}:${h.line}`); }
    for (const h of scanAll(text, DYN_FROM_RE))
      warnings.push(`dynamic .from(<expr>) at ${rel(root, f)}:${h.line} — table not statically provable, verify by hand`);
    // BARE .from("t") with no chained verb (stored-builder pattern:
    // `const base = supabase.from("orders"); base.select()`): the table is
    // real but its ops are not chain-provable — record it, then WARN.
    const chained = new Set(scanAll(text, FROM_RE).map((h) => h.index));
    for (const h of scanAll(text, /\.from\s*(?:<[^>]{0,120}>)?\s*\(\s*["'`](\w+)["'`]\s*\)/g)) {
      if (chained.has(h.index)) continue;
      let t = tables.get(h.m[1]);
      if (!t) { t = { source: `${rel(root, f)}:${h.line}`, rls: null, policies: 0, ops: new Set(), inferred: true }; tables.set(h.m[1], t); }
      (t.bare ??= []).push(`${rel(root, f)}:${h.line}`);
      (t.sites ??= []).push(`${rel(root, f)}:${h.line}`);
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
    if (t.bare?.length && t.ops.size === 0)
      warnings.push(`table "${name}": ${t.bare.length} bare .from() reference(s) (stored builder) — ops not statically provable, verify reads/writes by hand, e.g. ${t.bare[0]}`);
    rows.push({ layer: "supabase", name, kind: t.view ? "view" : "table", source: t.source,
      ops: t.view ? "r" : [...t.ops].sort().join("") || "r",
      evidence: (t.inferred ? "inferred from client sites" : t.view ? "migration DDL (view)" : "migration DDL") +
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

function scanPrisma(root, appTexts) {
  const schema = path.join(root, "prisma", "schema.prisma");
  if (!fs.existsSync(schema)) return null;
  const rows = [];
  const schemaText = stripSqlComments(fs.readFileSync(schema, "utf8"));
  for (const h of scanAll(schemaText, /(?:^|\n)model\s+(\w+)\s*\{/g)) {
    const model = h.m[1];
    const client = model[0].toLowerCase() + model.slice(1);
    const ops = new Set();
    for (const [, text] of appTexts) {
      for (const s of scanAll(text, new RegExp(`\\b(?:ctx\\.)?(?:prisma|db)\\.${client}\\.(findMany|findUnique|findFirst|count|aggregate|create|createMany|update|updateMany|upsert|delete|deleteMany)`, "g")))
        ops.add(/^find|^count|^aggregate/.test(s.m[1]) ? "r" : /^create/.test(s.m[1]) ? "c" : /^delete/.test(s.m[1]) ? "d" : "u");
    }
    rows.push({ layer: "prisma", name: model, kind: "table", source: `${rel(root, schema)}:${h.line}`, ops: [...ops].sort().join("") || "r", evidence: "prisma model" });
  }
  return rows.length ? { layer: "prisma", rows, warnings: [], detected: "prisma/schema.prisma" } : null;
}

function scanRest(root, appTexts) {
  const rows = [];
  const warnings = [];
  const roots = [path.join(root, "app"), path.join(root, "src", "app")];
  for (const r of roots) {
    for (const f of walk(r, CODE_EXT)) {
      if (!/route\.(ts|js|mjs)$/.test(f)) continue;
      const text = stripJsComments(fs.readFileSync(f, "utf8"));
      const methods = scanAll(text, /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE)\b/g).map((h) => h.m[1]);
      // re-exported handlers: `export { GET, POST } from "…"` and `export const { GET, POST } = handlers`
      for (const h of scanAll(text, /export\s+(?:const\s*)?\{([^}]*)\}/g))
        for (const m of h.m[1].matchAll(/\b(GET|POST|PUT|PATCH|DELETE)\b/g)) methods.push(m[1]);
      if (!methods.length) {
        warnings.push(`route file ${rel(root, f)} exports no parsable HTTP method — handler shape not statically provable, add its route by hand`);
        continue;
      }
      const route = ("/" + rel(path.dirname(r) === root ? r : path.join(root, "src"), path.dirname(f)).replace(/^app\//, "").replace(/\\/g, "/")).replace(/\/\([^)/]+\)/g, "");
      rows.push({ layer: "rest", name: route, kind: "route", source: rel(root, f),
        ops: methods.every((m) => m === "GET") ? "r" : "rw", evidence: [...new Set(methods)].join("/"), _sites: [] });
    }
  }
  const pagesApi = [path.join(root, "pages", "api"), path.join(root, "src", "pages", "api")];
  for (const r of pagesApi) {
    for (const f of walk(r, CODE_EXT)) {
      const route = "/api/" + rel(r, f).replace(/\.(ts|js|mjs|tsx|jsx)$/, "").replace(/\\/g, "/").replace(/\/index$/, "");
      rows.push({ layer: "rest", name: route, kind: "route", source: rel(root, f), ops: "rw", evidence: "pages/api handler", _sites: [] });
    }
  }
  if (!rows.length) {
    // still surface fetch("/api/…") leaks in projects with no scanned routes at all
    for (const [f, text] of appTexts)
      for (const h of scanAll(text, /fetch\s*\(\s*["'`](\/api\/[^"'`?\s]*)/g))
        warnings.push(`fetch("${h.m[1]}") at ${rel(root, f)}:${h.line} — no route files scanned; if this is a LEGACY endpoint it must become a D-row or die`);
    return warnings.length ? { layer: "rest", rows: [], warnings, detected: "fetch sites only" } : null;
  }

  // bind fetch("/api/…") call sites to scanned routes ([param] segments match anything);
  // an unmatched fetch is a LEGACY-LEAK candidate — the exact thing migrations forget
  const matchers = rows.map((r) => ({
    r,
    re: new RegExp("^" + r.name.replace(/[.*+?^${}()|\\]/g, "\\$&").replace(/\[[^\]]+\]/g, "[^/]+") + "/?$"),
  }));
  for (const [f, text] of appTexts) {
    for (const h of scanAll(text, /fetch\s*\(\s*["'`](\/api\/[^"'`?\s]*)/g)) {
      const hit = matchers.find((x) => x.re.test(h.m[1]));
      if (hit) hit.r._sites.push(`${rel(root, f)}:${h.line}`);
      else warnings.push(`fetch("${h.m[1]}") at ${rel(root, f)}:${h.line} — matches NO scanned route (legacy leak? typo? external proxy?)`);
    }
  }
  for (const r of rows) {
    if (r._sites.length) r.evidence += ` · ${r._sites.length} fetch site(s) e.g. ${r._sites[0]}`;
    delete r._sites;
  }
  return { layer: "rest", rows, warnings, detected: `${rows.length} route file(s)` };
}

function scanTrpc(root, appTexts) {
  const rows = [];
  const warnings = [];
  const customProcs = new Set();
  for (const [f, text] of appTexts) {
    if (!/(\w*[Pp]rocedure)\b/.test(text) || !/\.(query|mutation|subscription)\s*\(/.test(text)) continue;
    for (const h of scanAll(text, /(\w+)\s*:\s*(\w*[Pp]rocedure)\b/g)) {
      const builder = h.m[2];
      if (!/^(publicProcedure|protectedProcedure|\w*[Pp]rocedure)$/.test(builder)) continue;
      const custom = !/^(publicProcedure|protectedProcedure)$/.test(builder) && builder !== "procedure";
      const tail = text.slice(h.index);
      const q = tail.indexOf(".query("), mu = tail.indexOf(".mutation("), sub = tail.indexOf(".subscription(");
      const first = [["query", q], ["mutation", mu], ["realtime", sub]]
        .filter(([, i]) => i !== -1).sort((a, b) => a[1] - b[1])[0];
      const kind = first ? first[0] : "query";
      if (custom) customProcs.add(builder);
      rows.push({ layer: "trpc", name: h.m[1], kind, source: `${rel(root, f)}:${h.line}`, ops: kind === "mutation" ? "w" : "r", evidence: custom ? `trpc procedure (custom builder ${builder})` : "trpc procedure" });
    }
  }
  if (customProcs.size)
    warnings.push(`trpc custom procedure builder(s) detected: ${[...customProcs].join(", ")} — middleware semantics not statically provable; confirm auth scope by hand`);
  return rows.length ? { layer: "trpc", rows, warnings, detected: `${rows.length} procedure(s)` } : null;
}

/* ─────────────────────────── the scan ─────────────────────────── */

export function scanBackend(root) {
  const appFiles = walk(root, CODE_EXT).filter((f) => !f.includes(path.sep + "convex" + path.sep));
  const appTexts = loadTexts(appFiles);
  const layers = [scanConvex(root, appTexts), scanSupabase(root, appTexts), scanPrisma(root, appTexts), scanRest(root, appTexts), scanTrpc(root, appTexts)]
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
