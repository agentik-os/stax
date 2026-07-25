import { test } from "@playwright/test";
import { fresh } from "./helpers";

/** the search row opened AT each width (compact remount resets it, so opening
 *  once at 1280 never actually exercised 620/480/380). */

const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];

const INJECT = () => {
  const R = (n: number) => Math.round(n * 100) / 100;
  (window as any).__m = () => {
    const p = [...document.querySelectorAll(".panel")].pop() as HTMLElement;
    const f = p.querySelector(".panel-foot") as HTMLElement;
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
    return {
      label: p.getAttribute("aria-label"), panelW: R(p.getBoundingClientRect().width),
      h: R(fr.height), lines, spread: s.length ? R(s[s.length - 1] - s[0]) : 0,
      spill: R(f.scrollWidth - f.clientWidth), kids: centres,
      barH: R((p.querySelector(".panel-bar") as HTMLElement).getBoundingClientRect().height),
    };
  };
};

const URLS: { name: string; url: string }[] = [
  { name: "tasks root", url: "#/tasks" },
  { name: "notes root", url: "#/notes" },
  { name: "data root", url: "#/data" },
  { name: "data table", url: "#/data/datatable~dtc%3Ac-customers" },
];

for (const dark of [false, true]) {
  for (const u of URLS) {
    test(`[${dark ? "dark" : "light"}] search opened at each width: ${u.name}`, async ({ page }) => {
      await fresh(page, { dark });
      await page.addInitScript(INJECT);
      const report: any = { scene: "search-at-width: " + u.name, theme: dark ? "dark" : "light", widths: {} };
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto(u.url);
        await page.waitForSelector(".panel-foot");
        await page.waitForFunction(() => (document as any).fonts.status === "loaded");
        await page.waitForTimeout(250);
        const btn = page.locator(".panel").last().locator(".foot-gear[title='Search this panel']");
        const n = await btn.count();
        if (n) { await btn.click(); await page.waitForTimeout(300); }
        const m = await page.evaluate(() => (window as any).__m());
        report.widths[w] = [{ ...m, searchOpened: n > 0 }];
      }
      console.log("###JSON###" + JSON.stringify(report));
    });
  }
}
