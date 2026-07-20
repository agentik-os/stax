# Frameword prompt kit

> Reçu le 2026-07-19 avec le concept brief (voir `CONCEPT-BRIEF.md`).
> **Statut : kit de prompts canonique v2** — remplace `PROMPTS.md` (P0–P3) là où
> ils se recouvrent. Utiliser le contexte canonique une fois en début de session,
> puis le prompt de tâche. Remplacer chaque placeholder entre crochets.

Status: discovery draft, 2026-07-19.

Use the canonical context once at the start of an AI session, then append the task-specific prompt. Replace every bracketed placeholder before use. Ask the model to cite code, screenshots, tests, or research for material claims.

## Canonical context

```text
FRAMEWORD CANONICAL CONTEXT

Frameword is a context-preserving UX framework for relational, data-dense operational software. A top-level Space opens a RootPanel. Opening a related record creates a DetailPanel beside its source, preserving context while the user investigates or acts.

ApplicationDock launches Spaces.
CommandBar contains the active ContextPath, search, and global utilities.
WorkspaceCanvas is the main application surface.
PanelZone presents panels.
PanelRail is the shared spatial layout primitive.
ContextRail is derived from the current ContextPath and is never a second ordered source of truth.
ReferenceRail is the explicitly ordered set of detached PinnedPanels.
ContextPath is the current semantic ancestry of the context leaf and drives breadcrumbs, close behavior, and deep links. The Next.js adapter records transitions between encoded paths in browser history.
DrillTrigger opens a related DetailPanel.
A PreviewPanel is transient.
A PinnedPanel is retained in its active branch and becomes an explicit detached reference if that branch is replaced; it never silently becomes part of another panel's ancestry.
UtilityDrawer is reserved for cross-context tools.
Persistent resource-level commit and create actions belong in PanelFooter; navigation, row actions, and local secondary actions remain near their object.

Navigation state contains validated JSON descriptors, stable IDs, parent references, context leaf, focus, structural role, retention, placement, and presentation hints. It never contains JSX, component functions, callbacks, fetched records, authentication vendors, or backend-specific type imports. Opaque serialized application IDs may appear inside resourceKey. A typed panel registry resolves descriptors to renderers, labels, URLs, and capabilities.

Opening the same target from the same contextual parent reveals and focuses it. The same target under a different parent may have a distinct attached instance. Detached references deduplicate by canonical target within a Space. Closing a parent deterministically closes preview descendants and detaches retained descendants into ReferenceRail. Active ancestry cannot be arbitrarily reordered. Browser Back and Forward are handled by URL reconciliation and are distinct from Navigate Up. On narrow screens, the same ContextPath becomes one focused panel rather than a forced desktop rail.

V1 pinning hypothesis: pinPanel changes an attached panel from preview to retained. If a branch change would orphan it, the same instance detaches into ReferenceRail and loses its active parent. Unpinning an attached panel makes it preview again; unpinning a detached reference closes it. resumeReference removes it from ReferenceRail and asks the route adapter to reconstruct a fresh ContextPath. Only ContextPath is URL-shareable; references persist only in a device session or an explicitly saved workspace.

Frameword is not a chart library, card collection, admin template, backend, freeform window manager, visual brand, or universal replacement for pages, tabs, dialogs, and drawers.

Future delivery target, to validate before implementation:
- @frameword/panels-core: serializable TypeScript state machine
- @frameword/panels-react: renderer registry, provider, focus, keyboard, reveal, boundaries
- @frameword/ui: open-code shadcn registry items
- @frameword/panels-next: URL/history and hydration adapter
- @frameword/panels-convex: optional preferences and named-workspace persistence
- create-frameword-workspace: opinionated Next.js + shadcn + Convex starter
- conformance tests and unrelated reference applications

Separate these layers in every answer:
1. engine invariants;
2. adaptive layout behavior;
3. accessibility and focus behavior;
4. panel anatomy;
5. visual theme tokens;
6. optional recipes such as AI chat, kanban, or KPI views;
7. application domain data.

Do not use “Sheet” for Frameword's in-page panels because shadcn uses Sheet for an overlay. Do not market “infinite visible depth.” Describe unbounded logical depth with a bounded rendered presentation.
```

