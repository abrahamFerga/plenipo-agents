---
description: 'Rules for authoring a SKILL.md in this marketplace — frontmatter, section order, linking, and the size budget. Enforced by eng/validate-marketplace.mjs.'
applyTo: '**/SKILL.md'
---

# Authoring a skill

`AUTHORING.md` is the full contract; these are the rules a validator enforces, so getting them wrong
fails CI rather than merely reading badly.

## Frontmatter

```yaml
---
name: <kebab-name>              # MUST equal the folder name; no "claude"/"anthropic"
description: >
  2-4 dense sentences: what it does, when to reach for it, the sharpest exclusions.
  USE FOR: ... DO NOT USE FOR: ...
license: MIT
disable-model-invocation: true  # ACTION skills only — see below
---
```

- `description` ≤ 1024 chars. It is the **only** text loaded for routing, so lead with the distinct
  use case. A `DO NOT USE FOR:` clause is required — overlapping descriptions cause wrong activation
  or hesitation between options, and the validator flags any pair overlapping by more than half.
- **Action skill** — mutates something, scaffolds, or is a pipeline phase → set
  `disable-model-invocation: true` (costs nothing until invoked as `/<plugin>:<skill>`) and name its
  terminal states near the top: which of `Success`, `No-op`, `Blocked`, `Stalled`, `Exhausted`,
  `Approval-required` it can end in, and what each means there.
- **Knowledge skill** — something to reach for while working → omit the key. Its description is
  always-on context whenever the plugin is enabled, so keep it tight.

## Section order

`# Title` + short intro → `## When to Use` → `## Stop Signals` → `## Inputs` → `## Workflow` →
`## Guardrails` → `## Common Pitfalls` → `## Related skills`.

No persona paragraph. "You operate here as a staff-level architect…" is always-loaded voice-setting
that changes no behaviour.

## Linking — the rule that fails the build

A plugin is installed on its own, so anything outside its own directory does not exist at runtime.

| Target | How | Never |
|---|---|---|
| sibling skill, same plugin | `../<name>/SKILL.md` | — |
| this skill's own files | `references/x.md`, `assets/y` | — |
| another plugin's skill | `/<plugin>:<skill>` | a file path |
| a model-invokable `harness` skill | its bare name, e.g. `loop-discipline` | a file path |
| repo root (`HARNESS.md`, `README.md`) | don't — move the content into a skill | `../../../../HARNESS.md` |

Every relative link must also resolve on disk.

## Size

Body under **450 lines**. Push depth into `references/<topic>.md`, one level deep, under 600 lines
each. Copy-ready templates go in `assets/`.

## Content rules

- Tables for matrices, numbered steps for procedures.
- Verify API names, package names, and versions **against source** before writing them — the
  platform's own documentation has been wrong about its host API.
- Never hardcode a GitHub owner; read it from `workflow.json` or `gh api user`.
- Never require a product-name prefix — the `the-*` convention is dead.
- No secrets in examples.
