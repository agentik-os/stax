import { test, expect } from "@playwright/test";
import { fresh } from "./helpers";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

/**
 * The README's deep links are its whole pitch: someone evaluating the framework
 * clicks them before reading a word. A dead one is worse than no link, and the
 * catalogs already rotted this way once, unnoticed for months.
 */
const README = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../../../../README.md"),
  "utf8",
);
const LINKS = [...README.matchAll(/\(https:\/\/stax-agentik-oss-projects\.vercel\.app\/(#\/[^)\s]+)\)/g)]
  .map((m) => m[1]);

test("every deep link the README advertises opens the panel it names", async ({ page }) => {
  expect(LINKS.length, "the README advertises no deep links").toBeGreaterThan(8);
  await fresh(page);
  const dead: string[] = [];
  for (const url of [...new Set(LINKS)]) {
    await page.goto(url);
    await page.waitForSelector(".panel", { timeout: 5000 }).catch(() => {});
    const s = await page.evaluate(() => {
      const leaf = [...document.querySelectorAll(".panel")].pop();
      const body = leaf?.querySelector(".panel-body");
      return {
        hash: location.hash,
        title: leaf?.querySelector(".bar-title")?.textContent ?? null,
        filled: body ? body.querySelectorAll("*").length : 0,
      };
    });
    if (!s.title || s.title === "Node" || s.filled === 0)
      dead.push(`${url} -> title=${s.title} children=${s.filled}`);
    else if (s.hash !== url) dead.push(`${url} -> landed on ${s.hash} (${s.title})`);
  }
  expect(dead, `README deep links that do not open what they claim:\n${dead.join("\n")}`).toEqual([]);
});
