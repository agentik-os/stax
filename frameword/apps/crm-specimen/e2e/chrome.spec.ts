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

for (const dark of [false, true]) {
  test(`L-FIELD: composer fields are tokenized surfaces (${dark ? "dark" : "light"})`, async ({ page }) => {
    await fresh(page, { dark });
    await page.goto(link({ spaceId: "platform", path: [{ t: "section", k: "sec:platform" }, { t: "pfprompt", k: "pf:prompt" }] }));
    await page.waitForSelector("input.foot-search");
    const lum = await page.locator("input.foot-search").first().evaluate((el) => {
      const cnv = document.createElement("canvas"); cnv.width = cnv.height = 1;
      const cx = cnv.getContext("2d")!;
      cx.fillStyle = "#fff"; cx.fillRect(0, 0, 1, 1);
      cx.fillStyle = getComputedStyle(el).backgroundColor; cx.fillRect(0, 0, 1, 1);
      const d = cx.getImageData(0, 0, 1, 1).data;
      return (0.2126 * d[0] + 0.7152 * d[1] + 0.0722 * d[2]) / 255;
    });
    if (dark) expect(lum).toBeLessThan(0.5); // a white field in dark is the defect
    else expect(lum).toBeGreaterThan(0.5);
  });
}
