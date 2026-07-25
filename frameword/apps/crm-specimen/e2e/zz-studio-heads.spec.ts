import { test, type Page } from "@playwright/test";
import { writeFileSync } from "node:fs";

/** TEMPORARY audit spec — L-BAR / L-FOOT across all ten head layouts. */

const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];
const LAYOUTS = ["dense-bar", "echo", "no-subtitle", "bar-title", "focus-only",
  "scroll-collapse", "first-run", "spine", "density", "editorial"];
const ROUTES = ["#/studio/realtime", "#/studio/prompt", "#/studio/hub"];
const SCRATCH = "/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad";
const OUT: any[] = [];

async function boot(page: Page, layout: string, dark: boolean) {
  await page.emulateMedia({ colorScheme: dark ? "dark" : "light" });
  await page.addInitScript(([l, d]) => {
    try {
      localStorage.clear();
      localStorage.setItem("frameword-prefs", JSON.stringify({ headLayout: l }));
      if (d === "1") document.documentElement.setAttribute("data-theme", "dark");
    } catch { /* first load */ }
  }, [layout, dark ? "1" : "0"]);
}

async function measure(page: Page) {
  return page.evaluate(() => {
    const cluster = (cs: number[], tol = 8) => {
      const s = [...cs].sort((a, b) => a - b); const lines: number[][] = [];
      for (const c of s) { const l = lines[lines.length - 1]; if (l && c - l[l.length - 1] <= tol) l.push(c); else lines.push([c]); }
      return lines.length;
    };
    const vis = (e: Element) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden"; };
    const rr = (e: Element) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left * 10) / 10, r: Math.round(r.right * 10) / 10, h: Math.round(r.height * 10) / 10, cy: Math.round((r.top + r.height / 2) * 10) / 10 }; };
    return [...document.querySelectorAll(".panel")].map((p) => {
      const bar = p.querySelector(":scope > .panel-bar") as HTMLElement;
      const foot = p.querySelector(":scope > .panel-foot") as HTMLElement | null;
      const o: any = { ref: p.classList.contains("ref"), panelW: Math.round(p.getBoundingClientRect().width), head: document.body.dataset.head };
      if (foot) {
        const fr = foot.getBoundingClientRect();
        const kids = [...foot.children].filter(vis).filter((c) => !c.classList.contains("panel-pop") && !c.classList.contains("pop-bg"));
        o.foot = { h: Math.round(fr.height * 10) / 10, lines: cluster(kids.map((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; })), spill: Math.round((foot.scrollWidth - foot.clientWidth) * 10) / 10, kids: kids.map((c) => ({ cls: c.className || c.tagName, ...rr(c) })) };
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
        const ident = bar.querySelector(".bar-title, .eyebrow") as HTMLElement | null;
        o.bar = {
          h: Math.round(br.height * 10) / 10,
          lines: cluster(all.map((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; })),
          spill: Math.round((bar.scrollWidth - bar.clientWidth) * 10) / 10,
          overlaps,
          clipped: kids.filter((c) => { const r = c.getBoundingClientRect(); return r.right > br.right + 0.5 || r.left < br.left - 0.5; }).map((c) => ({ cls: c.className, ...rr(c), barR: Math.round(br.right * 10) / 10 })),
          kids: kids.map((c) => ({ cls: c.className || c.tagName, ...rr(c) })),
          ident: ident ? { cls: ident.className, text: ident.textContent?.slice(0, 40), trunc: ident.scrollWidth > ident.clientWidth + 1, sw: ident.scrollWidth, cw: ident.clientWidth, ...rr(ident) } : null,
          named: !!bar.querySelector(".bar-title, .eyebrow") || !!p.querySelector(".panel-title, .panel-spine"),
        };
      }
      return o;
    });
  });
}

for (const dark of [false, true]) {
  for (const layout of LAYOUTS) {
    test(`head ${layout} ${dark ? "dark" : "light"}`, async ({ page }) => {
      await boot(page, layout, dark);
      for (const route of ROUTES) {
        await page.goto(route);
        await page.waitForSelector(".panel-bar");
        await page.waitForTimeout(350);
        for (const w of WIDTHS) {
          await page.setViewportSize({ width: w, height: 900 });
          await page.waitForTimeout(260);
          OUT.push({ layout, theme: dark ? "dark" : "light", route, w, panels: await measure(page) });
        }
      }
    });
  }
}

test.afterEach(async ({}, info) => {
  writeFileSync(SCRATCH + "/hd-" + info.title.replace(/[^a-z0-9]+/gi, "-") + ".json", JSON.stringify(OUT, null, 1));
  OUT.length = 0;
});
