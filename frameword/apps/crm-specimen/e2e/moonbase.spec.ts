import { test, expect } from "@playwright/test";
import { fresh } from "./helpers";

/**
 * Five shapes from a real conversion manifest. The manifest declared each
 * panel's width, head layout and foot contract, so those are ASSERTED here:
 * a manifest that is not honoured is a manifest nobody will trust twice.
 */
const PANELS = [
  { url: "#/moonbase/scorecard", title: "Deal scorecard", sel: ".mb-crit", width: 800, primary: "Save scorecard" },
  { url: "#/moonbase/reconcile", title: "Reconcile candidates", sel: ".mb-match", width: 640, primary: "Accept match" },
  { url: "#/moonbase/call", title: "Capital call", sel: ".mb-alloc", width: 640, primary: "Build capital call" },
  { url: "#/moonbase/killcheck", title: "Kill check", sel: ".mb-gate", width: 380, primary: null },
  { url: "#/moonbase/rhythm", title: "Weekly rhythm", sel: ".mb-slot", width: 640, primary: null },
];

test("each panel honours the width and foot its manifest row declared", async ({ page }) => {
  await fresh(page);
  for (const p of PANELS) {
    await page.goto(p.url);
    await page.waitForSelector(p.sel);
    const m = await page.evaluate(() => {
      const el = [...document.querySelectorAll(".panel")].pop()!;
      const f = el.querySelector(".panel-foot")!;
      return {
        hash: location.hash,
        title: el.querySelector(".bar-title")?.textContent,
        width: Math.round(el.getBoundingClientRect().width),
        footH: Math.round(f.getBoundingClientRect().height),
        primary: f.querySelector(".foot-cta")?.textContent ?? null,
      };
    });
    expect(m.hash, `${p.url} did not round-trip`).toBe(p.url);
    expect(m.title).toBe(p.title);
    expect(m.width, `${p.title} width`).toBe(p.width);
    expect(m.footH, `${p.title} foot height`).toBeLessThanOrEqual(46);
    expect(m.primary, `${p.title} primary action`).toBe(p.primary);
  }
});

// the scorecard's whole argument: the total is computed, so editing a criterion
// moves it. A stored total would not.
test("the scorecard total is derived from its criteria, not stored beside them", async ({ page }) => {
  await fresh(page);
  await page.goto("#/moonbase/scorecard");
  await page.waitForSelector(".mb-crit");
  const read = () => page.locator(".panel").last().locator(".stat .val").first().textContent();
  const before = await read();
  await page.locator(".pf-seg .aseg", { hasText: "Manual" }).click();
  // drop the first criterion to one point and watch the total follow
  await page.locator(".mb-crit").first().locator(".dot").first().click();
  await expect.poll(read).not.toBe(before);
  const after = await read();
  expect(Number(after)).toBeLessThan(Number(before));
});

test("the capital call always reconciles: the parts sum to the total", async ({ page }) => {
  await fresh(page);
  await page.goto("#/moonbase/call");
  await page.waitForSelector(".mb-alloc");
  const { parts, total } = await page.evaluate(() => {
    const n = (s: string) => Number(s.replace(/[^\d.]/g, ""));
    return {
      // scope to the leaf panel: the sidebar publishes .stat .val as well, and
      // reading the document-wide first one silently measures the sidebar
      parts: [...document.querySelectorAll(".mb-alloc .amt")].map((e) => n(e.textContent || "")),
      total: n([...document.querySelectorAll(".panel")].pop()!.querySelector(".stat .val")?.textContent || ""),
    };
  });
  // the stat prints millions, the rows print units
  expect(parts.reduce((a, b) => a + b, 0) / 1_000_000).toBeCloseTo(total, 1);
});

test("the gate leads with its verdict, and a blocking failure kills it", async ({ page }) => {
  await fresh(page);
  await page.goto("#/moonbase/killcheck");
  await page.waitForSelector(".mb-gate");
  const v = page.locator(".mb-verdict");
  await expect(v).toHaveClass(/stop/); // the fixture carries one blocking failure
  // the verdict must be the FIRST thing in the body, not a summary at the end
  const firstIsVerdict = await page.evaluate(() => {
    const body = [...document.querySelectorAll(".panel-body")].pop()!;
    return body.firstElementChild?.classList.contains("mb-verdict") ?? false;
  });
  expect(firstIsVerdict).toBe(true);
});

test("no state colour is hardcoded on any Moonbase surface, either theme", async ({ page }) => {
  for (const dark of [false, true]) {
    await fresh(page, { dark });
    for (const p of PANELS) {
      await page.goto(p.url);
      await page.waitForSelector(p.sel);
      const hard = await page.evaluate(() =>
        [...document.querySelectorAll("[class^='mb-'] *, [class*=' mb-'] *")].filter((e) => {
          const c = getComputedStyle(e).color;
          return c === "rgb(0, 128, 0)" || c === "rgb(255, 0, 0)" || c === "rgb(0, 255, 0)";
        }).length,
      );
      expect(hard, `${p.title} in ${dark ? "dark" : "light"}`).toBe(0);
    }
  }
});
