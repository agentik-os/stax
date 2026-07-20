# PHASE 3/9 — UI INVENTORY — forensic design crawl, pixel granularity

ROLE: forensic design auditor. Phases 1-2 inventoried what the app DOES; you
inventory what it LOOKS LIKE — down to the last icon, hex value, and margin.
Read {{TARGET}}/stax-migration/design-spec.md FIRST: it is the contract every
element will later be converted against; your rows are its work queue.

TARGET: {{TARGET}}  (stack: {{STACK}})
WRITE:  {{TARGET}}/stax-migration/element-matrix.csv (rows under the existing
        header) + a design summary appended to inventory.md. Nothing else —
        no app code, no feature-matrix.csv, no state.json.

## The law of this phase

> The smallest visual detail is a row — an icon used once is a row.

The pixel guarantee downstream is mechanical: an element without a row will
never be converted, and nobody will notice until a user does.

## Protocol — crawl source AND running UI, count everything

1.  ICONS — every icon: name it (or describe it precisely), source (library /
    inline svg / sprite), COUNT of uses, rendered sizes, stroke vs filled.
2.  BUTTONS — every variant (primary, secondary, ghost, icon-only, danger,
    link-button…): bg, border, radius, padding, hover treatment.
3.  CARDS — every card/tile style: padding, radius, border, shadow.
4.  BADGES & PILLS — every badge/pill/tag/chip variant and its colors.
5.  INPUTS — text inputs, textareas, checkboxes, radios, toggles: border,
    radius, focus treatment (ring? border? both?).
6.  SELECTS & DROPDOWNS — native `<select>` vs custom; what each one chooses
    (status-like choice vs open set — phase 5 maps them differently).
7.  DATE/TIME CONTROLS — native `<input type=date|time>` vs custom pickers.
8.  TABLES & GRIDS — header style, row height, gridlines, cell types,
    numeric alignment, inline editing, sticky behavior.
9.  CHARTS — every chart: type, colors used, legend/tooltip styling.
10. NAV ELEMENTS — sidebar items, topbar, breadcrumbs, footers, palette.
11. MODALS / DRAWERS / TOASTS — their VISUAL treatment (overlay, shadow,
    radius, placement) — the behavioral rows live in the feature matrix.
12. SPACING — the histogram of paddings/margins/gaps ACTUALLY used: grep px
    values in styles, count occurrences of each (`8px ×41, 12px ×28, 13px ×2…`).
13. TYPE — every font family and every font-size value, with counts.
14. COLOR — every hex/rgb/hsl/oklch literal found, with counts.
15. SHADOWS & RADII — every distinct box-shadow and border-radius value.
16. STATES — for each interactive element: which of the six states (default,
    hover, focus/active, empty, loading, error) EXIST and which are MISSING.
    A missing state is a row too (kind=state) — absence is a finding.

## element-matrix.csv columns

| column | value |
|---|---|
| id | `E-NNN` (zero-padded), `E-NNN.N` for sub-elements — a button's hover variant, a table's cell type. Sub-elements are gated individually, exactly like sub-features. |
| area | app area where it lives ("global" if cross-cutting) |
| element | precise name ("trash icon", "primary button", "status select on deals") |
| kind | one of: icon, button, card, badge, input, select, table, chart, nav, modal, toast, spacing, color, type, state, other |
| count | occurrences found (the number from your crawl) |
| source | citation — file:line or style-sheet selector |
| stax_target, tokens, spacing | LEAVE EMPTY — phase 5 fills them |
| status | `inventoried` — always |
| evidence | LEAVE EMPTY — phase 7 fills it |

CSV hygiene: quote fields containing commas; never reorder existing rows.

## Also: append to inventory.md

Add a `## Design inventory summary` section: the color palette (every literal
+ count), the spacing histogram, the font-size list, and the icon census.

## Exit criteria — prove the crawl, don't claim it

1. Grep reconcile, shown raw: `grep -roE "#[0-9a-fA-F]{3,8}" src | wc -l`,
   a font-size grep, an svg/icon-import grep (adapt to {{STACK}}) — and
   reconcile each count against your rows (a color literal with 40 hits is
   ONE row with count=40, not 40 rows).
2. Every interactive element has its states row(s) — missing states included.
3. Run `node {{CLI}} status {{TARGET}}` — the element count must dwarf the
   feature count; a 30-feature app with 12 elements means you did not crawl.

When you are done, stop. Do not map anything (phases 4-5).
