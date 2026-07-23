# __APP_NAME__

A [Stax](https://github.com/agentik-os/stax) panels-inside-panels app.

```bash
bun install
bun dev        # http://localhost:5800
```

- `src/domain.ts` — your content graph: nodes open panels, children become drills.
- `src/App.tsx` — the shell: provider, stage, panel anatomy (bar · body · foot).
- `DESIGN-SPEC.md` — the design contract every element follows.
- Engine docs: the packages under `packages/` are the vendored Stax engine
  (`panels-core` = pure state + 7 intents; `panels-react` = provider/bindings).

Grammar in 20 seconds: `openSpace` starts a thread, drilling a row `openDetail`s
the next panel beside it, PIN keeps a panel across pages, closing the root
promotes its child. The URL carries the thread; reload restores it.
