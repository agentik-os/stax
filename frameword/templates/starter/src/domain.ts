/** Your content graph: every key opens a panel; children become drill rows. */
export interface NodeDef {
  panelType: string;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  kpis?: { v: string; l: string }[];
  body?: string;
  children?: string[];
  composer?: string;
}

export const DOMAIN: Record<string, NodeDef> = {
  "sec:home": {
    panelType: "section", title: "Welcome.", eyebrow: "Home · 01",
    subtitle: "This is a Stax space: drill a row, the next panel opens beside it. Pin what you want to keep.",
    kpis: [{ v: "1", l: "mechanic" }, { v: "7", l: "laws" }, { v: "∞", l: "depth" }],
    children: ["doc:mechanic", "doc:pins", "doc:next"],
    composer: "New item…",
  },
  "doc:mechanic": {
    panelType: "doc", title: "The mechanic", eyebrow: "Home · 01.1",
    subtitle: "One gesture: open right. No tabs, no modals, no page swaps.",
    body: "Click a drill and the child panel opens BESIDE this one: context stays mounted. Escape closes the leaf; the thread reads left to right like a sentence.",
    children: ["doc:deeper"],
  },
  "doc:deeper": {
    panelType: "doc", title: "Depth 2", eyebrow: "Home · 01.1.1",
    subtitle: "Same shell, one level deeper.",
    body: "The stage scrolls horizontally; the URL carries the whole thread, so reload and Back both restore it.",
  },
  "doc:pins": {
    panelType: "doc", title: "Pins & references", eyebrow: "Home · 01.2",
    subtitle: "PIN keeps a panel across pages.",
    body: "A pinned panel detaches to the reference rail on the right and survives every navigation. Click its title to resume the thread it came from.",
  },
  "doc:next": {
    panelType: "doc", title: "Make it yours", eyebrow: "Home · 01.3",
    subtitle: "Edit src/domain.ts: add nodes, wire children.",
    body: "Panel widths belong to the KIND (registry in App.tsx). The design contract lives in DESIGN-SPEC.md: tokens first, hairlines over boxes, one accent.",
  },
};
