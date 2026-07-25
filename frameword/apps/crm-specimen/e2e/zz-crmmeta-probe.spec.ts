import { test } from "@playwright/test";
import { fresh } from "./helpers";

test("crmmeta probe", async ({ browser }) => {
  test.setTimeout(120_000);
  for (const w of [1280, 620]) {
    const ctx = await browser.newContext({ colorScheme: "light", viewport: { width: w, height: 900 } });
    const page = await ctx.newPage();
    await fresh(page);
    await page.goto("/#/crm/acme/jo/refonte/call1");
    await page.waitForSelector(".panel", { timeout: 10000 });
    await page.waitForTimeout(900);
    const out = await page.evaluate(() => {
      const panels = [...document.querySelectorAll(".panel")];
      return {
        hash: location.hash,
        panels: panels.map((p) => {
          const bar = p.querySelector(":scope > .panel-bar") as HTMLElement | null;
          const foot = p.querySelector(":scope > .panel-foot") as HTMLElement | null;
          return {
            label: p.getAttribute("aria-label"),
            cls: p.className,
            w: Math.round(p.getBoundingClientRect().width),
            bar: bar ? { h: bar.getBoundingClientRect().height, kids: [...bar.children].map((c) => (c as HTMLElement).className + "|" + (c.textContent || "").slice(0, 24)) } : null,
            foot: foot ? { h: foot.getBoundingClientRect().height, sw: foot.scrollWidth, cw: foot.clientWidth, kids: [...foot.children].map((c) => (c as HTMLElement).className + "|" + (c.textContent || "").slice(0, 24)) } : null,
          };
        }),
      };
    });
    console.log("W=" + w + " " + JSON.stringify(out, null, 1));
    await ctx.close();
  }
});