## Prompt 1 — Explain and position Frameword

```text
Using FRAMEWORD CANONICAL CONTEXT, explain Frameword to [AUDIENCE].

Return:
1. one-sentence definition;
2. tagline;
3. 30-second explanation;
4. two-minute explanation;
5. the concrete user problem;
6. a four-step example interaction in [EXAMPLE DOMAIN];
7. three best-fit products;
8. three poor-fit products;
9. what Frameword replaces;
10. what it deliberately does not replace;
11. the strongest objection and an honest response.

Lead with context preservation and related-record navigation. Never describe it merely as a “dashboard framework.” Avoid “revolutionary,” “OS,” “one interface for everything,” and generic productivity claims. Use precise, falsifiable language.
```

## Prompt 2 — Evaluate whether a product fits

```text
Evaluate this product for Frameword:

[PRODUCT BRIEF]

Identify:
- primary users and high-frequency jobs;
- entities and meaningful relationships;
- where conventional route changes lose context;
- candidate Spaces;
- three golden ContextPaths;
- workflows that should remain normal pages;
- alternate representations that should be tabs inside one Panel;
- brief blocking decisions that should be dialogs;
- cross-context tools that should be UtilityDrawers;
- comparison needs and possible PinnedPanels;
- desktop versus phone usage expectations;
- a fit score from 0 to 5 with evidence.

Reject panelization where data is shallow, sequential, or unrelated. Do not turn every screen into a Panel. End with GO, ADAPT, or DO NOT USE and explain the decision.
```

## Prompt 3 — Convert a domain into a navigation blueprint

```text
Using FRAMEWORD CANONICAL CONTEXT and this domain model:

[DOMAIN MODEL]

Create a navigation blueprint. For every Space and Panel, specify:
- panelType;
- canonical resourceKey;
- source and parent relationship;
- DrillTrigger;
- expected panel size;
- title source and breadcrumb label source;
- body responsibilities;
- persistent PanelFooter action, if any;
- PreviewPanel and PinnedPanel policy;
- URL representation;
- permissions;
- loading, empty, error, not-found, permission-lost, stale, offline, deleted-resource, and dirty-edit states;
- desktop, compact, and phone presentation.

Then provide:
1. three end-to-end ContextPaths;
2. behavior for open, reopen, sibling replacement, pin, unpin, close, close ancestor, browser Back/Forward, refresh, and shared deep link;
3. areas deliberately excluded from Frameword navigation;
4. unresolved product decisions.

Do not write components yet. First make the information architecture and transition semantics internally consistent.
```

## Prompt 4 — Specify the headless state machine

```text
Design Frameword's deterministic, framework-agnostic state machine using FRAMEWORD CANONICAL CONTEXT.

Required events:
openSpace, openDetail, revealPanel, focusPanel, replacePreview,
pinPanel, unpinPanel, closePanel, closeBranch, moveReference,
navigateUp, resumeReference, reconcileLocation(destination),
restoreFromUrl, restoreWorkspace, saveWorkspace, openUtility, closeUtility.

Derive ContextRail from ContextPath and store only ReferenceRail order. Use explicit instanceId, resourceKey, panelType, parentInstanceId, contextLeafId, focusedPanelId, Space, role, retention, placement, and schemaVersion. Treat role, retention, and placement as independent axes with validated combinations.

Return:
- TypeScript types containing JSON-safe data only;
- state invariants;
- event preconditions and effects;
- complete transition table;
- pure reducer pseudocode;
- URL codec interface;
- persistence adapter interface;
- version migration strategy;
- context-scoped duplicate-resource policy: same target plus same parent reveals, while a different parent may create another attached instance;
- ancestor-close and retained-reference policy;
- dirty-edit guard protocol;
- overlay Escape precedence;
- malformed-state recovery;
- property-based test properties;
- model-based test sequences.

Falsify the design against cycles, missing parents, stale targets, context-key collisions, duplicate references, two simultaneous previews from one source, location-reconciliation loops, and orphaned references. Do not store React elements, functions, data rows, presentation components, or backend-specific imported types in state.
```

