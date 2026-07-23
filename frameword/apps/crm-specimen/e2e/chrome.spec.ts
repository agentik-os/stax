/**
 * THE SHELL CHROME CONTRACT: the quiet ⌘K lives in the crumbbar left of
 * GitHub; the responsive rules RR-1..RR-8 hold at every width.
 */
import { test, expect } from "@playwright/test";
import { link, fresh } from "./helpers";

const DEEP = link({ spaceId: "blocks", path: [{ t: "section", k: "sec:blocks" }, { t: "doc", k: "blkcat:data" }, { t: "block", k: "blk:pivot" }] });

test("the bare ⌘K sits left of GitHub and opens the palette; no topbar pill", async ({ page }) => {
  await fresh(page);
  await page.goto("/");
  await page.waitForSelector(".crumbbar");
  await expect(page.locator(".tb-goto")).toHaveCount(0);
  const chip = page.locator(".crumb-goto");
  await expect(chip).toHaveCount(1);
  const pos = await page.evaluate(() => ({
    chipR: document.querySelector(".crumb-goto")!.getBoundingClientRect().right,
    ghL: document.querySelector(".crumb-gh")!.getBoundingClientRect().left,
    border: getComputedStyle(document.querySelector(".crumb-goto")!).borderTopWidth,
  }));
  expect(pos.chipR).toBeLessThanOrEqual(pos.ghL + 1);
  expect(pos.border).toBe("0px");
  await chip.click();
  await expect(page.locator(".palette")).toBeVisible();
});

for (const w of [1280, 980, 744, 580, 375]) {
  test(`RR sweep at ${w}px: no sideways document, chrome survives`, async ({ page }) => {
    await fresh(page);
    await page.setViewportSize({ width: w, height: 800 });
    await page.goto(DEEP);
    await page.waitForSelector(".panel");
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => ({
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      chip: !!document.querySelector(".crumb-goto"),
      gh: !!document.querySelector(".crumb-gh"),
      dots: [...document.querySelectorAll(".crumbbar .crumb")].some((c) => c.textContent!.trim() === "…"),
    }));
    expect(r.overflowX).toBeLessThanOrEqual(0);
    expect(r.chip && r.gh).toBe(true);
    if (w < 640) expect(r.dots).toBe(true); // RR-4: crumbs middle-collapse
  });
}
