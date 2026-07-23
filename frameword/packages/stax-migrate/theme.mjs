/** sRGB hex → OKLCH, pure JS (Björn Ottosson's OKLab constants). */
export function oklchFromHex(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const r = lin((n >> 16) & 255), g = lin((n >> 8) & 255), b = lin(n & 255);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const mm = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * mm - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * mm + 0.4505937099 * s;
  const b2 = 0.0259040371 * l + 0.7827717662 * mm - 0.808675766 * s;
  const C = Math.sqrt(a * a + b2 * b2);
  let H = (Math.atan2(b2, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

const fmt = (L, C, H) => `oklch(${L.toFixed(3)} ${C.toFixed(3)} ${H.toFixed(1)})`;

/** The full accent token block, BOTH themes, from one brand color. */
export function themeBlock(hex) {
  const c = oklchFromHex(hex);
  if (!c) return null;
  const { C, H } = c;
  // clamp lightness: near-white/near-black brands still yield a LEGIBLE ramp
  const L = Math.min(Math.max(c.L, 0.35), 0.75);
  const darkL = Math.min(Math.max(L + 0.14, 0.45), 0.8);
  return `/* accent ramp generated from ${hex} — paste into your tokens */
:root {
  --accent:            ${fmt(L, C, H)};
  --accent-foreground: ${L > 0.65 ? "oklch(0.145 0 0)" : "oklch(1 0 0)"};
  --accent-soft:       ${fmt(0.94, Math.min(C, 0.06), H)};
  --accent-hover:      ${fmt(Math.max(L - 0.06, 0.1), C, H)};
}
.dark {
  --accent:            ${fmt(darkL, C * 0.62, H)};
  --accent-foreground: ${darkL > 0.65 ? "oklch(0.145 0 0)" : "oklch(0.985 0 0)"};
  --accent-soft:       ${fmt(0.3, Math.min(C * 0.25, 0.06), H)};
  --accent-hover:      ${fmt(Math.max(darkL - 0.09, 0.1), C * 0.68, H)};
}`;
}
