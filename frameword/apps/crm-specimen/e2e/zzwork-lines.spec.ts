import { test } from "@playwright/test";
import { fresh } from "./helpers";

/** The operator's law is about LINES OF TEXT, not just box height. Count the
 *  line boxes the browser actually lays out for every text node in the foot:
 *  a button whose label wraps is a two-line foot inside a 44px box. */

const INJECT = () => {
  const R = (n: number) => Math.round(n * 100) / 100;
  (window as any).__lines = () => {
    const p = [...document.querySelectorAll(".panel")].pop() as HTMLElement;
    const f = p.querySelector(".panel-foot") as HTMLElement | null;
    if (!f) return null;
    const rects: { txt: string; cy: number; owner: string }[] = [];
    const walk = document.createTreeWalker(f, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = walk.nextNode())) {
      const t = (n.textContent ?? "").trim();
      if (!t) continue;
      if ((n.parentElement as HTMLElement)?.closest(".panel-pop")) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of [...range.getClientRects()]) {
        if (r.width < 0.5 || r.height < 0.5) continue;
        rects.push({ txt: t.slice(0, 18), cy: R(r.top + r.height / 2), owner: ((n.parentElement as HTMLElement)?.className || "").toString().slice(0, 26) });
      }
    }
    const ys = rects.map((r) => r.cy).sort((a, b) => a - b);
    let lines = ys.length ? 1 : 0;
    for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] > 4) lines++;
    // which owners are internally multi-line?
    const byOwner = new Map<string, number[]>();
    for (const r of rects) byOwner.set(r.owner + "|" + r.txt, [...(byOwner.get(r.owner + "|" + r.txt) ?? []), r.cy]);
    const wrapped: string[] = [];
    for (const [k, v] of byOwner) {
      const s = [...v].sort((a, b) => a - b);
      let c = 1; for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] > 4) c++;
      if (c > 1) wrapped.push(k + " => " + c + " lines @ " + s.map((x) => R(x)).join("/"));
    }
    return {
      label: p.getAttribute("aria-label"), panelW: R(p.getBoundingClientRect().width),
      footH: R(f.getBoundingClientRect().height),
      textLines: lines, spreadPx: ys.length ? R(ys[ys.length - 1] - ys[0]) : 0,
      wrapped, rects,
    };
  };
};

const URLS = [
  "#/tasks", "#/notes", "#/data",
  "#/tasks/task~tsk%3At-ship",
  "#/notes/note~nte%3An-launch",
  "#/data/datatable~dtc%3Ac-customers",
  "#/data/datatable~dtc%3Ac-customers/datarow~dtr%3Ac-customers%3Ar1",
];
const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];

for (const dark of [false, true]) {
  test(`foot TEXT line count (${dark ? "dark" : "light"})`, async ({ page }) => {
    await fresh(page, { dark });
    await page.addInitScript(INJECT);
    for (const u of URLS) {
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto(u);
        await page.waitForSelector(".panel-foot");
        await page.waitForFunction(() => (document as any).fonts.status === "loaded");
        await page.waitForTimeout(240);
        const m = await page.evaluate(() => (window as any).__lines());
        if (m && (m.textLines > 1 || m.wrapped.length))
          console.log(`###WRAP### ${dark ? "dark" : "light"} | ${u} | ${w}px | panelW=${m.panelW} footH=${m.footH} textLines=${m.textLines} spread=${m.spreadPx} | ${JSON.stringify(m.wrapped)}`);
      }
    }
    console.log(`###END### ${dark ? "dark" : "light"}`);
  });
}
