/**
 * THE ESCAPE LADDER + LAZY SEAMS: overlays peel one rung per press;
 * the editor stack loads only when an editor mounts (bundle-diet law).
 */
import { test, expect } from "@playwright/test";
import { link, fresh } from "./helpers";

test("escape peels palette before panels", async ({ page }) => {
  await fresh(page);
  await page.goto(link({ spaceId: "blocks", path: [{ t: "section", k: "sec:blocks" }, { t: "doc", k: "blkcat:data" }] }));
  await page.waitForSelector(".panel");
  const panels = await page.locator(".panel").count();
  await page.locator(".crumb-goto").click();
  await expect(page.locator(".palette")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await expect(page.locator(".palette")).toHaveCount(0);
  await expect(page.locator(".panel")).toHaveCount(panels); // no panel died for the overlay
});

test("boot loads ONE js chunk; the editor stack arrives on demand and works", async ({ page }) => {
  const js: string[] = [];
  let devServer = false;
  page.on("request", (r) => {
    if (r.url().includes("/@vite/")) devServer = true;
    if (r.url().endsWith(".js")) js.push(r.url().split("/").pop()!);
  });
  await fresh(page);
  await page.goto("/");
  await page.waitForSelector(".panel");
  await page.waitForTimeout(500);
  const bootChunks = js.length;
  // chunk counting only means something on a BUILT preview, not the dev server
  if (!devServer) expect(bootChunks).toBe(1);

  await page.goto(link({ spaceId: "blocks", path: [{ t: "section", k: "sec:blocks" }, { t: "block", k: "blk:rich-editor" }] }));
  await page.waitForSelector(".ProseMirror", { timeout: 15_000 });
  if (!devServer) expect(js.length).toBeGreaterThan(bootChunks);
  await page.locator(".ProseMirror").first().click();
  await page.keyboard.type("suite proof");
  await expect(page.locator(".ProseMirror").first()).toContainText("suite proof");
});
