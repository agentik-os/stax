import { test } from "@playwright/test";
import { fresh } from "./helpers";
import * as fs from "fs";

const OUT = "/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad/crmmeta-states.json";
const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];
const THEMES: ("light" | "dark")[] = ["light", "dark"];

const PROBE = () => {
  const vis = (el: Element) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  const popped = (el: Element) => ["absolute", "fixed"].includes(getComputedStyle(el).position);
  const rc = (el: Element) => { const r = el.getBoundingClientRect(); return { l: +r.left.toFixed(2), r: +r.right.toFixed(2), t: +r.top.toFixed(2), b: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), cy: +((r.top + r.bottom) / 2).toFixed(2) }; };
  const name = (el: Element) => {
    const c = (typeof el.className === "string" ? el.className : (el as SVGElement).getAttribute?.("class")) || "";
    const t = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 26);
    return el.tagName.toLowerCase() + (c ? "." + c.trim().split(/\s+/).join(".") : "") + (t ? "[" + t + "]" : "");
  };
  const atoms = (root: Element) => {
    const out: Element[] = [];
    const walk = (el: Element) => { for (const c of Array.from(el.children)) {
      if (!vis(c) || popped(c)) continue;
      const t = c.tagName.toUpperCase();
      if (["BUTTON", "INPUT", "A", "SELECT", "SVG", "IMG"].includes(t) || c.children.length === 0) { out.push(c); continue; }
      walk(c);
    } };
    walk(root); return out;
  };
  const lines = (els: Element[], tol = 4) => {
    const cys = els.map((e) => { const r = e.getBoundingClientRect(); return (r.top + r.bottom) / 2; }).sort((a, b) => a - b);
    const g: number[][] = [];
    for (const c of cys) { const last = g[g.length - 1]; if (last && Math.abs(c - last[last.length - 1]) <= tol) last.push(c); else g.push([c]); }
    return g.map((x) => +(x.reduce((a, b) => a + b, 0) / x.length).toFixed(2));
  };
  return Array.from(document.querySelectorAll(".panel")).map((p) => {
    const bar = p.querySelector(":scope > .panel-bar") as HTMLElement | null;
    const foot = p.querySelector(":scope > .panel-foot") as HTMLElement | null;
    const o: any = { label: p.getAttribute("aria-label"), cls: p.className, w: +rc(p).w.toFixed(1) };
    if (bar) {
      const cs = getComputedStyle(bar), br = rc(bar), A = atoms(bar);
      const ov: string[] = [];
      for (let a = 0; a < A.length; a++) for (let b = a + 1; b < A.length; b++) {
        const x = A[a].getBoundingClientRect(), y = A[b].getBoundingClientRect();
        const ix = Math.min(x.right, y.right) - Math.max(x.left, y.left), iy = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
        if (ix > 0.5 && iy > 0.5) ov.push(name(A[a]) + " ∩ " + name(A[b]) + "=" + ix.toFixed(1) + "x" + iy.toFixed(1));
      }
      o.bar = { h: br.h, pad: cs.padding, gap: cs.columnGap, l: br.l, r: br.r, sw: bar.scrollWidth, cw: bar.clientWidth,
        lines: lines(A), atoms: A.map((e) => ({ n: name(e), ...rc(e) })), overlaps: ov,
        outside: A.filter((e) => { const r = e.getBoundingClientRect(); return r.left < br.l - 0.5 || r.right > br.r + 0.5; }).map((e) => ({ n: name(e), ...rc(e) })),
        vspill: A.filter((e) => { const r = e.getBoundingClientRect(); return r.top < br.t - 0.5 || r.bottom > br.b + 0.5; }).map((e) => ({ n: name(e), ...rc(e) })) };
      const t = bar.querySelector(".bar-title") as HTMLElement | null;
      if (t) o.bar.title = { txt: (t.textContent || "").trim(), sw: t.scrollWidth, cw: t.clientWidth, ell: t.scrollWidth > t.clientWidth + 0.5, ...rc(t), fam: getComputedStyle(t).fontFamily.split(",")[0] };
    }
    if (foot) {
      const cs = getComputedStyle(foot), fr = rc(foot), A = atoms(foot);
      const kids = Array.from(foot.children).filter((c) => vis(c) && !popped(c));
      const boxL = fr.l + parseFloat(cs.paddingLeft), boxR = fr.r - parseFloat(cs.paddingRight);
      o.foot = { h: fr.h, pad: cs.padding, sw: foot.scrollWidth, cw: foot.clientWidth,
        linesKids: lines(kids), linesAtoms: lines(A),
        atoms: A.map((e) => ({ n: name(e), ...rc(e) })), kids: kids.map((e) => ({ n: name(e), ...rc(e) })),
        spillR: A.length ? +(Math.max(...A.map((e) => e.getBoundingClientRect().right)) - boxR).toFixed(2) : 0,
        spillL: A.length ? +(boxL - Math.min(...A.map((e) => e.getBoundingClientRect().left))).toFixed(2) : 0,
        vspill: A.filter((e) => { const r = e.getBoundingClientRect(); return r.top < fr.t - 0.5 || r.bottom > fr.b + 0.5; }).map((e) => ({ n: name(e), ...rc(e) })),
        popH: (() => { const pop = foot.querySelector(".panel-pop") as HTMLElement | null; return pop ? rc(pop) : null; })() };
    }
    return o;
  });
};

