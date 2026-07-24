/**
 * THE HEAD LAYOUTS — how a panel states its own identity.
 *
 * Measured on the live app (2026-07-24, MacBook 13in): the panel bar (44px), the
 * body head (title + subtitle, 75 to 122px) and the foot (44px) spend 28% of a
 * panel's height, 32% on a small screen. Worse: 15 drills out of 15 open a panel
 * whose title AND subtitle repeat the row that was clicked, verbatim, while that
 * row stays on screen beside it. In a Miller-column UI the parent never leaves,
 * so a child's identity is already displayed. The head is often not too big, it
 * is redundant.
 *
 * Ten treatments ship with the framework. An app picks one; the user may
 * override it per device. Each is a pure DATA plan: the Panel renders from it,
 * so a new layout is a row in this table, never a fork of the render.
 *
 * DEFAULT: "dense-bar" — the bar carries the identity AND the live numbers, the
 * body is 100% content, the foot stays the only action zone.
 */

export type HeadLayout =
  | "dense-bar"        // P6 · DEFAULT: glyph + title + live meta in the bar
  | "bar-title"        // P1 · title in the bar, description behind an info affordance
  | "echo"             // P2 · no body head when the panel repeats its parent's row
  | "scroll-collapse"  // P3 · full head on arrival, flies into the bar on scroll
  | "focus-only"       // P4 · only the focused panel wears its full head
  | "no-subtitle"      // P5 · serif title stays, the description leaves
  | "first-run"        // P7 · the head teaches once per node, then collapses
  | "spine"            // P8 · the title becomes a vertical rail on the panel edge
  | "density"          // P9 · dense-bar plus a cozy/compact/dense body rhythm
  | "editorial";       // the original: eyebrow + serif title + description

export type Density = "cozy" | "compact" | "dense";

export interface HeadLayoutDef {
  id: HeadLayout;
  /** the proposition number this treatment came from (0 = the original) */
  proposal: number;
  label: string;
  /** one line, shown in Settings */
  blurb: string;
  /** px of vertical body space this treatment gives back, at the measured average */
  reclaims: number;
}

/** the catalog, in the order Settings shows it: the default first */
export const HEAD_LAYOUTS: HeadLayoutDef[] = [
  { id: "dense-bar", proposal: 6, label: "Dense bar", reclaims: 89,
    blurb: "The bar carries the glyph, the title and the live numbers. The body is nothing but content." },
  { id: "echo", proposal: 2, label: "Echo law", reclaims: 97,
    blurb: "A panel never repeats the row that opened it. Roots keep their full editorial head." },
  { id: "no-subtitle", proposal: 5, label: "No subtitle", reclaims: 58,
    blurb: "The serif title stays and tightens. The description moves behind an info affordance." },
  { id: "bar-title", proposal: 1, label: "Bar title", reclaims: 97,
    blurb: "The title moves into the bar, the eyebrow becomes a type glyph, the body starts on content." },
  { id: "focus-only", proposal: 4, label: "Focused head", reclaims: 97,
    blurb: "Only the panel you are working in wears its head. The others fold into their bar." },
  { id: "scroll-collapse", proposal: 3, label: "Collapse on scroll", reclaims: 97,
    blurb: "The head is whole when you arrive, then the title flies into the bar as you scroll." },
  { id: "first-run", proposal: 7, label: "First visit only", reclaims: 97,
    blurb: "The head teaches once per panel, then folds away for good. The info affordance brings it back." },
  { id: "spine", proposal: 8, label: "Vertical spine", reclaims: 122,
    blurb: "The title leaves the flow and becomes a rail on the panel's left edge. Costs 18px of width." },
  { id: "density", proposal: 9, label: "Density modes", reclaims: 89,
    blurb: "The dense bar plus a body rhythm you choose: cozy, compact or dense." },
  { id: "editorial", proposal: 0, label: "Editorial (original)", reclaims: 0,
    blurb: "Eyebrow in the bar, serif title and description in the body. The reference treatment." },
];

