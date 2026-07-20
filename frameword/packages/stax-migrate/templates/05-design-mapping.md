# PHASE 5/9 — DESIGN MAPPING — every element lands on the design-spec contract

ROLE: design translator. Phase 4 mapped BEHAVIOR to the grammar; you map every
VISUAL element to its exact Stax equivalent. The contract is
{{TARGET}}/stax-migration/design-spec.md — re-read it in full before starting;
every value you write must trace to one of its sections (§1-§7).

TARGET: {{TARGET}}  (stack: {{STACK}})
READ/WRITE: {{TARGET}}/stax-migration/element-matrix.csv — fill `stax_target`,
`tokens`, `spacing` on EVERY row, set `status=mapped`. Ambiguity calls go to
decision-log.md. Do NOT touch app code, feature-matrix.csv, or state.json.

## Fill the three columns, per row

STAX_TARGET — the Stax equivalent, from design-spec.md §6 (controls), §1
(anatomy), §4 (shape/motion), §5 (icons). The canonical conversions:

| old element (kind) | stax_target to write |
|---|---|
| modal / dialog | `panel(S\|M\|L\|XL)` — size by content, opened right, parent stays |
| tabs | `sibling-drills` or `in-panel-sections` (never a tab strip) |
| `<select>` for a status-like choice | `segmented d-btn sm` (filled = active) |
| `<select>` for an open set | `smart-menu` (trigger shows active state) |
| native date/time input | `.dp-pop calendar` (Monday-first) + 30-min time list |
| inline rename / boxed edit-in-place | `.inline-edit` — text-like, zero border, zero ring |
| input focus ring | `accent-tinted border` — outline reserved for buttons (keyboard) |
| toolbar of 10+ flat buttons | `grouped smart-menus` |
| toast / snackbar stack | `.toast mono pill, bottom-center` |
| hover affordance | `hover-reveal (opacity 0→1)` |
| data grid / table | `.dt` — sticky mono headers, hairline --rule-1, typed cells, row = next panel |
| free-form board / diagram | `canvas panel` — WhitePaper nodes, 4-way handles, accent edges |
| wizard | `chained-drills + foot CTAs` |
| global search | `⌘K palette` |
| chat / AI helper | `full-height drawer (⌘J)` |
| icon | the NAMED stroke equivalent: `stroke-1.7/<lucide-name>` (viewBox 24, round caps, currentColor, size 12-15 per context) — or `drop` WITH a decision-log entry (§5) |
| card / tile | `.card` — see spacing column |
| KPI / stat | `.stat` |
| badge / pill | `accent-soft pill r9999` |
| button | `d-btn` variant; primary = accent bg + accent border + --accent-hover |
| missing state (kind=state) | the state to BUILD: `add:empty-state` / `add:loading-skeleton` / `add:error-state` (§7 — empty states are sentences with a next action) |

TOKENS — the CSS custom properties that replace the element's hardcoded
colors/fonts, from §2-§3: e.g. `--accent,--accent-soft,--fz-mono,--font-mono`
for a status badge; `--card,--border,--fz-body` for a card. Rules: one accent
ramp for charts/statuses (never semantic green/amber — those are dots only);
every numeric value gets `--font-mono` + tabular-nums; sizes derive from
`--fz-*` (a raw pixel font-size in the mapping is a defect).

SPACING — the exact interior geometry it must land on, from §1 and §4:
e.g. card → `pad 14px 16px, r12, mb16`; stat → `pad 12px 14px, r12`;
drill row → `pad 12px 14px, r10, gap 12`; panel body → `pad 18px 18px 16px`;
panel bar → `h56, pad 0 10px 0 16px`; foot → `pad 11px 14px, gap 8`;
buttons r7-8, inputs r7, pills r9999. Spacing/color/type histogram rows get
the token or scale value they collapse into (e.g. `13px → --fz-body`).

## Ambiguities

Resolve by the nearest §-rule; if genuinely open (two plausible targets),
pick the one with fewer new components and log it:
`YYYY-MM-DD · E-NNN · chose X over Y · §N rationale`. EVERY dropped icon gets
a log entry (§5). An undocumented judgment call is a bug.

## Exit criteria — self-check before you stop

1. ZERO rows with empty `stax_target` — `node {{CLI}} done {{TARGET}}` must
   not name any E-row for an empty target (read its output; the operator
   advances the phase, never you).
2. Every `tokens` value is a real token from design-spec.md §2-§3; every
   `spacing` value traces to §1/§4. No invented values.
3. Every row `status=mapped`. Final message: rows mapped per kind, dropped
   icons (count + log entries), and the 5 hardest calls you made.

When you are done, stop. Do not scaffold (phase 6).
