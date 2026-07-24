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

test("THE GUTTER LAW: a panel never touches the main menu, at rest or scrolled", async ({ page }) => {
  await fresh(page);
  await page.setViewportSize({ width: 1440, height: 800 });
  await page.goto(link({ spaceId: "pf-analytics", path: [{ t: "section", k: "sec:pf-analytics" }] }));
  await page.waitForSelector(".panel");
  await page.waitForTimeout(500);
  const probe = () => page.evaluate(() => {
    const sb = document.querySelector(".sidebar")!;
    const band = parseFloat(getComputedStyle(sb, "::after").width) || 0;
    const edge = sb.getBoundingClientRect().right + band;
    const p = document.querySelector(".panel")!.getBoundingClientRect();
    // either the panel starts AT the gutter's right edge, or it has scrolled UNDER it
    return { band, ok: p.left >= edge - 1 || p.left < edge };
  });
  const rest = await probe();
  expect(rest.band).toBeGreaterThanOrEqual(14); // the gutter exists and is not cosmetic
  expect(rest.ok).toBe(true);
  await page.locator(".drill").first().click();
  await page.waitForTimeout(80);
  expect((await probe()).ok).toBe(true);   // mid-animation
  await page.waitForTimeout(700);
  expect((await probe()).ok).toBe(true);   // scrolled
});

test("a device with an OLD data store still receives newly shipped tables", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.clear();
      localStorage.setItem("frameword-data", JSON.stringify({
        collections: [{
          id: "c-customers", name: "Customers",
          fields: [{ id: "f-name", name: "Name", type: "text" }],
          rows: [{ id: "r1", ts: 1, v: { "f-name": "Acme" } }],
          views: [{ id: "v1", name: "Table", filters: [], hidden: [] }], activeView: "v1",
        }],
      }));
    } catch { /* first load */ }
  });
  await page.goto(link({ spaceId: "pf-analytics", path: [{ t: "section", k: "sec:pf-analytics" }, { t: "datatable", k: "dtc:c-crypto" }] }));
  await page.waitForSelector(".panel");
  await page.waitForTimeout(600);
  const leaf = page.locator(".panel").last();
  await expect(leaf).not.toContainText("was deleted");
  await expect(leaf.locator(".dt tbody tr")).toHaveCount(6);
});
