#!/usr/bin/env node
/** Generates ../agents.md + ../llms.txt from the M-prompts in domain.ts —
 *  the app stays the source of truth; run after editing the Prompt pack. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");            // repo root (FRAMEWORK/)
const DOMAIN = path.join(ROOT, "frameword/apps/crm-specimen/src/domain.ts");
const src = fs.readFileSync(DOMAIN, "utf8");

// each master prompt sits in a `pr:m-*` node: capture title/subtitle + the code literal
const nodes = [...src.matchAll(/"pr:m-[\w-]+":\s*\{[\s\S]*?title:\s*"([^"]+)",\s*subtitle:\s*"([^"]+)"[\s\S]*?label:\s*"MASTER PROMPT[^"]*",\s*code:\s*("(?:[^"\\]|\\.)*")/g)];
if (nodes.length < 6) { console.error(`expected 6 master prompts, found ${nodes.length}`); process.exit(1); }

const md = [`# Stax — prompts for AI agents

Stax is a panels-inside-panels (Miller-columns) UX framework: one mechanic —
click anything with depth and a panel opens to the RIGHT; the parent stays.
This file is generated from the live Prompt pack inside the demo app
(\`frameword/apps/crm-specimen/src/domain.ts\` — source of truth; regenerate
with \`node frameword/scripts/gen-agents.mjs\`).

**How to use:** paste one prompt into Claude Code, Codex, or any coding agent,
verbatim, with the target repo as cwd. Demand the evidence each prompt
specifies — citations, grep output, running builds. For a full gated migration
prefer the CLI: \`node frameword/packages/stax-migrate/index.mjs init . --level full\`.

Key references: [README.md](README.md) · [PANEL-LOGIC.md](PANEL-LOGIC.md) ·
[DESIGN-SPEC.md](DESIGN-SPEC.md) · [frameword/packages/stax-migrate/README.md](frameword/packages/stax-migrate/README.md)
`];
for (const [, title, subtitle, lit] of nodes) {
  const code = eval(lit); // our own literal, from our own file
  md.push(`\n## ${title}\n\n*${subtitle}*\n\n\`\`\`text\n${code}\n\`\`\`\n`);
}
fs.writeFileSync(path.join(ROOT, "agents.md"), md.join(""));

fs.writeFileSync(path.join(ROOT, "llms.txt"), `# Stax — panels-inside-panels UX framework

> One mechanic: click anything with depth and a panel opens to the right; the
> parent stays. No pages, no modals, no tabs — a serializable stack of panels.

## Docs
- [README](README.md): what Stax is, quickstart, migration engine
- [PANEL-LOGIC.md](PANEL-LOGIC.md): the grammar — state, intents, laws
- [DESIGN-SPEC.md](DESIGN-SPEC.md): the pixel contract (anatomy, tokens, conversions)
- [agents.md](agents.md): six paste-ready master prompts (M1-M6) for coding agents
- [stax-migrate](frameword/packages/stax-migrate/README.md): gated migration CLI — contracted integration levels, three matrices

## Code
- [panels-core](frameword/packages/panels-core/src/index.ts): pure reducer engine (zero deps)
- [panels-react](frameword/packages/panels-react/src/index.tsx): React bindings + URL/history/storage sync
- [demo app](frameword/apps/crm-specimen/src/): the living specimen — 4 dashboards, every pattern

## Demo
- Live: https://stax-agentik-oss-projects.vercel.app
`);
console.log(`agents.md (${nodes.length} prompts) + llms.txt written`);
