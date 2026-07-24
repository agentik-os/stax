/* The backend-continuity scanner: the 80% programmatic half, proven on fixtures. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scanBackend, mergeDataRows, checkDataRows } from "../datascan.mjs";

const FIX = join(dirname(fileURLToPath(import.meta.url)), "fixtures");
const by = (rows, layer, kind) => rows.filter((r) => r.layer === layer && r.kind === kind);
const named = (rows, name) => rows.find((r) => r.name === name);

/* ── Convex ─────────────────────────────────────────────────────────── */

const convex = scanBackend(join(FIX, "convex-app"));

test("convex: detected, all 3 tables extracted with sources", () => {
  assert.ok(convex.layers.some((l) => l.layer === "convex"));
  const tables = by(convex.rows, "convex", "table").map((r) => r.name).sort();
  assert.deepEqual(tables, ["accounts", "activities", "deals"]);
  assert.match(named(convex.rows, "deals").source, /schema\.ts:\d+$/);
});

test("convex: query/mutation extracted; internal listed but excluded from the gate", () => {
  assert.equal(named(convex.rows, "deals.list").kind, "query");
  assert.equal(named(convex.rows, "deals.create").kind, "mutation");
  assert.equal(named(convex.rows, "deals.sweep").kind, "internal");
  const problems = checkDataRows(convex.rows.map((r) => ({ ...r, id: "D-000", panel_binding: "", write_path: "", status: "pending" })));
  assert.ok(!problems.some((p) => p.includes("deals.sweep")));
});

test("convex: app call sites bind; the never-called mutation is flagged UNUSED", () => {
  assert.match(named(convex.rows, "deals.list").evidence, /1 app call site.*App\.tsx/);
  assert.match(named(convex.rows, "deals.restage").evidence, /no direct api\.\* call site found/);
});

test("convex: table ops carry reads and writes from ctx.db usage", () => {
  const deals = named(convex.rows, "deals");
  assert.ok(deals.ops.includes("r") && deals.ops.includes("c"), deals.ops);
});

/* ── Supabase ───────────────────────────────────────────────────────── */

const supa = scanBackend(join(FIX, "supabase-app"));

test("supabase: tables from SQL DDL (mixed case, quoted, schema-prefixed)", () => {
  const tables = by(supa.rows, "supabase", "table").map((r) => r.name).sort();
  assert.deepEqual(tables, ["audit_log", "invoices", "orders", "payments"]);
});

test("supabase v2: PRETTIER MULTILINE chains are first-class; comment traps never count", () => {
  const pay = named(supa.rows, "payments");
  assert.ok(pay.ops.includes("r") && pay.ops.includes("u"), pay.ops); // multiline select + update
  assert.ok(!supa.rows.some((r) => r.name === "ghost_table" || r.name === "phantom"));
});

test("supabase v2: a MULTILINE policy still counts (payments has RLS + 1 policy, no lockout warning)", () => {
  assert.ok(!supa.warnings.some((w) => w.includes("payments") && w.includes("ZERO")));
});

test("supabase: RLS-without-policy raises the lockout warning", () => {
  assert.ok(supa.warnings.some((w) => w.includes("audit_log") && w.includes("ZERO policies")));
  assert.ok(!supa.warnings.some((w) => w.includes('"invoices"') && w.includes("ZERO")));
});

test("supabase: client ops attributed (select+insert on invoices), rpc + realtime + edge fn rows", () => {
  const inv = named(supa.rows, "invoices");
  assert.ok(inv.ops.includes("r") && inv.ops.includes("c"), inv.ops);
  assert.equal(named(supa.rows, "close_month").kind, "rpc");
  assert.equal(named(supa.rows, "room:invoices").kind, "realtime");
  assert.equal(named(supa.rows, "send-email").kind, "edge-function");
});

test("supabase v2: a STORED-BUILDER bare .from() still surfaces the table + warns ops-unprovable", () => {
  const orders = named(supa.rows, "orders");
  assert.equal(orders.kind, "table");
  assert.ok(supa.warnings.some((w) => w.includes('"orders"') && w.includes("bare .from()")));
});

