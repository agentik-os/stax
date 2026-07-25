import { test } from "@playwright/test";
import * as fs from "node:fs";

const OUT = "/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad";

const DEEP = () => {
  const vis = (el: Element) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  return [...document.querySelectorAll(".stage .panel, .push-stage .panel")].map((panel) => {
    const foot = panel.querySelector(":scope > .panel-foot") as HTMLElement;
    if (!foot) return null;
    const fr = foot.getBoundingClientRect();
    const fcs = getComputedStyle(foot);
    const contentL = fr.left + parseFloat(fcs.paddingLeft), contentR = fr.right - parseFloat(fcs.paddingRight);
    const kid = (e: Element) => {
      const r = e.getBoundingClientRect();
      const cs = getComputedStyle(e);
      return { cls: (e.className || "").toString(), txt: (e.textContent || "").trim().slice(0, 24),
        l: +r.left.toFixed(1), r: +r.right.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        sw: (e as HTMLElement).scrollWidth, cw: (e as HTMLElement).clientWidth,
        flex: cs.flex, overflow: cs.overflow, minW: cs.minWidth };
    };
    const items = [...foot.children].filter(vis).map(kid);
    const acts = foot.querySelector(".foot-actions");
    const actKids = acts ? [...acts.children].filter(vis).map(kid) : [];
    // does anything inside foot-actions paint over the next foot child?
    const gear = [...foot.children].filter((e) => e.classList.contains("foot-gear")).pop();
    const gr = gear ? gear.getBoundingClientRect() : null;
    const collide = gr ? actKids.filter((k) => k.r > gr.left + 0.5) : [];
    // hit test: what element actually owns the pixel at each action button's centre?
    const hit = actKids.map((k) => {
      const el = document.elementFromPoint((k.l + k.r) / 2, foot.getBoundingClientRect().top + 22);
      return { btn: k.txt || k.cls, owner: (el?.className || "").toString().slice(0, 40), tag: el?.tagName };
    });
    return { label: panel.getAttribute("aria-label"), footL: +contentL.toFixed(1), footR: +contentR.toFixed(1),
      footH: +fr.height.toFixed(2), footSw: foot.scrollWidth, footCw: foot.clientWidth,
      items, actKids, gear: gr ? { l: +gr.left.toFixed(1), r: +gr.right.toFixed(1) } : null, collide, hit };
  }).filter(Boolean);
};

test("crypto foot deep probe", async ({ browser }) => {
  test.setTimeout(300_000);
  const out: any[] = [];
  for (const theme of ["light", "dark"] as const) {
    const page = await browser.newPage({ colorScheme: theme, viewport: { width: 1512, height: 900 } });
    await page.addInitScript((dark) => {
      try { localStorage.clear(); } catch { /* first load */ }
      if (dark) document.documentElement.setAttribute("data-theme", "dark");
    }, theme === "dark");
    for (const w of [1512, 1280, 1024, 860, 720, 620, 480, 380]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto("/#/analytics/c-crypto", { waitUntil: "load" });
      await page.waitForSelector(".panel-foot", { state: "attached", timeout: 15_000 });
      await page.evaluate(() => (document as any).fonts?.ready);
      await page.waitForTimeout(500);
      out.push({ theme, w, panels: await page.evaluate(DEEP) });
      if (w === 380 || w === 480 || w === 720) {
        await page.screenshot({ path: `${OUT}/crypto-foot-${theme}-${w}.png`, fullPage: false });
      }
    }
    await page.close();
  }
  fs.writeFileSync(`${OUT}/crypto-foot.json`, JSON.stringify(out, null, 1));
});
