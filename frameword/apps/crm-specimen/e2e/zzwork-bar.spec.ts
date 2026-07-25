import { test } from "@playwright/test";
import { fresh } from "./helpers";

/** L-BAR sweep incl. NESTED overflow + text wrapping, every panel on stage. */
const URLS = [
  "#/tasks", "#/notes", "#/data",
  "#/tasks/task~tsk%3At-ship",
  "#/notes/note~nte%3An-launch",
  "#/data/datatable~dtc%3Ac-customers",
  "#/data/datatable~dtc%3Ac-customers/datarow~dtr%3Ac-customers%3Ar1",
];
const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];

const INJECT = () => {
  const R = (n: number) => Math.round(n * 100) / 100;
  (window as any).__bars = () =>
    ([...document.querySelectorAll(".panel")] as HTMLElement[]).map((p) => {
      const b = p.querySelector(".panel-bar") as HTMLElement | null;
      if (!b) return { label: p.getAttribute("aria-label"), bar: null };
      const br = b.getBoundingClientRect(), pr = p.getBoundingClientRect();
      const cs = getComputedStyle(b);
      // nested overflow anywhere under the bar
      const nested = ([b, ...b.querySelectorAll("*")] as HTMLElement[])
        .filter((e) => e.getBoundingClientRect().width > 0)
        .map((e) => ({ cls: (e.className || e.tagName).toString().slice(0, 30), sw: e.scrollWidth, cw: e.clientWidth,
          ovx: getComputedStyle(e).overflowX, to: getComputedStyle(e).textOverflow }))
        .filter((e) => e.sw > e.cw + 1 && !(e.to === "ellipsis" && e.ovx === "hidden"));
      // text line boxes in the bar
      const ys: number[] = [];
      const w2 = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = w2.nextNode())) {
        if (!(n.textContent ?? "").trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const r of [...rg.getClientRects()]) if (r.width > 0.5 && r.height > 0.5) ys.push(R(r.top + r.height / 2));
      }
      ys.sort((a, c) => a - c);
      let textLines = ys.length ? 1 : 0;
      for (let i = 1; i < ys.length; i++) if (ys[i] - ys[i - 1] > 4) textLines++;
      // children out of the PANEL box, and pairwise overlap
      const kids = ([...b.children] as HTMLElement[]).map((c) => {
        const r = c.getBoundingClientRect();
        return { cls: (c.className || c.tagName).toString(), txt: (c.textContent ?? "").trim().slice(0, 18), l: R(r.left), r: R(r.right), w: R(r.width) };
      }).filter((k) => k.w > 0 && (k.txt !== "" || /glyph|btn|badge/.test(k.cls)));
      const outside = kids.filter((k) => k.l < pr.left - 0.5 || k.r > pr.right + 0.5);
      const overlaps: any[] = [];
      for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
        const ov = Math.min(kids[i].r, kids[j].r) - Math.max(kids[i].l, kids[j].l);
        if (ov > 1) overlaps.push({ a: kids[i].cls + "/" + kids[i].txt, b: kids[j].cls + "/" + kids[j].txt, ov: R(ov) });
      }
      const t = b.querySelector(".bar-title") as HTMLElement | null;
      const ts = t ? getComputedStyle(t) : null;
      return { label: p.getAttribute("aria-label"), bar: {
        h: R(br.height), pad: cs.paddingLeft + "/" + cs.paddingRight, gap: cs.gap,
        spill: R(b.scrollWidth - b.clientWidth), textLines, nested, outside, overlaps,
        title: t && ts ? { txt: (t.textContent ?? "").slice(0, 22), trunc: t.scrollWidth > t.clientWidth + 1,
          ff: ts.fontFamily.split(",")[0].replace(/["']/g, ""), to: ts.textOverflow, ovx: ts.overflowX, ws: ts.whiteSpace } : null,
      } };
    });
};

for (const dark of [false, true]) {
  test(`L-BAR sweep (${dark ? "dark" : "light"})`, async ({ page }) => {
    await fresh(page, { dark });
    await page.addInitScript(INJECT);
    let bad = 0;
    for (const u of URLS) {
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto(u);
        await page.waitForSelector(".panel-bar");
        await page.waitForFunction(() => (document as any).fonts.status === "loaded");
        await page.waitForTimeout(240);
        const arr = await page.evaluate(() => (window as any).__bars());
        for (const p of arr) {
          const b = p.bar; if (!b) continue;
          const probs: string[] = [];
          if (Math.abs(b.h - 44) > 0.5) probs.push(`h=${b.h}`);
          if (b.pad !== "16px/10px") probs.push(`pad=${b.pad}`);
          if (b.gap !== "10px") probs.push(`gap=${b.gap}`);
          if (b.spill > 1) probs.push(`spill=${b.spill}`);
          if (b.textLines > 1) probs.push(`textLines=${b.textLines}`);
          if (b.nested.length) probs.push(`nested=${JSON.stringify(b.nested)}`);
          if (b.outside.length) probs.push(`outsidePanel=${JSON.stringify(b.outside)}`);
          if (b.overlaps.length) probs.push(`overlap=${JSON.stringify(b.overlaps)}`);
          if (b.title && b.title.trunc && !(b.title.to === "ellipsis" && b.title.ovx === "hidden")) probs.push(`titleClip=${JSON.stringify(b.title)}`);
          if (b.title && !/mono/i.test(b.title.ff)) probs.push(`titleFont=${b.title.ff}`);
          if (probs.length) { bad++; console.log(`###BAR### ${dark ? "dark" : "light"} | ${u} | ${w}px | "${p.label}" | ${probs.join(" ")}`); }
        }
      }
    }
    console.log(`###BARDONE### ${dark ? "dark" : "light"} problems=${bad}`);
  });
}
