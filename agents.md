# Stax — prompts for AI agents

Stax is a panels-inside-panels (Miller-columns) UX framework: one mechanic —
click anything with depth and a panel opens to the RIGHT; the parent stays.
This file is generated from the live Prompt pack inside the demo app
(`frameword/apps/crm-specimen/src/domain.ts` — source of truth; regenerate
with `node frameword/scripts/gen-agents.mjs`).

**How to use:** paste one prompt into Claude Code, Codex, or any coding agent,
verbatim, with the target repo as cwd. Demand the evidence each prompt
specifies — citations, grep output, running builds. For a full gated migration
prefer the CLI: `node frameword/packages/stax-migrate/index.mjs init . --level full`.

Key references: [README.md](README.md) · [PANEL-LOGIC.md](PANEL-LOGIC.md) ·
[DESIGN-SPEC.md](DESIGN-SPEC.md) · [frameword/packages/stax-migrate/README.md](frameword/packages/stax-migrate/README.md)

## M8: Drive the workspace (agent bridge)

*The UI is an API: window.stax exposes the state and every intent.*

```text
You can DRIVE this Stax workspace at runtime through window.stax:
  getState()            -> the full serializable WorkspaceState
  path()                -> the current thread as resourceKeys
  find(text)            -> [{key, title}] fuzzy title matches
  open(key)             -> deep-link any resource (chain auto-rebuilt)
  openSpace(spaceId)    -> start a space thread
  actions(panelId?)     -> the focused panel's registry actions [{id,label,kind}]
  act(actionId, panelId?) -> run one (same actions the foot and ⌘K show)
  pin()/unpin()/close()/focus(id) -> panel intents
  undo()/redo()         -> workspace history
Rules: read getState() before acting; prefer act() over synthetic clicks;
never fabricate ids: they come from getState()/find(). The agent drawer's
/commands (/open /actions /run /pin /close /undo) are this bridge, spoken.
```

## M9: ANY dashboard → Stax

*Understand the source app's views, then rebuild them better: one dataset, four shapes.*

```text
ROLE: Dashboard transformer. Take ANY existing product (site, blog, SaaS dashboard, Notion workspace, Next.js mega-dashboard, admin panel) and REBUILD it as a Stax panels app with shadcn-grade atomic elements. The goal is to UNDERSTAND the product, then remake it better: never a 1:1 port of its layout.
PHASE 0: UNDERSTAND. Inventory EVERY screen of the source into view-matrix.csv (id,screen,data,shape,filters,actions,detail_path,kpis): shape is one of kanban | data-table | card-grid | list | detail-page | modal | chart | hero-kpis | filter-bar | nav. No screen skipped: the smallest settings modal is a row.
PHASE 1: MAP by the VIEW GRAMMAR, never by eye:
- kanban board -> a saved view with type BOARD: the first select field's options are the columns, dragging a card restages it (writes the field), column head = mono label + count.
- data table -> the dt grid (typed cells, per-view settings, CSV, bulk select).
- card grid -> view type CARDS (flat cards, click = peek sheet).
- long list -> view type LIST (one-line rows in the drill grammar).
ONE DATASET, FOUR SHAPES: table/board/cards/list are VIEW TYPES over the same rows, switched from the FOOT segments — never four separate pages.
- detail page or overlay -> the faceted SHEET first (pipeline pills from the stage field, facet tabs as the sub-menu line: Info / Financials / Notes / Documents...), 'Open as panel' promotes it to a full panel in the thread.
- global filter bar, fund/team switcher, archived toggle -> FOOT SEGMENTS (.foot-seg) with the live count as a foot note; per-panel search = the foot ⌕. The foot is the panel's control deck.
- hero KPI strip -> QUIET stats (17px mono values) + the sidebar KPI mirror; never display-size numbers in the hero.
- top nav / side nav -> spaces + drills; modals -> panels beside; settings -> a sys panel.
PHASE 2: REBUILD BETTER. Actions into the registry (foot = palette = window.stax bridge); every list searchable from the foot; undo everywhere; exit ghosts on close; both themes.
DEFINITION OF DONE: view-matrix.csv 100% mapped with the Stax target per row; every source capability reachable (cite where); stax-migrate verify --url <live> --themes light,dark PASS; the M7 token sweep clean. Evidence, not adjectives.
```

## M1: Decompose the existing