test("supabase: storage.from is a bucket, NEVER a table; dynamic .from() warns", () => {
  assert.equal(named(supa.rows, "avatars").kind, "storage");
  assert.ok(!by(supa.rows, "supabase", "table").some((r) => r.name === "avatars"));
  assert.ok(supa.warnings.some((w) => w.includes("dynamic .from")));
});

test("convex v2: custom wrapper endpoints extracted (kind guessed), wrapper def is not an endpoint, multiline useQuery binds", () => {
  const rev = named(convex.rows, "reports.revenue");
  assert.equal(rev.kind, "query"); // guessed from authedQuery
  assert.match(rev.evidence, /custom builder/);
  assert.match(rev.evidence, /1 app call site/); // the MULTILINE useQuery site
  assert.ok(!convex.rows.some((r) => r.name === "lib.authedQuery")); // the def is a builder
  assert.ok(convex.warnings.some((w) => w.includes("authedQuery")));
});

/* ── Prisma · REST · tRPC ───────────────────────────────────────────── */

const rest = scanBackend(join(FIX, "rest-app"));

test("prisma models + client ops; REST route methods; trpc query vs mutation", () => {
  const user = named(rest.rows, "User");
  assert.equal(user.kind, "table");
  assert.ok(user.ops.includes("r") && user.ops.includes("c"), user.ops);
  const route = by(rest.rows, "rest", "route")[0];
  assert.match(route.name, /api\/users/);
  assert.equal(route.ops, "rw");
  assert.equal(named(rest.rows, "userList").kind, "query");
  assert.equal(named(rest.rows, "userAdd").kind, "mutation");
});

test("rest v2: fetch sites bind to routes ([param] aware); unmatched fetch = leak warning", () => {
  const route = by(rest.rows, "rest", "route").find((r) => /api\/users/.test(r.name));
  assert.match(route.evidence, /1 fetch site/);
  assert.ok(rest.warnings.some((w) => w.includes("/api/ghost") && w.includes("NO scanned route")));
});

/* ── merge + gate ───────────────────────────────────────────────────── */

test("merge preserves ids and AI mappings, refreshes facts, keeps manual rows", () => {
  const existing = [
    { id: "D-001", layer: "convex", name: "deals", kind: "table", source: "old", ops: "r", panel_binding: "space:crm/panel:deals", write_path: "foot:new-deal", status: "migrated", evidence: "old" },
    { id: "D-009", layer: "rest", name: "/legacy/soap", kind: "route", source: "manual", ops: "rw", panel_binding: "wrapped", write_path: "", status: "wrapped: SOAP bridge kept for the ERP", evidence: "manual row" },
  ];
  const { rows, stale } = mergeDataRows(existing, convex.rows);
  const deals = rows.find((r) => r.id === "D-001");
  assert.equal(deals.panel_binding, "space:crm/panel:deals"); // mapping survives
  assert.notEqual(deals.source, "old");                        // facts refreshed
  assert.equal(stale.length, 1);                               // the manual SOAP row is kept, flagged
  const fresh = rows.filter((r) => r.status === "pending");
  assert.ok(fresh.length > 0 && fresh.every((r) => /^D-\d{3}$/.test(r.id)));
  const ids = rows.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);                 // no id collisions
});

test("the gate: unbound writable fails; a REASONED skip passes; a bare skip does not", () => {
  const bad = checkDataRows([{ id: "D-001", layer: "supabase", name: "invoices", kind: "table", ops: "cr", panel_binding: "", write_path: "", status: "pending" }]);
  assert.equal(bad.length, 2); // no binding AND writable without write_path
  const reasoned = checkDataRows([{ id: "D-002", layer: "rest", name: "/api/cron", kind: "route", ops: "w", panel_binding: "", write_path: "", status: "out-of-scope: internal cron, no UI surface" }]);
  assert.equal(reasoned.length, 0);
  const bare = checkDataRows([{ id: "D-003", layer: "rest", name: "/api/x", kind: "route", ops: "w", panel_binding: "", write_path: "", status: "skipped" }]);
  assert.equal(bare.length, 2); // "skipped" with no reason is not a reason
});
