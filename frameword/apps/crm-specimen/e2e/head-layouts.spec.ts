/**
 * THE HEAD-LAYOUT REGISTRY (headLayouts.ts): ten treatments ship, dense-bar is
 * the default, and EVERY one of them must leave the panel identifiable.
 */
import { test, expect, type Page } from "@playwright/test";
import { link, fresh } from "./helpers";

const DEEP = link({ spaceId: "blocks", path: [{ t: "section", k: "sec:blocks" }, { t: "doc", k: "blkcat:data" }] });
const LEAF = link({ spaceId: "blocks", path: [{ t: "section", k: "sec:blocks" }, { t: "doc", k: "blkcat:data" }, { t: "block", k: "blk:pivot" }] });

/** boot with a chosen layout; clears once so reloads keep the app's memory */
async function withLayout(page: Page, layout: string) {
  await page.emulateMedia({ colorScheme: "light" });
  await page.addInitScript((l) => {
    try {
      if (!sessionStorage.getItem("e2e-boot")) {
        localStorage.clear();
        localStorage.setItem("frameword-prefs", JSON.stringify({ headLayout: l }));
        sessionStorage.setItem("e2e-boot", "1");
      }
    } catch { /* first load */ }
  }, layout);
}

const LAYOUTS = ["dense-bar", "echo", "no-subtitle", "bar-title", "focus-only",
  "scroll-collapse", "first-run", "spine", "density", "editorial"];

