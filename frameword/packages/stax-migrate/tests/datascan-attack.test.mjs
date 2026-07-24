/**
 * The adversarial harvest, frozen as regression guards: 17 reproducible
 * discrepancies found by hostile-but-realistic fixture attack (three attacker
 * agents), each fixed and asserted here against the attackers' OWN fixtures.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { scanBackend } from "../datascan.mjs";

const ATK = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "attack");
const named = (rows, name) => rows.find((r) => r.name === name);

/* ── convex ─────────────────────────────────────────────────────────── */

const billing = scanBackend(join(ATK, "attack-convex", "billing"));
const crm = scanBackend(join(ATK, "attack-convex", "crm"));
const dash = scanBackend(join(ATK, "attack-convex", "dashboard"));

test("A1 prettier-broken ctx.db chains carry table reads", () => {
  assert.ok(named(billing.rows, "invoices").ops.includes("r"), named(billing.rows, "invoices").ops);
});

test("A2 split-schema tables (export const = defineTable) surface; authTables spread warns", () => {
  assert.equal(named(billing.rows, "deals").kind, "table");
  assert.ok(billing.warnings.some((w) => w.includes("...authTables")));
});

test("A3 subdirectory modules get real api names and bind their call sites", () => {
  assert.match(named(crm.rows, "features.deals.list").evidence, /1 app call site/);
  assert.match(named(crm.rows, "features.deals.create").evidence, /1 app call site/);
});

test("A4 TanStack convexQuery sites bind; untraceable aliases claim nothing false", () => {
  assert.match(named(dash.rows, "tasks.list").evidence, /1 app call site/);
  assert.match(named(dash.rows, "tasks.stats").evidence, /no direct api\.\* call site found/);
});

test("A5 convex http.route inline handlers become route rows", () => {
  const r = named(crm.rows, "POST /clerk-users-webhook");
  assert.equal(r.kind, "route");
});

test("A6 zCustomQuery wrapper definitions never become phantom endpoints", () => {
  assert.ok(!billing.rows.some((r) => /functions\.z(Query|Mutation|CustomQuery|CustomMutation)/.test(r.name)));
  assert.equal(named(billing.rows, "invoices.forDeal").kind, "query"); // built WITH the wrapper: real
});

/* ── supabase ───────────────────────────────────────────────────────── */

const ssr = scanBackend(join(ATK, "attack-supabase", "nextjs-ssr"));
const store = scanBackend(join(ATK, "attack-supabase", "storefront"));
const legacy = scanBackend(join(ATK, "attack-supabase", "crm-legacy"));

test("A7 @supabase/ssr-only apps detect the layer", () => {
  assert.ok(ssr.layers.some((l) => l.layer === "supabase"));
  const notes = named(ssr.rows, "notes");
  assert.ok(notes.ops.includes("c") && notes.ops.includes("r"), notes.ops);
});

test("A8 a dropped table is a tombstone, not a live surface", () => {
  const all = [ssr, store, legacy].flatMap((s) => s.rows.map((r) => r.name));
  assert.ok(!all.includes("beta_signups"));
});

test("A9 a policy whose NAME contains ' on ' still counts for its table", () => {
  const profiles = named(store.rows, "profiles");
  assert.match(profiles.evidence, /1 policy/);
  assert.ok(!store.warnings.some((w) => w.includes("profiles") && w.includes("ZERO")));
});

test("A10 create view is DDL: kind view, read-only, never 'inferred'", () => {
  const v = named(store.rows, "product_stats");
  assert.equal(v.kind, "view");
  assert.match(v.evidence, /migration DDL \(view\)/);
});

test("A11 supabase-js v1 typed builders .from<T>('t') are visible", () => {
  const contacts = named(legacy.rows, "contacts");
  assert.ok(contacts.ops.includes("c") && contacts.ops.includes("r"), contacts.ops);
});

test("A12 prettier-split dynamic .from(args) still warns", () => {
  assert.ok(legacy.warnings.some((w) => w.includes("dynamic .from") && w.includes("orders.ts")));
});

/* ── prisma · rest · trpc ───────────────────────────────────────────── */

const shop = scanBackend(join(ATK, "attack-prisma-rest-trpc", "nextauth-shop"));
const rt = scanBackend(join(ATK, "attack-prisma-rest-trpc", "realtime-notes"));
const t3 = scanBackend(join(ATK, "attack-prisma-rest-trpc", "t3-taskboard"));

test("A13 re-exported route handlers (NextAuth v5 / uploadthing / trpc) yield rows", () => {
  for (const r of ["/api/auth/[...nextauth]", "/api/uploadthing"])
    assert.ok(named(shop.rows, r), r);
  assert.ok(named(t3.rows, "/api/trpc/[trpc]"));
});

test("A14 the T3 db wrapper feeds prisma ops (c/u/d, not read-only)", () => {
  const task = named(t3.rows, "Task");
  assert.ok(task.ops.includes("c") && task.ops.includes("d"), task.ops);
  assert.ok(named(t3.rows, "Comment").ops.includes("d"));
});

test("A15 custom tRPC procedures (adminProcedure) yield rows + a warning", () => {
  assert.ok(named(t3.rows, "purgeDone"));
  assert.ok(named(t3.rows, "ban"));
  assert.ok(t3.warnings.some((w) => w.includes("adminProcedure")));
});

test("A16 Next.js route groups vanish from route names", () => {
  assert.ok(named(shop.rows, "/api/products"));
  assert.ok(!shop.rows.some((r) => r.name.includes("(")));
});

test("A17 .subscription() procedures are realtime reads, never stolen mutations", () => {
  const sub = named(rt.rows, "onNew");
  assert.equal(sub.kind, "realtime");
  assert.equal(sub.ops, "r");
});
