---
name: staxaudit
description: >
  Forensic audit of a Stax project, in three modes. TRANSFER audits a legacy app
  before it moves (is it ready, and what would be lost). STAX audits a Stax app
  against its own laws while it is being built. COHESION audits the drift between
  what the matrices declare and what the product renders. Use when the user says
  "/staxaudit", "stax audit", "audit the transfer", "audit my stax app", "is this
  still coherent", or in French "audit stax", "audite le transfert", "audit de
  cohesion", "est-ce que ca respecte stax". NOT for a generic code, security or
  a11y audit: those are their own skills. This one audits STAX CONFORMANCE.
---

# Stax audit

> **An audit that never ran a command against the target is not an audit, it is
> an opinion with headings.**

Three moments, three questions. Pick the one the user is actually in.

| mode | when | asks | hinge |
|---|---|---|---|
| `transfer` | BEFORE the move | Is the legacy app ready, and what would be lost if we moved it today? | the capability whose loss makes the transfer a failure |
| `stax` | DURING the build | Does this Stax app obey its own laws, on every surface, in both themes? | the law with the widest blast radius |
| `cohesion` | AFTER, and continuously | Do the matrices and the running product still describe the same thing? | the row whose declaration and render have drifted furthest |

---

## PHASE 0 — RUN THE MECHANICAL HALF FIRST. Not optional.

```sh
CLI=<path>/frameword/packages/stax-migrate/index.mjs
node $CLI audit <mode> <dir> --url <live-url> [--legacy-url <old-app>]
```

It runs the real gates, captures what each one actually printed, and writes
`.stax-audit/<mode>-evidence.json`. **Read that file before writing a single
phase.** Every phase below cites a probe from it or a command you ran yourself.

Stax is unusual: it already has runnable gates. So this audit does not re-derive
them in prose, it orchestrates them and audits what they cannot see. If you find
yourself explaining what `verify` checks instead of reading what it printed, stop.

**Three readings that are not verdicts:**

- `unreachable` is neither a pass nor a fail. If the app was not running, the
  audit has no verdict to give. Start it and re-run. A blocked surface is an
  ABORT.
- `not applicable` is not a fail either. `doctor` on a native Stax app will
  always say NOT ADOPTED, and a permanent red that means nothing teaches the
  reader to ignore the report.
- A gate that passes is not the end of a phase. The gates check four laws. Most
  of what follows, they cannot see.

---

## PHASE 1 — THE HINGE

Before scoring anything, name the ONE thing this mode pivots on, and give it 10x
the scrutiny of any other phase. Write it at the top of the report with its
evidence.

- **transfer**: read the parity contract and the data matrix together. The hinge
  is usually a write path only one legacy screen exposes, or a report someone
  runs monthly that no route reaches. Ask: if this single thing were lost on
  cutover day, would the transfer be judged a failure? That is the hinge.
- **stax**: count the SURFACES each failing law touches. A foot defect across
  eight spaces outranks one panel's misalignment however ugly the latter looks.
  Blast radius, not offence.
- **cohesion**: the layout proof is the instrument. A row declaring size L whose
  panel opens at M is drift you can measure. A row with no citation is drift
  nobody can even check, and it is worse.

Falsify it (Popper): what would prove this is NOT the hinge? Run that check. If
it survives, you have the hinge.

---

## THE PHASES

Each phase: a question, a command you RAN, its real output, a verdict, and how
you would disprove your own verdict. A phase with no captured output is
performative and must be deleted rather than scored.

### Common to all three modes

1. **The gates.** From the evidence file: design gate, data gate, contract,
   parity, e2e. Quote the exit code and the line that decided it. A gate you did
   not run is `unreachable`, never `pass`.
2. **The unknowns.** `proof` counts them. On a first pass a large number is the
   correct output: it is the work list. Score the TREND, not the number, and if
   there is no earlier run to compare against, say so rather than inventing a
   baseline.
3. **The disagreements.** Two matrices describing one surface differently. At
   phase 4 of a migration this is a finding; after phase 8 it is a contradiction
   that shipped. Never resolve one silently in the report.

### mode `transfer` — is the legacy app ready to move?

4. **Capability inventory completeness.** Does `parity.csv` cover every route,
   list, form, report, export and permission surface? Grep the legacy router and
   compare counts. A capability with no row cannot be missed on cutover day,
   which is exactly why it will be.
5. **The unreachable capability.** Drive the legacy app and find what the
   inventory names but the app no longer serves. Dead rows inflate the contract
   and hide real work.
6. **Backend continuity.** `data scan` extracts tables, functions, rpc and call
   sites programmatically. Your job is only the 20%: is every non-internal row
   bound to a panel that READS it and a foot action that WRITES it? An unbound
   writable row is data the new app can display and never change.
7. **The write paths nobody claimed.** Cross the scan against the matrix. A
   write in the legacy code with no `write_path` in the matrix is a capability
   about to be silently dropped.
8. **Shape readiness.** For each legacy screen, has a shape been chosen, or was
   `data-panel/<entity>-table` written by reflex? Run `shapes` and check the
   mapping column against what the data actually IS. This is the phase that
   decides whether the new app is a product or nineteen grids.
