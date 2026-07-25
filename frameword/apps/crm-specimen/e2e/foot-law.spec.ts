import { test, expect } from "@playwright/test";
import { fresh } from "./helpers";

/**
 * THE FOOT LAW, measured correctly at last.
 *
 * The operator reported a two line footer four times. Three times a test said
 * it was fine, because the three obvious assertions are all structurally blind
 * to the actual failure:
 *
 *   .panel-foot height        44.00   (the wrap hides INSIDE a 30px button)
 *   .panel-foot scroll spill  0       (the overrun lives in a DESCENDANT)
 *   children on one centre    true    (the wrap is inside one child)
 *
 * All three pass while the foot paints three text baselines spread 12px and
 * the destructive control sits UNDER the view deck, unclickable.
 *
 * So this file measures the two things that actually see it:
 *   1. TEXT LINE BOXES, via Range.getClientRects(). One rect is one line box.
 *   2. DESCENDANT overflow, walked, not just the foot's own scroll box.
 * Plus a hit test on every foot control, because a control that is painted over
 * is not a control.
 */

const ROUTES = [
  "#/data", "#/analytics/c-crypto", "#/analytics/blotter", "#/console/keys",
  "#/studio/terminal", "#/moonbase/scorecard", "#/crm/acme", "#/tasks",
];
const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];

async function footState(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const foot = [...document.querySelectorAll(".panel-foot")].pop();
    if (!foot) return null;
    const wrapped: string[] = [];
    const spilling: string[] = [];
    const buried: string[] = [];

    // 1. A wrap is a text node painted at TWO VERTICAL POSITIONS. Counting the
    //    rects themselves is wrong: a text node starting with a space gets its
    //    own rect for that space, on the same line, so "6 rows" reports two
    //    rects and no wrap. Count distinct rounded tops instead.
    const walk = document.createTreeWalker(foot, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent?.trim()) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      const tops = new Set([...r.getClientRects()].map((x) => Math.round(x.top)));
      if (tops.size > 1)
        wrapped.push(`"${n.textContent.trim().slice(0, 28)}" in ${(n.parentElement as HTMLElement)?.className} across ${tops.size} lines`);
    }

    // 2. The overflow may live in a child while the foot's own box reads zero.
    //    An element that ellipsises is EXEMPT: shortening a note under pressure
    //    is the ladder working, and it necessarily leaves scrollWidth wider.
    for (const el of [foot, ...foot.querySelectorAll("*")]) {
      const e = el as HTMLElement;
      const cs = getComputedStyle(e);
      if (cs.textOverflow === "ellipsis" && cs.overflow !== "visible") continue;
      if (cs.overflowX === "auto" || cs.overflowX === "scroll") continue; // the deck yields by scrolling
      const over = e.scrollWidth - e.clientWidth;
      if (over > 1) spilling.push(`${e.className || e.tagName} over by ${over}px`);
    }

    // 3. a control painted under a neighbour is not a control
    for (const b of foot.querySelectorAll("button")) {
      const r = b.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (hit && !b.contains(hit) && hit !== b)
        buried.push(`${b.textContent?.trim().slice(0, 20)} is under ${(hit as HTMLElement).className || hit.tagName}`);
    }
    return { h: Math.round(foot.getBoundingClientRect().height), wrapped, spilling, buried };
  });
}

test("no foot label ever wraps, at any width, on any surface", async ({ page }) => {
  await fresh(page);
  const bad: string[] = [];
  for (const url of ROUTES) {
    await page.goto(url);
    await page.waitForSelector(".panel-foot");
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(140);
      const s = await footState(page);
      if (!s) continue;
      if (s.h > 46) bad.push(`${url} @${w}: foot is ${s.h}px`);
      for (const x of s.wrapped) bad.push(`${url} @${w}: WRAPPED ${x}`);
    }
  }
  expect(bad, `foot labels wrapped:\n${bad.join("\n")}`).toEqual([]);
});

test("nothing inside the foot overruns its box, and no control is buried", async ({ page }) => {
  await fresh(page);
  const bad: string[] = [];
  for (const url of ROUTES) {
    await page.goto(url);
    await page.waitForSelector(".panel-foot");
    for (const w of WIDTHS) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.waitForTimeout(140);
      const s = await footState(page);
      if (!s) continue;
      for (const x of s.spilling) bad.push(`${url} @${w}: SPILL ${x}`);
      for (const x of s.buried) bad.push(`${url} @${w}: BURIED ${x}`);
    }
  }
  expect(bad, `foot overruns and buried controls:\n${bad.join("\n")}`).toEqual([]);
});

test("the responsive ladder's rungs target classes the foot actually renders", async ({ page }) => {
  await fresh(page);
  await page.goto("#/data");
  await page.waitForSelector(".panel-foot");
  await page.setViewportSize({ width: 460, height: 900 });
  await page.waitForTimeout(200);
  // .lbl is the rung the ladder sheds at 470px. A rung aimed at a class nobody
  // emits is a ladder with a missing step, and it silently never fires.
  const n = await page.evaluate(
    () => [...document.querySelectorAll(".panel-foot")].pop()!.querySelectorAll(".foot-actions .lbl").length,
  );
  expect(n, "the foot emits no .lbl, so the shed rung at 470px cannot fire").toBeGreaterThan(0);
});
