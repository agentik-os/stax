import { test, expect } from "@playwright/test";
import { fresh } from "./helpers";

const at = (type: string, key: string) =>
  `/#/pf-analytics/section~sec:pf-analytics/${type}~${key}`;

test("the blotter is a fill stream, not a grid: stream, venue split, cost block", async ({ page }) => {
  await fresh(page);
  await page.goto(at("anblotter", "an:blotter"));
  await page.waitForSelector(".an-fill");
  expect(await page.locator(".an-fill").count()).toBeGreaterThan(4);
  expect(await page.locator(".an-venue").count()).toBeGreaterThan(2);
  // no .dt table anywhere: this surface is a panel, not a datatable
  expect(await page.locator(".panel").last().locator(".dt").count()).toBe(0);
});

test("money columns reserve their width: no clipped figure, nothing past the panel edge", async ({ page }) => {
  await fresh(page);
  await page.goto(at("anblotter", "an:blotter"));
  await page.waitForSelector(".an-venue");
  const bad = await page.evaluate(() => {
    const p = document.querySelectorAll(".panel");
    const box = p[p.length - 1].getBoundingClientRect();
    return [...document.querySelectorAll(".an-venue .v, .an-fill .nt, .an-fill .pl")]
      .filter((e) => e.scrollWidth > e.clientWidth + 1 || e.getBoundingClientRect().right > box.right)
      .map((e) => e.textContent);
  });
  expect(bad).toEqual([]);
});

// THE law of a finance view: a cost under plan is FAVOURABLE even though the
// delta is negative. Colouring from the raw sign gets this backwards.
test("the sign inverts on cost lines: under-plan opex reads favourable", async ({ page }) => {
  await fresh(page);
  await page.goto(at("ancfo", "an:cfo"));
  await page.waitForSelector(".an-pl");
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll(".an-pl")].map((r) => ({
      name: r.querySelector(".nm")?.textContent ?? "",
      delta: r.querySelector(".dv")?.textContent ?? "",
      good: !r.querySelector(".dv")?.classList.contains("bad"),
      cost: r.classList.contains("cost"),
    })),
  );
  const under = rows.find((r) => r.cost && r.delta.startsWith("-"));
  const over = rows.find((r) => r.cost && r.delta.startsWith("+"));
  expect(under, "a cost line under plan must exist in the fixture").toBeTruthy();
  expect(under!.good, `${under!.name} came in under plan: favourable`).toBe(true);
  expect(over!.good, `${over!.name} came in over plan: unfavourable`).toBe(false);
  // and a revenue line over plan is the mirror case
  const rev = rows.find((r) => r.name === "Revenue")!;
  expect(rev.good).toBe(rev.delta.startsWith("+"));
});

// the plan ghost is half of a plan-vs-actual: it must survive a dark canvas
test("the plan ghost is outlined, so the comparison survives dark", async ({ page }) => {
  await fresh(page, { dark: true });
  await page.goto(at("ancfo", "an:cfo"));
  await page.waitForSelector(".an-pl .bar > .plan");
  const shadow = await page.evaluate(
    () => getComputedStyle(document.querySelector(".an-pl .bar > .plan")!).boxShadow,
  );
  expect(shadow).not.toBe("none");
});

// the whole point of a finance demo: two panels agreeing on one derived number
test("the panels reconcile: the CFO runway is the treasury cash over the burn", async ({ page }) => {
  await fresh(page);
  await page.goto(at("antreasury", "an:treasury"));
  await page.waitForSelector(".an-acct");
  const cash = await page.evaluate(() => {
    const f = [...document.querySelectorAll(".panel-foot")].pop()!;
    return f.querySelector(".foot-note")!.textContent!.match(/\$([\d,]+)/)![1];
  });
  await page.goto(at("ancfo", "an:cfo"));
  await page.waitForSelector(".an-pl");
  const cfo = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".anat-row")].map((r) => r.textContent ?? "");
    const closing = rows.find((t) => t.includes("Closing cash"))!.match(/\$([\d,]+)/)![1];
    const burn = rows.find((t) => t.includes("Average burn"))!.match(/\$([\d,]+)/)![1];
    const runway = rows.find((t) => t.startsWith("Runway"))!.match(/([\d.]+) months/)![1];
    return { closing, burn, runway };
  });
  expect(cfo.closing, "the CFO's closing cash IS the treasury's ledger").toBe(cash);
  const n = (s: string) => Number(s.replace(/,/g, ""));
  expect(n(cfo.closing) / n(cfo.burn)).toBeCloseTo(Number(cfo.runway), 1);
});

test("no state colour is hardcoded on any analytics surface, either theme", async ({ page }) => {
  for (const theme of ["light", "dark"] as const) {
    await fresh(page, { dark: theme === "dark" });
    for (const [t, k] of [["anblotter", "an:blotter"], ["antreasury", "an:treasury"], ["ancfo", "an:cfo"]]) {
      await page.goto(at(t, k));
      await page.waitForSelector(".stats");
      const hard = await page.evaluate(() =>
        [...document.querySelectorAll("[class^='an-'] *, [class*=' an-'] *")].filter((e) => {
          const c = getComputedStyle(e).color;
          return c === "rgb(0, 128, 0)" || c === "rgb(255, 0, 0)" || c === "rgb(0, 255, 0)";
        }).length,
      );
      expect(hard, `${t} in ${theme}`).toBe(0);
    }
  }
});
