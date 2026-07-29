# Authoring for this repo

The checklist for adding a skill, agent, or hook to `plenipo-agents`. Most of what follows is
**enforced** by `node eng/validate-marketplace.mjs`, which runs in CI — so this document and the
validator should never disagree. If they do, the validator is right and this file is a bug.

## Layout

```text
plugins/<plugin>/
├── .claude-plugin/plugin.json    # manifest — ONLY this lives in .claude-plugin/
├── skills/<kebab-name>/
│   ├── SKILL.md                  # required, body < 450 lines
│   ├── references/<topic>.md     # optional, one level deep, < 600 lines each
│   └── assets/                   # optional, copy-ready template files
├── agents/<kebab-name>.md        # optional subagents
├── hooks/hooks.json              # optional lifecycle hooks
└── scripts/<name>.mjs            # node — no jq dependency
```

Plugins **auto-discover** everything under `skills/` and `agents/`. There is no array to maintain
and **no catalog file** — adding one is an explicit non-goal. Only a whole new *plugin* needs a
`marketplace.json` entry.

## The five plugins

| Plugin | Loop | Default |
|---|---|---|
| `harness` | control plane — always available | on |
| `scout` | discovery | off |
| `define` | definition | off |
| `shape` | design | off |
| `deliver` | build + verification | on |

Put a skill in the loop that *runs* it. If a skill is needed in every loop, it belongs in `harness`.

## Frontmatter

```yaml
---
name: <kebab-name>              # MUST equal the folder name
description: >
  <2-4 dense sentences: what it does, when to reach for it, the sharpest exclusions.>
  USE FOR: ... DO NOT USE FOR: ...
license: MIT
disable-model-invocation: true  # action skills only — see below
---
```

- `name` — lowercase, digits, hyphens; ≤ 64 chars; must not contain `claude` or `anthropic`.
- `description` — ≤ 1024 chars. It is **the only thing loaded at startup** and the only basis for
  routing. Lead with the distinct use case. A `DO NOT USE FOR:` clause is required: overlapping
  descriptions are the most common marketplace defect, causing wrong activation or hesitation
  between options. The validator flags descriptions that overlap a sibling by more than half.

### Invocation: automatic vs manual

| Kind | Setting | Cost | Examples |
|---|---|---|---|
| **Knowledge / reference** — Claude should reach for it while working | omit `disable-model-invocation` | description is always-on when the plugin is enabled | `plenipo-platform`, `plenipo-runbook`, `loop-discipline`, `plenipo-module-sdk` |
| **Action / phase / ops** — a human fires it deliberately | `disable-model-invocation: true` | **zero** until invoked as `/<plugin>:<skill>` | everything that mutates, scaffolds, or is a pipeline phase |

Every action skill also names its **terminal states** near the top — which of `Success`, `No-op`,
`Blocked`, `Stalled`, `Exhausted`, `Approval-required` it can end in, and what each means there.
A skill that cannot say how it ends will not end.

## Section order

1. `# Title` + a 1–2 paragraph intro. **No persona paragraph** — no "You operate here as a
   staff-level…". It is always-loaded voice-setting that changes no behaviour.
2. `## When to Use` — concrete scenarios.
3. `## Stop Signals` — `**<situation>** → <use this instead>`.
4. `## Inputs` — table.
5. `## Workflow` — numbered, copy-pasteable. *(Process skills may use `## How to reason` /
   `## Output` instead — match the job.)*
6. `## Guardrails` — the rules that must not be broken.
7. `## Common Pitfalls` — table: pitfall / consequence / do instead.
8. `## Related skills` — each with a **Load when:** hint.

## Linking — the rule that bites

**A plugin is installed on its own.** Anything outside its own directory does not exist at runtime.

| Target | How | Never |
|---|---|---|
| Same plugin, sibling skill | `../<name>/SKILL.md` | — |
| Same skill's own files | `references/x.md`, `assets/y` | — |
| **Another plugin's skill** | `/<plugin>:<skill>` (a slash command) | a file path |
| **A model-invokable `harness` skill** | its bare name, e.g. `` `loop-discipline` `` | a file path |
| **Repo root** (`HARNESS.md`, `README.md`) | don't — move the content into a skill | `../../../../HARNESS.md` |

The validator rejects any relative link that escapes the plugin root or fails to resolve on disk.
This is not pedantry: it is the exact bug that makes an installed plugin reference a file the user
does not have.

## Writing rules

- Body under **450 lines**; push depth into `references/` (one level deep).
- Tables for matrices, numbered steps for procedures, checklists for requirements.
- **Verify API names, package names and versions against source before writing them.** The platform's
  own documentation has been wrong about its method names. Trust ranking:
  **source > tests > `.http` catalog > platform docs > product docs.**
- **Never hardcode the GitHub owner.** Read it from `workflow.json` or `gh api user`.
- **Never require a product-name prefix.** The `the-*` convention is dead.
- No secrets in examples, ever.

## Agents

An agent is a worker in its own context window. Add one only when a phase would otherwise flood the
main thread — not to mirror a skill.

**The rule the predecessor broke:** do **not** re-implement a skill's procedure inside an agent
body. Two copies of a procedure drift, and the drift is invisible until it produces wrong work.
Either the procedure lives in a skill the agent can actually load (i.e. model-invokable), or the
agent owns it outright and no skill duplicates it.

Constraints specific to plugin-shipped agents:

- **`hooks`, `mcpServers`, and `permissionMode` are ignored.** The validator rejects them.
- A subagent has no active-skill base directory, so it **cannot** read another skill by relative
  path — and `skills:` preload works only for **model-invokable** skills. An agent cannot invoke a
  `disable-model-invocation` skill at all.
- Scope tools tightly: `disallowedTools: Edit, Write` for read/run-only agents (keeps MCP);
  a `tools` allowlist when only a few are needed (drops MCP).

## Hooks

- Gate with `if` so an always-on hook stays cheap.
- Scripts are node in `scripts/`, invoked in exec form with `${CLAUDE_PLUGIN_ROOT}`.
- **Fail open**: exit 0 silently on any internal error and when there is no `workflow.json`. A buggy
  guard must never brick a session.
- Anything aggressive is opt-in and bounded by a circuit breaker.

## Checklist — new skill

1. Create `plugins/<plugin>/skills/<name>/` under the plugin that owns its loop.
2. Write `SKILL.md`: valid frontmatter, the section order above, `DO NOT USE FOR:` in the
   description, terminal states if it's an action skill.
3. Decide automatic vs manual and set `disable-model-invocation` accordingly.
4. Verify every version, package id, and API name against source.
5. **Run `node eng/validate-marketplace.mjs` — it must exit 0.**
6. Run `npx markdownlint-cli2 "**/*.md"`.
7. Add a row to the matching table in `README.md`.

## Checklist — new agent, hook, or script

1. Write the file per the constraints above.
2. **Bump `version` in that plugin's `plugin.json`.** Agents, hooks, and scripts are cached by
   plugin version; without a bump the install keeps serving the old copy (and a live session needs
   `/reload-plugins`).
3. Test a hook script by piping sample stdin JSON.
4. Validate and lint as above.

## Changing the validator

If a rule here is worth enforcing, enforce it in `eng/validate-marketplace.mjs` rather than trusting
prose. Add the check, watch it **fail** against a deliberately broken file, then fix the file. A
check never seen red may be asserting nothing.
