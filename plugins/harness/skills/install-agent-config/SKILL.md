---
name: install-agent-config
description: >
  Give a repo cross-tool agent configuration so OpenAI Codex, GitHub Copilot (VS Code, cloud agent,
  code review) and Claude Code all work from the same rules: AGENTS.md as the single source, a
  CLAUDE.md that imports it, a thin .github/copilot-instructions.md, path-scoped
  .github/instructions/*.instructions.md, and .github/agents/*.agent.md for agents that run on
  github.com. Facts land in exactly one file — duplication across these is the top cause of
  contradictory agent behaviour.
  USE FOR: making a product or platform repo usable by Codex and Copilot, not just Claude Code.
  DO NOT USE FOR: writing the run/test contract itself (/deliver:install-runbook), which AGENTS.md
  then points at.
license: MIT
disable-model-invocation: true
---

# Install cross-tool agent configuration

Different tools read different files, none of them read all of the others, and none of them define a
precedence between them. So the only safe design is: **one fact, one file, everything else points.**

**Terminal states.** `Success` — files written, `AGENTS.md` under the size cap, and at least one tool
verified to pick them up · `No-op` — present and current · `Blocked` — the repo has no `RUNBOOK.md`
or equivalent to point at, so there is nothing to say · `Approval-required` — installing
`.github/agents/*.agent.md` makes agents assignable on github.com, which is an outward-facing change.

## When to Use

- A product repo only has `.claude/` and you want Codex or Copilot to work on it too.
- A repo's rules live in someone's head, or only in a Claude Code skill.
- Onboarding a repo to a team that uses mixed tooling.

## Stop Signals

- **The repo has no runbook** → `/deliver:install-runbook` first. `AGENTS.md` should point at how to
  run and test, not restate it.
- **You want to change what the rules *are*** → edit the source of truth, then regenerate.

## What reads what

This drives every placement decision below. Verified July 2026:

| File | Codex | Copilot VS Code | Copilot cloud agent | Copilot on github.com | Claude Code |
|---|---|---|---|---|---|
| `AGENTS.md` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `.github/copilot-instructions.md` | ❌ | ✅ | ✅ | ✅ | ❌ |
| `.github/instructions/*.instructions.md` | ❌ | ✅ | ✅ | ❌ | ❌ |
| `.github/agents/*.agent.md` | ❌ | ✅ | ✅ | ✅ | ❌ |
| `CLAUDE.md` | ❌ | ✅ | ✅ | ❌ | ✅ |

Two consequences worth internalizing:

- **Claude Code does not read `AGENTS.md`.** Bridge it with an `@AGENTS.md` import inside
  `CLAUDE.md` — not a symlink, which needs Administrator or Developer Mode on Windows.
- **github.com Chat reads only `copilot-instructions.md`.** Anything that must reach a reviewer
  working in the browser has to be there, which is why that file is not merely a pointer.

## The size trap

**Codex truncates the concatenated `AGENTS.md` chain at 32 KiB, silently** — no warning in the TUI,
in `/stats`, in `exec`, or in the VS Code extension. Content past the cap is simply discarded, and a
long file at the root starves nested ones. Target **well under** it; ~150 lines is comfortable.
GitHub's own advice for `copilot-instructions.md` is "no longer than two pages."

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

4. **Write `.github/copilot-instructions.md`** — points at `AGENTS.md`, then carries the minimum a
   github.com reviewer needs standalone: what the repo is, the verification commands, and the two or
   three rules that catch most mistakes. Say explicitly that it does not duplicate AGENTS.md, so the
   next editor does not "helpfully" sync them.

5. **Write path-scoped instructions** for rules that only apply to certain files:

   ```yaml
   ---
   description: 'What these rules cover and when they apply.'
   applyTo: '**/*.cs'
   ---
   ```

   `applyTo` is a glob string; comma-separate multiple patterns **inside one string**
   (`'**/*.ts,**/*.tsx'`). Multiple matching files are combined with **no ordering guarantee**, so
   they must never contradict each other.

6. **Write custom agents** for work that should be assignable on github.com —
   `.github/agents/<name>.agent.md`. `description` is required; `name` defaults to the filename.
   This is the format that lets a reviewer hand an issue to an agent in the browser. (`.chatmode.md`
   is the deprecated predecessor — rename any you find.)

7. **Verify the install**, and be honest that this is mostly L4:
   - `AGENTS.md` byte size is under the cap — that part is L1, so actually measure it;
   - every path referenced from these files exists;
   - if the repo generates its index, the sync check passes;
   - open the repo in one of the tools and confirm it picks the rules up. Nothing here is enforced by
     the tools — these files are *context*, not configuration, and an agent may ignore them.

8. **Report** what was written, and state plainly that these instructions are advisory. Anything that
   must be enforced belongs in CI or a hook, not in a markdown file an agent may skim.

## Guardrails

- **One fact, one file.** If a rule needs to be in two places, put it in `AGENTS.md` and point from
  the other. Contradictions between these files resolve nondeterministically.
- **Never let `AGENTS.md` grow past the cap** — the failure is silent, so nothing will tell you.
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
| A long AGENTS.md | silently truncated by Codex, rules never arrive | keep it short; push depth into linked files |
| Path rules that contradict each other | nondeterministic behaviour, no ordering guarantee | make them disjoint by `applyTo` |
| Writing `.chatmode.md` | deprecated format | `.github/agents/<name>.agent.md` |
| Assuming instructions are enforced | an agent skips them and nothing catches it | enforce in CI or a hook |

## Related skills

- `/deliver:install-runbook` — the run/test contract these files point at. **Load when:** the repo
  has no runbook yet.
- `platform-protocol` — the cross-repo rules a product's `AGENTS.md` should summarize.
