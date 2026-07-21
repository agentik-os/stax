# Stax Design Spec — the pixel-level transformation contract

This is the authoritative UI/UX spec of the Stax panel system. Every value below is the
one shipped in `frameword/apps/crm-specimen/src/styles.css` + `tokens.css`. During a
migration, **every visual element of the old app is converted against this contract** —
icons, cards, badges, buttons, tables, spacing, type, color, states. Nothing is restyled
"by eye": each element maps to a row of the element matrix and each row lands on the
values in this file.

## 1 · Panel anatomy — interior margins are law

```
┌─ .panel ──────────────────────────────── radius 14 · 1px border · shadow-2xs ─┐
│ .panel-bar     h 56 · padding 0 10px 0 16px · gap 10 · 1px bottom border      │
│   .eyebrow     mono var(--fz-mono) · tracking 0.14em · uppercase · muted      │
│ .panel-body    padding 18px 18px 16px · flex column · scrolls (thin bar)      │
│   .panel-title serif var(--fz-title 27) · lh 1.08 · tracking -0.02em         │
│                margin 4px 0 8px                                               │
│   .panel-sub   0.96 × fz-body · muted · margin 0 0 18px · max 54ch           │
│   content …                                                                   │
│ .panel-foot    padding 11px 14px · gap 8 · 1px top border · bg secondary      │
└───────────────────────────────────────────────────────────────────────────────┘
```

- Panel widths come from the registry only: **S 380 · M 480 · L 640 · XL 800 · XXL fluid**. XXL sizes to EXACTLY the
  stage's visible width (`calc(100% - stage-pad)`) so an aligned XXL panel
  breathes the same gutter on both sides; a size change re-scrolls the stage to
  the leaf; double-clicking any panel bar aligns that panel at the pad. Pinned
  references default to S but every size (XXL included) applies in pin mode.
  Never a hardcoded width on a panel.
- Stage: gap `var(--stage-gap, 14px)`, gutter `var(--stage-pad, 18px)` on BOTH sides
  (left padding + end spacer). A flexing panel (canvas/kanban) keeps the right gutter.
- Inside the body, blocks stack with these exact rhythms:
  - `.card` (doc block) — **FLAT**: no border, no bg, radius 0; hairline TOP, padding
    **14px 0 15px**; its `.lab` mono label gets margin-bottom 8. Borders belong to
    FLOATING surfaces (menus, popovers, pickers), INPUTS and MEDIA — in-flow content
    is flat, structured by hairlines and rhythm.
  - `.stats` — no tiles: a vertical hairline BETWEEN stats (padding 18 both sides).
  - `.drills` — hairline top on the list, hairline between rows; the list bleeds
    **12px into the gutter** (margin 0 -12px, row padding 12px) so hover breathes while
    text keeps the flat-block left edge. Separators are drawn as 12px-INSET pseudo
    hairlines (`.drills::before`, `.drill::after`), never as borders on the bled box:
    only the FILL bleeds, never a line. Hover = secondary fill + the row's own 1px
    hairline turns **accent** (same thickness); index/arrow accent, arrow slides 3px.
    Row meta tags are flat mono uppercase, never pills. A row that pairs a drill
    with a TRAILING action (pin, edit) draws the separator on the ROW wrapper, not
    the drill, so the line still reaches the shared right bound.
  - **Separator law** — ONE hairline between any two stacked blocks, never two:
    containers absorb their first child's top hairline; lists drop the last row's
    bottom hairline. And ONE alignment: every separator in a panel shares the EXACT
    left/right bounds of the head hairline (the content box); a surface that bleeds
    into the gutter draws its lines inset back to those bounds.
  - **Focus ring** — neutral (foreground mix), suppressed while hovered/active
    (Safari fires :focus-visible on click); keyboard keeps it. Never accent.
  - `.anat-row` — hairline top, padding 10/0, mono accent label column 104px.
  - Popover labels `.pop-sub` — margin-bottom 6.
