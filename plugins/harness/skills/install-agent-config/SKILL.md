---
name: install-agent-config
description: >
  Give a repo cross-tool agent configuration so OpenAI Codex, GitHub Copilot (VS Code, cloud agent,
  code review), Cursor and Claude Code all work from the same rules: AGENTS.md as the single source,
  a CLAUDE.md that imports it, a thin .github/copilot-instructions.md, the path-scoped rule file
  each tool reads (.github/instructions/*.instructions.md, .claude/rules/*.md, .cursor/rules/*.mdc),
  and .github/agents/*.agent.md for agents that run on github.com. Facts land in exactly one file —
  duplication across these is the top cause of contradictory agent behaviour.
  USE FOR: making a product or platform repo usable by Codex, Copilot and Cursor, not just Claude
  Code. DO NOT USE FOR: writing the run/test contract itself (/deliver:install-runbook), which
  AGENTS.md then points at.
license: MIT
---

# Install cross-tool agent configuration

Different tools read different files, none of them read all of the others, and none of them define a
precedence between them. So the only safe design is: **one fact, one file, everything else points.**

This skill installs repository instructions. It does not install or enable the marketplace plugins
for Codex, Copilot, Cursor or Claude Code; do that separately in the host that will run the skills.

**Terminal states.** `Success` — files written, `AGENTS.md` under the size cap, and at least one tool
verified to pick them up · `No-op` — present and current · `Blocked` — the repo has no `RUNBOOK.md`
or equivalent to point at, so there is nothing to say · `Approval-required` — installing
`.github/agents/*.agent.md` makes agents assignable on github.com, which is an outward-facing change.

## When to Use

- A product repo only has `.claude/` and you want Codex, Copilot or Cursor to work on it too.
- A repo's rules live in someone's head, or only in a Claude Code skill.
- Onboarding a repo to a team that uses mixed tooling.

## Stop Signals

- **The repo has no runbook** → `/deliver:install-runbook` first. `AGENTS.md` should point at how to
  run and test, not restate it.
- **You want to change what the rules *are*** → edit the source of truth, then regenerate.

## What reads what

This drives every placement decision below. Verified against each vendor's own documentation on
2026-09-09:

| File | Codex | Copilot agent surfaces¹ | github.com Chat | Copilot code review | Cursor | Claude Code |
|---|---|---|---|---|---|---|
| `AGENTS.md` — root, and nested per directory | ✅ | ✅ | ❌ | ✅ | ✅ | ❌ |
| `.github/copilot-instructions.md` | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `.github/instructions/*.instructions.md` — `applyTo:` | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| `.claude/rules/*.md` — `paths:` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `.cursor/rules/*.mdc` — `globs:` | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| `.github/agents/*.agent.md` | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| `CLAUDE.md` | ❌ | ✅ | ❌ | ❌ | ✅² | ✅ |
| `.claude/skills/*/SKILL.md` | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `.agents/skills/*/SKILL.md` | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| `.claude/agents/*.md` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |

¹ VS Code, Copilot CLI, and the Copilot cloud agent. Other IDEs support a smaller subset.
² As literal, always-applied rules — the `@AGENTS.md` import line is inert text there, and Cursor
gets the rules from `AGENTS.md` itself.

Four consequences worth internalizing:

- **Claude Code does not read `AGENTS.md`.** Bridge it with an `@AGENTS.md` import inside
  `CLAUDE.md` — not a symlink, which needs Administrator or Developer Mode on Windows.
- **github.com Chat reads only `copilot-instructions.md` from this set.** Anything that must reach a
  Chat session in the browser has to be there, which is why that file is not merely a pointer.
- **Path-scoped rules have three formats and no shared reader.** Copilot's `applyTo:`, Claude
  Code's `paths:` and Cursor's `globs:` each read only their own file. This is the one place a rule
  is copied; keep every copy a few lines, byte-identical in body, and listed together in
  `AGENTS.md` so drift is visible.
- **No skills directory reaches every tool.** `.claude/skills/` reaches Claude Code, Cursor and
  Copilot CLI; `.agents/skills/` reaches Codex, Cursor and Copilot CLI; nothing reaches both Claude
  Code and Codex. A product's `run-<product>` skill therefore stays in `.claude/skills/`, and Codex
  reaches the same contract through `AGENTS.md`, which points at `RUNBOOK.md`. Codex also ignores
  `disable-model-invocation` in skill frontmatter, so a human-fired skill must refuse to run
  unasked in its own body.

## The size trap

Codex stops adding files to the concatenated `AGENTS.md` chain when it reaches
`project_doc_max_bytes`, which defaults to **32 KiB**. A user can raise the limit in Codex
configuration, but a shared repository cannot depend on that personal setting. Content beyond the
active cap is omitted from the task context, and a long file at the root can starve nested ones.
Target **well under the default**; ~150 lines is comfortable. GitHub's own advice for
`copilot-instructions.md` is "no longer than two pages."

## Workflow

1. **Find the source of truth.** For a product that is `RUNBOOK.md`; for this marketplace it is
   `AUTHORING.md` plus the skills. Everything you write points at it.

2. **Write `AGENTS.md`** at the repo root — the cross-tool contract, short:
   - what the repo is, in two sentences;
   - **the build/test commands**, verbatim and runnable (listing a test command is an implicit
     instruction to run it, which is what you want);
   - the layout, briefly;
   - the rules most often broken;
   - **how work is judged** — the evidence ladder and the named terminal states;
   - facts verified against source that contradict the repo's own docs, if any;
   - pointers to the deeper files. Do not inline them.

3. **Write `CLAUDE.md`** with `@AGENTS.md` on its own line, then *only* what is Claude-specific.
   Never restate AGENTS.md.

4. **Write `.github/copilot-instructions.md`** — points at `AGENTS.md`, then carries the minimum
   github.com Chat needs standalone: what the repo is, the verification commands, and the two or
   three rules that catch most mistakes. Say explicitly that it does not duplicate AGENTS.md, so the
   next editor does not "helpfully" sync them.

5. **Write path-scoped rules, once per reader.** A rule that applies only to some files has three
   formats:

   | Tool | File | Frontmatter |
   |---|---|---|
   | Copilot | `.github/instructions/<topic>.instructions.md` | `description:` and `applyTo: '**/*.cs'` — a glob string; comma-separate several **inside one string** (`'**/*.ts,**/*.tsx'`) |
   | Claude Code | `.claude/rules/<topic>.md` | `paths:` — a glob string or a list; the rule loads when Claude reads a matching file |
   | Cursor | `.cursor/rules/<topic>.mdc` | `description:`, `globs:` and `alwaysApply: false`; plain `.md` files in that folder are ignored |

   Write the body once and paste it into each file unchanged; the frontmatter is the only line that
   differs. Multiple matching Copilot files are combined with **no ordering guarantee**, so they
   must never contradict each other — the same is true across the three copies.

6. **Write custom agents** for work that should be assignable on github.com —
   `.github/agents/<name>.agent.md`. `description` is required; `name` defaults to the filename;
   `model` picks the model the cloud agent runs; `tools` lists what it may call; the body is capped
   at 30,000 characters. This is the format that lets a reviewer hand an issue to an agent in the
   browser or the repository's Agents tab. (`.chatmode.md` is the deprecated predecessor — rename
   any you find.)

