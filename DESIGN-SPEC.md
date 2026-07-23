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
│ .panel-bar     h 44 · padding 0 10px 0 16px · gap 10 · 1px bottom border      │
│   .eyebrow     mono var(--fz-mono) · tracking 0.14em · uppercase · muted      │
│ .panel-body    padding 18px 18px 16px · flex column · scrolls (thin bar)      │
│   .panel-title serif var(--fz-title 27) · lh 1.08 · tracking -0.02em         │
│                margin 4px 0 8px                                               │
│   .panel-sub   0.96 × fz-body · muted · margin 0 0 18px · max 54ch           │
│   content …                                                                   │
│ .panel-foot    padding 7px 14px  · gap 8 · 1px top border · bg secondary      │
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
  - `.stats` — no tiles: a vertical hairline BETWEEN stats (padding 18 both sides);
    the block is a GRID of equal tracks (`grid-auto-columns: minmax(0, 1fr)`, never
    flex) so the hairlines land at exact even divisions; margin-bottom 12. QUIET:
    values are 17px mono, never display-size — the sidebar KPI block already
    carries the numbers, the hero states them without shouting.
  - **Vertical rhythm law** — hairline-carrying blocks stack EDGE TO EDGE (gap 0):
    the air around a hairline comes from the blocks' own paddings (rows 12,
    cards 14/15, sections 15/16), never from ad-hoc spacer divs or inline margins.
    Surfaced blocks (code, demos) carry their own margin-bottom 14-16; the head
    closes with margin-bottom 18.
  - `.drills` — hairline top on the list, hairline between rows, and everything
    sits ON THE TEXT RAIL: the list does NOT bleed into the gutter (margin 0,
    row padding 12px 0). The hover FILL, the pseudo hairlines (`.drills::before`,
    `.drill::after`, both left/right 0) and the text share EXACTLY the same
    bounds — nothing ever overhangs the rail, in either theme (dark makes any
    overhang glare). Hover = secondary fill + the row's own 1px hairline turns
    **accent** IN PLACE (no width change, no expansion choreography), and the
    EDGE CONTENT breathes INSIDE the fill: the index nudges +10px, the arrow
    -10px, by TRANSFORM only (zero layout shift) — text glued to a fill edge
    reads cramped, but padding would move the rail. The LAST
    row has no hairline at rest (the dedup law gives it to whatever follows),
    so hover paints none there: inventing a line under the cursor doubles the
    next block's separator. Index and arrow turn accent while they breathe.
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
  - **Exit transitions** — an EXPLICIT close gesture (×, the compact back ‹,
    ctrl+X, Escape on the leaf, the bridge's close()) leaves a 150ms ghost of the panel (opacity + 0.98 scale, the panel's
    own ease; `prefers-reduced-motion` skips it). Engine-driven removals (space
    switches, promotion) stay instant: those are navigations, not departures.
  - **A11y baseline** — toasts announce via a `role="status"` aria-live region;
    ArrowUp/Down walk the drill rows of the list the focus is in; overlays
    (sheet, drawer) move focus inside on open and RETURN it to the opener on
    close; every icon-only control carries a title/aria-label. The stage is a
    `<main>` landmark. DARK-ACCENT LEGIBILITY LAW: an accent-filled control's
    text follows the accent's lightness per theme — a dark theme brightens the
    accent (L≈0.7), so its text goes NEAR-BLACK (white by inertia measures
    ~2.5:1, illegible); contrast is MEASURED (canvas oklch→sRGB, ≥4.5:1), not
    eyeballed. REDUCED MOTION covers EVERY entry-animated surface (panels,
    menus, palette, drawer, sheet, dropdowns, backdrops, toasts…), never a
    partial list — but infinite FUNCTIONAL indicators (recording, typing,
    skeletons) keep their opacity beats: freezing them loses information.
    COARSE POINTERS inflate hit areas invisibly (::after insets) to ~44px
    without moving a pixel of chrome; zones tile without overlap so a mis-tap
    never lands on Close. Shortcut HINTS are platform-aware (⌘/⌃ on mac,
    Ctrl+ elsewhere) via one keys module — bindings never change, only glyphs.
  - **Title punctuation** — SECTION titles end with a period ("Blocks.");
    LEAF titles never do ("Terminal"). The period is the section's voice.
  - **Row-revealed actions** — a trailing per-row action (pin, edit) is a
    QUIET 24px icon at opacity 0, revealed by row hover or :focus-within,
    accent when active — never a bordered full-height capsule in the row.
  - `.anat-row` — hairline top, padding 12/0, mono accent label column 104px.
  - Popover labels `.pop-sub` — margin-bottom 6.
