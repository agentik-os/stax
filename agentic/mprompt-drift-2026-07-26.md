# M-prompt doctrine drift, audited statically

Task N93. Nine MASTER PROMPT blocks in `frameword/apps/crm-specimen/src/domain.ts`,
regenerated into `PROMPTS.md`. An operator pastes one of these into a coding
agent to drive a conversion, so a claim that has rotted produces a wrong
conversion silently.

Audited by extracting every prompt and checking its factual claims against the
CLI dispatcher, the two catalogs, the phase templates and DESIGN-SPEC.md. No
runtime probe: the machine was at load average 11.7 and the dev server would not
stay up, which is recorded here rather than worked around.

## The result, and it is better than expected

**Zero FALSE claims.** Every rot I hunted for is absent:

| hunted | found | checked against |
|---|---|---|
| the pre-0.25 URL form (`section~sec:…`, percent-encoded JSON) | none | regex over all nine prompts |
| the retired `ana-overview` / `ana-revenue` spaces | none | regex, after those spaces were removed in 0.23 |
| "serif for panel titles", stale since titles went mono | none | regex |
| `bar h56` where the contract says 44 | none | regex, after one such drift was fixed by hand in the README |

That is worth stating plainly. The prompts were kept honest as the framework
moved, and the one drift that did exist (the "tables, views and drills" claim)
had already been found and fixed.

## The real defect: five prompts are INCOMPLETE, not wrong

Three capabilities shipped after these prompts were written, and each is now a
required step rather than an option. A prompt that describes the pipeline
without them teaches an agent a pipeline that no longer exists.

| prompt | missing shape router | missing layout proof | missing audit |
|---|---|---|---|
| M2 | yes | yes | yes |
| M3 | yes | yes | no |
| M4 | yes | yes | yes |
| M5 | yes | no | yes |
| M6 | yes | yes | no |

**The shape router is missing from all five**, and it is the most consequential
omission of the three. It shipped in 0.26.0 precisely to stop an agent mapping
every domain surface to a table, which is the failure the operator rejected in
person. A mapping prompt that does not route through `stax-migrate shapes` is
the prompt that produced that failure.

**The layout proof** (0.30.0) is required at phases 4 and 8. Without it an agent
fills a status column and never renders a row against its own declaration.

**The audit** (0.31.0) is a phase gate at 8 and 9.

## Severity, by blast radius

1. **M2 and M4** carry all three gaps and are conversion prompts, which is what
   an operator reaches for first. Highest blast radius.
2. **M6** and **M3** miss the router and the proof.
3. **M5** misses the router and the audit.

## What is TRUE and was worth checking

- Every command named in a prompt exists in the dispatcher. The real surface is:
  `audit contract data doctor done init level next parity patterns prompt proof
  run scope shapes status theme upgrade verify`.
- The catalog counts a prompt could quote are 26 shapes and 20 patterns, and no
  prompt quotes a stale number.
- No prompt contradicts a phase template.

## The one disagreement, which I am not resolving

The operator's own external layout reference (`moonbase-layout-preview.html`)
states "serif for display and panel titles". Stax moved panel titles to MONO on
his explicit request. Neither the prompts nor the spec now say serif, so there
is no drift INSIDE the repo, but the repo and his reference disagree. That is
his call to settle, not mine, and it is recorded here so it is not discovered
later as an accident.

## Not audited

The "adversarial review of Wave 4" half of N93. Wave 4 has since been reviewed
by several adversarial passes (the rail sweep, the design panel, the panel
sweep, the forensic audit), and re-running a fifth one against a moving target
would produce findings about code that has changed underneath it. Stated rather
than silently dropped.
