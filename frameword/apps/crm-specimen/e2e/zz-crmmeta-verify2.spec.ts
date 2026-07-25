import { test } from "@playwright/test";
import { fresh } from "./helpers";
import * as fs from "fs";

const OUT = "/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad/crmmeta-verify2.json";
const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];
const THEMES: ("light" | "dark")[] = ["light", "dark"];
const ROUTES = ["#/crm", "#/crm/acme/jo", "#/crm/acme/jo/refonte/call1", "#/blocks/data/kanban", "#/laws/law-1", "#/canvas", "#/prompts"];

/** hit-test ONLY the controls actually inside the visible stage viewport:
 *  a Miller stage scrolls, so panels parked off to the left are clipped by
 *  design and their controls legitimately hit the sidebar chrome. */
const HIT = () => {
  const stage = document.querySelector(".stage") as HTMLElement | null;
  const s = stage ? stage.getBoundingClientRect() : { left: 0, right: innerWidth, top: 0, bottom: innerHeight } as DOMRect;
  const res = { inView: 0, misses: [] as any[], stage: { l: s.left, r: s.right } };
  for (const p of Array.from(document.querySelectorAll(".panel"))) {
    for (const zone of ["panel-bar", "panel-foot"]) {
      const z = p.querySelector(":scope > ." + zone) as HTMLElement | null;
      if (!z) continue;
      for (const c of Array.from(z.querySelectorAll("button, input, .bar-title, .bar-meta, .foot-note, .eyebrow, .badge-ref"))) {
        const r = c.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.left < s.left + 0.5 || r.right > s.right - 0.5 || r.top < 0 || r.bottom > innerHeight) continue; // clipped by the scrolling stage
        res.inView++;
        const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        const ok = !!hit && (hit === c || c.contains(hit) || hit.contains(c));
        if (!ok) res.misses.push({ panel: p.getAttribute("aria-label"), zone, el: (c as HTMLElement).className, txt: (c.textContent || "").trim().slice(0, 20), hit: hit ? hit.tagName + "." + (hit as HTMLElement).className : null, r: { l: r.left, r: r.right, t: r.top, b: r.bottom } });
      }
    }
  }
  return res;
};

test("crm-meta in-view hit-test", async ({ browser }) => {
  test.setTimeout(0);
  const bad: any[] = [];
  let inView = 0;
  for (const theme of THEMES) for (const width of WIDTHS) {
    const ctx = await browser.newContext({ colorScheme: theme, viewport: { width, height: 900 } });
    for (const route of ROUTES) {
      const page = await ctx.newPage();
      await fresh(page, { dark: theme === "dark" });
      await page.goto("/" + route);
      await page.waitForSelector(".panel-bar", { timeout: 15000 });
      await page.waitForTimeout(450);
      const r = await page.evaluate(HIT);
      inView += r.inView;
      if (r.misses.length) bad.push({ theme, width, route, stage: r.stage, misses: r.misses });
      await page.close();
    }
    await ctx.close();
  }
  fs.writeFileSync(OUT, JSON.stringify({ inViewControls: inView, failures: bad }, null, 1));
  console.log("IN-VIEW CONTROLS", inView, "FAILURES", bad.length, JSON.stringify(bad).slice(0, 3000));
});
