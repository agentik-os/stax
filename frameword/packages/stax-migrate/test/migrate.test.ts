
import { oklchFromHex, themeBlock } from "../theme.mjs";

test("oklchFromHex: pure red lands on the known OKLCH point", () => {
  const c = oklchFromHex("#ff0000")!;
  expect(Math.abs(c.L - 0.6279)).toBeLessThan(0.01);
  expect(Math.abs(c.C - 0.2577)).toBeLessThan(0.01);
  expect(Math.abs(c.H - 29.23)).toBeLessThan(0.5);
});

test("themeBlock emits both themes with a computed foreground", () => {
  const b = themeBlock("#e11d48")!;
  expect(b).toContain(":root");
  expect(b).toContain(".dark");
  expect(b).toContain("--accent-soft");
  expect(b.match(/--accent:/g)?.length).toBe(2);
});

test("themeBlock rejects garbage", () => {
  expect(themeBlock("red")).toBeNull();
});
