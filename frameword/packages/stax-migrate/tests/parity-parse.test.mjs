/* The 100%-transfer contract parser: every edge a real migration CSV hits. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseParityCsv } from "../verify/parity-parse.mjs";

test("plain rows with a header", () => {
  const rows = parseParityCsv("id,capability,probe,expect\nc1,Login works,%7B%7D,panel\n");
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { id: "c1", capability: "Login works", probe: "%7B%7D", expect: "panel" });
});

test("capability text may contain commas", () => {
  const [r] = parseParityCsv("c2,Search, filter, roll and revoke,HASH,text:API keys\n");
  assert.equal(r.capability, "Search, filter, roll and revoke");
  assert.equal(r.probe, "HASH");
  assert.equal(r.expect, "text:API keys");
});

test("probe keeps or drops the leading #", () => {
  const rows = parseParityCsv("a,cap,#deep,panel\nb,cap,deep,panel\n");
  assert.equal(rows[0].probe, "deep");
  assert.equal(rows[1].probe, "deep");
});

test("empty probe means the root", () => {
  const [r] = parseParityCsv("a,cap,,panel\n");
  assert.equal(r.probe, "");
  assert.equal(r.expect, "panel");
});

test("CRLF, blank lines and surrounding spaces are tolerated", () => {
  const rows = parseParityCsv("id,capability,probe,expect\r\n\r\n  a , cap , h , panel  \r\n\n");
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], { id: "a", capability: "cap", probe: "h", expect: "panel" });
});

test("the header is only skipped on the first line", () => {
  const rows = parseParityCsv("a,cap,h,panel\nid,capability as a real id row,h2,panel\n");
  assert.equal(rows.length, 2);
  assert.equal(rows[1].id, "id");
});

test("expect variants survive intact", () => {
  const rows = parseParityCsv([
    "a,cap,h,panel",
    "b,cap,h,action:play-tour",
    "c,cap,h,text:needle with spaces",
  ].join("\n"));
  assert.deepEqual(rows.map((r) => r.expect), ["panel", "action:play-tour", "text:needle with spaces"]);
});

test("an encoded deep-link probe (the real format) round-trips", () => {
  const probe = encodeURIComponent(JSON.stringify({ spaceId: "blocks", path: [{ t: "doc", k: "blkcat:data" }] }));
  const [r] = parseParityCsv(`cap-1,Data doc,${probe},text:Pivot table`);
  assert.equal(decodeURIComponent(r.probe).includes("blkcat:data"), true);
});
