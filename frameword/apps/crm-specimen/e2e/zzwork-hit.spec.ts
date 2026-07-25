import { test } from "@playwright/test";
import { fresh } from "./helpers";

/** Non-mutating actionability probe: can the buried "Delete table" action be
 *  clicked at all? trial:true runs Playwright's hit-target check and performs
 *  no click. */
for (const dark of [false, true]) {
  test(`buried foot action actionability (${dark ? "dark" : "light"})`, async ({ page }) => {
    await fresh(page, { dark });
    for (const w of [380, 480, 620, 860, 1280]) {
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto("#/data/datatable~dtc%3Ac-customers");
      await page.waitForSelector(".panel-foot");
      await page.waitForFunction(() => (document as any).fonts.status === "loaded");
      await page.waitForTimeout(300);
      const btn = page.locator(".panel").last().locator(".panel-foot .foot-actions button", { hasText: "Delete table" });
      let verdict = "CLICKABLE";
      try {
        await btn.click({ trial: true, timeout: 2500 });
      } catch (e) {
        verdict = "BLOCKED: " + String(e).split("\n").filter((l) => /intercepts pointer|Timeout|subtree/.test(l)).slice(0, 2).join(" / ").slice(0, 180);
      }
      console.log(`###HIT### ${dark ? "dark" : "light"} ${w}px :: ${verdict}`);
    }
  });
}
