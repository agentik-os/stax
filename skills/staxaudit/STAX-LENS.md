---
name: STAX-LENS
description: >
  The Stax lens. A shared reference that ANY forensic audit loads when its target
  is a Stax app, so the audit asks the questions this framework actually answers
  instead of generic ones. NOT a user-invokable skill: it is a source of truth
  referenced by /uiuxaudit, /flowaudit, /a11yaudit, /featureaudit, /codeaudit,
  /motionaudit, /dxaudit, /refontaudit and /staxaudit.
---

# The Stax lens

A generic audit on a Stax app measures the wrong things and misses the right
ones. It will report "inconsistent button styles" on a design system that has
exactly one, and it will not notice that a foot is painting a destructive
control under a view tab.

Load this when the target is Stax. It does not replace your domain protocol: it
tells you what changes about your questions, and what you can stop asking.

---

## 1. Detect the target FIRST. Do not assume.

```sh
grep -l "@frameword/panels-core\|@frameword/panels-react" package.json */package.json 2>/dev/null
grep -rl "WorkspaceProvider" src 2>/dev/null | head -1
```

Either hit means Stax. Neither means this lens does not apply and you should run
your normal protocol unchanged. A half-adopted app (the shell wraps legacy
screens as `legacy` embed panels) is BOTH: audit the Stax surfaces with this
lens and the embedded ones with your normal one, and say which is which.

## 2. Run the gates before you reason. They are cheap and they are real.

```sh
CLI=<repo>/frameword/packages/stax-migrate/index.mjs
node $CLI audit stax <dir> --url <live>     # writes .stax-audit/stax-evidence.json
```

Read that file. It carries, per probe, the exact command, the exit code and the
captured output. Cite it. Four readings and only one is a verdict you can score:

| reading | means |
|---|---|
| `pass` | the gate ran and held |
| `fail` | the gate ran and broke. Score it |
| `unreachable` | nobody could look. An ABORT, no verdict, do not average it away |
| `not applicable` | the probe does not apply here, with its reason. Not a red |

## 3. Stop asking these. Stax answers them structurally.

An audit that reports these on a Stax app is reporting the framework, not the
product, and it burns the reader's attention:

- "Inconsistent spacing between cards." Interior margins are fixed by contract:
  bar 44 padding 0 10 0 16, body 18/18/16, foot 7/14. Measure a BREACH, not a
  variation.
- "No design tokens." Every colour resolves through `tokens.css`. What is worth
  reporting is a computed value that does NOT, judged at runtime rather than by
  grep, because a token resolving to the wrong value passes a grep.
- "Modal accessibility." There are no modals. A modal in a Stax app is itself
  the finding.
- "Inconsistent page layouts." There are no pages. Everything is a panel at a
  registry width (S 380, M 480, L 640, XL 800, XXL fluid).
- "Add breadcrumbs." The crumbbar exists and is free.
- "Deep link support." The hash IS the workspace and round-trips.

## 3bis. THE MECHANIC. Audit this before anything visual.

Everything above is design. This is the framework. A Stax app that renders
beautifully and breaks the mechanic is not a Stax app, and no generic protocol
will notice because no generic protocol knows the mechanic exists.

**One move: anything with depth opens a panel to the RIGHT, and the source
STAYS on stage.** Not a route change, not a modal, not a replaced view. That one
sentence generates every check below.

### The chain

- **The parent stays mounted.** Drill three deep, then assert the first panel is
  still in the DOM, still scrolled where you left it, and still holding its own
  state (a filter, a selected row, a half-typed field). A parent that remounts
  has lost the mechanic and nobody will see it in a screenshot.
- **Closing a panel closes its descendants**, and only its descendants. Close
  the middle of a chain of four and count what remains: two, not one, not three.
- **Back is closing the rightmost panel**, not leaving the app. With
  `urlSync="push"`, browser Back must rewind the workspace and never exit.
- **A wizard is a chained drill.** Step N opens step N+1 to the right, the
  earlier steps stay visible, and the step's primary lives in ITS foot. A wizard
  that replaces its own panel is a page wearing a panel's clothes.

### The state

- **`WorkspaceState` is the whole UI.** `panelsById`, `contextLeafId`,
  `referenceRailOrder`. Serialise it, reload, restore: the workspace must come
  back identical. Run the round trip and diff the object, do not eyeball it.
- **The URL hash IS the context path**, and it round-trips byte for byte. A
  state the URL cannot express is a state that cannot be shared, which is the
  feature people adopt Stax for.
- **One space is active at a time.** Switching spaces must not leave a stale
  panel from the previous one on stage.

### The reference rail