- The foot is the ONLY action zone, with a strict hierarchy: ONE primary CTA per
  foot (accent bg + accent border + `--accent-hover` on hover); SECONDARY actions
  are QUIET (hairline `--border`, ink-2 text, secondary fill on hover — never
  accent chrome); destructive rests in MUTED ink and only turns `--destructive`
  red on approach (hover/focus): delete never rhymes with the primary. Never object-state toggles (pin/unpin) in the foot; never
  metadata lines.
- AI actions are REGISTRY citizens: kind "ai" renders as the ✶ signature on an
  accent-SOFT chip (never accent-filled: the one-primary law counts fills); its
  run computes a REAL insight from the panel's data and hands it to the agent
  surface (stax:ai). The palette and the bridge list them like any action.
- The panel SEARCH lives in the FOOT, FAR LEFT: the quiet icon-only ⌕ is the
  foot's FIRST element, and its active input starts from the same left edge
  (passive and active states share the anchor). Clicking it swaps the foot
  content into a borderless search row (same 44px height, autofocus, a quiet
  ×; Escape restores the actions, never closes the panel). It
  live-filters the panel's lists; zero matches show a one-sentence empty state
  with the next action.

## 2 · Type & numbers

| Role | Font | Size | Rules |
|---|---|---|---|
| Display / panel titles | `--font-serif` (Newsreader) | `--fz-title` 27 · ROOTS 32 | weight 400 (roots 450, opsz 32): the thread shows a visible hierarchy of rank |
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
| List page with a search box | Foot ⌕ toggle: the foot swaps into a borderless search row (same height); Escape restores the actions |
| Kanban board | A saved view with type BOARD: the first select field's options are the columns; dragging a card RESTAGES it (writes the field); column head = mono label + count |
| Card grid | View type CARDS: flat responsive cards, click = the peek sheet |
| Long list | View type LIST: one-line rows in the drill grammar |
| One dataset, many layouts | table · board · cards · list are VIEW TYPES over the SAME rows, switched from the foot segments — never separate pages |
| Global filter bar / fund switcher / archived toggle | FOOT SEGMENTS (.foot-seg: hairline container, mono labels, card-bg active) + the live count as a foot note — the foot is the panel's control deck |
| Hero KPI strip | QUIET stats (17px mono values) + the sidebar KPI mirror; display-size numbers never sit in a panel hero |
| Filter builder | CLICK-THROUGH, never typed: pick a field, then per-type value pickers (select options as toggles with "is any of", dates via the popover calendar, check as two segments); active filters render as CHIPS in the toolbar (click the chip to edit values, × to drop); free typing only for text "contains". The table toolbar is ONE row: view tabs + filter chips + tools |
| Embedded terminal / CLI surface | A PANEL: mono scrollback in the body (❯ accent prompts, err in red), the PROMPT in the FOOT (the action zone), ArrowUp/Down history, Escape blurs; the verbs speak the copilot bridge — status/open/pin/undo really drive the workspace |
| LLM chat | A chat is CONTENT, not chrome: the thread is a panel body (mono speaker labels, hairline separators, typing beat), the composer is the foot; /commands drive the workspace through the bridge; pin it, drill beside it, share it in the workspace link. The agent DRAWER stays the global assistant |
| Team task manager | Tasks carry assignee · priority · project; ONE group control (status / person / priority / project) drives BOTH the list sections and the kanban columns, and dropping a card WRITES the group's field; "Mine" filters to the CONNECTED profile; people/project filters are click-through chips; assignees render as initial avatars, projects as ghost tags |
| Menu / dropdown items | Sans 500 rows; MONO uppercase group labels; selected = accent-soft text + right ✓ — never a filled slab; segments keep the soft fill |
| Record side peek (Notion-style) | Row hover reveals an `Open` chip on the title cell → the ENTITY SHEET: a fixed right drawer (agent-drawer language, 440px) with header (table eyebrow · icon actions ↗/⋯/×), serif editable title, PIPELINE PILLS derived from the first select field (click = set stage, live in the grid), underline facet tabs (Fields · Page · Activity · n) and a per-row note/task stream with a composer. `Open as panel` converts the peek into a thread panel |
| Toast / snackbar stacks | `.toast` mono pill, bottom-center |
| Hover affordances | Reveal on row/element hover (edit pencils, open arrows at opacity 0 → 1) |
| Data grid | `.dt` table — sticky mono headers, hairline `--rule-1` grid, borderless cell
  inputs (focus = 5% accent tint), typed cells (mono numbers right-aligned, accent select
  pills, accent checks), row opens as the NEXT panel (a page), never instead of it.
  Views carry their OWN settings via the active tab's menu (rename, duplicate,
  Cozy/Compact density per view, reset, delete); the ⋯ menu exports a real CSV
  (visible fields, filtered+sorted rows); the row menu inserts a row below; the
  foot's New row adds IN PLACE (reveals the row, never opens a panel). The foot ⌕
  drives the row quick-search; rows multi-select via quiet hover checkboxes
  (header = select-all-visible) and a selection shows a BULK BAR in the toolbar
  (count · Duplicate · Delete red-text · clear) |