*Forensic inventory of every route, modal, tab, and flow before a single panel is drawn.*

```text
ROLE: Forensic UI auditor. Target: the app in this repo (or the URL/screens I provide). Goal: a complete FEATURE MATRIX before migrating to Stax, a panels-inside-panels (Miller columns) framework. Do NOT redesign, refactor, or propose panels yet: inventory only.
PROTOCOL: inventory each layer. EVERY row carries a citation (file:line, router-config entry, or screenshot ref). Uncited rows are rejected.
1. ROUTES: every route/page/layout: URL pattern, params, guards, lazy boundaries.
2. NAVIGATION: every nav surface (sidebar, topbar, breadcrumbs, command palette, footer) and the exact target of each item.
3. MODALS & OVERLAYS: every modal, dialog, popover, drawer, action-toast. Record trigger, content type (form | confirm | detail | picker | media), and content size (count fields/sections).
4. TABS & SEGMENTS: every tab bar / segmented control; note whether tabs facet the SAME entity or switch BETWEEN entities.
5. DETAIL VIEWS: every master->detail relation (list row -> what opens, and where it opens).
6. CRUD FLOWS: per entity: create / read / update / delete path, including multi-step wizards (record step count).
7. FILTERS / SEARCH / SORT: where each control lives and what scope it filters.
8. CHARTS & DASHBOARDS: every visualization, its data source, and whether it drills down on click.
9. CROSS-CUTTING: chat/assistant surfaces, settings, notifications, global search, onboarding.
OUTPUT: write `feature-matrix.md`: one table, columns: id | layer | name | current pattern (route/modal/tab/wizard/drawer/...) | entity | has-depth? (does it open something deeper) | size hint S/M/L/XL/XXL by content density | citation.
Then a SUMMARY: counts per pattern + the 5 hairiest items (nested modals, modal-inside-tab, wizard-inside-modal, etc.).
DEFINITION OF DONE: every route and every overlay in the codebase appears in the matrix. Prove coverage: run `grep -riE "modal|dialog|drawer|<Tabs" src | wc -l` (adapt to the stack), show the output, and reconcile the count against your matrix rows. Unreconciled hits = the audit is not done.
```

## M2: Map features to the grammar

*Deterministic legacy-pattern -> panel-grammar translation; zero judgment calls left implicit.*

```text
ROLE: Translator from legacy UI patterns to the Stax panel grammar (Miller columns: anything with depth opens a panel to the RIGHT, the parent STAYS; one Space active at a time; pinned references survive navigation). Input: the feature matrix from M1 (if absent, build a minimal one first). Output: a MAPPING TABLE: one row per matrix item, no item skipped, no row marked TBD.
APPLY THESE RULES DETERMINISTICALLY: never invent a new pattern:
- Top-level page / app section -> a SPACE. Max 7 spaces; merge cousins by workflow.
- Nav-section landing view -> the ROOT PANEL of its space.
- List row click / "view details" -> a DRILL: new panel to the RIGHT, parent list stays mounted.
- Modal -> a PANEL, sized by content: confirm or 1-3 fields = S; standard form = M; rich detail/editor = L; full workbench = XL; a stage-filling workbench (board, IDE-like surface) = XXL (fluid). Modals are FORBIDDEN in the output.
- Tabs faceting the SAME entity -> in-panel sections inside one panel. Tabs switching ENTITIES -> sibling drills from the same parent.
- Wizard / multi-step flow -> CHAINED DRILLS: step N opens step N+1 to the right; back = close the rightmost panel.
- Settings / preferences -> a sys panel (panelType `sys:*`), drilled from the space root: never a separate page.
- Chat / assistant -> full-height drawer panel, pinnable: never a floating bubble.
- Anything the user must keep visible while working elsewhere -> a PINNED REFERENCE (survives navigation and space switches).
AMBIGUITY RESOLUTION (apply in order): (1) a view that is both landing and detail = root panel, its detail parts become drills; (2) content overflowing XL = split into a drill chain, never scroll horizontally; (3) two rules match = the deeper-nesting rule wins (drill beats in-panel section); (4) still ambiguous = pick the mapping with the fewest simultaneous panels and log it in a DECISIONS section with one-line rationale.
OUTPUT: write `mapping.md`: table: matrix id | legacy pattern | Stax mapping (space / root / drill / section / chained-drill / sys / drawer / reference) | panelType (kebab-case) | size S/M/L/XL/XXL | parent panelType | citation to the matrix row.
END with the derived REGISTRY draft as a paste-ready TypeScript object: `{ [panelType]: { size } }` covering every panelType you named. Every matrix row must be traceable into it.
```