- **A pinned reference survives navigation AND a space switch.** Pin something,
  drill elsewhere, switch space twice, and assert `referenceRailOrder` is
  unchanged and the reference still renders live data rather than a snapshot.
- A reference detaches from its parent: closing the parent must NOT close it.

### Sizing and identity

- **Width comes from the registry, never from a component.** Grep for a hardcoded
  panel width in app code: each hit is a panel that will disagree with its own
  registry entry the first time the ladder moves.
- **The panel type decides the size**, so two panels of one type at different
  widths is a defect even when both look fine.

### The forbidden constructs, and each is a finding by itself

A modal. A tab bar switching between entities. A detail ROUTE. A floating action
button. A drawer that is not the drawer. A "back" button drawn in the body. Each
one means a surface escaped the grammar, and the report should name the file.

### How to probe the chain, concretely

```js
// after drilling three deep
const n = document.querySelectorAll(".panel").length;              // 3, not 1
const first = document.querySelector(".panel");                    // still there
first.scrollTop;                                                    // preserved
window.stax?.getState?.();                                          // the bridge, if exposed
```

The app exposes `window.stax` in the reference implementation. If the target
does too, read the state directly rather than inferring it from the DOM: an
inferred state is a guess and this is the one place a guess is expensive.

## 4. Ask these instead. This is what actually breaks here.

### The foot, and measure it correctly

The foot law is 44px, one line, every width. **The three obvious assertions are
all blind to how it really breaks**, and they passed while the foot painted
three baselines and buried a control:

- foot height reads 44.00, because a wrapped label hides inside a 30px button
  whenever `line-height: 1` lets two 12px lines fit;
- the foot's own `scrollWidth - clientWidth` reads 0, because the overrun lives
  in a DESCENDANT;
- the children share one centre, because the wrap is inside ONE of them.

Measure instead: **line boxes by distinct vertical position** via
`Range.getClientRects()` (never by rect count: a text node starting with a space
yields an extra rect on the same line), **descendant** overflow walked, and a
**hit test** with `elementFromPoint` at every control's centre.

### The shapes actually rendered

Take 15 domain surfaces, fingerprint each leaf panel's body (the tag+class
sequence of its top level children plus the dominant repeated row class), and
count the distinct fingerprints. If most surfaces share one, the grammar was
executed and nothing was designed. `node $CLI shapes` is the catalog; `grid` is
one shape of twenty six and is correct only when the user EDITS the rows.

### Refusal, which is a designed state here

A denied element renders its empty expression or nothing. Sweep for
`[disabled]`, `[aria-disabled]` and any `title`/`aria-label` naming a
capability, permission, role or plan. Check every rendered count against the
rows actually rendered. Read the sign-in copy: "no account with that address" is
an account oracle.

### Derivation

A figure shown in two panels must be COMPUTED from one source, not typed twice.
Find a number that appears on two surfaces and verify they move together.

### The sign, on anything financial

`good = isCost ? delta < 0 : delta > 0`. A cost under plan is favourable while
its delta is negative. Colouring from the raw sign is the most common defect in
a hand-built finance view and no generic audit looks for it.

### Cohesion, if the app came from a migration

`node $CLI proof <dir>` renders every matrix row at its declared size under its
citation. Size drift, shape drift and citation rot are invisible to every other
audit and trivial for this one.

## 5. What each audit should change

| audit | what the lens adds |
|---|---|
| `/uiuxaudit` | the foot measured correctly, the bar contract, the shape fingerprint count, optical alignment against the cap band |
| `/a11yaudit` | rows that open panels must be reachable by keyboard; the drill chain is the tab order; a refusal must not be a greyed control with a naming tooltip |
| `/flowaudit` | the state machine IS `WorkspaceState`. A flow is a drill chain, a wizard is a chained drill, and "back" is closing the rightmost panel |
| `/featureaudit` | compare against the three matrices and the parity contract, not against a wish list |
| `/codeaudit` | the reducer is pure and the registry is the single source of panel sizing. A component that hardcodes a width is the finding |
| `/motionaudit` | one ease, panel entrance and the 130ms close ghost. Extra motion is the defect |
| `/dxaudit` | can a new contributor add a panel without touching the shell? Registry, domain node, body, foot: four places, and no more |
| `/refontaudit` | overlaps `stax-migrate` heavily. Run the CLI pipeline rather than re-deriving a plan in prose |
| `/secaudit` | the refusal law is a security surface: a capability named in a tooltip is a disclosure |

## 6. Cite the framework's own laws, not your own opinion

`DESIGN-SPEC.md` at the repo root is the pixel contract and the shape router.
When you report a breach, cite the law by name and the file:line of the breach.
When the spec and the app disagree and BOTH are defensible, say so and name who
must settle it. Do not pick.
