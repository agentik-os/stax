import { test, expect } from "@playwright/test";
import * as fs from "node:fs";

const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];
const ROUTES = ["#/analytics", "#/analytics/blotter", "#/analytics/treasury", "#/analytics/cfo", "#/analytics/c-crypto"];
const OUT = "/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad";

const MEASURE = () => {
  const vis = (el: Element) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  const flow = (el: Element) => {
    const cs = getComputedStyle(el);
    return cs.position !== "absolute" && cs.position !== "fixed";
  };
  return [...document.querySelectorAll(".stage .panel, .push-stage .panel")].map((panel, pi) => {
    const foot = panel.querySelector(":scope > .panel-foot") as HTMLElement | null;
    const bar = panel.querySelector(":scope > .panel-bar") as HTMLElement | null;
    let f: any = null;
    if (foot && vis(foot)) {
      const fr = foot.getBoundingClientRect();
      const kids = [...foot.children].filter((e) => vis(e) && flow(e));
      const items = kids.map((e) => {
        const r = e.getBoundingClientRect();
        return { cls: (e.className || "").toString().slice(0, 30), centre: +(r.top + r.height / 2).toFixed(2), h: +r.height.toFixed(2), l: +r.left.toFixed(1), r: +r.right.toFixed(1) };
      });
      const sorted = [...items].sort((a, b) => a.centre - b.centre);
      const lines: any[][] = [];
      for (const it of sorted) { const last = lines[lines.length - 1]; if (last && Math.abs(it.centre - last[0].centre) <= 10) last.push(it); else lines.push([it]); }
      f = { h: +fr.height.toFixed(2), spill: foot.scrollWidth - foot.clientWidth, lines: lines.length, items,
            over: items.filter((i) => i.r > fr.right + 1 || i.l < fr.left - 1).map((i) => i.cls) };
    }
    let b: any = null;
    if (bar && vis(bar)) {
      const br = bar.getBoundingClientRect();
      const boxes = [...bar.children].filter((e) => vis(e) && flow(e)).map((e) => {
        const r = e.getBoundingClientRect();
        return { cls: (e.className || "").toString().slice(0, 30), l: +r.left.toFixed(1), r: +r.right.toFixed(1), t: +r.top.toFixed(1), bo: +r.bottom.toFixed(1) };
      });
      const ov: string[] = [];
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], c = boxes[j];
        if (Math.min(a.r, c.r) - Math.max(a.l, c.l) > 0.5 && Math.min(a.bo, c.bo) - Math.max(a.t, c.t) > 0.5) ov.push(`${a.cls}|${c.cls}`);
      }
      b = { h: +br.height.toFixed(2), spill: bar.scrollWidth - bar.clientWidth, ov };
    }
    return { pi, label: panel.getAttribute("aria-label"), foot: f, bar: b };
  });
};

for (const theme of ["light", "dark"] as const) {
  test(`analytics foot states — ${theme}`, async ({ browser }) => {
    test.setTimeout(900_000);
    const page = await browser.newPage({ colorScheme: theme, viewport: { width: 1512, height: 900 } });
    await page.addInitScript((dark) => {
      try { localStorage.clear(); } catch { /* first load */ }
      if (dark) document.documentElement.setAttribute("data-theme", "dark");
    }, theme === "dark");
    const report: any[] = [];
    for (const route of ROUTES) {
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto("/" + route, { waitUntil: "load" });
        await page.waitForSelector(".panel-bar", { state: "attached", timeout: 15_000 });
        await page.waitForTimeout(400);
        // open every panel's foot search, then measure
        const opened = await page.evaluate(() => {
          let n = 0;
          for (const g of document.querySelectorAll('.panel-foot > .foot-gear[title="Search this panel"]')) { (g as HTMLElement).click(); n++; }
          return n;
        });
        await page.waitForTimeout(350);
        report.push({ route, w, theme, state: "search-open", opened, panels: await page.evaluate(MEASURE) });
        // and with the panel-settings popover open
        await page.evaluate(() => {
          for (const g of document.querySelectorAll('.panel-foot > .foot-gear[title="Panel settings"]')) { (g as HTMLElement).click(); }
        });
        await page.waitForTimeout(350);
        report.push({ route, w, theme, state: "gear-open", panels: await page.evaluate(MEASURE) });
      }
    }
    fs.writeFileSync(`${OUT}/states-${theme}.json`, JSON.stringify(report));
    await page.close();
    expect(report.length).toBe(ROUTES.length * WIDTHS.length * 2);
  });
}
