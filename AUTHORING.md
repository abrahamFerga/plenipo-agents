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

Every plugin also carries a second manifest, `plugin.json` at its root, in the
[Agent Plugins 1.0](https://agent-plugins.org) open-standard format that Codex, Copilot CLI and
Cursor load; and the repo root carries `.cursor-plugin/marketplace.json`, the only index Cursor
reads. Both are **generated from the Claude manifests** by `node eng/generate-open-manifests.mjs`,
and the validator fails the build the moment a name, version or description differs between the
two — so edit `.claude-plugin/plugin.json`, then regenerate. Skills under `skills/<name>/SKILL.md`
are exactly what the standard discovers; agents are Claude Code's routing mechanism and are
deliberately not exposed through it.

## The seven plugins

| Plugin | Loop | Default |
|---|---|---|
| `plenipo` | front door — eight bounded verbs | on |
| `harness` | control plane — always available | on |
| `scout` | discovery | off |
| `define` | definition | off |
| `shape` | design | off |
| `deliver` | build + verification | on |
| `steward` | platform request + release loop | platform repo only |

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
  (Claude Code itself truncates `description` plus `when_to_use` at 1,536 characters in the skill
  listing, so the budget is real, not stylistic.)
- Two other Claude Code fields exist and are used sparingly here. `paths:` (glob patterns) makes
  Claude load a skill automatically only while working on matching files — the right shape for a
  rule about one file type, the wrong shape for a loop verb. `context: fork` with `agent:` runs the
  skill body inside a subagent; the verbs delegate to named agents through the Agent tool instead,
  so the model route, tool set and turn cap are declared once in the agent file rather than per
  skill.

### Invocation: automatic vs manual

| Kind | Setting | Cost | Examples |
|---|---|---|---|
| **Knowledge / reference** — Claude should reach for it while working | omit `disable-model-invocation` | description is always-on when the plugin is enabled | `plenipo-platform`, `plenipo-runbook`, `loop-discipline`, `plenipo-module-sdk` |
| **Loop body** — a `plenipo` verb or the conductor must be able to *call* it | omit `disable-model-invocation` | description always-on | `work-next-issue`, `sync-backlog`, `design-product`, `scaffold-product`, `triage-requests`, `announce-release`, every `plenipo` verb |
| **Human-fired op** — irreversible, or a decision only a person should start | `disable-model-invocation: true` | **zero** until invoked as `/<plugin>:<skill>` | `upgrade-platform`, `install-request-surface` |

**The loop-body category is not a style choice; it is a hard constraint.** A skill with
`disable-model-invocation: true` is absent from the model's skill list entirely, so **no skill,
subagent or scheduled task can invoke it** — only a user typing the command can. Any skill that an
automated tick has to call must therefore omit the flag, and must earn that by being **idempotent,
re-entrant, and willing to stop** rather than improvise when its input artifact is missing.

The flag is Claude Code's mechanism, and Cursor honours it too; **Codex ignores it** (verified in
its skill parser, which discards unknown frontmatter silently). So a human-fired op's body must
also refuse to run unasked — state the human decision it waits for up front, and end
`Approval-required` rather than proceeding — because in one of the tools that loads it, the
frontmatter is not a gate.

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

The validator rejects any relative link that escapes the plugin root or fails to resolve on disk. It
also rejects a `/<plugin>:<skill>` reference naming a skill that does not exist, and a backticked
`../x/SKILL.md` that does not resolve — both were dead ends inherited from a predecessor's skill
names, and neither is cosmetic now that a verb can *invoke* what it references.

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
  path. A `skills:` entry injects the **full body** of each model-invokable skill at startup;
  unlisted project, user, and plugin skills remain available through the Skill tool. Preload only a
  skill used on every invocation, and load conditional references on demand. An agent cannot invoke
  a `disable-model-invocation` skill at all.
- Scope tools tightly: `disallowedTools: Edit, Write` for read/run-only agents (keeps MCP);
  a `tools` allowlist when only a few are needed (drops MCP).
- Leaf workers omit `Agent` from a `tools` allowlist or add it to `disallowedTools`. Recursive
  delegation multiplies contexts and loses the state the specialist was created to hold.
- Refer to a plugin agent by its registered `plugin:name`, even from a skill in the same plugin.
  Short names can be shadowed by a project or user agent with different tools and model routing.

Every agent also declares a concrete cost envelope:

```yaml
model: claude-opus-5   # pin the exact generation; never inherit or a bare family alias
effort: xhigh          # low / medium / high / xhigh / max; omit only for Haiku
maxTurns: 60           # a runaway circuit breaker, not a promised token budget
isolation: worktree    # any worker that writes code or boots the product
```

