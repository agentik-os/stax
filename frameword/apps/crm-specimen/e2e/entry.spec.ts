import { test, expect } from "@playwright/test";
import { fresh } from "./helpers";

/**
 * The front door is a panel, and a refusal is a state with a contract.
 * A product is judged on its refusals, not on its success path, so the law is
 * asserted here rather than described: a denied element renders its empty
 * expression or nothing, and no refusal copy discloses whether an account exists.
 */
test("the door renders at the registry M width, with a 44px bar and one primary", async ({ page }) => {
  await fresh(page);
  await page.goto("#/moonbase/entry");
  await page.waitForSelector(".en-door");
  const m = await page.evaluate(() => {
    const d = document.querySelector(".en-door")!;
    const bar = d.querySelector(".en-bar")!;
    const foot = d.querySelector(".en-foot")!;
    return {
      width: Math.round(d.getBoundingClientRect().width),
      bar: Math.round(bar.getBoundingClientRect().height),
      foot: Math.round(foot.getBoundingClientRect().height),
      primaries: d.querySelectorAll(".foot-cta").length,
      bodyPad: getComputedStyle(d.querySelector(".en-body")!).padding,
    };
  });
  expect(m.width, "the door is the registry M width").toBe(480);
  expect(m.bar, "bar h44").toBe(44);
  expect(m.foot, "foot 44").toBeLessThanOrEqual(46);
  expect(m.primaries, "exactly ONE primary CTA").toBe(1);
  expect(m.bodyPad).toBe("18px 18px 16px");
});

test("switching entry changes the copy and the method, and nothing else", async ({ page }) => {
  await fresh(page);
  await page.goto("#/moonbase/entry");
  await page.waitForSelector(".en-door");
  const snap = () =>
    page.evaluate(() => {
      const d = document.querySelector(".en-door")!;
      return {
        eyebrow: d.querySelector(".en-eyebrow")?.textContent,
        title: d.querySelector(".en-title")?.textContent,
        method: d.querySelector(".en-method")?.textContent,
        width: Math.round(d.getBoundingClientRect().width),
        bar: Math.round(d.querySelector(".en-bar")!.getBoundingClientRect().height),
      };
    });
  const a = await snap();
  await page.locator(".pf-seg .aseg", { hasText: "Investor" }).click();
  const b = await snap();
  expect(b.title).not.toBe(a.title);
  expect(b.method).not.toBe(a.method);
  // the structure is the argument: it must NOT move
  expect(b.width).toBe(a.width);
  expect(b.bar).toBe(a.bar);
});

test("no refusal copy discloses whether an account exists", async ({ page }) => {
  await fresh(page);
  await page.goto("#/moonbase/refusal");
  await page.waitForSelector(".en-ref");
  const heads = page.locator(".en-ref > .hd");
  const n = await heads.count();
  const said: string[] = [];
  for (let i = 0; i < n; i++) {
    // the first refusal ships open, so a blind click would CLOSE it
    const row = page.locator(".en-ref").nth(i);
    if (!(await row.evaluate((e) => e.classList.contains("on")))) await heads.nth(i).click();
    await row.locator(".says .q").waitFor();
    const t = await row.locator(".says .q").textContent();
    if (t) said.push(t);
    await heads.nth(i).click();
  }
  expect(said.length).toBe(n);
  // the tells: a refusal must never confirm or deny an address, nor name the
  // missing capability or org type, because that answer describes the business
  const leaky = said.filter((s) =>
    /no account (with|for) that|address (is |was )?not found|does not exist|unknown email|missing capability|requires the .* capability/i.test(s),
  );
  expect(leaky, "a refusal disclosed account existence or a capability name").toEqual([]);
  // and every refusal must say what to do next
  const mute = said.filter((s) => !/ask|contact|sign out|pick|your workspace|entrance/i.test(s));
  expect(mute, "a refusal that does not say what the person does next").toEqual([]);
});

test("the refusal panel offers nothing to submit: it is a reference surface", async ({ page }) => {
  await fresh(page);
  await page.goto("#/moonbase/refusal");
  await page.waitForSelector(".en-ref");
  const primaries = await page.locator(".panel").last().locator(".panel-foot .foot-cta").count();
  expect(primaries, "a reference surface has no primary action").toBe(0);
});
