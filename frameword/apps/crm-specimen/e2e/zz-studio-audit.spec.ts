import { test } from "@playwright/test";
import { fresh } from "./helpers";
import { writeFileSync, mkdirSync } from "node:fs";

/** TEMPORARY audit spec — measures L-FOOT and L-BAR across the studio space. */

const ROUTES = [
  "#/studio",
  "#/studio/terminal",
  "#/studio/chat",
  "#/studio/prompt",
  "#/studio/realtime",
  "#/studio/images",
  "#/studio/hub",
];
const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];

const OUT: any[] = [];

async function measure(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    // cluster a list of centres into lines with a tolerance: children on the
    // SAME line have different heights, so their tops (and even their centres,
    // by a pixel or two of rounding) differ.
    const cluster = (cs: number[], tol = 8) => {
      const s = [...cs].sort((a, b) => a - b);
      const lines: number[][] = [];
      for (const c of s) {
        const last = lines[lines.length - 1];
        if (last && c - last[last.length - 1] <= tol) last.push(c);
        else lines.push([c]);
      }
      return lines.length;
    };
    const vis = (e: Element) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && cs.display !== "none" && cs.visibility !== "hidden";
    };
    const rect = (e: Element) => {
      const r = e.getBoundingClientRect();
      return { x: Math.round(r.left * 10) / 10, r: Math.round(r.right * 10) / 10, y: Math.round(r.top * 10) / 10, b: Math.round(r.bottom * 10) / 10, w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 };
    };

    const panels = [...document.querySelectorAll(".panel")];
    return panels.map((p) => {
      const bar = p.querySelector(":scope > .panel-bar") as HTMLElement | null;
      const foot = p.querySelector(":scope > .panel-foot") as HTMLElement | null;
      const glyph = p.querySelector(":scope > .panel-bar .bar-glyph") as HTMLElement | null;
      const out: any = {
        pid: (p as HTMLElement).dataset.pid,
        label: p.getAttribute("aria-label"),
        type: glyph?.getAttribute("title") ?? null,
        ref: p.classList.contains("ref"),
        panelW: Math.round(p.getBoundingClientRect().width),
      };

      if (foot) {
        const fr = foot.getBoundingClientRect();
        const cs = getComputedStyle(foot);
        const kids = [...foot.children].filter(vis);
        const centres = kids.map((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; });
        // flat leaves: any visible element with no visible element children
        const leaves: Element[] = [];
        const walk = (e: Element) => {
          const ch = [...e.children].filter(vis);
          if (!ch.length) { if (vis(e)) leaves.push(e); return; }
          ch.forEach(walk);
        };
        [...foot.children].filter(vis).forEach(walk);
        const leafCentres = leaves.map((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; });
        out.foot = {
          h: Math.round(fr.height * 10) / 10,
          minH: cs.minHeight, pad: cs.padding, gap: cs.columnGap, wrap: cs.flexWrap,
          linesDirect: cluster(centres),
          linesLeaf: cluster(leafCentres),
          nKids: kids.length,
          nLeaves: leaves.length,
          spill: Math.round((foot.scrollWidth - foot.clientWidth) * 10) / 10,
          kids: kids.map((c) => ({ cls: c.className, tag: c.tagName, ...rect(c), cy: Math.round((c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2) * 10) / 10 })),
          leafOut: leaves.filter((l) => { const r = l.getBoundingClientRect(); return r.right > fr.right + 1 || r.left < fr.left - 1; }).map((l) => ({ cls: l.className, ...rect(l) })),
        };
      } else out.foot = null;

      if (bar) {
        const br = bar.getBoundingClientRect();
        const cs = getComputedStyle(bar);
        const kids = [...bar.children].filter(vis).filter((c) => !(c as HTMLElement).style.flex?.startsWith("1"));
        const all = [...bar.children].filter(vis);
        const centres = all.map((c) => { const r = c.getBoundingClientRect(); return r.top + r.height / 2; });
        const padR = parseFloat(cs.paddingRight), padL = parseFloat(cs.paddingLeft);
        const inner = { l: br.left + padL, r: br.right - padR };
        const overlaps: any[] = [];
        for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
          const a = kids[i].getBoundingClientRect(), b = kids[j].getBoundingClientRect();
          const ov = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          if (ov > 1) overlaps.push({ a: kids[i].className, b: kids[j].className, ov: Math.round(ov * 10) / 10 });
        }
        const clipped = kids.filter((c) => { const r = c.getBoundingClientRect(); return r.right > br.right + 0.5 || r.left < br.left - 0.5; })
          .map((c) => ({ cls: c.className, ...rect(c), barR: Math.round(br.right * 10) / 10 }));
        const title = bar.querySelector(".bar-title") as HTMLElement | null;
        const tcs = title ? getComputedStyle(title) : null;
        out.bar = {
          h: Math.round(br.height * 10) / 10,
          pad: cs.padding, gap: cs.columnGap,
          lines: cluster(centres),
          spill: Math.round((bar.scrollWidth - bar.clientWidth) * 10) / 10,
          overlaps, clipped,
          innerR: Math.round(inner.r * 10) / 10,
          kids: all.map((c) => ({ cls: c.className || c.tagName, ...rect(c), cy: Math.round((c.getBoundingClientRect().top + c.getBoundingClientRect().height / 2) * 10) / 10 })),
          title: title ? {
            text: title.textContent?.slice(0, 40),
            fam: tcs!.fontFamily.split(",")[0],
            ov: tcs!.textOverflow, wsp: tcs!.whiteSpace, ovf: tcs!.overflow,
            truncated: title.scrollWidth > title.clientWidth + 1,
            scrollW: title.scrollWidth, clientW: title.clientWidth,
            ...rect(title),
          } : null,
        };
      } else out.bar = null;
      return out;
    });
  });
}

for (const dark of [false, true]) {
  for (const route of ROUTES) {
    test(`measure ${route} ${dark ? "dark" : "light"}`, async ({ page }) => {
      await fresh(page, { dark });
      await page.setViewportSize({ width: 1512, height: 900 });
      await page.goto(route);
      await page.waitForSelector(".panel-bar");
      await page.waitForTimeout(500);
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.waitForTimeout(320);
        const panels = await measure(page);
        OUT.push({ route, theme: dark ? "dark" : "light", w, panels });
      }
    });
  }
}

test.afterAll(() => {
  mkdirSync("/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad", { recursive: true });
  writeFileSync("/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad/studio.json", JSON.stringify(OUT, null, 1));
});
