import { test, expect } from "@playwright/test";
import { fresh } from "./helpers";

/**
 * A glyph centred on a title's LINE BOX is geometrically perfect and visually
 * wrong: the box reserves descender room the title never uses, so its centre
 * sits above where the eye reads the middle of the word. Measured in the bar,
 * the glyph landed 0.98px ABOVE the cap band in Inter and 1.14px BELOW it in
 * the serif used by space roots: a 2.1px swing between a panel and its own
 * parent, in opposite directions. The operator saw it before any test did.
 *
 * The target is the CAP BAND, which is independent of the string (a title with
 * a descender must not shift the icon). The correction is measured from the
 * resolved font at runtime, because the fonts are user-selectable and because a
 * fixed nudge cannot serve a value that flips sign between two faces.
 */
const capDelta = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const bar = [...document.querySelectorAll(".panel .panel-bar")].pop()!;
    const g = bar.querySelector(".bar-glyph") as HTMLElement;
    const t = bar.querySelector(".bar-title") as HTMLElement;
    const tr = t.getBoundingClientRect();
    const svg = g.querySelector("svg")!.getBoundingClientRect();
    const ts = getComputedStyle(t);
    const cv = document.createElement("canvas").getContext("2d")!;
    cv.font = `${ts.fontWeight} ${ts.fontSize} ${ts.fontFamily}`;
    const H = cv.measureText("H"); // the ink of a capital IS the cap height
    const half = (parseFloat(ts.lineHeight) - parseFloat(ts.fontSize)) / 2;
    const capCentre = tr.top + half + H.fontBoundingBoxAscent - H.actualBoundingBoxAscent / 2;
    return +((svg.top + svg.height / 2) - capCentre).toFixed(2);
  });

test("the bar glyph sits on the title's cap band, sans and serif alike", async ({ page }) => {
  await fresh(page);
  // a serif root, a sans drill, and a title carrying a descender
  for (const u of ["#/blocks", "#/console/keys", "#/analytics/blotter", "#/crm/acme", "#/studio/terminal"]) {
    await page.goto(u);
    await page.waitForSelector(".panel .bar-title");
    await page.waitForFunction(() => document.fonts.status === "loaded");
    const d = await capDelta(page);
    expect(Math.abs(d), `${u} is off the cap band by ${d}px`).toBeLessThanOrEqual(0.6);
  }
});

test("changing the title font in Settings re-aligns the glyph", async ({ page }) => {
  await fresh(page);
  await page.goto("#/blocks");
  await page.waitForSelector(".panel .bar-title");
  await page.waitForFunction(() => document.fonts.status === "loaded");
  const before = await capDelta(page);
  expect(Math.abs(before)).toBeLessThanOrEqual(0.6);
  // swap the serif to a face with different metrics and re-measure
  await page.evaluate(() => {
    const p = JSON.parse(localStorage.getItem("frameword-prefs") || "{}");
    p.titleFont = Object.keys(p).length ? p.titleFont : undefined;
    localStorage.setItem("frameword-prefs", JSON.stringify({ ...p, titleFont: "playfair" }));
  });
  await page.reload();
  await page.waitForSelector(".panel .bar-title");
  await page.waitForFunction(() => document.fonts.status === "loaded");
  const after = await capDelta(page);
  expect(Math.abs(after), `after a font change the glyph is off by ${after}px`).toBeLessThanOrEqual(0.6);
});