## Prompt 5 — Design the React and shadcn API

```text
Design the public React and shadcn API for Frameword using FRAMEWORD CANONICAL CONTEXT.

Return:
- @frameword/panels-react responsibilities;
- @frameword/ui registry item list and dependencies;
- typed panel registry API;
- controlled and uncontrolled providers;
- hooks and intent-level commands;
- component composition examples for RootPanel and DetailPanel;
- DrillTrigger as a real progressively enhanced link;
- PanelHeader, PanelBody, and PanelFooter contracts;
- per-panel loading and error boundaries;
- focus and scroll/reveal manager;
- keyboard command ownership;
- theming token contract;
- extension policy that avoids wrapper proliferation;
- Storybook matrix;
- unit, integration, accessibility, visual, and Playwright tests.

Use shadcn primitives where they fit, but do not rename shadcn Sheet into an in-page Panel. Keep visible components open-code and editable. Keep reducer invariants in a versioned package rather than duplicating them in generated application files.
```

## Prompt 6 — Design the Next.js adapter

```text
Design @frameword/panels-next for the currently supported Next.js App Router using FRAMEWORD CANONICAL CONTEXT.

Return:
- server/client boundary;
- initial URL-to-state parsing and validation;
- application-owned readable route codec;
- PanelLink behavior;
- push versus replace history policy for every navigation event;
- browser Back/Forward reconciliation: on popstate, parse and validate the destination URL, then dispatch reconcileLocation(destination);
- explicit separation between navigateUp and browser Back;
- refresh and shared-link reconstruction;
- not-found, unauthorized, and stale-resource routing;
- progressive enhancement when JavaScript is unavailable;
- RSC content composition constraints;
- Suspense and streaming behavior;
- hydration mismatch prevention;
- example route tree for [DOMAIN];
- test plan for soft navigation and hard reload.

Do not model an arbitrary-length PanelRail as a collection of statically named parallel-route slots. If parallel routes are proposed for known utility regions, explain their hard-navigation default behavior and why they are bounded.
```

## Prompt 7 — Design the optional Convex adapter

```text
Design @frameword/panels-convex using FRAMEWORD CANONICAL CONTEXT.

Separate:
1. application domain records;
2. ephemeral device-local navigation;
3. URL-shareable ContextPath;
4. user panel preferences;
5. explicitly named and saved workspaces;
6. optional collaboration or presence.

Return:
- packaging recommendation: packaged Convex Component, hybrid component, or generated application-owned files, with tradeoffs;
- the smallest generic Convex schema;
- queries and mutations;
- application-supplied authenticated subject contract;
- authorization rules;
- versioned snapshot validation and migration;
- optimistic revision or last-write-wins policy;
- realtime behavior when records visible in several Panels change;
- deletion and permission-revocation behavior;
- offline/reconnect behavior;
- restore precedence with URL and device-local state;
- tests.

Prefer a packaged Convex Component when Frameword owns persistent generic tables and functions; keep authentication in application-side wrappers because component state/functions are isolated. If that boundary is too restrictive, justify generated application-owned files instead. Do not persist every transient open, close, focus, or scroll event. Do not require Clerk. Do not assume a users table. Do not put LifeOS goals, habits, journals, RAG, billing, or AI chat in this adapter.
```

## Prompt 8 — Create a visual system and theme

