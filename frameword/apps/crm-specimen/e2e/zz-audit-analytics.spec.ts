import { test, expect } from "@playwright/test";
import * as fs from "node:fs";

const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];
const ROUTES = [
  "#/analytics",
  "#/analytics/blotter",
  "#/analytics/treasury",
  "#/analytics/cfo",
  "#/analytics/c-crypto",
];

const PROBE = () => {
  const vis = (el: Element) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  const flow = (el: Element) => {
    const cs = getComputedStyle(el);
    return cs.position !== "absolute" && cs.position !== "fixed";
  };
  const cls = (el: Element) => (el.className || "").toString().trim().slice(0, 60);

  const out: any[] = [];
  const panels = [...document.querySelectorAll(".stage .panel, .push-stage .panel")];
  panels.forEach((panel, pi) => {
    const pr = panel.getBoundingClientRect();
    const label = panel.getAttribute("aria-label") || "";

    /* ─── FOOT ─────────────────────────────────────────────── */
    const foot = panel.querySelector(":scope > .panel-foot") as HTMLElement | null;
    let footRec: any = null;
    if (foot && vis(foot)) {
      const fr = foot.getBoundingClientRect();
      const kids = [...foot.children].filter((e) => vis(e) && flow(e));
      const items = kids.map((e) => {
        const r = e.getBoundingClientRect();
        return { cls: cls(e), centre: +(r.top + r.height / 2).toFixed(2), top: +r.top.toFixed(2), h: +r.height.toFixed(2), left: +r.left.toFixed(1), right: +r.right.toFixed(1) };
      });
      // cluster centres — a genuine second line sits >= ~20px away; 10px tolerance
      const sorted = [...items].sort((a, b) => a.centre - b.centre);
      const lines: any[][] = [];
      for (const it of sorted) {
        const last = lines[lines.length - 1];
        if (last && Math.abs(it.centre - last[0].centre) <= 10) last.push(it);
        else lines.push([it]);
      }
      // deepest leaf descendants too (catches a wrap INSIDE foot-actions)
      const leaves = [...foot.querySelectorAll("*")].filter(
        (e) => vis(e) && flow(e) && e.children.length === 0 && (e.textContent || "").trim().length + (e.tagName === "SVG" ? 1 : 0) > 0,
      );
      const leafSorted = leaves
        .map((e) => { const r = e.getBoundingClientRect(); return { cls: cls(e), tag: e.tagName, centre: +(r.top + r.height / 2).toFixed(2), txt: (e.textContent || "").trim().slice(0, 24) }; })
        .sort((a, b) => a.centre - b.centre);
      const leafLines: any[][] = [];
      for (const it of leafSorted) {
        const last = leafLines[leafLines.length - 1];
        if (last && Math.abs(it.centre - last[0].centre) <= 10) last.push(it);
        else leafLines.push([it]);
      }
      footRec = {
        h: +fr.height.toFixed(2),
        scrollW: foot.scrollWidth,
        clientW: foot.clientWidth,
        spill: foot.scrollWidth - foot.clientWidth,
        childLines: lines.length,
        childLineCentres: lines.map((l) => l[0].centre),
        items,
        leafLines: leafLines.length,
        leafLineCentres: leafLines.map((l) => l[0].centre),
        leafSample: leafLines.map((l) => l.map((x) => x.cls + "|" + x.txt).slice(0, 6)),
        // anything painted outside the foot box horizontally
        overflowKids: items.filter((i) => i.right > fr.right + 1 || i.left < fr.left - 1).map((i) => i.cls),
      };
    }

    /* ─── BAR ──────────────────────────────────────────────── */
    const bar = panel.querySelector(":scope > .panel-bar") as HTMLElement | null;
    let barRec: any = null;
    if (bar && vis(bar)) {
      const br = bar.getBoundingClientRect();
      const cs = getComputedStyle(bar);
      const kids = [...bar.children].filter((e) => vis(e) && flow(e));
      const boxes = kids.map((e) => {
        const r = e.getBoundingClientRect();
        return { cls: cls(e), tag: e.tagName, l: +r.left.toFixed(1), r: +r.right.toFixed(1), t: +r.top.toFixed(1), b: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), sw: (e as HTMLElement).scrollWidth, cw: (e as HTMLElement).clientWidth, txt: (e.textContent || "").trim().slice(0, 30) };
      });
      // every interactive control, wherever it sits in the bar tree
      const controls = [...bar.querySelectorAll("button, input, a")].filter((e) => vis(e)).map((e) => {
        const r = e.getBoundingClientRect();
        return { cls: cls(e), title: e.getAttribute("title") || "", l: +r.left.toFixed(1), r: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
      });
      const clipped = controls.filter((c) => c.r > br.right + 0.5 || c.l < br.left - 0.5 || c.w < 12 || c.h < 12);
      // pairwise horizontal overlap of the bar's own flow children
      const overlaps: string[] = [];
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          const ox = Math.min(a.r, b.r) - Math.max(a.l, b.l);
          const oy = Math.min(a.b, b.b) - Math.max(a.t, b.t);
          if (ox > 0.5 && oy > 0.5) overlaps.push(`${a.cls}[${a.l},${a.r}] x ${b.cls}[${b.l},${b.r}] ov=${ox.toFixed(1)}`);
        }
      const title = bar.querySelector(".bar-title") as HTMLElement | null;
      barRec = {
        h: +br.height.toFixed(2),
        pad: cs.padding,
        gap: cs.gap,
        scrollW: bar.scrollWidth,
        clientW: bar.clientWidth,
        spill: bar.scrollWidth - bar.clientWidth,
        boxes,
        overlaps,
        clipped,
        title: title
          ? { txt: (title.textContent || "").slice(0, 40), w: +title.getBoundingClientRect().width.toFixed(1), sw: title.scrollWidth, cw: title.clientWidth, ell: title.scrollWidth > title.clientWidth + 1, overflow: getComputedStyle(title).textOverflow }
          : null,
        // does any bar child sit on a second line?
        lines: (() => {
          const cts = boxes.map((b) => b.t + b.h / 2).sort((a, b) => a - b);
          const L: number[][] = [];
          for (const c of cts) { const last = L[L.length - 1]; if (last && Math.abs(c - last[0]) <= 10) last.push(c); else L.push([c]); }
          return L.length;
        })(),
      };
    }

    out.push({ pi, label, host: (panel.parentElement?.className||""), panelW: +pr.width.toFixed(1), foot: footRec, bar: barRec });
  });
  return { docScrollW: document.documentElement.scrollWidth, docClientW: document.documentElement.clientWidth, panels: out };
};

for (const theme of ["light", "dark"] as const) {
  test(`audit analytics — ${theme}`, async ({ browser }) => {
    test.setTimeout(600_000);
    const page = await browser.newPage({ colorScheme: theme, viewport: { width: 1512, height: 900 } });
    await page.addInitScript((dark) => {
      try { localStorage.clear(); } catch { /* first load */ }
      if (dark) document.documentElement.setAttribute("data-theme", "dark");
    }, theme === "dark");

    const report: any[] = [];
    for (const route of ROUTES) {
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        try {
          await page.goto("/" + route, { waitUntil: "load" });
          await page.waitForSelector(".panel-bar", { state: "attached", timeout: 15_000 });
          await page.waitForTimeout(500);
          const r = await page.evaluate(PROBE);
          report.push({ route, w, theme, ...r });
        } catch (e) {
          report.push({ route, w, theme, error: String(e).slice(0, 200), panels: [] });
        }
      }
    }
    fs.writeFileSync(`/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad/out-${theme}.json`, JSON.stringify(report));
    await page.close();
    expect(report.length).toBe(ROUTES.length * WIDTHS.length);
  });
}
