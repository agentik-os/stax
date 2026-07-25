import { test } from "@playwright/test";
import { fresh } from "./helpers";

/** WORK space audit: L-FOOT + L-BAR at 8 widths x 2 themes. Measure only. */

const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];

const SCENES: { name: string; url: string }[] = [
  { name: "tasks root", url: "#/tasks" },
  { name: "tasks + drilled task", url: "#/tasks/task~tsk%3At-ship" },
  { name: "notes root", url: "#/notes" },
  { name: "notes + drilled note", url: "#/notes/note~nte%3An-launch" },
  { name: "data root", url: "#/data" },
  { name: "data + table", url: "#/data/datatable~dtc%3Ac-customers" },
  { name: "data + table + drilled row", url: "#/data/datatable~dtc%3Ac-customers/datarow~dtr%3Ac-customers%3Ar1" },
];

const measure = () =>
  (window as any).__measure();

const INJECT = () => {
  const R = (n: number) => Math.round(n * 100) / 100;
  (window as any).__measure = () => {
    const panels = [...document.querySelectorAll(".panel")] as HTMLElement[];
    return panels.map((p) => {
      const pr = p.getBoundingClientRect();
      const label = p.getAttribute("aria-label") ?? "?";
      const out: any = { label, panelW: R(pr.width), panelH: R(pr.height), collapsed: p.classList.contains("root-collapsed") };

      /* ── FOOT ───────────────────────────────────────── */
      const f = p.querySelector(".panel-foot") as HTMLElement | null;
      if (!f) out.foot = null;
      else {
        const fr = f.getBoundingClientRect();
        const kids = ([...f.children] as HTMLElement[]).filter((c) => c.getBoundingClientRect().width > 0 && c.getBoundingClientRect().height > 0);
        // CENTRES, never tops: children have different heights on the SAME line.
        const centres = kids.map((c) => {
          const r = c.getBoundingClientRect();
          return { cls: c.className || c.tagName, cy: R(r.top + r.height / 2), h: R(r.height), left: R(r.left), right: R(r.right) };
        });
        // cluster centres with a 4px tolerance -> real line count
        const sorted = [...centres].map((c) => c.cy).sort((a, b) => a - b);
        let lines = sorted.length ? 1 : 0;
        for (let i = 1; i < sorted.length; i++) if (sorted[i] - sorted[i - 1] > 4) lines++;
        out.foot = {
          h: R(fr.height),
          lines,
          centresRounded: [...new Set(centres.map((c) => Math.round(c.cy)))].length,
          spill: R(f.scrollWidth - f.clientWidth),
          spread: sorted.length ? R(sorted[sorted.length - 1] - sorted[0]) : 0,
          kids: centres,
        };
      }

      /* ── BAR ────────────────────────────────────────── */
      const b = p.querySelector(".panel-bar") as HTMLElement | null;
      if (!b) out.bar = null;
      else {
        const br = b.getBoundingClientRect();
        const cs = getComputedStyle(b);
        const padL = parseFloat(cs.paddingLeft), padR = parseFloat(cs.paddingRight);
        const kids = ([...b.children] as HTMLElement[]);
        const items = kids.map((c) => {
          const r = c.getBoundingClientRect();
          const s = getComputedStyle(c);
          return {
            cls: (c.className || c.tagName).toString(),
            text: (c.textContent ?? "").trim().slice(0, 24),
            left: R(r.left), right: R(r.right), w: R(r.width), h: R(r.height),
            cy: R(r.top + r.height / 2),
            scrollW: c.scrollWidth, clientW: c.clientWidth,
            overflow: s.overflow, textOverflow: s.textOverflow, ws: s.whiteSpace,
            ff: s.fontFamily.split(",")[0].replace(/["']/g, ""),
          };
        });
        const visible = items.filter((i) => i.w > 0);
        // overlaps between visible siblings (spacers excluded by w>0 already; a
        // flex spacer has w>0 but no content -> exclude the pure spacer div)
        const solid = visible.filter((i) => i.text !== "" || /glyph|btn|badge/.test(i.cls));
        const overlaps: any[] = [];
        for (let i = 0; i < solid.length; i++)
          for (let j = i + 1; j < solid.length; j++) {
            const a = solid[i], c = solid[j];
            const ov = Math.min(a.right, c.right) - Math.max(a.left, c.left);
            if (ov > 1) overlaps.push({ a: a.cls + "/" + a.text, b: c.cls + "/" + c.text, ov: R(ov) });
          }
        // clipped: any part outside the bar's PADDING BOX
        const innerL = br.left + padL, innerR = br.right - padR;
        const clipped = solid
          .map((i) => ({ ...i, outL: R(innerL - i.left), outR: R(i.right - innerR) }))
          .filter((i) => i.outL > 1 || i.outR > 1)
          .map((i) => ({ cls: i.cls, text: i.text, outLeft: i.outL, outRight: i.outR, w: i.w }));
        const title = items.find((i) => /bar-title/.test(i.cls));
        out.bar = {
          h: R(br.height), padL, padR, gap: cs.gap,
          spill: R(b.scrollWidth - b.clientWidth),
          lines: (() => {
            const cys = solid.map((i) => i.cy).sort((a, b2) => a - b2);
            let n = cys.length ? 1 : 0;
            for (let i = 1; i < cys.length; i++) if (cys[i] - cys[i - 1] > 4) n++;
            return n;
          })(),
          overlaps, clipped,
          title: title ? {
            text: title.text, w: title.w, scrollW: title.scrollW, clientW: title.clientW,
            truncated: title.scrollW > title.clientW + 1,
            overflow: title.overflow, textOverflow: title.textOverflow, ws: title.ws, ff: title.ff,
          } : null,
          items: visible.map((i) => ({ cls: i.cls, text: i.text, l: i.left, r: i.right, w: i.w })),
        };
      }
      return out;
    });
  };
};

for (const dark of [false, true]) {
  for (const scene of SCENES) {
    test(`[${dark ? "dark" : "light"}] ${scene.name}`, async ({ page }) => {
      await fresh(page, { dark });
      await page.addInitScript(INJECT);
      await page.goto(scene.url);
      await page.waitForSelector(".panel");
      await page.waitForFunction(() => (document as any).fonts.status === "loaded");
      const report: any = { scene: scene.name, theme: dark ? "dark" : "light", widths: {} };
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.waitForTimeout(260);
        report.widths[w] = await page.evaluate(measure);
      }
      console.log("###JSON###" + JSON.stringify(report));
    });
  }
}