## M7: Integrate the design system

*Token bootstrap, element crawl, conversion table, six states: restyle ANY project onto the WhitePaper language, grep-proven.*

```text
ROLE: Design integrator. Restyle the target project onto the Stax WhitePaper design system: completely, token-first, with grep-proof. You change SKIN, not behavior: no feature work, no layout re-architecture beyond what the conversion table demands. If the project also needs the panel grammar, run M2/M3 first: this prompt assumes the surfaces exist and makes every pixel speak the design language.
PHASE 1: TOKEN BOOTSTRAP. Install the base tokens as CSS variables on :root, BOTH themes (a token missing from light or dark is a defect): surfaces --background --card --secondary --border --foreground --muted-foreground --ink-2 --ink-4; ONE accent --accent (default oklch(0.578 0.245 27)) with the derived ramp --accent-soft, --accent-hover (mix in OKLCH, never oklab: oklab browns reds), --accent-2/3/4 (72/45/22% mixes) and --accent-foreground (luminance-computed); type --font-serif (display ONLY) --font-sans --font-mono + --fz-title 27 --fz-body 13.5 --fz-mono 10 (every size derives via calc: a hardcoded font-size that ignores them is a defect); one ease cubic-bezier(0.32,0.72,0,1); radius scale 14 panels · 12 cards · 10 rows/menus · 7-8 buttons · 7 inputs · 9999 pills.
PHASE 2: ELEMENT CRAWL. Inventory EVERY visual element into element-matrix.csv (id,area,element,kind,count,source,stax_target,tokens,spacing,status,evidence): every icon (named, use-counted), button variant, card, badge, input, select, table, chart, toast, nav item, every color literal, every font-size, the spacing histogram. The smallest icon is a row. No row, no restyle.
PHASE 3: CONVERT, by the table, never by eye: dropdown select for status-like choices → segmented buttons (filled = active); native date/time inputs → popover calendar + 30-min time list; boxed edit-in-place → borderless .inline-edit (no ring, no window.prompt); focus rings on inputs → ONE accent-tinted border (outline stays for buttons/keyboard); 10+-button toolbars → grouped smart menus; toast stacks → one mono pill; icons → stroke-only Lucide-style viewBox 24 strokeWidth 1.6-1.7 currentColor (map or drop-with-log every legacy icon; NO emoji in chrome: editorial glyphs § ✶ → ⌄ ✓ ⋯ only); cards inside cards → borderless .section (lab + content); EVERY numeric value → --font-mono with tabular-nums (numbers are never serif: serif is display text only); accent-filled controls carry accent BORDERS with --accent-hover on hover; semantic green/amber reserved for do/don't and notification dots: charts, statuses, kanban dots use the accent ramp + neutral inks.
PHASE 4: RHYTHM. Apply the interior-margin law where panels exist: bar h44 pad 0 10 0 16; body 18/18/16; foot 7px 14px bg secondary (the ONLY action zone: one accent CTA family: ~30px, icon required, primary filled, destructive as red text, never metadata or state toggles); card 14/16 r12 mb16; drill rows 12/14 gap 8; stat 12/14. Widths from a registry (S380 M480 L640 XL800), never hardcoded.
PHASE 5: STATES. Every converted element ships all six: default · hover · focus/active · empty · loading/skeleton · error. Empty states are a sentence plus one next action, never blank space. A missing state keeps the matrix row open.
DEFINITION OF DONE: evidence, not adjectives: (1) element-matrix.csv 100% status=migrated, each row citing file:line; (2) `grep -rinE "#[0-9a-f]{3,8}\b" src` → zero app-level hex literals outside the token file (show raw output); (3) `grep -rinE "font-size:\s*[0-9]" src` → zero hardcoded px sizes off the --fz scale; (4) `grep -riE "<select|type=.date.|window.prompt" src` → zero status-selects, native pickers, prompt() renames; (5) screenshots of the 5 densest screens in BOTH themes; (6) the numbers check: every rendered numeric uses mono tabular (spot-DOM-check 10 random values, show computed font-family). Any failing check = not done; fix and re-run all six.
```

