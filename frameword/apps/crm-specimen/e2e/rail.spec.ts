/**
 * THE ZERO-BLEED RAIL LAW (DESIGN-SPEC · U-031): the hover fill, the
 * separators and the text share EXACTLY the same bounds; hovered edge
 * content breathes by transform; a rest row's text sits ON the rail.
 */
import { test, expect } from "@playwright/test";
import { link, fresh } from "./helpers";

const DATA_DOC = link({ spaceId: "blocks", path: [{ t: "section", k: "sec:blocks" }, { t: "doc", k: "blkcat:data" }] });

for (const dark of [false, true]) {
  test(`fill == separators == text on the drill rail (${dark ? "dark" : "light"})`, async ({ page }) => {
    await fresh(page, { dark });
    await page.goto(DATA_DOC);
    await page.waitForSelector(".panel");
    const panel = page.locator(".panel").last();
    const row = panel.locator(".drill").first();
    await row.hover();
    await page.waitForTimeout(220);

    const m = await row.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el, "::after");
      const body = el.closest(".panel-body")!;
      const bcs = getComputedStyle(body);
      const br = body.getBoundingClientRect();
      return {
        fillL: r.left, fillR: r.right,
        railL: br.left + parseFloat(bcs.paddingLeft),
        railR: br.right - parseFloat(bcs.paddingRight),
        afterL: parseFloat(cs.left), afterR: parseFloat(cs.right),
        bg: getComputedStyle(el).backgroundColor,
      };
    });
    expect(Math.abs(m.fillL - m.railL)).toBeLessThan(1.01);
    expect(Math.abs(m.fillR - m.railR)).toBeLessThan(1.01);
    expect(m.afterL).toBe(0);
    expect(m.afterR).toBe(0);
    expect(m.bg).not.toBe("rgba(0, 0, 0, 0)");
  });
}

test("hovered index and arrow breathe; rest rows sit on the rail; no layout shift", async ({ page }) => {
  await fresh(page);
  await page.goto(DATA_DOC);
  await page.waitForSelector(".panel");
  await page.waitForTimeout(400); // the stage settles (entry scroll) before geometry reads
  const panel = page.locator(".panel").last();
  const restTitleX = await panel.locator(".drill").nth(1).evaluate(
    (el) => el.querySelector(".tt")!.getBoundingClientRect().left,
  );

  const row = panel.locator(".drill").first();
  await row.hover();
  await page.waitForTimeout(220);
  const m = await row.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      noGap: el.querySelector(".no")!.getBoundingClientRect().left - r.left,
      arrGap: r.right - el.querySelector(".arr")!.getBoundingClientRect().right,
    };
  });
  expect(m.noGap).toBeGreaterThan(8);
  expect(m.arrGap).toBeGreaterThan(8);

  // the NEIGHBOR row must not move while another row breathes
  const restTitleXDuring = await panel.locator(".drill").nth(1).evaluate(
    (el) => el.querySelector(".tt")!.getBoundingClientRect().left,
  );
  expect(Math.abs(restTitleXDuring - restTitleX)).toBeLessThan(0.51);

  // at rest the index sits exactly ON the rail
  const restOffset = await panel.locator(".drill").nth(2).evaluate(
    (el) => el.querySelector(".no")!.getBoundingClientRect().left - el.getBoundingClientRect().left,
  );
  expect(Math.abs(restOffset)).toBeLessThan(1.01);
});

test("the last row paints no separator on hover (dedup law)", async ({ page }) => {
  await fresh(page);
  await page.goto(DATA_DOC);
  await page.waitForSelector(".panel");
  const last = page.locator(".panel").last().locator(".drill").last();
  await last.hover();
  await page.waitForTimeout(220);
  const color = await last.evaluate((el) => getComputedStyle(el, "::after").borderBottomColor);
  expect(color === "rgba(0, 0, 0, 0)" || color === "transparent").toBe(true);
});