9. **The permission surface.** Which capabilities gate which screens, and does
   any of them currently rely on hiding a control rather than refusing it?
   A hidden-but-present control is a leak the migration will inherit.
10. **Scope honesty.** Every `deferred` and `out-of-scope` row must carry a cited
    reason. A row left empty because nobody wants to do it is a gate violation,
    not a scope call.

### mode `stax` — does this app obey its own laws?

4. **The foot, measured correctly.** The three obvious assertions are blind:
   foot height reads 44 while a label wraps INSIDE a 30px button, the foot's own
   scroll box reads 0 while a descendant is 95px over, and the children share one
   centre while the wrap is inside one of them. Measure LINE BOXES BY VERTICAL
   POSITION via `Range.getClientRects()`, walk DESCENDANT overflow, and HIT TEST
   every control with `elementFromPoint`. Eight widths, both themes.
5. **The bar.** 44px, nothing clipped, nothing overlapping, the title ellipsing
   cleanly rather than colliding with the controls. Rank between a root and a
   drill must be legible through at least two independent signals.
6. **Optical alignment.** A glyph centred on a title's LINE BOX is geometrically
   perfect and visually wrong. Measure against the CAP BAND, which is string
   independent, and remember a text node starting with a space yields an extra
   rect ON THE SAME LINE.
7. **Tokens only.** No literal colour survives in app CSS. Check the computed
   values at runtime, in both themes, not the source: a token resolving to the
   wrong value passes a grep and fails the eye.
8. **The shapes actually used.** Count distinct body grammars across five domain
   panels. If the answer is one, the grammar was executed and nothing was
   designed.
9. **URLs.** Every public link round-trips byte for byte. Old forms still decode
   and normalise. An unknown slug degrades to its space rather than failing.
10. **Refusal.** Is any denied element rendered greyed with a tooltip naming its
    capability, masked, or counted? Does any refusal copy disclose whether an
    account exists?
11. **The catalog references.** Every entry opens a real, populated panel AND
    lands where it claims. A populated panel is not proof: check the round trip.

### mode `cohesion` — do the declaration and the render still agree?

4. **Size drift.** For a sample of rows, compare the declared `size` against the
   width the panel actually opens at. This is the cheapest real drift to find and
   the most common.
5. **Shape drift.** Compare the `mapping` column against the body grammar that
   rendered. A row saying `view/board` whose panel renders a table is a lie the
   matrix is telling.
6. **Citation rot.** Every `source` must still point at a line that exists and
   says what the row claims. Files move; citations do not follow.
7. **Reference rot.** Every catalog and README deep link opens what it names.
   This rotted once here, unnoticed for months, because the check was "did a
   panel render" rather than "did the RIGHT panel render".
8. **Binding drift.** A `panel_binding` naming a panel no feature row declares,
   or a writable row bound to an out-of-scope surface.
9. **Doctrine drift.** The spec says X, the app does Y, and both are defensible.
   Name the disagreement and who must settle it. Do not pick.
10. **The count that never falls.** Compare this run's unknown count against the
    previous. A count that never falls is a project that fills its status column
    and learns nothing.

---

## PHASE N-1 — PRE-FIX BASELINE (before touching anything)

Capture the current state of everything you intend to change, as runnable
evidence: the gate outputs, the counts, screenshots of the surfaces. You cannot
prove "no regression" without it, and you will be tempted to skip it precisely
because the fix looks obvious.

## PHASE N+4 — THE BEFORE AND AFTER MATRIX

Write `.stax-audit/<mode>-before-after.md`: one row per fix, with the baseline
evidence, the post-fix evidence, and whether anything else moved. **A 100/100
verdict is blocked unless this file shows zero regressions.**

---

## SCORING

Raw out of `10 x phases`, normalised: `raw / max * 100`. State the formula with
the numbers filled in.

**The density rule, and it binds hard here.** If the number of PASS phases
exceeds the number of distinct real captured commands, cap confidence at
`medium` regardless of score. An audit cannot assert more than it ran. Add depth
by running more probes, never by adding more headings.

**Verdict gates:**

- Any gate `fail` caps the score at 60.
- Any gate `unreachable` means NO VERDICT for that dimension. Say so; do not
  average it away.
- `disagreements > 0` after a migration's phase 8 caps at 70.
- No `before-after.md` blocks any claim above 90.

---

## THE REPORT

Ship it per R-ARTIFACT: one self-contained HTML under the project's deliverable
folder, and hand back the path. Structure:

1. The hinge, first, with its evidence and its falsification.
2. The gate table, with exit codes, and `unreachable` distinguished from `fail`.
3. Findings ranked by severity, each with a captured command, the file and line,
   and the fix. R-CITE: an uncited finding is rejected.
4. What was NOT run and why. A skip is not a pass, and hiding the skips is the
   one dishonest thing this report can do.
5. The five counts, so the report states its own coverage.

Fix loop: at most 5 iterations on the same finding. Then escalate to the
operator and say plainly that it needs a human and why.