## M3: Migration plan (refonte)

*Seven gated phases from inventory to law-clean workspace, each with verifiable acceptance criteria.*

```text
ROLE: Migration planner for a refonte of this app onto Stax (panels-inside-panels; no modals/tabs/pages; serializable WorkspaceState { panelsById, contextLeafId, referenceRailOrder }; registry maps panelType -> size S/M/L/XL/XXL). Produce `migration-plan.md` with EXACTLY these 7 phases. For each: scope, concrete tasks, ACCEPTANCE CRITERIA, and the evidence the implementing model must show. A phase without shown evidence is NOT passed.
PHASE 1: INVENTORY: run the M1 forensic audit -> feature-matrix.md. Accept only if every route AND every modal is cited file:line and grep counts reconcile.
PHASE 2: MAPPING: apply the M2 rules -> mapping.md + registry draft. Accept only if zero TBD rows and every modal maps to a panel with a size.
PHASE 3: REGISTRY: implement the panel registry (panelType -> component, size, title resolver). Accept: it compiles, and a demo/story per panelType renders: show build output + one screenshot grid.
PHASE 4: SPACES: implement WorkspaceState + space switching (one space active). Accept: state serializes to JSON and restores an identical workspace: show the round-trip test RUNNING and passing.
PHASE 5: DRILLS: wire every drill in mapping.md; parent stays mounted; closing a panel closes its descendants. Accept: the 5 deepest chains clicked through with screenshots or an e2e run log.
PHASE 6: REFERENCES: pin -> detached reference on the rail, surviving navigation AND space switches. Accept: pin an item, switch space twice, dump referenceRailOrder: unchanged, reference still live.
PHASE 7: POLISH & PURGE: widths from registry only, design tokens only, delete every leftover modal/tab/detail-route. Accept: `grep -riE "modal|<Dialog|<Tabs" src` returns zero app-level hits (show output) and the M6 laws report is all-PASS.
STANDING DEMANDS ON THE IMPLEMENTING MODEL: cite file:line for every claim; ship RUNNING code (build log, test output, or screenshot: never intent); no phase starts before the previous phase's evidence is shown green. Restate these demands inside each phase's brief.
```

## M4: Build a NEW app on the grammar

*From a one-line idea to spaces, panel trees, and a compiling registry: questions first, code second.*

```text
ROLE: Product architect building a NEW app directly on the Stax panel grammar. Grammar facts you must obey: Miller columns: anything with depth opens a panel to the RIGHT and the parent STAYS; one Space active at a time; pin -> detached reference that survives navigation; state is a serializable WorkspaceState { panelsById, contextLeafId, referenceRailOrder }; a registry maps panelType -> size S/M/L/XL/XXL; modals, tabs, and route-per-page are FORBIDDEN.
STEP 0: ASK ME THESE, THEN STOP AND WAIT: (a) who is the user and the ONE job they hire this app for; (b) the 3-6 core entities and which contains which; (c) the 2-3 workflows run daily vs the ones run rarely; (d) what must stay visible while working on something else (pin candidates); (e) required cross-cutting surfaces (AI chat, settings, billing, search).
STEP 1: SPACES: derive 2-5 spaces from the workflow clusters (one active at a time). Name each and declare its root panel.
STEP 2: PANEL TREES: per space, draw the drill tree from root: root -> list -> detail -> sub-detail. Every node = panelType (kebab-case) + size S/M/L/XL by content density. Wizards = chained drills; same-entity facets = in-panel sections; settings = sys panel; chat = full-height pinnable drawer.
STEP 3: REGISTRY & STATE: emit `registry.ts`: `{ [panelType]: { component, size, title } }` for every node: and `state.ts` with the WorkspaceState types. Both must compile; show the tsc/build output.
STEP 4: GOLDEN PATHS: script the 3 main flows as explicit panel sequences (space -> root -> drill -> drill), marking which panels get pinned as references and why.
STEP 5: SELF-CHECK vs the laws: assert in writing: no modal, no tab bar, no detail route anywhere in the blueprint; every width traces to the registry; parent always visible on drill; state round-trips through JSON.
OUTPUT: `app-blueprint.md` (spaces, trees, golden paths, law self-check) + compiling `registry.ts` + `state.ts`. Do NOT write feature code before I approve the blueprint.
```

## M5: Wire an AI agent into the workspace