| Free-form board / diagram | Canvas panel — WhitePaper nodes, 4-way handles, accent edges |
| Wizard | Chained drills with foot CTAs |
| Form/inspector card ("Element", "Details"…) | **The title IS the field**: the entity's name/subtitle edit in place as the panel's serif title block (`.fs-head`/`.fs-title`/`.fs-sub`, rhythm 6/12/18); every remaining group is a flat `.section` (mono label + hairline top) — form cards are FORBIDDEN |
| Global search | ⌘K palette |
| Close the focused panel | ctrl+X (inert while typing) + the bar × + Escape on the leaf. The Escape LADDER peels one layer per press: overlay → live table selection → popover/sheet → palette → drawer → menus → leaf panel |
| Search the focused panel | "/" (inert while typing) opens its foot search |
| Undo / redo a workspace intent | mod+Z / shift+mod+Z (bounded stack in the provider; a FOCUSED canvas keeps its own board history) |
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
- utility icons 15 (system spaces: data, notes, tasks, canvas) ·
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
- SPACE KPIs block: when the active space's ROOT declares kpis, the sidebar
  mirrors them right above the pipeline block (same source of truth as the panel's
  .stats, never a second dataset): equal grid tracks, mono tabular values, mono
  uppercase labels (ellipsised), a full-width hairline below so the pipeline keeps
  its own separator. No kpis on the root → the block does not render ·
- usage/pipeline block (mono label, value, hairline track) ·
- account chip (avatar 28 + name + role/email, ⋯): menu = Profile · Settings ·
  Documentation · separator · Language accordion (inline rows, flag 18 SVGs, no
  side-flyout: the sidebar clips) · separator · Sign out. Avatar everywhere follows
  the profile store instantly.