```text
Create a brand-agnostic visual contract for Frameword using shadcn-compatible semantic tokens.

Brand input:
[BRAND BRIEF]

Define:
- Panel anatomy and alignment invariants;
- compact, standard, and wide size recipes;
- PanelZone and PanelRail geometry;
- active, ancestor, preview, pinned-reference, loading, error, and disabled treatments;
- primary versus local action placement;
- motion and reduced-motion behavior;
- desktop, compact, phone, RTL, and 200% zoom layouts;
- semantic token names mapped to shadcn CSS variables;
- container-query behavior;
- light, dark, forced-colors, and high-contrast requirements;
- one neutral reference theme;
- optional [THEME NAME] preset.

Keep behavior independent from visual branding. Do not hardcode colors or spacing inside domain Panels. Do not use decorative cards when document rhythm, dividers, lists, or typography communicate hierarchy more clearly.
```

## Prompt 9 — Accessibility and responsive audit

```text
Audit this Frameword implementation against FRAMEWORD CANONICAL CONTEXT:

[CODE, STORY URL, OR SPEC]

Test:
- labelled Panel regions and heading hierarchy;
- focus transfer on open and restoration on close;
- keyboard movement among visible Panels;
- DrillTrigger link semantics;
- breadcrumb semantics;
- Escape precedence with menus, dialogs, UtilityDrawer, dirty forms, and Panels;
- browser Back/Forward;
- screen-reader opening and closing announcements;
- pinned-state announcement;
- horizontal-scroll discoverability;
- touch target size;
- 200% and 400% zoom/reflow;
- reduced motion;
- forced colors and contrast;
- RTL;
- translated and very long labels;
- one-panel phone mode;
- virtual keyboard and orientation changes;
- unsaved-edit warnings;
- UtilityDrawer modality by breakpoint, initial focus, focus containment, underlying-content inertness, and return focus.

Return failures by severity, exact reproduction, expected behavior, responsible framework layer, and an automated regression test. Do not award a pass for documented behavior that is absent at runtime.
```

## Prompt 10 — Adversarial conformance test

```text
Try to falsify this Frameword implementation. Treat every claimed invariant as a hypothesis.

System under test:
[REPOSITORY OR SPEC]

Required scenarios:
- 12-level ContextPath;
- 100 serializable panel descriptors with a bounded mounted set;
- duplicate target opened twice from the same parent, then from a different semantic parent;
- sibling open after pinning a descendant;
- closing a middle ancestor with preview and retained descendants;
- reordering references;
- clicking an older visible Panel and continuing from it;
- preview replacement when rail length is unchanged;
- browser Back/Forward after URL restore;
- refresh and shared deep link;
- malformed and previous-version snapshots;
- permission revoked while open;
- resource deleted while open;
- failed, slow, and stale queries;
- optimistic mutation reflected in parent and detail views;
- concurrent saved-workspace edits;
- phone viewport, rotation, zoom, RTL, and long labels;
- keyboard-only and screen-reader use;
- open UtilityDrawer plus Escape;
- wide nonmodal and narrow modal UtilityDrawer behavior;
- unsaved form replacement;
- Space switch with references present.

For each scenario give setup, action, expected state, observed result or risk, falsified invariant, and an automated test. End with a conformance score only after listing evidence.
```

## Prompt 11 — Plan progressive adoption in an existing dashboard

```text
Given this existing Next.js dashboard:

[ROUTES]
[COMPONENTS]
[DOMAIN MODEL]
[USER WORKFLOWS]

Plan progressive Frameword adoption using FRAMEWORD CANONICAL CONTEXT.

Choose one high-value relational workflow first. Preserve existing routes as a fallback. Map current routes to Spaces, panel types, resource keys, ContextPaths, and readable URLs.

Return:
- fit assessment;
- chosen golden workflow and why;
- package/registry installation order;
- route and component migration map;
- data ownership and adapter boundaries;
- feature flags;
- telemetry events;
- usability baseline;
- rollout cohorts;
- rollback plan;
- success and stop metrics;
- risks and mitigations.

Metrics must include time to target, backtracking/reopening, wrong-context actions, orientation confidence, horizontal-navigation burden, keyboard completion, phone completion, and deep-link restore success.
```

## Prompt 12 — Build a new workspace with Frameword

Future implementation prompt: use only after Phase 0 has validated the state contract and the named packages or registry items actually exist.

