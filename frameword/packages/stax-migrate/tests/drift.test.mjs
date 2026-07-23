/* The doctor's drift counters: the alpha-hex blind spot stays closed. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { countDrift } from "../verify/drift.mjs";

test("6- and 3-digit hex literals count", () => {
  assert.equal(countDrift("color: #e11d48; border: 1px solid #abc;").hex, 2);
});

test("alpha hex (4 and 8 digits) counts — the historical blind spot", () => {
  assert.equal(countDrift("background: #ffffff80; outline: #abcd;").hex, 2);
});

test("var(--token) usage does not count", () => {
  assert.equal(countDrift("color: var(--accent); background: var(--card);").hex, 0);
});

test("hardcoded font-size counts; token font-size does not", () => {
  const { fz } = countDrift("font-size: 13px; font-size: var(--fz-body); font-size: calc(var(--fz-mono) * 1.05);");
  assert.equal(fz, 1);
});

test("a css id selector is not a hex color", () => {
  // #root is 4 word chars but 'r','o','t' are not hex digits
  assert.equal(countDrift("#root { height: 100%; }").hex, 0);
});
