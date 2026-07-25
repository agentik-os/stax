import { test, expect } from "@playwright/test";
import { fresh } from "./helpers";

/**
 * The bar glyph is the one identity token the default head layout adds, and for
 * a long time it added nothing: the bar called SpaceIcon with a resourceKey
 * ("an:blotter") while SpaceIcon switches on a spaceId ("pf-analytics"), so
 * every panel in the app fell through to the same featureless circle. Measured
 * before the fix: ONE distinct glyph across ten panels. Six independent audit
 * agents flagged it, and it is the largest mechanical cause of "every panel
 * looks the same".
 *
 * This test is the guard. Compare a HASH OF THE FULL MARKUP: every glyph shares
 * the same <svg> attributes, so a truncated prefix compares nothing and reports
 * a false 1 (which it did, on the first attempt at this measurement).
 */
const PANELS = [
  "#/analytics/blotter", "#/console/keys", "#/studio/terminal", "#/crm/acme",
  "#/laws/law-1", "#/blocks", "#/tasks", "#/notes", "#/analytics/c-crypto", "#/canvas",
];

test("each panel kind states itself: the bar glyph is not one shared circle", async ({ page }) => {
  await fresh(page);
  const byGlyph = new Map<string, string[]>();
  for (const u of PANELS) {
    await page.goto(u);
    await page.waitForSelector(".panel");
    await page.waitForTimeout(200);
    const g = await page.evaluate(() => {
      const b = [...document.querySelectorAll(".panel .bar-glyph")].pop();
      if (!b) return "(none)";
      const h = b.innerHTML.replace(/\s+/g, " ").trim();
      let n = 0;
      for (let i = 0; i < h.length; i++) n = (n * 31 + h.charCodeAt(i)) | 0;
      return (n >>> 0).toString(16);
    });
    byGlyph.set(g, [...(byGlyph.get(g) ?? []), u]);
  }
  const collisions = [...byGlyph.entries()].filter(([, us]) => us.length > 1);
  expect(
    collisions.map(([g, us]) => `${g}: ${us.join(" ")}`),
    "two panel kinds share a glyph, which is how the app went uniform last time",
  ).toEqual([]);
  expect(byGlyph.size).toBe(PANELS.length);
});
