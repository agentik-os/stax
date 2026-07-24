# Stax, the panels-inside-panels UI/UX framework

**One mechanic: click anything with depth and a panel opens to the right. The parent stays.**

No pages, no modals, no tabs. A serializable stack of panels (Miller columns,
evolved) with pinned references that survive navigation, URL-synced state, and a
registry that sizes every panel. Stax is as much a design system as a navigation
model: a complete WhitePaper UI language (serif display, mono data, one accent
and its ramp, exact interior margins, stroke icons, six mandatory states) shipped
as tokens. Change the accent in Settings and the whole system follows.

**Live demo: [stax-agentik-oss-projects.vercel.app](https://stax-agentik-oss-projects.vercel.app/)**

## See it live

The URL hash IS the workspace, and since 0.25.0 it reads like a path you could
have guessed. Every link below opens the panels it names, on the live demo:

| Link | What it opens |
|---|---|
| [`#/analytics/blotter`](https://stax-agentik-oss-projects.vercel.app/#/analytics/blotter) | An execution blotter: a fill stream, notional by venue, a cost block in bps |
| [`#/analytics/cfo`](https://stax-agentik-oss-projects.vercel.app/#/analytics/cfo) | A monthly close: the P&L walk from revenue to EBITDA, plan against actual |
| [`#/console/keys`](https://stax-agentik-oss-projects.vercel.app/#/console/keys) | API keys: masked secrets, reveal once on creation, roll and revoke as row actions |
| [`#/crm/acme/jo/refonte`](https://stax-agentik-oss-projects.vercel.app/#/crm/acme/jo/refonte) | Four panels deep in one URL: accounts, account, contact, opportunity |
| [`#/studio/terminal`](https://stax-agentik-oss-projects.vercel.app/#/studio/terminal) | A terminal as a panel: mono scrollback in the body, the prompt in the foot |
| [`#/canvas/canvas`](https://stax-agentik-oss-projects.vercel.app/#/canvas/canvas) | A Figma-class whiteboard as a panel; nodes drill to inspectors |
| [`#/data/data`](https://stax-agentik-oss-projects.vercel.app/#/data/data) | Airtable-class tables where every row opens as a Notion-class page |

Old links never rot. The previous `type~key` form and the original
percent-encoded JSON both still decode, and they upgrade themselves: open one and
the address bar rewrites to the short form.

## What's inside

| Path | What it is |
|---|---|
| `frameword/packages/panels-core` | The pure TypeScript engine: reducer, intents, laws, the URL codec. Zero dependencies |
| `frameword/packages/panels-react` | React bindings: provider, registry, URL sync, persistence |
| `frameword/apps/crm-specimen` | The specimen app: the WhitePaper design system, a component gallery, 86 dashboard blocks with live demos, a multi-board canvas, notes and tasks, data tables, the agent drawer, four financial surfaces |
| `frameword/packages/stax-migrate` | The migration engine: a zero-dependency CLI that drives a full refonte of any legacy app to the panel grammar via Claude Code or Codex, gated mechanically |
| `frameword/packages/create-stax-app` | The starter generator for a brand-new app |
| `DESIGN-SPEC.md` | The pixel contract: panel anatomy, interior margins, type and number laws, the accent ramp, and the conversion tables |
| `agents.md` | The working contract for a coding agent: where to add a panel, the URL rules, the design laws, the exact gate commands |
| `frameword/apps/crm-specimen/e2e` | The committed regression suite: the design laws as 50 Playwright specs, run in CI |

## Install and run

```sh
git clone https://github.com/agentik-os/stax
cd stax/frameword
bun install          # workspaces: panels-core, panels-react, crm-specimen, stax-migrate
bun run test         # 122 tests: the engine laws + the CLI cases
bun run dev          # the specimen at http://localhost:5799
```

Use `bun run test`, not bare `bun test`: the latter sweeps the Playwright e2e
specs into bun's own runner, which cannot execute them.

The 50-spec regression suite runs against a built preview, or against any running
app via `BASE`:

```sh
cd apps/crm-specimen
bunx vite build && bunx playwright test -c e2e/playwright.config.ts   # preview on :4173
BASE=http://localhost:5799 bunx playwright test -c e2e/playwright.config.ts   # or a live URL
```

Production build of the specimen: `cd apps/crm-specimen && bunx vite build`
(static `dist/`, deploy anywhere).

## Start a NEW app in one command

```sh
node frameword/packages/create-stax-app/index.mjs my-app   # or from a clone: --from <checkout>
cd my-app && bun install && bun dev
```

You get the starter shell (provider, stage, panel anatomy, drills, foot), the
vendored engine under `packages/`, and `DESIGN-SPEC.md`, the same contract this
repo enforces. Edit `src/domain.ts` and the app grows panels.

## Use the framework in your own app

The engine is two packages, a pure reducer and thin React bindings:

```tsx
import { WorkspaceProvider, useWorkspace } from "@frameword/panels-react";

// 1 · the registry maps every panelType to a width class (S 380, M 480, L 640, XL 800)
const REGISTRY = { space: { size: "L" }, account: { size: "M" }, contact: { size: "M" } };

// 2 · wrap the app. URL sync and localStorage persistence are built in.
//     slugCodec is optional: without it the URL falls back to the type~key form.
<WorkspaceProvider registry={REGISTRY} urlSync storageKey="my-app" slugCodec={slugCodec}>
  <Shell />
</WorkspaceProvider>;

// 3 · drive it with intents. The entire UI derives from WorkspaceState.
function Row({ panelId, account }) {
  const ws = useWorkspace();
  return (
    <button onClick={() =>
      ws.openDetail(panelId, { panelType: "account", resourceKey: "acc:" + account.id })}>
      {account.name}                {/* opens the next panel to the right, the parent stays */}
    </button>
  );
}
```

Seven intents cover everything: `openSpace`, `openDetail`, `pinPanel` and
`unpinPanel`, `closePanel`, `navigateTo`, `openPath`. `mod+Z` and
`shift+mod+Z` undo and redo every workspace intent out of the box.

For a backend instead of localStorage, pass `storage={yourAdapter}`
(`{ load(), save(state) }`). Async loads reconcile UNDER the current URL: the
URL's thread always wins.

```ts
import type { StorageAdapter } from "@frameword/panels-react";
const convexAdapter = (client, userId): StorageAdapter => ({
  load: () => client.query(api.workspace.get, { userId }),
  save: (state) => void client.mutation(api.workspace.put, { userId, state }),
});
```

## Readable URLs, without teaching the engine your domain

`encodeLocation` and `decodeLocation` take an optional `SlugCodec`. The engine
knows a slug is a string and never what "blotter" means; the app supplies the
mapping (see `frameword/apps/crm-specimen/src/slugs.ts` for a worked one). Four
rules: the space is named by its public slug, the space root is never written, a
node's slug is its key with the namespace stripped, and on a collision the most
public surface wins the bare word while the others keep a qualified form. Three
forms decode and they can mix inside one URL, which is what keeps every old link
alive.

## Ten identity treatments, picked at runtime

A panel's head is a data plan, not a hardcoded render: `headPlan(layout, ctx)` is
a pure function and the Panel just renders what it returns. Ten treatments ship
(`dense-bar` by default, then `echo`, `no-subtitle`, `bar-title`, `focus-only`,
`scroll-collapse`, `first-run`, `spine`, `density`, `editorial`), selectable per
device in Settings. The default moves the identity into the panel bar and gives
the body back about 89px, taking panel chrome from 28% of the height to 13%.

## A domain surface is a panel, not a table in a trench coat

The data grammar can express anything, which is exactly the trap. A position book
genuinely is a table. An execution blotter is a fill stream plus a cost block, a
treasury is a cash ladder with a reconciliation state, a monthly close is the P&L
walk. Figures are derived and reconcile across panels, the sign inverts on cost
lines, and state comes from tokens so the comparison survives dark mode. No chart
library: bars are divs. Live at `#/analytics/blotter`, `#/analytics/treasury`,
`#/analytics/cfo`.

## Drive it from an agent

The workspace is an API. `window.stax` exposes the serializable state and every
intent (`getState`, `find`, `open`, `actions`, `act`, `pin`, `close`, `undo`,
`redo`), the same action registry the foot and the palette read. The demo
drawer's slash commands (`/open acme`, `/actions`, `/run new-row`, `/undo`) are
that bridge, spoken. The full agent contract is [agents.md](agents.md).

⌘K opens the palette. "Open devtools" inspects the live state and time-travels
the intent history; "Copy workspace link" gzips the full arrangement into
`#ws=...`; `?` prints the keyboard map; "Play the tour" has the bridge
demonstrate the grammar on itself.

## Adopt Stax in a legacy project, structure AND design

`stax-migrate` is a program, not a prompt. It rebuilds a legacy app on the panel
grammar and retransforms its UI at pixel granularity, via Claude Code or Codex,
in gated phases, at an integration level you contract up front, so a migration
can never end up "10% integrated and quietly done".

| level | you get | the gates accept |
|---|---|---|
| **`full`** (default) | 100% integrated, everything migrated, old UI purged | migrated only |
| **`standard`** | every row terminal; legacy surfaces may stay embedded | migrated, wrapped or deferred **with cited reasons** |
| **`starter`** | your chosen core spaces at 100% | migrated, out-of-scope **with cited reasons** |
| **`shell`** | the Stax shell wraps the app, every route panel-reachable | migrated, wrapped **with cited reasons** |

```sh
CLI=$(pwd)/frameword/packages/stax-migrate/index.mjs   # not published to npm: call it by path
node $CLI init <your-legacy-app> --level full
node $CLI run  <your-legacy-app> --agent claude        # drive ONE phase (or codex)
node $CLI status   <your-legacy-app>                   # three coverage matrices
node $CLI contract <your-legacy-app>                   # the honesty check, exit 1 on breach
```

Nine phases run recon, the feature and data matrices, the UI inventory, the
mapping passes, the scaffold, the migration batches, an adversarial coverage
re-crawl, and acceptance. Three matrices are the law: every feature and
sub-feature is a row (F-012, F-012.1), every visual atom is a row (E-041 is one
icon, one card style, one spacing value), and every table and server function is
a row bound to the panel that reads it and the foot action that writes it. The
pipeline refuses to complete while a single row of any matrix blocks the
contracted level, and every skipped row must carry its reason.

Other things the CLI does:

```sh
node $CLI patterns "api key"                       # 20 proven SaaS-admin screens, with a live reference panel
node $CLI data scan <dir> --write                  # extract tables, functions, rpc, realtime + call sites, with file:line
node $CLI data check <dir>                         # exit 1 until 100% of the backend is bound
node $CLI parity --url https://your-app.example    # the 100% transfer gate, capability by capability
node $CLI verify --url <live> --themes light,dark  # Playwright-scan the real page for the design laws
node $CLI doctor <dir>                             # adoption health: contract, pending upgrades, token drift
node $CLI theme  --from "#e11d48"                  # a full OKLCH accent ramp, both themes
```

The backend survives untouched. Convex, Supabase, Prisma, REST and tRPC all keep
working, because panels are a view grammar over your existing queries and
mutations. The scan is programmatic (80%), the AI only maps each row to its
reading panel and writing action (20%).

**Already on Stax?** You never re-migrate. `upgrade` diffs your project against
the versioned catalog (U-001 to U-040), each unit a DETECT / APPLY / VERIFY brief
an agent applies and you record after checking the evidence:

```sh
node $CLI upgrade .                       # applied vs pending
node $CLI upgrade plan U-040 .            # print one unit's brief
node $CLI upgrade run  . --agent claude   # apply the next unit
node $CLI upgrade done U-040 .            # record it (operator-gated, never the agent)
```

The same intelligence is browsable inside the app at
[`#/prompts`](https://stax-agentik-oss-projects.vercel.app/#/prompts): ten master
prompts, M1 to M10, covering the forensic inventory, the grammar mapping, the
design integration, the enterprise strangler and the agent bridge.

## The laws, short form

1. Opening a space replaces the active thread; pinned references ride across it.
2. One action zone per panel, the foot. Never a floating button.
3. Parents stay visible, depth reads left to right, ⌘K goes anywhere.
4. State is a serializable list; the URL, the crumbbar and the agent context all
   derive from it.
5. Tokens only. Change the accent and the whole system follows.

MIT. Built by [Agentik OS](https://github.com/agentik-os).
