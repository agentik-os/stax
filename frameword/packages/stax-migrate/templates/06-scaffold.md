# PHASE 6/9 — SCAFFOLD — the panel shell, beside the untouched old app

ROLE: framework integrator. You bootstrap the Stax shell inside {{TARGET}} so
phase 7 has somewhere real to migrate features INTO. You migrate NOTHING yet.

TARGET: {{TARGET}}  (stack: {{STACK}})
READ:  {{TARGET}}/stax-migration/feature-matrix.csv (the `mapping`, `size`,
       and `area` columns drive everything you build) and
       {{TARGET}}/stax-migration/design-spec.md (the token + anatomy contract)
WRITE: app code (shell only) — never feature logic, never the matrix's status
       column, never state.json.

## Prime directive

The OLD app keeps running, untouched, at its existing routes. The new shell
mounts BESIDE it (e.g. at `/stax` or a dedicated entry). Users and tests can
still do everything the old way after this phase. Zero legacy deletions.

## Tasks

1. GET THE ENGINE — install `@frameword/panels-core` and `@frameword/panels-react`
   from github.com/agentik-os/stax (`frameword/packages/…`). If the package
   registry/git dependency is not workable in this repo, VENDOR the two
   packages: copy them into the repo (e.g. `vendor/panels-core`,
   `vendor/panels-react`), preserving their tests. Record which route you took.
2. TOKENS — bring in the WhitePaper design tokens (CSS variables) exactly as
   design-spec.md §2-§4 contracts them: the three `--fz-*` type preferences,
   the accent + derived ramp (OKLCH mixes, never oklab), surface tokens for
   BOTH themes, the radius/shadow/motion scales. All shell styling uses tokens
   only: no hex literals, no raw px soup in components.
3. REGISTRY — derive the panel registry FROM THE MATRIX: collect every distinct
   panel type named in the `mapping` column, and register each with its `size`
   (S/M/L/XL → width class). For now every type renders a labeled placeholder
   panel (type + matrix ids it will serve). The registry is the ONLY source of
   panel widths.
4. SPACES + SIDEBAR — one Space per distinct `area` whose mapping contains a
   `space-root/…` row (cap 7 — the matrix was already merged in phase 3). The
   sidebar lists the Spaces; clicking one opens its root panel; exactly one
   Space active at a time.
5. URL SYNC — on. The panel stack serializes into the URL and restores from it
   (deep-link → identical workspace). Verify a round-trip by hand.
6. SHELL CHROME — breadcrumb derived from the stack, ⌘K palette stub, drawer
   slot, reference rail (pin) slot. Stubs are fine; placement is not.

## Evidence required (show, don't claim)

- Build/typecheck output: the app compiles with the shell mounted.
- The OLD app still runs: hit 2-3 legacy routes and show they respond.
- A screenshot or DOM/text dump of the shell showing: sidebar with the Spaces,
  one root panel open, a placeholder drill opening to the RIGHT with the
  parent still visible.
- The registry file: one entry per distinct panel type from the matrix — state
  the count and it must equal the matrix's distinct-panel-type count.

## Exit

There is no mechanical gate for this phase — the operator advances it after
seeing your evidence (`stax-migrate done` will trust them, not you). Make the
evidence undeniable. When you are done, stop. Do not migrate features (phase 7).
