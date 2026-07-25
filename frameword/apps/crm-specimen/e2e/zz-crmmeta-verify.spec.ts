import { test } from "@playwright/test";
import { fresh } from "./helpers";
import * as fs from "fs";

const OUT = "/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad/crmmeta-verify.json";
const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];
const THEMES: ("light" | "dark")[] = ["light", "dark"];
const ROUTES = ["#/crm", "#/crm/acme/jo", "#/crm/acme/jo/refonte/call1", "#/blocks/data/kanban", "#/laws/law-1", "#/canvas", "#/prompts"];

/** hit-test: is every bar/foot control the topmost element at its own centre? */
const HIT = () => {
  const out: any[] = [];
  for (const p of Array.from(document.querySelectorAll(".panel"))) {
    for (const zone of ["panel-bar", "panel-foot"]) {
      const z = p.querySelector(":scope > ." + zone) as HTMLElement | null;
      if (!z) continue;
      for (const c of Array.from(z.querySelectorAll("button, input, .bar-title, .bar-meta, .foot-note, .eyebrow, .badge-ref"))) {
        const r = c.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) continue;
        if (r.left < 0 || r.right > innerWidth || r.top < 0 || r.bottom > innerHeight) { out.push({ panel: p.getAttribute("aria-label"), zone, el: (c as HTMLElement).className, verdict: "offscreen", r: { l: r.left, r: r.right, t: r.top, b: r.bottom } }); continue; }
        const hit = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
        const ok = !!hit && (hit === c || c.contains(hit) || hit.contains(c));
        if (!ok) out.push({ panel: p.getAttribute("aria-label"), zone, el: (c as HTMLElement).className, txt: (c.textContent || "").trim().slice(0, 20), hit: hit ? hit.tagName + "." + (hit as HTMLElement).className : null });
      }
    }
  }
  return out;
};

test("crm-meta hit-test + reference identity", async ({ browser }) => {
  test.setTimeout(0);
  const bad: any[] = [];
  let checked = 0;
  for (const theme of THEMES) for (const width of WIDTHS) {
    const ctx = await browser.newContext({ colorScheme: theme, viewport: { width, height: 900 } });
    for (const route of ROUTES) {
      const page = await ctx.newPage();
      await fresh(page, { dark: theme === "dark" });
      await page.goto("/" + route);
      await page.waitForSelector(".panel-bar", { timeout: 15000 });
      await page.waitForTimeout(450);
      const misses = await page.evaluate(HIT);
      const n = await page.evaluate(() => document.querySelectorAll(".panel-bar button, .panel-foot button").length);
      checked += n;
      if (misses.length) bad.push({ theme, width, route, misses });
      await page.close();
    }
    await ctx.close();
    console.log("hit", theme, width, "cum controls", checked);
  }

  // reference identity: does the pinned panel state what it points at?
  const ctx = await browser.newContext({ colorScheme: "light", viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await fresh(page);
  await page.goto("/#/crm/acme/jo/refonte/call1");
  await page.waitForSelector(".pin-btn", { timeout: 15000 });
  await page.waitForTimeout(400);
  await page.locator(".panel").last().locator(".pin-btn").click();
  await page.waitForTimeout(300);
  await page.goto("/#/blocks");
  await page.waitForTimeout(800);
  const ref = await page.evaluate(() => {
    const r = document.querySelector(".panel.ref") as HTMLElement | null;
    if (!r) return null;
    return { w: r.getBoundingClientRect().width, barText: (r.querySelector(".panel-bar") as HTMLElement)?.innerText.replace(/\n/g, " ⏎ "), bodyText: (r.querySelector(".panel-body") as HTMLElement)?.innerText.slice(0, 120).replace(/\n/g, " ⏎ "), footText: (r.querySelector(".panel-foot") as HTMLElement)?.innerText };
  });
  await ctx.close();

  fs.writeFileSync(OUT, JSON.stringify({ controlsHitTested: checked, failures: bad, ref }, null, 1));
  console.log("CONTROLS HIT-TESTED", checked, "FAILURES", bad.length);
  console.log("REF", JSON.stringify(ref));
});