- The foot is the ONLY action zone: primary CTA = accent bg + **accent border** +
  `--accent-hover` on hover; destructive = `--destructive` text. Never object-state
  toggles (pin/unpin) in the foot; never metadata lines.

## 2 · Type & numbers

| Role | Font | Size | Rules |
|---|---|---|---|
| Display / panel titles | `--font-serif` (Newsreader) | `--fz-title` 27 | weight 400, tracking −0.02em |
| Body | `--font-sans` (Inter) | `--fz-body` 13.5 | derived sizes via `calc(var(--fz-body) * k)` |
| Labels / eyebrows / data | `--font-mono` (Geist Mono) | `--fz-mono` 10 | uppercase, tracking 0.08–0.14em |
| **Every numeric value** | `--font-mono` | context | `tabular-nums`, tracking −0.02em — **numbers are never serif** |

All sizes derive from the three `--fz-*` user preferences. A migrated element with a
pixel font-size that ignores them is a defect.

## 3 · Color — one accent, everything derived

- Base tokens only: `--background --card --secondary --border --rule-1 --foreground
  --muted-foreground --ink-2 --ink-4`.
- ONE accent (`--accent`, default Supreme red oklch(0.578 0.245 27)) with derived ramp:
  `--accent-soft` (pills), `--accent-hover` (hover — **mix in OKLCH, never oklab**:
  oklab browns reds), `--accent-2/3/4` (72/45/22% mixes) for multi-series data.
- Semantic green/amber exist ONLY for do/don't dots and notification dots. Charts,
  statuses, kanban dots, funnels: **accent ramp + neutral inks**.
- Text on accent = `--accent-foreground` (computed by luminance for custom accents).
- Every theme block must define every surface token (light AND dark — a token missing
  from one theme is a defect).

## 4 · Shape, depth, motion

- Radius scale: panels 14 · cards/stats 12 · drills/menus 10 · buttons 7-8 · inputs 7 ·
  pills 9999.
- Shadows: resting `--shadow-2xs`, floating menus `--shadow-md`, drawers `--shadow-lg`.
  The last panel carries the reading-order edge shadow; non-focused panel bars tint
  `--secondary`; pinned panels get `inset 0 2px 0 var(--accent)` on the bar.
- Motion: one ease `var(--ease)` (cubic-bezier(0.32,0.72,0,1)); panels 260ms in,
  menus 100-160ms fade/rise. No springs, no bounces.

## 5 · Icons

- Stroke icons only (Lucide-style): viewBox 24, **strokeWidth 1.6–1.7**, round caps and
  joins, `currentColor`. Sizes: topbar 14, toolbars 15, inline 12-13.
- No emoji in UI chrome — editorial glyphs only (§ ¶ ✶ → ⌄ ✓ ⋯).
- Every icon of the old app is inventoried and either mapped to a stroke equivalent or
  dropped with a decision-log entry.

## 6 · Controls — conversion table (old world → Stax)

| Old element | Stax target |
|---|---|
| Modal / dialog | Panel (size by content) opened to the right — parent stays |
| Tabs | Sibling drills, or in-panel sections (never a tab strip) |
| Dropdown `<select>` for a status-like choice | Segmented `d-btn sm` buttons (filled = active) |
| Native date/time input | Popover calendar (`.dp-pop`, Monday-first) + 30-min time list |
| Inline rename / boxed edit-in-place | `.inline-edit` — text-like, zero border, zero ring |
| Focus ring on inputs | ONE accent-tinted border; outline reserved for buttons (keyboard) |
| Toolbar of 10+ flat buttons | Grouped smart menus (trigger shows active state) |
| Menu / dropdown items | Sans 500 rows; MONO uppercase group labels; selected = accent-soft text + right ✓ — never a filled slab; segments keep the soft fill |
| Record side peek (Notion-style) | Row hover reveals an `Open` chip on the title cell → the ENTITY SHEET: a fixed right drawer (agent-drawer language, 440px) with header (table eyebrow · icon actions ↗/⋯/×), serif editable title, PIPELINE PILLS derived from the first select field (click = set stage, live in the grid), underline facet tabs (Fields · Page · Activity · n) and a per-row note/task stream with a composer. `Open as panel` converts the peek into a thread panel |
| Toast / snackbar stacks | `.toast` mono pill, bottom-center |
| Hover affordances | Reveal on row/element hover (edit pencils, open arrows at opacity 0 → 1) |
| Data grid | `.dt` table — sticky mono headers, hairline `--rule-1` grid, borderless cell
  inputs (focus = 5% accent tint), typed cells (mono numbers right-aligned, accent select
  pills, accent checks), row opens as the NEXT panel (a page) |
