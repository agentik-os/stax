import { test } from "@playwright/test";
import { fresh } from "./helpers";

/** TEMPORARY — explain the realtime foot CTA paint miss, and re-test it enabled. */
test("realtime foot cta: disabled -> pointer-events none; enabled -> hit-testable", async ({ page }) => {
  await fresh(page);
  await page.goto("#/studio/realtime");
  await page.waitForSelector(".panel-foot");
  await page.setViewportSize({ width: 380, height: 900 });
  await page.waitForTimeout(400);
  const before = await page.evaluate(() => {
    const b = [...document.querySelectorAll(".panel-foot .foot-cta")].pop() as HTMLButtonElement;
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) as HTMLElement;
    return { disabled: b.disabled, pe: getComputedStyle(b).pointerEvents, op: getComputedStyle(b).opacity, hit: hit?.className, footH: Math.round((b.closest(".panel-foot") as HTMLElement).getBoundingClientRect().height) };
  });
  // fill the draft so the CTA enables (the realtime creator's textarea/input)
  const field = page.locator(".panel").last().locator("textarea, input").first();
  if (await field.count()) await field.fill("a live voice agent that answers in French");
  await page.waitForTimeout(350);
  const after = await page.evaluate(() => {
    const b = [...document.querySelectorAll(".panel-foot .foot-cta")].pop() as HTMLButtonElement;
    const r = b.getBoundingClientRect();
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) as HTMLElement;
    const foot = b.closest(".panel-foot") as HTMLElement;
    const fr = foot.getBoundingClientRect();
    const kids = [...foot.children].filter((c) => c.getBoundingClientRect().width > 0);
    const centres = new Set(kids.map((c) => { const q = c.getBoundingClientRect(); return Math.round(q.top + q.height / 2); }));
    return { disabled: b.disabled, pe: getComputedStyle(b).pointerEvents, hit: hit?.className, contains: b.contains(hit), footH: Math.round(fr.height), lines: centres.size, spill: Math.round(foot.scrollWidth - foot.clientWidth) };
  });
  console.log("BEFORE", JSON.stringify(before));
  console.log("AFTER ", JSON.stringify(after));
});
