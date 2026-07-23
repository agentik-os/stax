/**
 * The Stax design-law gate: node scan.mjs <url> [drillMax]
 * Verifies, on the LIVE app, the laws the DESIGN-SPEC states:
 *   L-ALIGN  every separator shares its panel's head-hairline bounds
 *   L-RHYTHM hairline blocks stack edge to edge (air = block paddings)
 *   L-FOOT   at most ONE accent-filled primary per panel foot
 *   L-FLOW   the document never scrolls horizontally
 * Needs playwright in the TARGET project (or globally resolvable).
 */
const urlArg = process.argv[2];
const drillMax = Number(process.argv[3] ?? 4);
if (!urlArg) { console.error("usage: scan.mjs <url> [drillMax]"); process.exit(2); }

import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
async function loadPlaywright() {
  // resolve from the CALLING project first (its node_modules), then from here
  for (const base of [process.cwd() + "/package.json", import.meta.url]) {
    for (const name of ["@playwright/test", "playwright", "playwright-core"]) {
      try {
        const req = createRequire(base);
        const mod = await import(pathToFileURL(req.resolve(name)).href);
        const m = mod.chromium ? mod : (mod.default ?? mod);
        if (m.chromium) return m;
      } catch { /* next candidate */ }
    }
  }
  console.error("playwright not found in this project: `bun add -d playwright` (then `bunx playwright install chromium`)");
  process.exit(2);
}
const { chromium } = await loadPlaywright();

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
await pg.goto(urlArg, { waitUntil: "networkidle" });
await pg.waitForTimeout(700);

const scanOnce = (tag) => pg.evaluate((tagIn) => {
  const out = [];
  const vis = (c) => c && c !== "rgba(0, 0, 0, 0)" && c !== "transparent";
  const doc = document.documentElement;
  if (doc.scrollWidth - doc.clientWidth > 1)
    out.push({ law: "L-FLOW", where: tagIn, detail: `document scrolls horizontally by ${doc.scrollWidth - doc.clientWidth}px` });
  const accent = getComputedStyle(doc).getPropertyValue("--accent").trim();
  for (const panel of document.querySelectorAll(".panel")) {
    const body = panel.querySelector(".panel-body");
    const title = (panel.querySelector("h2, .fs-title, .panel-title")?.textContent || "?").slice(0, 30);
    if (body) {
      const cs = getComputedStyle(body);
      const br = body.getBoundingClientRect();
      const gL = br.left + parseFloat(cs.paddingLeft), gR = br.right - parseFloat(cs.paddingRight);
      for (const el of body.querySelectorAll("*")) {
        if (el.closest('.dp-pop,.sheet,[class*="fly"],.pop-bg,[role="menu"],.dt,.demo-zone,.kb,.board')) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 0.5 * (gR - gL)) continue;
        const s = getComputedStyle(el);
        if (s.display === "none" || s.visibility === "hidden") continue;
        const isBox = (parseFloat(s.borderLeftWidth) > 0 && vis(s.borderLeftColor)) || el.matches("button, input, select, textarea, img, video");
        const lines = [];
        if (!isBox)
          for (const side of ["Top", "Bottom"])
            if (parseFloat(s["border" + side + "Width"]) > 0 && s["border" + side + "Style"] !== "none" && vis(s["border" + side + "Color"]))
              lines.push([r.left, r.right]);
        for (const pe of ["::before", "::after"]) {
          const p = getComputedStyle(el, pe);
          if (p.content === "none" || p.display === "none" || p.position !== "absolute") continue;
          if (parseFloat(p.borderTopWidth) > 0 || parseFloat(p.borderBottomWidth) > 0) {
            const pl = parseFloat(p.left), pr = parseFloat(p.right);
            lines.push([isNaN(pl) ? r.left : r.left + pl, isNaN(pr) ? r.right : r.right - pr]);
          }
        }
        for (const [l, rr] of lines)
          if (rr - l >= 0.5 * (gR - gL) && (Math.abs(l - gL) > 1 || Math.abs(rr - gR) > 1))
            out.push({ law: "L-ALIGN", where: tagIn + " · " + title, detail: `separator [${Math.round(l)},${Math.round(rr)}] vs head bounds [${Math.round(gL)},${Math.round(gR)}] (${(el.className || el.tagName).toString().slice(0, 24)})` });
      }
      for (const el of body.querySelectorAll(".drills, .anat-row, .card, .section, .stats")) {
        if (el.closest('.dp-pop,.sheet,[class*="fly"],.kb,.board,.demo-zone,.dt')) continue;
        const prev = el.previousElementSibling;
        if (!prev || el.getBoundingClientRect().height === 0) continue;
        const gap = Math.round(el.getBoundingClientRect().top - prev.getBoundingClientRect().bottom);
        if (!((gap >= 0 && gap <= 1) || (gap >= 8 && gap <= 20)))
          out.push({ law: "L-RHYTHM", where: tagIn + " · " + title, detail: `${(el.className || "").toString().slice(0, 16)} sits ${gap}px after ${(prev.className || prev.tagName).toString().slice(0, 16)} (allowed: 0-1 stacked, 8-20 spaced)` });
      }
    }
    const foot = panel.querySelector(".panel-foot");
    if (foot && accent) {
      let filled = 0;
      for (const btn of foot.querySelectorAll("button")) {
        const bg = getComputedStyle(btn).backgroundColor;
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg.replace(/\s/g, "") === accent.replace(/\s/g, "")) filled++;
      }
      if (filled > 1)
        out.push({ law: "L-FOOT", where: tagIn + " · " + title, detail: `${filled} accent-filled buttons in one foot (max 1 primary)` });
    }
  }
  return out;
}, tag);

await pg.mouse.move(0, 0); // hover expands separators BY DESIGN: scan at rest
const violations = [...await scanOnce("root")];
const nDrills = await pg.locator(".panel .drill").count();
for (let i = 0; i < Math.min(nDrills, drillMax); i++) {
  try {
    await pg.locator(".panel").last().locator(".drill").nth(i).click({ timeout: 2500 });
    await pg.waitForTimeout(500);
    await pg.mouse.move(0, 0);
    await pg.waitForTimeout(150);
    violations.push(...await scanOnce("drill-" + i));
    await pg.mouse.move(0, 0);
    await pg.waitForTimeout(150);
    await pg.goBack();
    await pg.waitForTimeout(400);
  } catch { break; }
}
await b.close();
console.log(JSON.stringify({ url: urlArg, checked: 1 + Math.min(nDrills, drillMax), violations, pass: violations.length === 0 }, null, 1));
process.exit(violations.length === 0 ? 0 : 1);