| Free-form board / diagram | Canvas panel — WhitePaper nodes, 4-way handles, accent edges |
| Wizard | Chained drills with foot CTAs |
| Form/inspector card ("Element", "Details"…) | **The title IS the field**: the entity's name/subtitle edit in place as the panel's serif title block (`.fs-head`/`.fs-title`/`.fs-sub`, rhythm 6/12/18); every remaining group is a flat `.section` (mono label + hairline top) — form cards are FORBIDDEN |
| Global search | ⌘K palette |
| Chat / AI helper | Full-height drawer (⌘J) |

## 7 · States — all six, for every element

Every migrated element ships all of: default · hover · focus/active · empty ·
loading/skeleton · error. Empty states are sentences with a next action, not blank
space. A migrated element missing a state keeps its matrix row open.

## 8 · The Shell: the chrome contract (topbar · sidebar · crumbbar)

A converted app ships THIS shell — every element below is part of the transformation,
inventoried in the element matrix and rebuilt to this anatomy. Nothing of the old
chrome (headers, navbars, user menus, settings pages, notification trays) survives
outside it.

**Topbar (h 52, solid card bg — NEVER backdrop-filter: it breaks fixed descendants):**
- sidebar toggle (bare icon 16) · dashboard NAV as dropdown triggers (icon 14 + label
  + caret; menu = numbered dd-items, one per space, footer hint) · spacer ·
- GO TO pill (⌘K) · utility icons 15 (system spaces: data, notes, tasks, canvas) ·
- notification bell (unread dot; dropdown: search, All/Unread segment, kind dots,
  mark-all-read foot) — the ONLY floating menus allowed are these chrome dropdowns.

**Sidebar (w 240, overflow hidden):**
- org/tenant switcher head (logo tile 15, name + tier, ⇅; menu = org rows + ⌘1-3) ·
- Quick open row (⌘K, filled) ·
- the SPACE area: dashboard's space list at rest; a DEDICATED space menu when one is
  open (‹ back arrow 26 with instant tooltip = dashboard name; head row = plain sans
  600 row, click focuses/reopens the main; collapse toggle always rendered, disabled
  when inert; numbered children 01…, one-level expansion ≤14, active thread
  highlighted) · compact adds a 4-icon dashboard switcher row ·
- usage/pipeline block (mono label, value, hairline track) ·
- account chip (avatar 28 + name + role/email, ⋯): menu = Profile · Settings ·
  Documentation · separator · Language accordion (inline rows, flag 18 SVGs, no
  side-flyout: the sidebar clips) · separator · Sign out. Avatar everywhere follows
  the profile store instantly.

**Crumbbar (h 34):**
- home glyph → thread crumbs (mono, focused = accent, click = navigateTo rewind) ·
  spacer · transient toasts (inline text, never floating pills over the UI) ·
  repo/GitHub link · theme toggle — both as bare 24px icons, menus open UPWARD.

**Panels-only surfaces:** settings = a sys PANEL (appearance, fonts, accent, zoom,
shortcuts) — never a page; profile = entity panel (fs-head name/role); language and
theme are DEVICE-LOCAL prefs (localStorage), never navigation state.

**Mobile ≤640 (PushHost):** one card + back, ref chips with remove ×, sidebar becomes
an overlay carrying the dashboard switcher; ≤760 hides the topbar nav (the sidebar
switcher takes over).
