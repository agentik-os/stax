import { test } from "@playwright/test";
import { fresh } from "./helpers";

/** CONFIRM: the data table foot's actions overflow their box and paint on top
 *  of the next foot control. Overlap by rect + proof by elementFromPoint. */
for (const dark of [false, true]) {
  test(`foot control collision (${dark ? "dark" : "light"})`, async ({ page }) => {
    await fresh(page, { dark });
    for (const w of [380, 480, 720]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto("#/data/datatable~dtc%3Ac-customers");
      await page.waitForSelector(".panel-foot");
      await page.waitForFunction(() => (document as any).fonts.status === "loaded");
      await page.waitForTimeout(300);
      const m = await page.evaluate(() => {
        const R = (n: number) => Math.round(n * 100) / 100;
        const p = [...document.querySelectorAll(".panel")].pop() as HTMLElement;
        const f = p.querySelector(".panel-foot") as HTMLElement;
        const fa = f.querySelector(".foot-actions") as HTMLElement;
        const btns = [...fa.querySelectorAll("button")] as HTMLElement[];
        const last = btns[btns.length - 1];
        const lr = last.getBoundingClientRect();
        const sibs = ([...f.children] as HTMLElement[]).filter((c) => c !== fa && c.getBoundingClientRect().width > 0);
        const collisions = sibs.map((s) => {
          const sr = s.getBoundingClientRect();
          return { sib: (s.className || s.tagName).toString(),
            overlapPx: R(Math.min(lr.right, sr.right) - Math.max(lr.left, sr.left)),
            sibL: R(sr.left), sibR: R(sr.right) };
        }).filter((c) => c.overlapPx > 0);
        const cy = R(f.getBoundingClientRect().top + f.getBoundingClientRect().height / 2);
        const probe = (x: number) => {
          const e = document.elementFromPoint(x, cy) as HTMLElement | null;
          return e ? (e.tagName + "." + (typeof e.className === "string" ? e.className : "(svg)")) : "null";
        };
        return {
          footSpill: R(f.scrollWidth - f.clientWidth),
          footH: R(f.getBoundingClientRect().height),
          footActionsBox: { l: R(fa.getBoundingClientRect().left), r: R(fa.getBoundingClientRect().right), sw: fa.scrollWidth, cw: fa.clientWidth, overrunPx: fa.scrollWidth - fa.clientWidth },
          lastBtn: { txt: (last.textContent ?? "").trim(), l: R(lr.left), r: R(lr.right) },
          collisions,
          paintAtLastBtnCentre: probe(R(lr.left + lr.width / 2)),
          paintAtLastBtnRightEdge: probe(R(lr.right - 3)),
        };
      });
      console.log(`###C### ${dark ? "dark" : "light"} ${w}px ` + JSON.stringify(m));
      await page.locator(".panel").last().locator(".panel-foot").screenshot({
        path: `/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad/foot-${dark ? "dark" : "light"}-${w}.png`,
      });
    }
  });
}
