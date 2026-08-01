# The panel-in-panel prompt

A portable brief. Paste the whole thing into any model, any tool, then add one
line saying which variation you want. It explains the concept, marks what is
INVARIANT (change it and you no longer have panel-in-panel) and what is FREE
(the dials that make a different style), and ends with a self-check the model
must run against its own output.

Use it to explore. The point is not to reproduce Stax: it is to find out how
many different-looking products the same mechanic can carry.

---

## PASTE FROM HERE

You are designing a user interface built on ONE navigation mechanic, called
panel-in-panel. Read the whole brief before proposing anything. At the end I
will name a variation I want to explore; everything marked INVARIANT survives
that variation, everything marked FREE is yours to change.

### 1. The mechanic, in one sentence

**Anything with depth opens a new panel beside the thing you opened it from, and
the thing you opened it from STAYS on screen.**

That is the whole idea. Everything else in this brief is a consequence of it.

The ancestor is the Miller column (the macOS Finder column view, 1980s NeXT):
click a folder, a new column appears to its right, the folder you clicked is
still visible and still selected. Panel-in-panel takes that and applies it to
everything a product does, not just a file tree.

### 2. What it replaces, and why that matters

A conventional app moves you by REPLACING what you were looking at:

| the old move | what it costs |
|---|---|
| a page navigation | your previous context is gone; Back is a gamble |
| a modal | the thing underneath is present but unusable, and you cannot compare |
| a tab bar | only one facet exists at a time; you cannot see two at once |
| a detail route | the list you came from unmounts, losing your scroll and your filters |
| a slide-over drawer | it covers the thing it describes |

Panel-in-panel makes one substitution: **depth becomes SPATIAL rather than
MODAL**. Instead of "this replaces that", it is "this appears beside that". You
keep your place, you can compare, and the trail of how you got here is the
screen itself.

The trade it makes, and you must own it: horizontal (or whatever direction you
choose) space is finite, so a deep chain must fold, scroll or collapse. How you
solve that is one of the most interesting dials in section 5.

### 3. THE INVARIANTS. Break any one of these and it is not panel-in-panel.

**I1. The source stays.** When B opens from A, A is still mounted, still
scrolled where it was, still holding its own state: its filter, its selection,
its half-typed field. A source that unmounts and remounts is a page navigation
wearing a costume, and no screenshot will reveal it.

**I2. Depth is a chain, and closing is subtractive.** Panels form an ordered
chain from the root to the leaf. Closing one closes its descendants and ONLY its
descendants. Closing the middle of a chain of four leaves two, never one, never
three.

**I3. Back means "close the deepest", not "leave".** Whatever your platform's
back gesture is, it must peel one level of depth. It must never exit the app
while there is depth to peel.

**I4. The whole interface is ONE serializable value.** Not component state
scattered across a tree: one object describing every open panel, which one has
focus, and any pinned references. Serialize it, reload, restore it, and you are
looking at the same screen. If you cannot round-trip it, you do not have this
architecture, you have a layout that resembles it.

**I5. That value is addressable.** A link reproduces the exact arrangement, not
just the last thing opened. This is the property people actually adopt the
pattern for: "look at row 3 of the invoice inside the March close" becomes a URL.

**I6. One action zone per panel.** Every panel has exactly one place where its
verbs live, and the primary action is unmistakable. Actions never float, never
scatter through the body, never live in two places. Which zone it is, is FREE.

**I7. No modals, ever.** A modal is the exact thing this mechanic replaces. If
something needs the user's full attention, it is a panel opened at the deepest
position, not a layer over everything.

**I8. A panel's size is decided by its TYPE, not by its content or its author.**
A registry maps kind to size. Two panels of the same kind are the same size,
always. Otherwise every author invents a width and the rhythm dies in a week.

### 4. The state model, concretely

```
WorkspaceState = {
  panelsById:         every open panel, keyed, each with { type, resourceKey, parentId }
  contextLeafId:      the ONE panel that currently has the user's attention
  referenceRailOrder: panels the user pinned, which survive navigation
}
```

Everything the user does is a pure function of this: open, close, focus,
navigate, pin, unpin. No other state describes the layout. A reducer takes the
current value plus an intent and returns the next value, and the renderer is a
function of the value alone.

Two consequences worth stating because people miss them:

- **Undo is free.** Keep the previous values and you have history.
- **An agent can drive the UI** by emitting intents, and can read the exact
  screen the human is looking at, because the screen IS a value.

### 5. THE FREE DIALS. This is where a new style comes from.

Everything below can change completely while the eight invariants hold. When I
ask for a variation, these are what you turn.

**D1. Direction.** Right is only the default. Depth can go DOWN (each level a
band stacking vertically), INWARD (each level nested inside its parent's
bounds), OUTWARD from a centre (radial, the root at the middle), along a
DIAGONAL, or into Z (each level closer to the viewer, earlier levels receding
and blurring). The invariant is that the source stays visible, not that it sits
on the left.

**D2. How many levels are visible at once.** Show all and scroll. Show the last
three and collapse earlier ones to spines. Show two and make the rest a
breadcrumb. Show one at a time on a phone while keeping the chain in state, so
the mechanic survives even when the geometry cannot.

