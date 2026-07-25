import { test } from "@playwright/test";
import { fresh } from "./helpers";
import { writeFileSync } from "node:fs";

/** TEMPORARY audit spec — PAINT test: is every bar control and foot child
 *  actually hit-testable at its own centre, or is something covering it? */

const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];
const ROUTES = ["#/studio", "#/studio/terminal", "#/studio/chat", "#/studio/prompt", "#/studio/realtime", "#/studio/images", "#/studio/hub"];
const SCRATCH = "/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad";
const OUT: any[] = [];

for (const dark of [false, true]) {
  test(`paint + document overflow, studio (${dark ? "dark" : "light"})`, async ({ page }) => {
    await fresh(page, { dark });
    for (const route of ROUTES) {
      await page.goto(route);
      await page.waitForSelector(".panel-bar");
      await page.waitForTimeout(320);
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.waitForTimeout(260);
        const r = await page.evaluate(() => {
          const covered: any[] = [];
          const vis = (e: Element) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden"; };
          for (const p of document.querySelectorAll(".panel")) {
            for (const zone of [":scope > .panel-bar", ":scope > .panel-foot"]) {
              const el = p.querySelector(zone) as HTMLElement | null;
              if (!el) continue;
              for (const c of [...el.children].filter(vis)) {
                if ((c as HTMLElement).style.flex?.startsWith("1")) continue;
                const b = c.getBoundingClientRect();
                const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
                if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) continue; // off-stage (rail scrolled away)
                const hit = document.elementFromPoint(cx, cy);
                const ok = !!hit && (c.contains(hit) || c === hit);
                if (!ok) covered.push({ zone, cls: c.className, hit: (hit as HTMLElement)?.className ?? "none", x: Math.round(cx), y: Math.round(cy) });
              }
            }
          }
          return {
            covered,
            docSpill: document.documentElement.scrollWidth - document.documentElement.clientWidth,
            bodySpill: document.body.scrollWidth - document.body.clientWidth,
          };
        });
        OUT.push({ route, theme: dark ? "dark" : "light", w, ...r });
      }
    }
  });
}

test.afterEach(async ({}, info) => {
  writeFileSync(SCRATCH + "/hit-" + info.title.replace(/[^a-z0-9]+/gi, "-") + ".json", JSON.stringify(OUT, null, 1));
  OUT.length = 0;
});
