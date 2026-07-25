import { test, expect } from "@playwright/test";
import * as fs from "node:fs";

const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];
const ROUTES = ["#/analytics", "#/analytics/blotter", "#/analytics/treasury", "#/analytics/cfo", "#/analytics/c-crypto"];
const OUT = "/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad";

/** every descendant of the bar and the foot: is it clipped by its own box,
 *  does it paint outside its zone, does its text run to a second line? */
const CLIP = () => {
  const vis = (el: Element) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  const bad: any[] = [];
  const zones = [
    ...[...document.querySelectorAll(".stage .panel, .push-stage .panel")].flatMap((p, pi) =>
      [[p.querySelector(":scope > .panel-bar"), "bar", pi, p.getAttribute("aria-label")],
       [p.querySelector(":scope > .panel-foot"), "foot", pi, p.getAttribute("aria-label")]] as any[]),
  ].filter((z) => z[0] && vis(z[0]));

  for (const [zone, kind, pi, label] of zones) {
    const zr = (zone as HTMLElement).getBoundingClientRect();
    const zcs = getComputedStyle(zone as HTMLElement);
    const padL = parseFloat(zcs.paddingLeft), padR = parseFloat(zcs.paddingRight);
    const contentL = zr.left + padL, contentR = zr.right - padR;
    for (const el of [zone as HTMLElement, ...(zone as HTMLElement).querySelectorAll("*")] as HTMLElement[]) {
      if (!vis(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.position === "absolute" || cs.position === "fixed") continue;   // popovers sit above by design
      const r = el.getBoundingClientRect();
      const c = (el.className || "").toString().slice(0, 30);
      const txt = (el.textContent || "").trim().slice(0, 28);
      // 1. own-box clipping — allowed only where the design says so (ellipsis / scroll deck)
      const ellipsis = cs.textOverflow === "ellipsis" && cs.overflow !== "visible";
      const scroller = cs.overflowX === "auto" || cs.overflowX === "scroll";
      if (el.scrollWidth > el.clientWidth + 1 && !ellipsis && !scroller && el !== zone)
        bad.push({ kind, pi, label, why: "clipped-x", cls: c, txt, sw: el.scrollWidth, cw: el.clientWidth });
      if (el.scrollHeight > el.clientHeight + 1 && cs.overflowY === "visible" && el.children.length === 0 && txt)
        bad.push({ kind, pi, label, why: "text-2nd-line", cls: c, txt, sh: el.scrollHeight, ch: el.clientHeight });
      // 2. painting outside its zone's content box
      if (el !== zone && (r.right > contentR + 1 || r.left < contentL - 1))
        bad.push({ kind, pi, label, why: "outside-zone", cls: c, txt, l: +r.left.toFixed(1), r: +r.right.toFixed(1), zl: +contentL.toFixed(1), zr: +contentR.toFixed(1) });
      // 3. taller than the 44px rail can hold
      if (el !== zone && r.height > 38)
        bad.push({ kind, pi, label, why: "too-tall", cls: c, txt, h: +r.height.toFixed(1) });
    }
  }
  return bad;
};

for (const theme of ["light", "dark"] as const) {
  test(`analytics clip sweep — ${theme}`, async ({ browser }) => {
    test.setTimeout(900_000);
    const page = await browser.newPage({ colorScheme: theme, viewport: { width: 1512, height: 900 } });
    await page.addInitScript((dark) => {
      try { localStorage.clear(); } catch { /* first load */ }
      if (dark) document.documentElement.setAttribute("data-theme", "dark");
    }, theme === "dark");
    const report: any[] = [];
    for (const route of ROUTES) {
      for (const w of WIDTHS) {
        await page.setViewportSize({ width: w, height: 900 });
        await page.goto("/" + route, { waitUntil: "load" });
        await page.waitForSelector(".panel-bar", { state: "attached", timeout: 15_000 });
        await page.evaluate(() => (document as any).fonts?.ready);
        await page.waitForTimeout(400);
        report.push({ route, w, theme, bad: await page.evaluate(CLIP) });
      }
    }
    fs.writeFileSync(`${OUT}/clip-${theme}.json`, JSON.stringify(report));
    await page.close();
    expect(report.length).toBe(ROUTES.length * WIDTHS.length);
  });
}
