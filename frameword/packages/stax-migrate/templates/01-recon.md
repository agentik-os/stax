# PHASE 1/7 — RECON — forensic inventory of the legacy app

ROLE: forensic UI auditor. You are running phase 1 of a 7-phase Stax migration
(panels-inside-panels grammar). This phase is READ-ONLY on the app itself.

TARGET: {{TARGET}}  (detected stack: {{STACK}})
WRITE:  {{TARGET}}/stax-migration/inventory.md — and NOTHING else.
FORBIDDEN: touching app code, redesigning, proposing panels, editing
feature-matrix.csv, editing state.json (the operator advances phases via the
stax-migrate CLI, never you). Inventory only. Migration comes later.

## The law of this phase

> When in doubt, write it down. Over-inventory is free; under-inventory is fatal.

Anything you miss here is a feature the migration will silently lose. The entire
no-feature-lost guarantee downstream rests on this document being exhaustive.

## Protocol — walk EVERY layer, cite EVERY line

Work from three sources and reconcile them: (a) the router/entry configuration,
(b) a full walk of the source tree, (c) the running app if you can start it.
Every inventory line carries a citation — file:line, route-config entry, or
screen reference. An uncited line is worthless.

1.  ROUTES & SCREENS — every route/page/screen/layout: URL pattern, params,
    guards/redirects, lazy boundaries.
2.  NAVIGATION — every nav surface (sidebar, topbar, breadcrumbs, footer,
    command palette) and the exact destination of every item.
3.  MODALS & OVERLAYS — every modal, dialog, drawer, popover, sheet, action
    toast: trigger, content kind (form | confirm | detail | picker | media),
    field/section count.
4.  TABS & SEGMENTS — every tab bar / segmented control; note whether the tabs
    facet the SAME entity or switch BETWEEN entities.
5.  WIZARDS — every multi-step flow, with EACH STEP listed individually.
6.  CONTEXT MENUS — every right-click / kebab / hover menu, with every item.
7.  FORMS — every form: fields, validation, autosave vs explicit submit,
    side effects on submit.
8.  TABLES & LISTS — every table/list: columns, sorting, filters, saved views,
    pagination, row actions, inline edit, bulk actions, import/export (CSV…).
9.  CHARTS & DASHBOARDS — every visualization, its data source, and whether it
    drills down on click.
10. FILTERS & SEARCH — where each control lives, what scope it filters; global
    search and its result kinds.
11. KEYBOARD SHORTCUTS — every binding, global or per-screen.
12. PERMISSION GATES — every role/plan/feature-flag gate and what it hides.
13. SETTINGS — every setting in every section (profile, billing, team, app).
14. INTEGRATIONS — every third-party surface: OAuth connections, webhooks,
    imports, embeds.
15. EMAILS & NOTIFICATIONS — every email, push, toast, in-app notification and
    its trigger.
16. EMPTY / ERROR / LOADING STATES — every deliberate empty state, error
    screen, and skeleton/loading treatment. Each one is a feature. Each gets a line.

## Output — {{TARGET}}/stax-migration/inventory.md

Structure BY AREA (the app's top-level sections), then by layer inside each area:

    ## Area: <name>
    ### Routes
    - `/deals` — deals list, guard: auth — src/routes.tsx:41
    ### Overlays
    - "Edit deal" modal — form, 7 fields — trigger: row click — src/DealModal.tsx:12
    ...

End with a SUMMARY section: counts per layer + the 5 hairiest items you found
(nested modals, modal-inside-tab, wizard-inside-modal, etc.).

## Definition of done — prove coverage, don't claim it

- Every route in the router config appears. List the config's entries and tick each off.
- Grep reconcile: run `grep -riE "modal|dialog|drawer|<Tabs|wizard" src | wc -l`
  (adapt the pattern and paths to {{STACK}}), show the raw count, and reconcile
  every hit against an inventory line. Unreconciled hits = the recon is not done.
- Re-read your own inventory once, hunting for areas with suspiciously few lines.

When you are done, stop. Do not start phase 2.