**Crumbbar (h 34):**
- home glyph (click FOCUSES the space root and scrolls the stage back — it never
  closes anything; ⌥click rewinds the thread to the root) → thread crumbs (mono,
  FOCUSED = the one accent crumb — the leaf is bold ink, never a second accent;
  click = focus + scroll, ⌥click = rewind; the "n pinned refs" crumb clicks
  through to the rail's first reference) ·
  spacer · transient toasts (inline text, never floating pills over the UI —
  sole exception: the SELF-DRIVING TOUR narrates via the bottom-center .toast
  pill in a larger subtitle size, because tour eyes are on the stage, not the
  corner) ·
  **⌘K chip** (the palette's ONLY chrome: a bare mono "⌘K" at 11px, borderless,
  bottom-right, just LEFT of GitHub — never a labeled pill in the topbar,
  never a boxed kbd chip) ·
  repo/GitHub link · theme toggle — icons as bare 24px, menus open UPWARD.

**Shareable workspaces:** "Copy workspace link" carries the FULL state
(gzip+base64url in `#ws=…`, no backend); a receiver restores it at boot OR on
live hash paste, then the hash rewrites to the normal thread encoding.

**Devtools (sys panel):** the workspace inspected by itself — live state JSON,
the intent history (each entry = the state an intent replaced), Jump =
time travel through ws.restore (undoable). The keyboard map ships as the "?"
overlay (palette chrome, Escape closes it first).

**Enterprise adoption — the strangler contract:** day 1, the WHOLE legacy app
runs inside the shell as LEGACY EMBED panels (iframe/srcDoc in the grammar,
media-rule border) — 100% capability before a single screen is rebuilt. Every
source capability is a row of `stax-migration/parity.csv` (id, capability,
probe deep-link, expect: panel | action:<id> | text:<needle>); `stax-migrate
parity --url` DRIVES each row against the live app and exits non-zero unless
100% pass: a migration that loses one capability is a failed migration.
Screens are replaced in place, one at a time, each swap parity-gated; the
embed shrinks until the legacy host dies, and the contract stays in CI forever.

**The design laws are CI:** `stax-migrate verify --url --themes light,dark`
runs on every push/PR (build → preview → scan, BOTH themes): L-ALIGN,
L-RHYTHM, L-FOOT, L-FLOW fail the build. `stax-migrate doctor` prints the
adoption health report (contract, pending upgrade units, hardcoded-value
drift) with its prescription.

**The sheet speaks the full grammar:** its facets are FOOT segments (never
underline tabs — that motif exists nowhere), and the foot riffles sibling
records (‹ › + ArrowUp/Down, position i/n): walk records without closing.
The LAST slabs are gone: table headers/calc bands sit on the card surface
over one hairline; board and kanban columns are hairline GUTTERS — cards are
the only objects. A chosen date reads as bare mono text, never a filled pill.

**Power gestures:** digits 1-9 drill the focused panel's painted 01/02/03
rows; shift-click selects a RANGE of table rows; a crumb click FOCUSES and
scrolls (⌥-click rewinds — looking back is free, chopping is deliberate);
the first run offers "Play the tour" in the Overview foot until COMPLETED —
an early Escape never consumes the offer (the toured flag writes at the tour's
END, not its start). A plain vertical mouse WHEEL translates the horizontal
stage when nothing under the cursor scrolls natively (trackpads and scrollable
descendants keep their gestures).

**Thread memory:** returning to a space RESUMES its last thread (the resume
point records on every settled path; switching spaces costs nothing). Deep
panel eyebrows carry their PARENT ("Acme Industries › contact"), never a bare
type — dynamic entities use friendly words (page, table, folder), and the
eyebrow SPLITS so the parent segment ellipsizes while the type token never
truncates (RR-7 applied to the bar). Floating surfaces (palette, drawer, sheet) exit in 140ms mirrors of
their entries — nothing blinks out.

**The copilot bridge:** the shell exposes `window.stax` (serializable state,
intents, the action registry) so agents DRIVE the workspace instead of faking
clicks; the agent drawer's /commands speak it. Contract: agents.md M8.

**Panels-only surfaces:** settings = a sys PANEL (appearance, fonts, accent, zoom,
shortcuts) — never a page; profile = entity panel (fs-head name/role); language and
theme are DEVICE-LOCAL prefs (localStorage), never navigation state.

**Responsive rules (numbered — a migration implements ALL of them):**

- **RR-1 Three tiers.** ≥900 the sidebar is DOCKED (240px beside the stage);
  640-900 it AUTO-CLOSES and reopens as an OVERLAY with backdrop (a docked
  240px sidebar starves the stage: a 640 L panel never fits), any nav click
  closes it; <640 is PushHost: one card + back-stack navigation.
- **RR-2 Nav collapse.** ≤760 the topbar nav dropdowns hide; the sidebar
  switcher takes over. The topbar keeps only brand + icon utils.
- **RR-3 The chrome never leaves.** The crumbbar (h34) survives EVERY width
  with its full right cluster — ⌘K chip, GitHub, theme — and never wraps.
- **RR-4 Crumbs middle-collapse.** <640 with a path deeper than 2, the
  crumbbar shows `home › … › parent › leaf`; the `…` crumb focuses the
  nearest hidden panel. Long crumb titles ellipsize at 96px — a title never
  pushes the right cluster out.
- **RR-5 Overlays clamp.** Fixed drawers (agent 380, sheet 440, palette 560)
  all clamp to 88-92% of the frame; they never touch both edges.
- **RR-6 No sideways document.** The document NEVER scrolls horizontally at
  any width — only the stage scrolls (and wide blocks scroll inside their own
  container). `scrollWidth <= clientWidth` is a testable invariant.
- **RR-7 Text degrades, never clips.** Stat labels, crumb titles and bar
  labels ellipsise; counts and kbd hints DROP before labels truncate mid-word.
- **RR-8 Compact refs.** PushHost ref chips carry a remove ×; the overlay
  sidebar carries the dashboard switcher.

**The shell at a glance:**

```
┌──────────────────── topbar h52 ────────────────────┐
│ ☰ · nav dropdowns · spacer · utils · 🔔            │
├─────────┬──────────────────────────────────────────┤
│ sidebar │  STAGE (scrolls horizontally)            │
│  org ⇅  │  ┌─ panel ─┐ ┌─ panel ─┐ ┌─ ref S ─┐    │
│  ⌘K row │  │ bar h44 │ │         │ │ (rail)  │    │
│  spaces │  │ body    │ │         │ │         │    │
│  ────── │  │ foot    │ │         │ │         │    │
│  KPIs*  │  └─────────┘ └─────────┘ └─────────┘    │
│  ────── │   *KPIs: only when the space's root      │
│  pipe   │    declares them (mirrors .stats)        │
│  avatar │                                          │
├─────────┴──────────────────────────────────────────┤
│ crumbbar h34: home → crumbs · toasts ⌘K gh theme   │
└────────────────────────────────────────────────────┘
```