for (const layout of LAYOUTS) {
  test(`${layout}: the panel always states its identity, and never scrolls the document`, async ({ page }) => {
    await withLayout(page, layout);
    await page.goto(LEAF);
    await page.waitForSelector(".panel");
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const p = [...document.querySelectorAll(".panel")].pop()!;
      return {
        named: !!p.querySelector(".bar-title, .panel-title, .panel-spine, .eyebrow"),
        overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(r.named).toBe(true);
    expect(r.overflowX).toBeLessThanOrEqual(0);
  });
}

test("the DEFAULT is dense-bar: bar carries the title, the body head is gone", async ({ page }) => {
  await fresh(page);
  await page.goto(DEEP);
  await page.waitForSelector(".panel");
  await page.waitForTimeout(400);
  const leaf = page.locator(".panel").last();
  await expect(leaf.locator(".bar-title")).toHaveText("Data");
  await expect(leaf.locator(".panel-title")).toHaveCount(0);
  await expect(leaf.locator(".panel-sub")).toHaveCount(0);
  // and the reclaim is real: chrome under 20% of the panel
  const pct = await leaf.evaluate((p) => {
    const bar = p.querySelector(".panel-bar")!.getBoundingClientRect().height;
    const foot = p.querySelector(".panel-foot")?.getBoundingClientRect().height ?? 0;
    return ((bar + foot) / p.getBoundingClientRect().height) * 100;
  });
  expect(pct).toBeLessThan(20);
});

test("dense-bar carries LIVE numbers derived from the content", async ({ page }) => {
  await fresh(page);
  await page.goto(DEEP);
  await page.waitForSelector(".bar-meta");
  await expect(page.locator(".panel").last().locator(".bar-meta")).toContainText(/item|row/);
});

test("scroll-collapse folds the head into the bar once you scroll", async ({ page }) => {
  await withLayout(page, "scroll-collapse");
  await page.goto(DEEP);
  await page.waitForSelector(".panel");
  await page.waitForTimeout(400);
  const leaf = page.locator(".panel").last();
  await expect(leaf.locator(".panel-title")).toHaveCount(1);
  await leaf.locator(".panel-body").evaluate((el) => el.scrollTo({ top: 220 }));
  await page.waitForTimeout(350);
  await expect(leaf.locator(".panel-title")).toHaveCount(0);
  await expect(leaf.locator(".bar-title")).toHaveText("Data");
});

test("focus-only: the blurred panel folds, the focused one keeps its head", async ({ page }) => {
  await withLayout(page, "focus-only");
  await page.goto(DEEP);
  await page.waitForSelector(".panel");
  await page.waitForTimeout(400);
  const leaf = page.locator(".panel").last();
  await expect(leaf.locator(".panel-title")).toHaveCount(1);
  await page.locator(".panel").first().locator(".panel-bar").click();
  await page.waitForTimeout(350);
  await expect(leaf.locator(".panel-title")).toHaveCount(0);
  await expect(leaf.locator(".bar-title")).toHaveCount(1);
});

test("echo law: a root keeps its editorial head, a drill drops it", async ({ page }) => {
  await withLayout(page, "echo");
  await page.goto("/");
  await page.waitForSelector(".panel");
  await page.waitForTimeout(500);
  await expect(page.locator(".panel").first().locator(".panel-title")).toHaveCount(1);
  await page.goto(DEEP);
  await page.waitForSelector(".panel");
  await page.waitForTimeout(500);
  await expect(page.locator(".panel").last().locator(".panel-title")).toHaveCount(0);
});

test("first-run teaches once, then folds on the next visit", async ({ page }) => {
  await withLayout(page, "first-run");
  await page.goto(DEEP);
  await page.waitForSelector(".panel");
  await page.waitForTimeout(500);
  await expect(page.locator(".panel").last().locator(".panel-title")).toHaveCount(1);
  await page.reload();
  await page.waitForSelector(".panel");
  await page.waitForTimeout(500);
  await expect(page.locator(".panel").last().locator(".panel-title")).toHaveCount(0);
  await expect(page.locator(".panel").last().locator(".bar-title")).toHaveCount(1);
});

test("spine: the rail names the panel and the body clears it", async ({ page }) => {
  await withLayout(page, "spine");
  await page.goto(DEEP);
  await page.waitForSelector(".panel-spine");
  const leaf = page.locator(".panel").last();
  await expect(leaf.locator(".panel-spine")).toHaveText("Data");
  const clears = await leaf.evaluate((p) => {
    const rail = p.querySelector(".panel-spine")!.getBoundingClientRect();
    const row = p.querySelector(".panel-body .drill")?.getBoundingClientRect();
    return row ? row.left >= rail.right : true;
  });
  expect(clears).toBe(true);
});

test("a data table's bar title renames the collection in place", async ({ page }) => {
  await fresh(page);
  await page.goto(link({ spaceId: "data", path: [{ t: "datahome", k: "sys:data" }] }));
  await page.waitForSelector(".panel");
  await page.waitForTimeout(400);
  await page.locator(".drill").first().click();
  await page.waitForSelector(".dt-toolbar");
  const leaf = page.locator(".panel").last();
  await expect(leaf.locator(".bar-title.editable")).toHaveCount(1);
  await leaf.locator(".bar-title").dblclick();
  const input = leaf.locator(".bar-title-edit");
  await expect(input).toHaveCount(1);
  await input.fill("Clients EU");
  await input.press("Enter");
  await expect(leaf.locator(".bar-title")).toHaveText("Clients EU");
  // the rename reached the store: the parent row shows it too
  await expect(page.locator(".panel").first().locator(".drill", { hasText: "Clients EU" })).toHaveCount(1);
});

/* ── the three defects the design panel found in the shipped default ──────
   Each was reproduced at runtime before being fixed; these guard the fix. */

test("ABSORPTION: with the head gone, no panel paints a second hairline under its bar", async ({ page }) => {
  await fresh(page);
  const VIEWS = [
    link({ spaceId: "glossary", path: [{ t: "section", k: "sec:glossary" }, { t: "doc", k: "gl:mechanic" }] }),
    link({ spaceId: "model", path: [{ t: "section", k: "sec:model" }] }),
    link({ spaceId: "architecture", path: [{ t: "section", k: "sec:architecture" }] }),
    link({ spaceId: "crm", path: [{ t: "space", k: "space:crm" }, { t: "account", k: "acc:acme" }] }),
  ];
  for (const v of VIEWS) {
    await page.goto(v);
    await page.waitForSelector(".panel");
    await page.waitForTimeout(350);
    const doubled = await page.evaluate(() => [...document.querySelectorAll(".panel")].filter((p) => {
      const body = p.querySelector(".panel-body");
      const first = body && [...body.children].find((c) => c.getBoundingClientRect().height > 0);
      if (!first) return false;
      const cs = getComputedStyle(first);
      return parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== "none"
        && cs.borderTopColor !== "rgba(0, 0, 0, 0)";
    }).length);
    expect(doubled).toBe(0);
  }
});

test("RR-7 in the bar is keyed on the PANEL: an S panel folds its numbers, never its title", async ({ page }) => {
  await fresh(page);
  await page.setViewportSize({ width: 1500, height: 850 });
  await page.goto(link({ spaceId: "overview", path: [{ t: "section", k: "sec:overview" }] }));
  await page.waitForSelector(".bar-title");
  await page.waitForTimeout(400);
  const r = await page.evaluate(async () => {
    const p = document.querySelector(".panel") as HTMLElement;
    p.style.width = "380px"; p.style.flex = "0 0 380px";
    await new Promise((res) => setTimeout(res, 250));
    const t = p.querySelector(".bar-title") as HTMLElement;
    return { clipped: t.scrollWidth > t.clientWidth + 1,
      metaWidth: p.querySelector(".bar-meta")?.getBoundingClientRect().width ?? 0 };
  });
  expect(r.metaWidth).toBe(0);   // the numbers fold first
  expect(r.clipped).toBe(false); // the title never truncates
});

test("RANK: a root's bar title is visibly senior to a drilled panel's", async ({ page }) => {
  await fresh(page);
  await page.goto(link({ spaceId: "crm", path: [{ t: "space", k: "space:crm" }, { t: "account", k: "acc:acme" }] }));
  await page.waitForSelector(".bar-title");
  await page.waitForTimeout(400);
  // Assert the LAW, not the mechanism. Rank used to be carried by swapping the
  // root to a serif; the titles are mono now, and rank is carried by size,
  // weight, tracking and case instead. A test that pins the mechanism fails on
  // a legitimate design change and says nothing about whether rank survived.
  const t = await page.evaluate(() => [...document.querySelectorAll(".panel .bar-title")].map((el) => {
    const cs = getComputedStyle(el);
    return {
      size: parseFloat(cs.fontSize),
      weight: parseInt(cs.fontWeight, 10),
      track: parseFloat(cs.letterSpacing) || 0,
      upper: cs.textTransform === "uppercase",
      family: cs.fontFamily.split(",")[0].replace(/"/g, ""),
    };
  }));
  expect(t.length).toBeGreaterThan(1);
  const [root, drill] = t;
  const signals = [
    root.size > drill.size,
    root.weight > drill.weight,
    root.track > drill.track,
    root.upper !== drill.upper,
    root.family !== drill.family,
  ].filter(Boolean).length;
  // one signal is an accident, two is a decision: rank must be legible without
  // the reader comparing the two panels side by side
  expect(signals, `root and drill differ on only ${signals} of five rank signals`).toBeGreaterThanOrEqual(2);
  expect(root.size).toBeGreaterThanOrEqual(drill.size);
});
