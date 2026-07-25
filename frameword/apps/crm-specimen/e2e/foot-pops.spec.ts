import { test, expect } from "@playwright/test";
import { fresh } from "./helpers";

/**
 * Every popover the foot opens sits ABOVE the foot (bottom: 100%), so it lives
 * outside the foot's own box. An `overflow: hidden` added to make the foot fold
 * responsively erased all of them: measured at pop bottom 696 against foot top
 * 703, with elementFromPoint at the pop's centre returning .panel-body.
 *
 * The real check is not geometry, it is PAINT: ask the browser what element is
 * actually hit at the popover's centre. A clipped popover has correct
 * coordinates and correct opacity and is still invisible.
 */
async function popIsPainted(page: import("@playwright/test").Page, sel: string) {
  return page.evaluate((s) => {
    const pop = document.querySelector(s) as HTMLElement | null;
    if (!pop) return { found: false, painted: false, hit: "" };
    const r = pop.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return { found: true, painted: !!hit && pop.contains(hit), hit: (hit as HTMLElement)?.className ?? "" };
  }, sel);
}

for (const dark of [false, true]) {
  test(`the panel settings popover is actually painted (${dark ? "dark" : "light"})`, async ({ page }) => {
    await fresh(page, { dark });
    await page.goto("#/console/keys");
    await page.waitForSelector(".panel-foot");
    await page.locator(".panel").last().locator(".foot-gear[title='Panel settings']").click();
    await page.waitForSelector(".panel-pop");
    const r = await popIsPainted(page, ".panel-pop");
    expect(r.found).toBe(true);
    expect(r.painted, `the settings popover is clipped; the browser paints "${r.hit}" at its centre`).toBe(true);
  });
}

test("the data table's foot popovers are painted too", async ({ page }) => {
  await fresh(page);
  await page.goto("#/analytics/c-crypto");
  await page.waitForSelector(".panel-foot");
  const gear = page.locator(".panel").last().locator(".panel-foot .foot-gear").last();
  await gear.click();
  await page.waitForTimeout(300);
  const r = await popIsPainted(page, ".panel-pop, .panel-foot .dp-pop");
  expect(r.found, "no popover opened from the table foot").toBe(true);
  expect(r.painted, `clipped; the browser paints "${r.hit}" at its centre`).toBe(true);
});

// the fold this clipping was introduced to serve must still hold
test("the foot still holds ONE line and its 44px at every width", async ({ page }) => {
  await fresh(page);
  await page.goto("#/console/keys");
  await page.waitForSelector(".panel-foot");
  for (const w of [1512, 1280, 1024, 860, 720, 620, 480, 380]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(160);
    const m = await page.evaluate(() => {
      const f = [...document.querySelectorAll(".panel-foot")].pop()!;
      const r = f.getBoundingClientRect();
      const kids = [...f.children].filter((c) => c.getBoundingClientRect().width > 0);
      // compare CENTRES: children have different heights, so their tops differ on
      // the SAME line. Comparing tops reported a false "3 lines" three times.
      const centres = new Set(kids.map((c) => Math.round(c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2)));
      return { h: Math.round(r.height), lines: centres.size, spill: Math.round(f.scrollWidth - f.clientWidth) };
    });
    expect(m.h, `foot height at ${w}px`).toBeLessThanOrEqual(46);
    expect(m.lines, `foot rows at ${w}px`).toBe(1);
    expect(m.spill, `horizontal spill at ${w}px`).toBeLessThanOrEqual(1);
  }
});
