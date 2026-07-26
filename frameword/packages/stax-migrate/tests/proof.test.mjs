import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CLI = resolve(dirname(fileURLToPath(import.meta.url)), "../index.mjs");

/**
 * The proof exists to make a conversion argue with itself. These tests pin the
 * two disciplines an agent will otherwise quietly drop: an unknown must be
 * DRAWN rather than hidden, and a disagreement between matrices must be
 * REPORTED rather than silently resolved.
 */
function fixture({ features, data }) {
  const dir = mkdtempSync(join(tmpdir(), "staxproof-"));
  mkdirSync(join(dir, "stax-migration"));
  const w = (f, s) => writeFileSync(join(dir, "stax-migration", f), s);
  w("state.json", '{"phase":4,"level":"full"}');
  w("feature-matrix.csv", features);
  w("data-matrix.csv", data);
  w("element-matrix.csv", "id,area,element,kind,count,source,stax_target,tokens,spacing,status,evidence\n");
  execFileSync("node", [CLI, "proof", dir], { encoding: "utf8" });
  return readFileSync(join(dir, "stax-migration", "layout-proof.html"), "utf8");
}

const HEAD = "id,area,feature,subfeature,source,ui_kind,mapping,size,status,evidence";
const DHEAD = "id,layer,name,kind,source,ops,panel_binding,write_path,status,evidence";

test("an empty cell is DRAWN as unknown, and names what would settle it", () => {
  const html = fixture({
    features: `${HEAD}\nF-1,deals,Board,,src/D.tsx:4,kanban,,,,\n`,
    data: `${DHEAD}\n`,
  });
  expect(html).toContain("[unknown] mapping");
  expect(html).toContain("[unknown] size");
  // the caption must name the next action, not just flag the hole
  expect(html).toContain("S 380, M 480, L 640, XL 800");
  expect(html).toContain("stax-migrate shapes");
});

test("a row with no citation renders as furniture, and says so", () => {
  const html = fixture({
    features: `${HEAD}\nF-1,deals,Board,,,kanban,view/board,XL,mapped,\n`,
    data: `${DHEAD}\n`,
  });
  expect(html).toContain("not a panel, it is furniture");
});

test("a data row binding to a panel no feature declares is REPORTED", () => {
  const html = fixture({
    features: `${HEAD}\nF-1,deals,Board,,src/D.tsx:4,kanban,view/board,XL,mapped,at :4\n`,
    data: `${DHEAD}\nD-1,convex,invoices,table,c/s.ts:9,rw,drill/ghost,foot/save,bound,at :9\n`,
  });
  expect(html).toContain("Disagreements between matrices (1)");
  expect(html).toContain("drill/ghost");
});

test("a writable row bound to an out-of-scope surface is REPORTED", () => {
  const html = fixture({
    features: `${HEAD}\nF-1,deals,Board,,src/D.tsx:4,kanban,drill/board,XL,out-of-scope,admin only\n`,
    data: `${DHEAD}\nD-1,convex,deals,table,c/s.ts:9,rw,drill/board,foot/save,bound,at :9\n`,
  });
  expect(html).toContain("a writable surface cannot be out of scope");
});

test("agreement is stated as a result, not left as an empty section", () => {
  const html = fixture({
    features: `${HEAD}\nF-1,deals,Board,,src/D.tsx:4,kanban,drill/board,XL,mapped,at :4\n`,
    data: `${DHEAD}\nD-1,convex,deals,table,c/s.ts:9,rw,drill/board,foot/save,bound,at :9\n`,
  });
  expect(html).toContain("agree everywhere they overlap");
});

test("the counts are published, and an unsupplied accent is declared a PLACEHOLDER", () => {
  const html = fixture({
    features: `${HEAD}\nF-1,deals,Board,,src/D.tsx:4,kanban,drill/board,XL,mapped,at :4\n`,
    data: `${DHEAD}\n`,
  });
  for (const c of ["rows documented", "unknowns drawn as unknown", "disagreements between matrices"])
    expect(html).toContain(c);
  expect(html).toContain("PLACEHOLDER");
  expect(html).toContain("Substitutions declared");
});

test("the document is self-contained: no external host, no network", () => {
  const html = fixture({
    features: `${HEAD}\nF-1,deals,Board,,src/D.tsx:4,kanban,drill/board,XL,mapped,at :4\n`,
    data: `${DHEAD}\n`,
  });
  expect(html).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  expect(html).not.toContain("<link");
  // both themes, and the viewer's toggle must beat the OS preference
  expect(html).toContain("prefers-color-scheme:dark");
  expect(html).toContain('[data-theme=dark]');
  expect(html).toContain('[data-theme=light]');
});
