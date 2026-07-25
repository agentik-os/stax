import { test } from "@playwright/test";
import { fresh } from "./helpers";

const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];

const INJECT = () => {
  const R = (n: number) => Math.round(n * 100) / 100;
  (window as any).__measure = () => {
    const panels = [...document.querySelectorAll(".panel")] as HTMLElement[];
    return panels.map((p) => {
      const label = p.getAttribute("aria-label") ?? "?";
      const out: any = { label };
      const f = p.querySelector(".panel-foot") as HTMLElement | null;
      if (f) {
        const fr = f.getBoundingClientRect();
        const kids = ([...f.children] as HTMLElement[]).filter((c) => {
          const r = c.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && !c.classList.contains("panel-pop");
        });
        const centres = kids.map((c) => {
          const r = c.getBoundingClientRect();
          return { cls: (c.className || c.tagName).toString(), cy: R(r.top + r.height / 2), h: R(r.height), l: R(r.left), r: R(r.right) };
        });
        const s = centres.map((c) => c.cy).sort((a, b) => a - b);
        let lines = s.length ? 1 : 0;
        for (let i = 1; i < s.length; i++) if (s[i] - s[i - 1] > 4) lines++;
        out.foot = { h: R(fr.height), lines, spill: R(f.scrollWidth - f.clientWidth), spread: s.length ? R(s[s.length - 1] - s[0]) : 0, kids: centres };
      }
      const b = p.querySelector(".panel-bar") as HTMLElement | null;
      if (b) {
        const br = b.getBoundingClientRect();
        const items = ([...b.children] as HTMLElement[]).map((c) => {
          const r = c.getBoundingClientRect();
          const st = getComputedStyle(c);
          return { cls: (c.className || c.tagName).toString(), text: (c.textContent ?? "").trim().slice(0, 20),
            l: R(r.left), r: R(r.right), w: R(r.width), cy: R(r.top + r.height / 2),
            scrollW: c.scrollWidth, clientW: c.clientWidth, to: st.textOverflow, ov: st.overflow, ff: st.fontFamily.split(",")[0].replace(/["']/g, "") };
        });
        const solid = items.filter((i) => i.w > 0 && (i.text !== "" || /glyph|btn|badge/.test(i.cls)));
        const overlaps: any[] = [];
        for (let i = 0; i < solid.length; i++) for (let j = i + 1; j < solid.length; j++) {
          const ov = Math.min(solid[i].r, solid[j].r) - Math.max(solid[i].l, solid[j].l);
          if (ov > 1) overlaps.push({ a: solid[i].cls + "/" + solid[i].text, b: solid[j].cls + "/" + solid[j].text, ov: R(ov) });
        }
        // clipped = any solid child straying outside the PANEL's own box (the
        // real clip: .panel has overflow hidden). The back button's -6px margin
        // is deliberate optical alignment and stays inside the panel.
        const pr = p.getBoundingClientRect();
        const clipped = solid.filter((i) => i.l < pr.left - 0.5 || i.r > pr.right + 0.5)
          .map((i) => ({ cls: i.cls, text: i.text, l: i.l, r: i.r, panelL: R(pr.left), panelR: R(pr.right) }));
        const t = solid.find((i) => /bar-title/.test(i.cls));
        out.bar = { h: R(br.height), spill: R(b.scrollWidth - b.clientWidth), overlaps, clipped,
          title: t ? { text: t.text, w: t.w, trunc: t.scrollW > t.clientW + 1, to: t.to, ov: t.ov, ff: t.ff, r: t.r } : null,
          // gap between the title's right edge and the first control after the spacer
          firstCtrl: (() => { const sp = items.findIndex((i) => i.cls === "" || i.cls === "DIV"); const after = items.slice(sp + 1).filter((i) => i.w > 0); return after.length ? { cls: after[0].cls, l: after[0].l } : null; })(),
        };
      }
      return out;
    });
  };
};

type Prep = (page: import("@playwright/test").Page) => Promise<void>;
const openSearch: Prep = async (page) => {
  await page.locator(".panel").last().locator(".foot-gear[title='Search this panel']").click();
  await page.waitForTimeout(300);
};
const renameTable: Prep = async (page) => {
  const t = page.locator(".panel").last().locator(".bar-title.editable");
  await t.dblclick();
  await page.locator(".bar-title-edit").fill("Quarterly enterprise customer renewals and expansion pipeline 2026");
  await page.locator(".bar-title-edit").press("Enter");
  await page.waitForTimeout(300);
};

const CASES: { name: string; url: string; prep?: Prep }[] = [
  { name: "tasks root + foot search open", url: "#/tasks", prep: openSearch },
  { name: "notes root + foot search open", url: "#/notes", prep: openSearch },
  { name: "data root + foot search open", url: "#/data", prep: openSearch },
  { name: "data table + foot search open", url: "#/data/datatable~dtc%3Ac-customers", prep: openSearch },
  { name: "data table renamed to a 66-char title", url: "#/data/datatable~dtc%3Ac-customers", prep: renameTable },
];

for (const dark of [false, true]) {
  for (const c of CASES) {
    test(`[${dark ? "dark" : "light"}] ${c.name}`, async ({ page }) => {
      await fresh(page, { dark });
      await page.addInitScript(INJECT);
      await page.goto(c.url);
      await page.waitForSelector(".panel-foot");
      await page.waitForFunction(() => (document as any).fonts.status === "loaded");
      if (c.prep) await c.prep(page);
      const report: any = { scene: c.name, theme: dark ? "dark" : "light", widths: {} };
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.waitForTimeout(260);
        report.widths[w] = await page.evaluate(() => (window as any).__measure());
      }
      console.log("###JSON###" + JSON.stringify(report));
    });
  }
}
