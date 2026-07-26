import { test, expect } from "@playwright/test";
import { fresh } from "./helpers";

/**
 * The three blockers the forensic audit found, each pinned so it cannot return.
 * All three were invisible to the four gated design laws, which is the whole
 * argument for the audit existing.
 */

// The app teaches this prohibition on /moonbase/refusal and broke it on the
// panel next door: it printed "4 open · €90,540" beside three rendered rows
// summing €68,540, a gap of exactly the one candidate it filtered out.
test("no panel prints a count that includes rows the reader cannot see", async ({ page }) => {
  await fresh(page);
  await page.goto("#/moonbase/reconcile");
  await page.waitForSelector(".mb-match");
  const m = await page.evaluate(() => {
    const p = [...document.querySelectorAll(".panel")].pop()!;
    const rows = [...p.querySelectorAll(".mb-match")];
    const n = (s: string) => Number((s.match(/[\d,]+/g) || ["0"]).pop()!.replace(/,/g, ""));
    const t = p.querySelector(".pf-toolbar .foot-note")!.textContent!;
    return {
      rendered: rows.length,
      sum: rows.map((r) => n(r.querySelector(".side .amt")!.textContent!)).reduce((a, b) => a + b, 0),
      count: Number(t.match(/(\d+)\s+open/)![1]),
      total: n(t.split("·")[1]),
    };
  });
  expect(m.count, "the toolbar counts rows nobody can see").toBe(m.rendered);
  expect(m.total, "the toolbar totals amounts nobody can see").toBe(m.sum);
});

// A masked value a filter can CONFIRM is not masked: matching the unmasked
// secret turned the row count into an oracle, and 673 probes recovered the key
// from the seven characters the mask itself prints.
test("a masked secret cannot be recovered through the search box", async ({ page }) => {
  await fresh(page);
  await page.goto("#/console/keys");
  await page.waitForSelector(".panel input");
  const box = page.locator(".panel").last().locator("input").first();
  const count = async (q: string) => {
    await box.fill(q);
    await page.waitForTimeout(80);
    return page.evaluate(() =>
      Number([...document.querySelectorAll(".panel")].pop()!.textContent!.match(/(\d+)\s+keys?/)![1]));
  };
  // the visible prefix must still find its row: the mask is public
  const visible = await page.evaluate(() => {
    const t = [...document.querySelectorAll(".panel")].pop()!.textContent!;
    return t.match(/sk-[a-z-]+/)![0];
  });
  expect(await count(visible), "the visible prefix should match").toBeGreaterThan(0);
  // but a guess at the HIDDEN body must not be confirmable
  const guess = await count(visible + "9f2kxq7wlm");
  const control = await count(visible + "zzzzzzzzzz");
  expect(guess, "the filter confirms hidden characters, so the row count is an oracle").toBe(control);
});

test("every row action in the grid is reachable by keyboard, and visible when focused", async ({ page }) => {
  await fresh(page);
  await page.goto("#/analytics/c-crypto");
  await page.waitForSelector(".dt");
  const m = await page.evaluate(() => {
    const q = (s: string) => [...document.querySelectorAll(s)] as HTMLElement[];
    const acts = [...q(".dt tbody .dt-open"), ...q(".dt tbody .dt-openchip"), ...q(".dt tbody .dt-selbox")];
    return { n: acts.length, unreachable: acts.filter((e) => e.tabIndex < 0).length };
  });
  expect(m.n, "no row actions found: the probe missed the grid").toBeGreaterThan(0);
  expect(m.unreachable, "row actions a keyboard can never reach").toBe(0);
  // and focusing one must reveal it, or removing tabIndex made it reachable and invisible
  const first = page.locator(".dt tbody .dt-open").first();
  await first.focus();
  await expect(first).toBeVisible();
});