7. **Verify the install**, and be honest that this is mostly L4:
   - `AGENTS.md` byte size is under Codex's shared 32 KiB default — that part is L1, so measure it;
   - every path referenced from these files exists;
   - if the repo generates its index, the sync check passes;
   - the three copies of each path-scoped rule have identical bodies — `diff` them, which is L1;
   - open the repo in one of the tools and confirm it picks the rules up. Nothing here is enforced by
     the tools — these files are *context*, not configuration, and an agent may ignore them.

8. **Report** what was written, and state plainly that these instructions are advisory. Anything that
   must be enforced belongs in CI or a hook, not in a markdown file an agent may skim.

## Guardrails

- **One fact, one file.** If a rule needs to be in two places, put it in `AGENTS.md` and point from
  the other. Contradictions between these files resolve nondeterministically.
- **Keep `AGENTS.md` below Codex's default cap** — do not make a shared repo depend on a personal
  `project_doc_max_bytes` override.
- **Never restate the runbook.** Point at it. A second copy of run instructions is a second copy to
  go stale, and the stale one is the one an agent will read.
- **Do not claim enforcement.** These are advisory context in every tool that reads them.
- **Generate the index if the repo has many skills** and check it in CI, so a rename cannot leave a
  dangling pointer.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Copying AGENTS.md into copilot-instructions.md | the two drift; no tool defines which wins | point, and keep only what github.com needs standalone |
| Symlinking CLAUDE.md → AGENTS.md | needs admin/Developer Mode on Windows | `@AGENTS.md` import |
| A long AGENTS.md | later files can be omitted at Codex's active cap | keep it below the 32 KiB default; push depth into linked files |
| Path rules that contradict each other | nondeterministic behaviour, no ordering guarantee | make them disjoint by `applyTo` |
| Editing one path-rule copy and not the other two | Copilot, Claude Code and Cursor now follow different rules for the same files | one body, three files, diffed in step 7 |
| Writing `.chatmode.md` | deprecated format | `.github/agents/<name>.agent.md` |
| Relying on `disable-model-invocation` to stop Codex | Codex discards the flag and may run the skill unasked | the skill body states the human decision and ends `Approval-required` |
| Assuming instructions are enforced | an agent skips them and nothing catches it | enforce in CI or a hook |

## Related skills

- `/deliver:install-runbook` — the run/test contract these files point at. **Load when:** the repo
  has no runbook yet.
- `platform-protocol` — the cross-repo rules a product's `AGENTS.md` should summarize.
