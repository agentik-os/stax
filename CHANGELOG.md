# Changelog

One line per catalog unit, grouped by the `stax-migrate` version that shipped it.
The catalog is the SSOT (`frameword/packages/stax-migrate/upgrades/manifest.json`);
each unit is a DETECT / APPLY / VERIFY brief under `upgrades/`. Newest first.

## 0.26.2
- **U-041** (design, extended) — The bar glyph was one shared circle on every panel (SpaceIcon fed a resourceKey, never a spaceId): a shape-grouped TypeGlyph takes it from 1 distinct glyph to 10, the catalog gate now asserts the URL round-trips rather than just that a panel rendered, and notes/tasks/data/canvas get working URLs

## 0.26.1
- **U-041** (migration, extended) — The shape router reaches every conversion entry point: M9 PHASE 0.75 replaces the legacy shape vocabulary, and the starter ships slugs.ts so a scaffolded app has readable URLs from the first commit

## 0.26.0
- **U-041** (migration) — The shape router: 19 shapes keyed on what the data IS, wired into the mapping phase, plus e2e gates so no catalog reference and no CLI command can silently rot

## 0.25.0
- **U-040** (engine) — Readable URLs: an injectable SlugCodec turns #/pf-analytics/section~sec:pf-analytics/anblotter~an:blotter into #/analytics/blotter, with three decode forms and self-normalising old links

## 0.24.0
- **U-039** (design) — A money surface is a PANEL, not a table in a trench coat: blotter as a fill stream, treasury as a cash ladder, the close as a P&L walk, figures reconciling across panels

## 0.23.0
- **U-038** (migration) — The console pattern table: 20 SaaS-admin screens mapped to a LIVE reference panel + stax-migrate patterns

## 0.22.0
- **U-037** (design) — The head layouts: ten identity treatments as a data registry, dense-bar by default (28% chrome to 13%)

## 0.21.0
- **U-036** (ux) — The view deck (named saved views in the foot + board phase bands) + the field law L-FIELD + the nav-conversion table

## 0.20.0
- **U-035** (migration) — Scanner v2: whole-text multiline matching, Convex custom builders, fetch→route leak linking, --json, the 100%-loop CI test

## 0.19.0
- **U-034** (migration) — Backend continuity: programmatic data scan (Convex/Supabase/Prisma/REST/tRPC) + the data check gate (80/20 law)

## 0.18.0
- **U-033** (ux) — UX Wave 4: wayfinding truth (home/refs/accent crumbs, split eyebrows), first-run care (tour pill + flag-on-completion, push foot), platform conventions (reduced-motion, coarse pointers, platform keys, wheel)

## 0.17.0
- **U-032** (a11y) — Dark-accent legibility law (fg follows accent lightness) + main landmark + canvas-measured contrast

## 0.16.0
- **U-031** (design) — Zero-bleed rail (fill = lines = text) + quiet crumbbar ⌘K + responsive rules RR-1..8

## 0.15.0
- **U-030** (migration) — The 100% transfer: legacy embed panels + the machine-checked parity contract (stax-migrate parity)

## 0.14.0
- **U-029** (ux) — UX Wave 3: sheet foot+riffle, hairline slabs, digit keys, range select, crumb minimap, first-run tour

## 0.13.0
- **U-028** (ux) — UX Wave 2: per-space thread memory, symmetric overlay exits, eyebrow identity, drag truth

## 0.12.0
- **U-027** (ux) — UX Wave-1 baseline: focus-scroll, escape ladder, narrated pins, truthful empties, quiet chrome, dark elevation

## 0.11.0
- **U-026** (ux) — Terminal + LLM chat as panels: scrollback/thread bodies, prompt/composer feet, bridge verbs

## 0.10.0
- **U-025** (ux) — Click-through filter chips + one-row toolbar + cell walking + team task grammar

## 0.9.0
- **U-024** (ux) — View grammar: table/board/cards/list per view + foot control deck + quiet hero KPIs

## 0.8.0
- **U-023** (ux) — Exit ghosts on close gestures + far-left foot search + drill row virtualization

## 0.7.0
- **U-021** (agent) — AI actions in the registry: kind ai, accent-soft chip, computed insights via stax:ai
- **U-022** (ux) — Devtools time travel + shareable #ws links + the ? keyboard map

## 0.6.0
- **U-019** (ux) — Action registry (foot = palette = bridge) + recent threads + saved layouts
- **U-020** (agent) — Copilot bridge: window.stax drives the workspace (state + intents + registry actions)

## 0.5.0
- **U-017** (ux) — Workspace undo/redo (mod+Z) + table multi-select bulk bar + bar-driven row search
- **U-018** (a11y) — A11y baseline: aria-live toasts, arrow-key drill nav, overlay focus land/return

## 0.4.5
- **U-016** (ux) — Panel search in the bar (flat row) + quiet secondary / destructive foot buttons

## 0.4.4
- **U-015** (ux) — Sidebar space KPIs (root mirror) + three-tier responsive shell

## 0.4.3
- **U-013** (ux) — Tables v3 · Notion row peek · the entity sheet (pipeline pills, facets, activity)
- **U-014** (design) — Menu design v2 · XXL exact-width semantics · double-click panel align

## 0.4.2
- **U-011** (ux) — Panel setups remembered, root-respecting deep-links, drill hover polish, no-dash copy
- **U-012** (design) — Separator dedup · neutral focus ring · resizable pinned refs

## 0.4.1
- **U-009** (design) — Flat everything — doc cards, stats, drills, anat-rows and list rows lose their boxes (hairline grammar)
- **U-010** (engine) — Root-close promotion — closing the root hands the lead to its child; the space ends at the last panel

## 0.4.0
- **U-001** (engine) — Pinned roots · reload keeps pins · Back/Forward rewind (urlSync push)
- **U-002** (design) — A×F5 form grammar — the title IS the field; form cards abolished
- **U-003** (layout) — Crumbbar utilities — bare theme icon at the right, repo link beside it, topbar decluttered
- **U-004** (layout) — Dedicated space menus — the sidebar mirrors the OPEN space, with back arrow and root show/hide
- **U-005** (layout) — Reference rail v2 — S-capped refs, scroll-to-leaf, removable chips, root-ref consume-on-resume
- **U-006** (ux) — First-run auto-open · ⌘K indexes live stores · mobile dashboard switcher
- **U-007** (design) — Foundations — one foot-button family, fixed-position popovers, no native selects/pickers, no emoji chrome
- **U-008** (perf) — Bundle diet — lazy heavy panel modules behind a store-only seam; trim icon mega-packs
