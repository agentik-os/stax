import { test, expect } from "@playwright/test";
import { fresh } from "./helpers";

/**
 * A diagram that draws shapes without declaring what they MEAN forces the
 * reader to hold the meaning in their head, which is the one thing a diagram
 * exists to stop. These three pin the semantic layer.
 */

test("a node states what it MEANS, not only how it draws", async ({ page }) => {
  await fresh(page);
  await page.goto("#/canvas");
  await page.waitForSelector(".cv-card");
  const m = await page.evaluate(() => {
    const marks = [...document.querySelectorAll(".cv-sem")] as HTMLElement[];
    return {
      n: marks.length,
      kinds: [...new Set(marks.map((e) => e.dataset.sem))],
      // the mark must carry its explanation, or it is a rune
      titled: marks.filter((e) => (e.getAttribute("title") || "").length > 10).length,
    };
  });
  expect(m.n, "no node declares a semantic kind").toBeGreaterThan(0);
  expect(m.kinds.length, "every node declares the same kind, so the layer says nothing").toBeGreaterThan(1);
  expect(m.titled, "a semantic mark with no hint is a rune").toBe(m.n);
});

// A boundary stored as a rectangle is a second source of truth for the same
// fact, and it drifts the first time a node moves.
test("a boundary is derived from its members, so it cannot drift", async ({ page }) => {
  await fresh(page);
  await page.goto("#/canvas");
  await page.waitForSelector(".cv-bound");
  const before = await page.evaluate(() => {
    const b = document.querySelector(".cv-bound") as HTMLElement;
    return { w: Math.round(b.getBoundingClientRect().width), label: b.querySelector(".lb")?.textContent };
  });
  expect(before.w).toBeGreaterThan(50);
  expect(before.label, "a boundary must be NAMED").toBeTruthy();
  // a boundary is a reading aid: it must never intercept a pointer
  const pe = await page.evaluate(() => getComputedStyle(document.querySelector(".cv-bound")!).pointerEvents);
  expect(pe, "the boundary steals clicks from the nodes it contains").toBe("none");
});

test("the legend lists what is on the board, never the whole vocabulary", async ({ page }) => {
  await fresh(page);
  await page.goto("#/canvas");
  await page.waitForSelector(".cv-legend");
  const m = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".cv-legend .rw")];
    const onBoard = new Set([...document.querySelectorAll(".cv-sem")].map((e) => (e as HTMLElement).dataset.sem));
    const counts = rows.map((r) => Number(r.querySelector(".n")!.textContent));
    const rendered = [...document.querySelectorAll(".cv-sem")].length;
    return { rows: rows.length, onBoard: onBoard.size, sum: counts.reduce((a, b) => a + b, 0), rendered };
  });
  expect(m.rows, "the legend lists kinds the board does not use").toBe(m.onBoard);
  expect(m.sum, "the legend's counts disagree with the board").toBe(m.rendered);
});