**D3. What a collapsed ancestor becomes.** A thin vertical spine with rotated
text. An icon rail. A stack of overlapping card edges. A single breadcrumb
chip. A number. Nothing at all, with the chain living only in the URL.

**D4. Panel anatomy.** Stax uses bar / body / foot. You could use: body only
with a floating title; a header that becomes a footer when the panel is not
focused; no chrome at all, with the panel's identity carried by its shape or
colour; a sidebar strip inside each panel. The invariant is ONE action zone, not
where it is.

**D5. The sizing system.** A fixed ladder (S 380, M 480, L 640, XL 800). Golden
ratio steps. Fluid fractions of the viewport. Content-derived, snapped to a
grid. Fibonacci. All of them satisfy I8 as long as the size comes from the type.

**D6. How a deep chain resolves.** Horizontal scroll. Accordion, where opening
one collapses its siblings. Fisheye, where the focused panel is large and the
others compress. Carousel with the focused panel centred. Zoom out to a map view
when the chain exceeds N.

**D7. Motion.** Slide in from the edge. Grow from the row that spawned it.
Unfold like paper. Fade with a scale. No motion at all, which is a real and
underrated choice. The one rule: the motion should say WHERE the panel came
from, because that is the mechanic made visible.

**D8. Density and voice.** Dense and monospaced like a terminal. Airy and
editorial with a serif. Brutalist, all hard edges and system fonts. Soft and
rounded. Paper-textured. This changes everything about the feel and nothing
about the mechanic.

**D9. The pinned reference.** A rail along one edge. Floating cards. A second
row above the chain. Torn-off panels that become their own windows. Or no
pinning at all, which is a legitimate simplification.

**D10. Input surface.** Mouse and keyboard. Touch, where the drill is a swipe
and the close is a swipe back. Voice, where a chain is spoken. Gaze. A game
controller. Each one changes the interaction grammar completely and none of them
touches the eight invariants.

**D11. What a panel can BE.** A form, a table, a chat, a terminal, a canvas, a
map, a video player, a 3D scene, a spreadsheet, a document. The mechanic does
not care. What matters is that each kind of panel earns its own shape rather
than every panel being a table with a different title.

**D12. The medium itself.** It does not have to be a screen app. This works as a
CLI (each drill is a new pane in a multiplexer), as a spatial or VR interface
(panels are surfaces in a room), as a printed diagram, as a physical desk
metaphor with sheets of paper.

### 6. What I want from you

I will name a variation. For it, produce:

1. **The one-sentence mechanic**, restated in the new geometry. If you cannot
   say it in one sentence, the variation is confused.
2. **Which dials you turned**, by number, and what you set each to.
3. **The invariant check**, one line per invariant, saying HOW this variation
   satisfies it. If one is violated, say so plainly and propose the nearest
   version that does not violate it, rather than quietly redefining the
   invariant to fit.
4. **The hard case**: what happens at depth 8, on a small screen, and when a
   panel needs more room than the geometry allows. Every panel-in-panel design
   is judged here and nowhere else. A variation that only works at depth 2 is a
   mockup.
5. **What this variation is BETTER at** than the horizontal default, and what it
   is worse at. If you cannot name something it is worse at, you have not
   understood it yet.
6. **A concrete render**: describe or draw one screen at depth 3, with real
   content, not lorem ipsum. Say what happens when the user opens one more level.

Do not pad. Do not produce a feature list. The interesting part is always the
hard case in point 4.

## PASTE TO HERE

---

## Variations worth asking for

Copy any of these as your one-line ask, or invent your own.

- Vertical: depth goes DOWN, each level a band, earlier bands collapsing to
  their titles. What does a phone do with this that the horizontal cannot?
- Radial: the root at the centre, each level a ring outward. How does the eye
  find the leaf?
- Fisheye: all levels always visible, the focused one large and the rest
  compressed to slivers that grow on hover.
- Nested: each panel renders INSIDE its parent's bounds, so depth is literal
  containment. Depth 8 is the whole problem here.
- Terminal: no graphics at all. Panels are panes in a multiplexer, the chain is
  a status line, the action zone is a prompt.
- Spatial: panels are surfaces floating in a room, and depth is walking.
- Paper: the chain is a stack of physical sheets, offset so you see the edges,
  and closing is sliding one off.
- Single-panel mobile: only one panel is ever visible, but every invariant
  holds. This is the hardest and the most useful one to get right.
- Two-dimensional: siblings go down, depth goes right, so the whole workspace
  is a grid and the chain is a path through it.
- Time as depth: each level is a moment, and drilling means going further into
  history. The chain is a timeline you can branch.

## The honest test, for any variation

Ask these four of whatever comes back, and be unforgiving:

1. **Open three levels, then look at the first one.** Is it still there, still
   scrolled where it was, still holding its filter? If the answer needs a
   caveat, invariant 1 is broken.
2. **Close the middle one.** Did exactly its descendants go?
3. **Copy the link and open it in a fresh window.** Is the arrangement identical?
4. **Go eight deep on a phone.** Describe what you see. Most variations die
   here, and finding out which ones is the entire point of exploring.
