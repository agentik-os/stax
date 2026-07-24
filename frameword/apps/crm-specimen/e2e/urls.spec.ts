import { test, expect } from "@playwright/test";
import { fresh } from "./helpers";

/**
 * The URL contract. A Stax link is a thing people paste into Slack, so it has
 * to read like a path someone could have guessed, and it has to keep working
 * after the app is refactored. Both halves are tested here.
 */

const CANON: [string, string][] = [
  ["#/analytics/blotter", "Trading blotter"],
  ["#/analytics/treasury", "Banking and treasury"],
  ["#/analytics/cfo", "CFO monthly"],
  ["#/console/keys", "API keys"],
  ["#/console/usage", "Usage"],
  ["#/studio/terminal", "Terminal"],
];

test("a public URL round-trips byte for byte", async ({ page }) => {
  await fresh(page);
  for (const [url, leaf] of CANON) {
    await page.goto(url);
    await page.waitForSelector(".panel .bar-title");
    await expect
      .poll(() => page.evaluate(() => location.hash), { timeout: 4000 })
      .toBe(url);
    const titles = await page.locator(".panel .bar-title").allTextContents();
    expect(titles[titles.length - 1]).toBe(leaf);
  }
});

test("the space root is implied, never written twice", async ({ page }) => {
  await fresh(page);
  await page.goto("#/analytics/blotter");
  await page.waitForSelector(".panel .bar-title");
  // two panels are open (the root plus the leaf) but the URL names only the leaf
  expect(await page.locator(".panel").count()).toBe(2);
  expect(await page.evaluate(() => location.hash)).toBe("#/analytics/blotter");
});

// the whole point of keeping the old codec alive: a link shared last month
// must still land, and it should quietly upgrade itself to the short form
test("an old type~key link still lands, and normalises to the short form", async ({ page }) => {
  await fresh(page);
  await page.goto("#/pf-analytics/section~sec:pf-analytics/anblotter~an:blotter");
  await page.waitForSelector(".panel .bar-title");
  const titles = await page.locator(".panel .bar-title").allTextContents();
  expect(titles[titles.length - 1]).toBe("Trading blotter");
  await expect
    .poll(() => page.evaluate(() => location.hash), { timeout: 4000 })
    .toBe("#/analytics/blotter");
});

test("a mixed URL is legal: a slug beside an explicit type~key", async ({ page }) => {
  await fresh(page);
  await page.goto("#/analytics/anblotter~an:blotter");
  await page.waitForSelector(".panel .bar-title");
  const titles = await page.locator(".panel .bar-title").allTextContents();
  expect(titles[titles.length - 1]).toBe("Trading blotter");
});

// a dead slug should degrade, not blow up: land on what did resolve
test("an unknown slug opens the space instead of failing", async ({ page }) => {
  await fresh(page);
  await page.goto("#/analytics/this-does-not-exist");
  await page.waitForSelector(".panel");
  expect(await page.locator(".panel").count()).toBe(1);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForTimeout(300);
  expect(errors).toEqual([]);
});

test("a contested slug goes to the public surface, and digits are never a slug", async ({ page }) => {
  await fresh(page);
  // pf:keys (the console screen) wins /keys over imp:keys (a note about it)
  await page.goto("#/console/keys");
  await page.waitForSelector(".panel .bar-title");
  const t = await page.locator(".panel .bar-title").allTextContents();
  expect(t[t.length - 1]).toBe("API keys");
  // law:1 cannot be "/1": it stays qualified
  await page.goto("#/laws/law-1");
  await page.waitForSelector(".panel .bar-title");
  expect(await page.evaluate(() => location.hash)).toBe("#/laws/law-1");
});