*The panel stack becomes the agent's context; the reducer becomes its only steering wheel.*

```text
ROLE: Integrate an AI agent into a Stax workspace. Principle: the WorkspaceState IS the agent's context, and the panel reducer IS its only navigation API. First locate and cite (file:line) the real WorkspaceState type and reducer actions in this repo: do not invent parallel ones.
CONTEXT CONTRACT: on every agent turn, serialize and inject: (1) the active space id; (2) the PATH: panels from root to contextLeafId, in order, each as { panelType, entityId, title, key facts }; (3) the REFERENCE RAIL in referenceRailOrder, same shape, flagged pinned:true. Weighting: the path is what the user is doing NOW; references are what they deliberately keep: say so in the system prompt. NEVER inject panels from inactive spaces.
NAVIGATION RULES: the agent drives the UI exclusively through the same actions a click dispatches: openPanel(parentId, panelType, entityId) = drill right; closePanel(id) = closes its descendants too; pinPanel(id) = promote to reference; switchSpace(id). Direct DOM or state mutation is forbidden.
GUARDRAILS (implement, don't just document): (a) max 2 panel opens per agent turn, each justified in its visible reply; (b) never close a panel the user opened this session without asking; (c) never unpin a reference; (d) destructive actions (delete, send, pay) are PROPOSED as a panel showing the exact payload: never executed silently; (e) context needed from another space -> ask before switching.
IMPLEMENT: (1) `serializeContext(state: WorkspaceState): AgentContext`: pure function, unit-tested against a fixture asserting the exact JSON; (2) the tool/function schema for the 4 nav actions; (3) a demo exchange where the user asks a question, the agent cites a pinned reference, and opens the correct drill.
EVIDENCE REQUIRED: the fixture test passing (real run output, not prose) and one end-to-end trace: user message -> injected context JSON -> tool call -> WorkspaceState diff. Every wiring claim cited file:line.
```

## M6: The non-negotiables contract

*The laws as machine-checkable assertions: a model must prove compliance, not claim it.*

```text
ROLE: Compliance auditor for the Stax panel grammar. Verify every LAW below against the RUNNING app AND the codebase. For each: PASS/FAIL + evidence (grep output, file:line, state dump, or screenshot). Prose without evidence = automatic FAIL. Adapt grep patterns to the stack, but always show the raw output.
LAW 1: NO MODALS: zero modal/dialog/lightbox at app level. Check: `grep -riE "modal|<Dialog|overlay" src`; every hit is a violation unless it is the framework's own panel layer. Action-free toasts are exempt.
LAW 2: NO TABS, NO PAGES: no tab bars; no route-push that replaces the workspace to show a detail. Check: grep for Tabs components and detail-route pushes; each hit must already map to sibling drills or in-panel sections: otherwise FAIL.
LAW 3: PARENT STAYS: opening a drill never unmounts or hides its parent. Check: open the 3 deepest drill chains; parents remain visible and interactive; screenshot each chain.
LAW 4: ONE ACTION ZONE: exactly one contextLeafId; primary actions render only in that leaf panel. Check: dump serialized state (single leaf) + scan panels for duplicate primary-action bars.
LAW 5: ONE SPACE ACTIVE: exactly one space mounted; switching swaps the whole panel tree. Check: state dump before/after a switch, diffed.
LAW 6: REFERENCES ARE THE ONLY CROSS-SPACE CITIZENS: pinned references survive navigation AND space switches; nothing else does. Check: pin one panel, switch space twice, dump referenceRailOrder: unchanged and live; unpinned panels gone.
LAW 7: REGISTRY-DRIVEN WIDTHS: every panel width derives from its registry size (S/M/L/XL). Check: grep for hardcoded width/w-[0-9] on panel roots; every hit must trace to the registry lookup or FAIL.
LAW 8: TOKENS ONLY: colors, spacing, typography come from design tokens. Check: grep panel components for hex literals and raw px values; list every hit.
LAW 9: SERIALIZABLE STATE: JSON.parse(JSON.stringify(state)) restores an identical workspace (panelsById, contextLeafId, referenceRailOrder). Check: execute the round-trip in the running app or a test; show the output.
OUTPUT: `laws-report.md`: table: law | assertion | check command | evidence | PASS/FAIL. Any FAIL blocks shipping: fix, then re-run this entire audit until all nine are green.
```