| Work | Cheapest reliable tier |
|---|---|
| deterministic inventory, classification, or formatting | a script first; `claude-haiku-4-5` only when judgement is unavoidable |
| bounded research, test driving, or rubric-based review | `claude-sonnet-5` |
| code changes, architecture, or ambiguous cross-layer diagnosis | `claude-opus-5` |
| one escalation of a `Stalled` diagnosis — never a default route | `claude-fable-5-1`, passed per invocation, not written into frontmatter |

**Effort is the second dial, and "medium" is not a neutral default.** `xhigh` is Claude Code's own
default for coding work, and Anthropic's guidance is that long-horizon agentic tasks handed a full
spec up front — exactly what a build worker receives — run at `high` or `xhigh`. So the code-writing
worker runs `xhigh`, bounded workers (a review, a sweep) run `medium`, and `max` is reserved for a
worker whose correctness matters more than its bill. Lower effort means fewer, more consolidated
tool calls, so `medium` on a reviewer is a cost decision, not a quality compromise.

Pin every route to an exact generation: the requirement is a generation, not whichever older model
a provider maps from a family alias. Since Claude Code 2.1.251 the resolution order is the
per-invocation `model` parameter → the agent's frontmatter → `CLAUDE_CODE_SUBAGENT_MODEL` → the
session model, with `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` (2.1.257+) overriding all of it; before
2.1.251 the environment variable silently beat the frontmatter. A worker that hits `maxTurns`
returns a result marked partial only from 2.1.246. **The floor is therefore Claude Code 2.1.251**,
plus access to the pinned models. The names work directly with Claude subscriptions and the Claude
API; Bedrock, Vertex AI and Foundry deployments map the same IDs to provider-specific version IDs,
inference profiles or deployment names through `modelOverrides`. Exact frontmatter expresses
routing intent; an organization policy that excludes the requested subagent model can still fall
back to the session model, so deployments must permit both routes. The marketplace rejects
`inherit`, bare `sonnet`, bare `opus` and bare `fable`; bare `haiku` stays allowed as the
explicitly cheapest tier.

`maxTurns` prevents runaway recursion; it does not replace the skill's named terminal states, and a
tight cap that causes a restart costs more than the turns it saved. A capped worker hands back a
partial result the coordinator can resume by messaging the same agent — resume before re-running.

`isolation: worktree` runs the agent in a temporary worktree cut from the default branch, so a build
or a sweep never switches the coordinator's checkout to a feature branch — a fleet running two loops
against one clone was observed doing exactly that. Set it on every worker that writes code or boots
the product; a worker that only reads GitHub does not need it. `memory:` is rejected by the
validator on purpose: loop state lives in GitHub and the journals, where every machine and every
tool reads the same facts, and a per-agent memory file is a second memory only one machine holds.

## Hooks

- Gate with `if` so an always-on hook stays cheap.
- Scripts are node in `scripts/`, invoked in exec form with `${CLAUDE_PLUGIN_ROOT}`.
- **Fail open**: exit 0 silently on any internal error and when there is no `workflow.json`. A buggy
  guard must never brick a session.
- Anything aggressive is opt-in and bounded by a circuit breaker.

## Checklist — new skill

0. Ask whether it needs to exist. The user-facing surface is the eight `plenipo` verbs; a new skill
   they must remember is a cost, and the right answer is often a step inside a verb instead.
1. Create `plugins/<plugin>/skills/<name>/` under the plugin that owns its loop.
2. Write `SKILL.md`: valid frontmatter, the section order above, `DO NOT USE FOR:` in the
   description, terminal states if it's an action skill.
3. Decide automatic vs manual and set `disable-model-invocation` accordingly.
4. Verify every version, package id, and API name against source.
5. **Run `node eng/validate-marketplace.mjs` — it must exit 0.** Then run the vendor's own check,
   `claude plugin validate --strict plugins/<plugin>`, which rejects an unrecognized frontmatter or
   manifest field that the runtime would otherwise tolerate silently.
6. Run `npx --yes markdownlint-cli2@0.23.2 "**/*.md" "#node_modules"`.
7. Add a row to the matching table in `README.md`.

## Checklist — new agent, hook, or script

1. Write the file per the constraints above. Pick the cheapest reliable `model`, declare `effort`
   and a generous `maxTurns`, deny recursive `Agent` use for leaf workers, and preload no conditional
   skill.
2. **Bump `version` in that plugin's `plugin.json`.** Agents, hooks, and scripts are cached by
   plugin version; without a bump the install keeps serving the old copy (and a live session needs
   `/reload-plugins`).
3. Test a hook script by piping sample stdin JSON.
4. Validate and lint as above.

## Changing the validator

If a rule here is worth enforcing, enforce it in `eng/validate-marketplace.mjs` rather than trusting
prose. Add the check, watch it **fail** against a deliberately broken file, then fix the file. A
check never seen red may be asserting nothing.
