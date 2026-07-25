import { test } from "@playwright/test";
import { fresh } from "./helpers";
import { writeFileSync } from "node:fs";

/** TEMPORARY audit spec — L-FOOT / L-BAR under interactive STATES. */

const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];
const OUT: any[] = [];
const SCRATCH = "/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad";

async function measure(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const cluster = (cs: number[], tol = 8) => {
      const s = [...cs].sort((a, b) => a - b);
      const lines: number[][] = [];
      for (const c of s) {
        const last = lines[lines.length - 1];
        if (last && c - last[last.length - 1] <= tol) last.push(c); else lines.push([c]);
      }
      return lines.length;
    };
    const vis = (e: Element) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
    };
    const rr = (e: Element) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left * 10) / 10, r: Math.round(r.right * 10) / 10, h: Math.round(r.height * 10) / 10, cy: Math.round((r.top + r.height / 2) * 10) / 10 }; };
    return [...document.querySelectorAll(".panel")].map((p) => {
      const bar = p.querySelector(":scope > .panel-bar") as HTMLElement | null;
      const foot = p.querySelector(":scope > .panel-foot") as HTMLElement | null;
      const glyph = p.querySelector(":scope > .panel-bar .bar-glyph") as HTMLElement | null;
      const o: any = { type: glyph?.getAttribute("title") ?? null, ref: p.classList.contains("ref"), panelW: Math.round(p.getBoundingClientRect().width) };
      if (foot) {
        const fr = foot.getBoundingClientRect();
        const kids = [...foot.children].filter(vis).filter((c) => !c.classList.contains("panel-pop") && !c.classList.contains("pop-bg"));
        o.foot = {
          h: Math.round(fr.height * 10) / 10,
          lines: cluster(kids.map((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; })),
          spill: Math.round((foot.scrollWidth - foot.clientWidth) * 10) / 10,
          kids: kids.map((c) => ({ cls: c.className || c.tagName, ...rr(c) })),
        };
      }
      if (bar) {
        const br = bar.getBoundingClientRect();
        const all = [...bar.children].filter(vis);
        const kids = all.filter((c) => !(c as HTMLElement).style.flex?.startsWith("1"));
        const overlaps: any[] = [];
        for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
          const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
          const ov = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          if (ov > 1) overlaps.push({ a: kids[i].className, b: kids[j].className, ov: Math.round(ov * 10) / 10 });
        }
        const t = bar.querySelector(".bar-title") as HTMLElement | null;
        o.bar = {
          h: Math.round(br.height * 10) / 10,
          lines: cluster(all.map((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; })),
          spill: Math.round((bar.scrollWidth - bar.clientWidth) * 10) / 10,
          overlaps,
          clipped: kids.filter((c) => { const r = c.getBoundingClientRect(); return r.right > br.right + 0.5 || r.left < br.left - 0.5; }).map((c) => ({ cls: c.className, ...rr(c), barR: Math.round(br.right * 10) / 10 })),
          kids: kids.map((c) => ({ cls: c.className || c.tagName, ...rr(c) })),
          title: t ? { text: t.textContent?.slice(0, 30), trunc: t.scrollWidth > t.clientWidth + 1, sw: t.scrollWidth, cw: t.clientWidth, ...rr(t) } : null,
        };
      }
      return o;
    });
  });
}

async function sweep(page: import("@playwright/test").Page, state: string, theme: string, prep?: (p: any) => Promise<void>) {
  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(300);
    if (prep) { try { await prep(page); } catch { /* control absent at this width */ } await page.waitForTimeout(220); }
    OUT.push({ state, theme, w, panels: await measure(page) });
  }
}

for (const dark of [false, true]) {
  const th = dark ? "dark" : "light";

  for (const route of ["#/studio", "#/studio/terminal", "#/studio/chat", "#/studio/prompt", "#/studio/realtime", "#/studio/images", "#/studio/hub"]) {
  test(`foot search open ${route} (${th})`, async ({ page }) => {
    await fresh(page, { dark });
    {
      await page.goto(route);
      await page.waitForSelector(".panel-foot");
      await page.waitForTimeout(300);
      await sweep(page, "search-open " + route, th, async (p) => {
        const btns = p.locator(".panel .panel-foot button[title='Search this panel']");
        const n = await btns.count();
        for (let i = 0; i < n; i++) await btns.nth(i).click({ timeout: 1500 });
      });
    }
  });
  }

  test(`panel-settings popover open (${th})`, async ({ page }) => {
    await fresh(page, { dark });
    for (const route of ["#/studio", "#/studio/prompt", "#/studio/images", "#/studio/hub"]) {
      await page.goto(route);
      await page.waitForSelector(".panel-foot");
      await page.waitForTimeout(300);
      await sweep(page, "gear-open " + route, th, async (p) => {
        const g = p.locator(".panel").last().locator(".panel-foot .foot-gear[title='Panel settings']");
        if (await g.count()) await g.first().click({ timeout: 1500 });
      });
    }
  });

  test(`pinned reference rail (${th})`, async ({ page }) => {
    await fresh(page, { dark });
    await page.goto("#/studio/prompt");
    await page.waitForSelector(".panel-foot");
    await page.waitForTimeout(300);
    await page.locator(".panel").last().locator(".pin-btn").click();
    await page.waitForTimeout(400);
    await page.goto("#/studio/images");
    await page.waitForTimeout(400);
    await sweep(page, "pinned-ref", th);
  });

  test(`hub -> open in studio (3 panels) + long composer text (${th})`, async ({ page }) => {
    await fresh(page, { dark });
    await page.goto("#/studio/hub");
    await page.waitForSelector(".panel-foot");
    await page.waitForTimeout(300);
    const open = page.locator(".panel").last().locator("button", { hasText: /Open in Studio/i }).first();
    if (await open.count()) { await open.click(); await page.waitForTimeout(500); }
    await sweep(page, "hub-open-in-studio", th, async (p) => {
      const inp = p.locator(".panel .panel-foot input.foot-search").last();
      if (await inp.count()) await inp.fill("A deliberately very long prompt typed into the studio composer to prove the foot never folds onto a second line at any width whatsoever");
    });
  });

  test(`terminal after output + realtime chip filled (${th})`, async ({ page }) => {
    await fresh(page, { dark });
    await page.goto("#/studio/terminal");
    await page.waitForSelector(".panel-foot");
    await page.waitForTimeout(300);
    await sweep(page, "terminal-typed", th, async (p) => {
      const inp = p.locator(".panel .panel-foot input[name='tcmd']").last();
      if (await inp.count()) await inp.fill("status --with-a-very-long-argument-string-to-stress-the-foot");
    });
    await page.goto("#/studio/realtime");
    await page.waitForTimeout(400);
    await sweep(page, "realtime-chip", th, async (p) => {
      const chip = p.locator(".panel").last().locator(".rt-chip, .chip, button").filter({ hasText: /.{6,}/ }).first();
      if (await chip.count()) await chip.click({ timeout: 1200 }).catch(() => {});
    });
  });
}

test.afterEach(async ({}, info) => {
  const name = info.title.replace(/[^a-z0-9]+/gi, "-");
  writeFileSync(SCRATCH + "/st-" + name + ".json", JSON.stringify(OUT, null, 1));
  OUT.length = 0;
});