test("crm-meta runtime states", async ({ browser }) => {
  test.setTimeout(0);
  const rows: any[] = [];
  for (const theme of THEMES) for (const width of WIDTHS) {
    const ctx = await browser.newContext({ colorScheme: theme, viewport: { width, height: 900 } });

    // A — foot search open on a searchable panel
    {
      const page = await ctx.newPage();
      await fresh(page, { dark: theme === "dark" });
      await page.goto("/#/blocks");
      await page.waitForSelector(".panel-foot", { timeout: 15000 });
      await page.waitForTimeout(400);
      const n = await page.locator(".panel").last().locator(".panel-foot > .foot-gear").count();
      if (n > 1) {
        await page.locator(".panel").last().locator(".panel-foot > .foot-gear").first().click();
        await page.waitForTimeout(400);
        await page.keyboard.type("kan");
        await page.waitForTimeout(400);
        rows.push({ theme, width, state: "foot-search-open", route: "#/blocks", panels: await page.evaluate(PROBE) });
      } else rows.push({ theme, width, state: "foot-search-absent", route: "#/blocks", panels: await page.evaluate(PROBE) });
      await page.close();
    }
    // B — gear popover open on the deepest CRM panel
    {
      const page = await ctx.newPage();
      await fresh(page, { dark: theme === "dark" });
      await page.goto("/#/crm/acme/jo/refonte/call1");
      await page.waitForSelector(".panel-foot", { timeout: 15000 });
      await page.waitForTimeout(400);
      await page.locator(".panel").last().locator(".panel-foot > .foot-gear").last().click();
      await page.waitForTimeout(400);
      rows.push({ theme, width, state: "gear-open", route: "#/crm/acme/jo/refonte/call1", panels: await page.evaluate(PROBE) });
      await page.close();
    }
    // C — pin the leaf, switch space: the pinned panel rides the rail as a reference
    {
      const page = await ctx.newPage();
      await fresh(page, { dark: theme === "dark" });
      await page.goto("/#/crm/acme/jo/refonte/call1");
      await page.waitForSelector(".panel-bar", { timeout: 15000 });
      await page.waitForTimeout(400);
      await page.locator(".panel").last().locator(".pin-btn").click();
      await page.waitForTimeout(400);
      await page.goto("/#/blocks");
      await page.waitForTimeout(800);
      rows.push({ theme, width, state: "pinned-reference", route: "#/blocks (after pin)", refCount: await page.locator(".panel.ref").count(), panels: await page.evaluate(PROBE) });
      await page.close();
    }
    await ctx.close();
    console.log("states done", theme, width);
  }
  fs.writeFileSync(OUT, JSON.stringify(rows));
  console.log("WROTE", OUT, rows.length);
});
