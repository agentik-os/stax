import { test } from "@playwright/test";

test("probe narrow", async ({ browser }) => {
  for (const w of [720, 620, 480, 380]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto("/#/analytics/blotter");
    await page.waitForTimeout(2500);
    const info = await page.evaluate(() => ({
      panels: document.querySelectorAll(".panel").length,
      stage: document.querySelectorAll(".stage").length,
      stagePanels: document.querySelectorAll(".stage .panel").length,
      frameKids: [...(document.querySelector(".frame")?.children ?? [])].map((e) => e.className),
      mains: [...document.querySelectorAll("main")].map((e) => e.className),
      panelParents: [...document.querySelectorAll(".panel")].map((e) => (e.parentElement?.className || "") + " :: " + e.getAttribute("aria-label")),
      bars: document.querySelectorAll(".panel-bar").length,
      foots: document.querySelectorAll(".panel-foot").length,
    }));
    console.log("###" + w + " " + JSON.stringify(info));
    await page.close();
  }
});