export const DEFAULT_HEAD_LAYOUT: HeadLayout = "dense-bar";
export const DEFAULT_DENSITY: Density = "compact";

/** what the panel knows about itself when it asks for a plan */
export interface HeadContext {
  isRoot: boolean;
  isRef: boolean;
  /** this panel currently holds the focus */
  focused: boolean;
  /** the row that opened this panel is visible AND says the same thing */
  echoesParent: boolean;
  /** the body has been scrolled past the head's height */
  scrolled: boolean;
  /** this node's head has already been read once on this device */
  seen: boolean;
  /** single-column mobile host */
  compact: boolean;
  /** the node carries no subtitle at all */
  hasSubtitle: boolean;
}

/** what the panel renders */
export interface HeadPlan {
  barEyebrow: boolean;
  barGlyph: boolean;
  barTitle: boolean;
  /** live numbers beside the bar title (row counts, first KPI) */
  barMeta: boolean;
  bodyTitle: boolean;
  bodySub: boolean;
  /** the info affordance carrying the description the body no longer shows */
  info: boolean;
  spine: boolean;
  /** the body title's optical size */
  titleScale: "root" | "deep" | "tight";
}

const BASE: HeadPlan = {
  barEyebrow: true, barGlyph: false, barTitle: false, barMeta: false,
  bodyTitle: true, bodySub: true, info: false, spine: false, titleScale: "deep",
};

/** the bar carries everything: glyph, title, numbers */
const denseBar = (): HeadPlan => ({
  ...BASE, barEyebrow: false, barGlyph: true, barTitle: true, barMeta: true,
  bodyTitle: false, bodySub: false, info: true,
});

/**
 * The single decision point. Pure, total, and testable: every layout is a
 * branch here, and the Panel never decides anything on its own.
 */
export function headPlan(layout: HeadLayout, c: HeadContext): HeadPlan {
  const root = { ...BASE, titleScale: c.isRoot && !c.isRef ? ("root" as const) : ("deep" as const) };

  // a reference panel is a bookmark: it always states what it points at
  if (c.isRef) return { ...root, bodySub: false };

  switch (layout) {
    case "editorial":
      return root;

    case "dense-bar":
    case "density":
      return denseBar();

    case "bar-title":
      return { ...root, barEyebrow: false, barGlyph: true, barTitle: true, bodyTitle: false, bodySub: false, info: true };

    case "echo":
      // the parent row already says it, and the parent is still on screen
      return c.echoesParent
        ? { ...root, barGlyph: true, barTitle: true, bodyTitle: false, bodySub: false, info: c.hasSubtitle }
        : root;

    case "no-subtitle":
      return { ...root, bodySub: false, info: c.hasSubtitle, titleScale: c.isRoot ? "root" : "tight" };

    case "focus-only":
      return c.focused
        ? root
        : { ...root, barEyebrow: false, barGlyph: true, barTitle: true, bodyTitle: false, bodySub: false };

    case "scroll-collapse":
      return c.scrolled
        ? { ...root, barEyebrow: false, barGlyph: true, barTitle: true, bodyTitle: false, bodySub: false }
        : root;

    case "first-run":
      return c.seen
        ? { ...root, barEyebrow: false, barGlyph: true, barTitle: true, bodyTitle: false, bodySub: false, info: c.hasSubtitle }
        : root;

    case "spine":
      // the compact host has no room for a rail: fall back to the bar title
      return c.compact
        ? { ...root, barEyebrow: false, barGlyph: true, barTitle: true, bodyTitle: false, bodySub: false }
        : { ...root, spine: true, bodyTitle: false, bodySub: false, info: c.hasSubtitle };

    default:
      return root;
  }
}

/** does this layout ever put the title in the bar? (used by the settings blurb and tests) */
export const usesBarTitle = (l: HeadLayout) =>
  ["dense-bar", "density", "bar-title", "focus-only", "scroll-collapse", "first-run", "echo", "spine"].includes(l);
