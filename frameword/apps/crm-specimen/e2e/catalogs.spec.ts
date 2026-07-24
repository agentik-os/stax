import { test, expect } from "@playwright/test";
import { fresh } from "./helpers";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const load = (f: string) =>
  JSON.parse(readFileSync(resolve(HERE, "../../../packages/stax-migrate", f), "utf8"));
const patterns = load("patterns.json").patterns as { legacy: string; reference: string }[];
const shapes = load("shapes.json").shapes as { id: string; reference: string }[];

/**
 * The catalogs promise a migrating agent that every reference opens a real,
 * populated panel it can copy. That promise rotted silently once already: four
 * pattern references still pointed at the ana-* spaces months after Analytics
 * folded into Platform, so an agent following them landed on an empty "Node"
 * placeholder and learned nothing. Nothing checked, so nobody knew.
 *
 * This is the check. A reference is dead if the panel does not open, or if it
 * opens with no content, which is the failure mode that hid the last four.
 */

const rows: { id: string; ref: string; from: string }[] = [
  ...patterns.map((p) => ({
    id: p.legacy.slice(0, 42),
    ref: p.reference,
    from: "patterns.json",
  })),
  ...shapes.map((s) => ({
    id: s.id,
    ref: s.reference,
    from: "shapes.json",
  })),
];

test("every catalog reference opens a real, populated panel", async ({ page }) => {
  await fresh(page);
  const dead: string[] = [];
  for (const r of rows) {
    await page.goto(r.ref.replace(/^\/#/, "#"));
    await page.waitForSelector(".panel", { timeout: 5000 }).catch(() => {});
    const state = await page.evaluate(() => {
      const panels = [...document.querySelectorAll(".panel")];
      const leaf = panels[panels.length - 1];
      if (!leaf) return { title: null, filled: 0 };
      const body = leaf.querySelector(".panel-body");
      return {
        title: leaf.querySelector(".bar-title")?.textContent ?? null,
        // a placeholder node renders a title and nothing else: count real children
        filled: body ? body.querySelectorAll("*").length : 0,
      };
    });
    // "Node" with an empty body is what the domain renders for an undefined key.
    // The child count alone is a bad discriminator: a canvas and a terminal are
    // legitimately shallow (1 and 2 children), so the emptiness IS the signal.
    if (!state.title || state.title === "Node" || state.filled === 0)
      dead.push(`${r.from} · ${r.id} · ${r.ref} · title=${state.title} children=${state.filled}`);
  }
  expect(dead, `dead catalog references:\n${dead.join("\n")}`).toEqual([]);
});

test("every catalog reference uses the readable URL form", async ({ page }) => {
  // an agent copying a reference should copy the URL style we actually publish
  const legacy = rows.filter((r) => r.ref.includes("~") || r.ref.includes("%7B"));
  expect(
    legacy.map((r) => `${r.from} · ${r.id} · ${r.ref}`),
    "these references still publish the old type~key form",
  ).toEqual([]);
  // and they must round-trip
  await fresh(page);
  const drift: string[] = [];
  for (const r of rows.slice(0, 8)) {
    const want = r.ref.replace(/^\/#/, "#");
    await page.goto(want);
    await page.waitForSelector(".panel");
    const got = await page.evaluate(() => location.hash);
    if (got !== want) drift.push(`${r.id}: typed ${want}, became ${got}`);
  }
  expect(drift).toEqual([]);
});
