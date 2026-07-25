import { test } from "@playwright/test";
import { fresh } from "./helpers";
import * as fs from "fs";

const OUT = "/private/tmp/claude-501/-Users-hacker-Desktop-FRAMEWORK/daa1326d-0cdc-4eb5-8710-80c28a3f052a/scratchpad/crmmeta.json";

const ROUTES = [
  "#/crm",
  "#/crm/acme",
  "#/crm/acme/jo",
  "#/crm/acme/jo/refonte",
  "#/crm/acme/jo/refonte/call1",
  "#/crm/acme/jo/maintenance/relance1",
  "#/crm/acme/max/equipement/visite1",
  "#/crm/globex/lea/migration/kickoff",
  "#/crm/initech",
  "#/blocks",
  "#/blocks/data",
  "#/blocks/data/kanban",
  "#/laws/law-1",
  "#/canvas",
  "#/prompts",
];

const WIDTHS = [1512, 1280, 1024, 860, 720, 620, 480, 380];
const THEMES: ("light" | "dark")[] = ["light", "dark"];

const PROBE = () => {
  const vis = (el: Element) => {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden") return false;
    const r = el.getBoundingClientRect();
    return r.width > 0.5 && r.height > 0.5;
  };
  const popped = (el: Element) => {
    const p = getComputedStyle(el).position;
    return p === "absolute" || p === "fixed";
  };
  const rc = (el: Element) => {
    const r = el.getBoundingClientRect();
    return { l: +r.left.toFixed(2), r: +r.right.toFixed(2), t: +r.top.toFixed(2), b: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), cy: +((r.top + r.bottom) / 2).toFixed(2) };
  };
  const name = (el: Element) => {
    const c = (el.className && typeof el.className === "string" ? el.className : (el as SVGElement).getAttribute?.("class")) || "";
    const txt = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 28);
    return el.tagName.toLowerCase() + (c ? "." + c.trim().split(/\s+/).join(".") : "") + (txt ? "[" + txt + "]" : "");
  };
  /** leaf-level controls: never descend into a button/input/svg */
  const atoms = (root: Element) => {
    const out: Element[] = [];
    const walk = (el: Element) => {
      for (const c of Array.from(el.children)) {
        if (!vis(c) || popped(c)) continue;
        const t = c.tagName.toUpperCase();
        if (t === "BUTTON" || t === "INPUT" || t === "A" || t === "SELECT" || t === "SVG" || t === "IMG" || c.children.length === 0) { out.push(c); continue; }
        walk(c);
      }
    };
    walk(root);
    return out;
  };
  /** cluster vertical centres: two atoms are on the SAME line if centres agree */
  const lines = (els: Element[], tol = 4) => {
    const cys = els.map((e) => (e.getBoundingClientRect().top + e.getBoundingClientRect().bottom) / 2).sort((a, b) => a - b);
    const groups: number[][] = [];
    for (const c of cys) {
      const g = groups[groups.length - 1];
      if (g && Math.abs(c - g[g.length - 1]) <= tol) g.push(c);
      else groups.push([c]);
    }
    return groups.map((g) => +(g.reduce((a, b) => a + b, 0) / g.length).toFixed(2));
  };

  const panels = Array.from(document.querySelectorAll(".panel"));
  return {
    hash: location.hash,
    theme: document.documentElement.getAttribute("data-theme"),
    bg: getComputedStyle(document.body).backgroundColor,
    panels: panels.map((p, i) => {
      const bar = p.querySelector(":scope > .panel-bar") as HTMLElement | null;
      const foot = p.querySelector(":scope > .panel-foot") as HTMLElement | null;
      const pr = rc(p);
      const out: any = { i, label: p.getAttribute("aria-label"), cls: p.className, w: +pr.w.toFixed(1) };

      if (bar) {
        const cs = getComputedStyle(bar);
        const br = rc(bar);
        const A = atoms(bar);
        const boxL = br.l + parseFloat(cs.paddingLeft), boxR = br.r - parseFloat(cs.paddingRight);
        const title = bar.querySelector(".bar-title") as HTMLElement | null;
        const ov: string[] = [];
        for (let a = 0; a < A.length; a++) for (let b = a + 1; b < A.length; b++) {
          const x = A[a].getBoundingClientRect(), y = A[b].getBoundingClientRect();
          const ix = Math.min(x.right, y.right) - Math.max(x.left, y.left);
          const iy = Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top);
          if (ix > 0.5 && iy > 0.5) ov.push(name(A[a]) + " ∩ " + name(A[b]) + " = " + ix.toFixed(1) + "x" + iy.toFixed(1));
        }
        const clipped = A.filter((e) => { const r = e.getBoundingClientRect(); return r.right > boxR + 0.5 || r.left < boxL - 0.5; })
          .map((e) => ({ n: name(e), ...rc(e), boxL: +boxL.toFixed(2), boxR: +boxR.toFixed(2) }));
        const vspill = A.filter((e) => { const r = e.getBoundingClientRect(); return r.top < br.t - 0.5 || r.bottom > br.b + 0.5; }).map((e) => ({ n: name(e), ...rc(e) }));
        out.bar = {
          h: br.h, pad: cs.padding, gap: cs.columnGap, sw: bar.scrollWidth, cw: bar.clientWidth,
          lines: lines(A), n: A.length, atoms: A.map((e) => ({ n: name(e), ...rc(e) })),
          overlaps: ov, clipped, vspill,
          title: title ? { txt: (title.textContent || "").trim(), sw: title.scrollWidth, cw: title.clientWidth, ell: title.scrollWidth > title.clientWidth + 0.5, ...rc(title), fam: getComputedStyle(title).fontFamily.split(",")[0] } : null,
        };
      }
      if (foot) {
        const cs = getComputedStyle(foot);
        const fr = rc(foot);
        const A = atoms(foot);
        const kids = Array.from(foot.children).filter((c) => vis(c) && !popped(c));
        const boxL = fr.l + parseFloat(cs.paddingLeft), boxR = fr.r - parseFloat(cs.paddingRight);
        const spillR = A.length ? +(Math.max(...A.map((e) => e.getBoundingClientRect().right)) - boxR).toFixed(2) : 0;
        const spillL = A.length ? +(boxL - Math.min(...A.map((e) => e.getBoundingClientRect().left))).toFixed(2) : 0;
        const vspill = A.filter((e) => { const r = e.getBoundingClientRect(); return r.top < fr.t - 0.5 || r.bottom > fr.b + 0.5; }).map((e) => ({ n: name(e), ...rc(e) }));
        out.foot = {
          h: fr.h, pad: cs.padding, sw: foot.scrollWidth, cw: foot.clientWidth,
          linesKids: lines(kids), linesAtoms: lines(A), n: A.length,
          atoms: A.map((e) => ({ n: name(e), ...rc(e) })),
          kids: kids.map((e) => ({ n: name(e), ...rc(e) })),
          spillR, spillL, vspill,
        };
      }
      return out;
    }),
  };
};

test("crm-meta L-FOOT / L-BAR sweep", async ({ browser }) => {
  test.setTimeout(0);
  const rows: any[] = [];
  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ colorScheme: theme, viewport: { width, height: 900 } });
      for (const route of ROUTES) {
        const page = await ctx.newPage();
        await fresh(page, { dark: theme === "dark" });
        await page.goto("/" + route);
        await page.waitForSelector(".panel", { timeout: 15000 });
        await page.waitForTimeout(500);
        const d = await page.evaluate(PROBE);
        rows.push({ theme, width, route, ...d });
        await page.close();
      }
      await ctx.close();
      console.log("done", theme, width);
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(rows));
  console.log("WROTE", OUT, rows.length);
});