```text
Build [PRODUCT NAME], a [PRODUCT DESCRIPTION], using the installed Frameword packages and FRAMEWORD CANONICAL CONTEXT.

Required process:
1. inspect the existing repository and installed Frameword registry items;
2. write a fit assessment and identify the golden ContextPaths;
3. create the typed domain and Panel blueprint;
4. validate the navigation transition table;
5. implement one vertical workflow end to end;
6. verify URL restore, browser history, focus, keyboard, phone mode, loading/error/permission/deleted states, and dirty edits;
7. run the conformance suite;
8. expand only after the first workflow passes.

Stack constraints:
- current supported Next.js App Router;
- shadcn UI primitives and Frameword registry items;
- Convex for [DOMAIN DATA AND OPTIONAL SAVED WORKSPACES];
- [AUTH PROVIDER] for authentication;
- TypeScript strict mode;
- English-only code, identifiers, comments, tests, and documentation.

Architecture constraints:
- no JSX, functions, or fetched records in navigation state;
- no Convex import in panels-core;
- no auth-provider assumption in the Convex adapter;
- no domain data in framework packages;
- no arbitrary reorder of active ancestry;
- no silent duplicate no-op;
- no orphan descendants;
- no desktop-only horizontal-scroll behavior;
- no undocumented accessibility behavior;
- no styling values that bypass semantic tokens.

Before writing application code, return the proposed files, transitions, acceptance tests, and risks. During implementation, verify behavior at runtime after every completed slice. Do not port LifeOS business features unless they are explicitly part of [PRODUCT NAME].
```

## Prompt 13 — Run comparative user research

```text
Design a comparative usability study for Frameword versus conventional page navigation.

Product domain:
[DOMAIN]

Define:
- participant profile and sample size rationale;
- three representative relational tasks;
- equivalent prototype scope;
- counterbalancing method;
- observable orientation and navigation behaviors;
- quantitative metrics;
- post-task and final interview questions;
- accessibility participants and assistive technology coverage;
- desktop and phone conditions;
- failure thresholds;
- continue, revise, or stop decision rule.

Explicitly test whether preserved context outweighs horizontal navigation, extra visible information, pinning complexity, and smaller focused work areas. Do not ask only preference questions; measure task behavior.
```

## Prompt 14 — Review a proposed change to the framework

```text
Review this proposed Frameword change:

[CHANGE PROPOSAL OR DIFF]

Classify it as one or more of:
- engine invariant;
- state transition;
- adaptive layout;
- accessibility/focus behavior;
- panel anatomy;
- visual theme;
- optional recipe;
- framework adapter;
- starter-only concern;
- application domain concern.

Then answer:
1. does it belong in the proposed layer;
2. which public contracts change;
3. whether serialized state needs a migration;
4. whether URL behavior changes;
5. whether it can create duplicates, cycles, orphans, stale focus, or history divergence;
6. desktop, phone, RTL, zoom, reduced-motion, and screen-reader impact;
7. backwards compatibility;
8. exact tests and documentation updates;
9. accept, revise, or reject.

Prefer a narrow extension point over weakening a core invariant.
```

## Prompt quality checklist

Before accepting any generated result, verify that it:

- distinguishes ContextPath, derived ContextRail, and ordered ReferenceRail;
- uses serializable targets rather than renderer closures;
- splits structural role, retention, and placement into independent validated fields;
- reveals the same target under the same parent while defining the different-parent policy;
- defines the exact parent-close, detach, unpin, and resume-reference transitions;
- distinguishes Navigate Up from router-owned Back/Forward and location reconciliation;
- specifies phone behavior independently from desktop geometry;
- implements focus transfer, restoration, and UtilityDrawer modality;
- handles loading, empty, error, permission, stale, deleted, offline, and dirty states;
- keeps Convex, auth, AI, and domain data outside the core;
- chooses a valid Convex packaging mechanism for persistent adapter state;
- keeps visual theme rules outside state invariants;
- identifies where panels are the wrong interaction;
- includes runtime tests that can falsify the result.
