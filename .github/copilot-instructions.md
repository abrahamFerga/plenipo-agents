# Copilot instructions

**Read [`AGENTS.md`](../AGENTS.md) first — it is the single source for how this repo works.**
Copilot agent surfaces and code review read it; github.com Chat does not. This file carries the
minimum Chat needs standalone plus Copilot-specific behaviour. It deliberately does **not** repeat
the whole of AGENTS.md, because duplicated rules drift and produce contradictions.

## What this repo is

A Claude Code plugin marketplace: markdown skills for building AI-first products on the **Plenipo**
platform, organized around harness engineering and loop engineering. No application code — the only
executable is one Node validator.

## Before you say you are done

```bash
node eng/validate-marketplace.mjs          # structural invariants; must exit 0
node eng/generate-agent-docs.mjs --check   # AGENTS.md index in sync with the skills on disk
npx markdownlint-cli2 "**/*.md" "#node_modules"
```

All three run in CI. If you added, renamed, or deleted a skill, run `node eng/generate-agent-docs.mjs`
(without `--check`) and commit the result.

## The rules most often broken

- A skill's `name` must equal its folder name, and its `description` must carry a `DO NOT USE FOR:`
  clause — overlapping descriptions are the most common defect in a skill marketplace.
- **Never link outside the plugin a file lives in.** Plugins install in isolation, so a path to a
  sibling plugin or to the repo root resolves to nothing at runtime. The validator rejects it.
- Never hardcode a GitHub owner.
- Verify API names and package versions **against source**, not documentation — the Plenipo
  platform's docs are wrong about its own host API.

## Grading your own work

State the level of evidence behind any claim: **L1** a command's exit code decided it · **L2** a
linter or schema decided it · **L3** an E2E suite or real usage · **L4** your reading of the code —
an opinion, not a measurement · **L5** a human decided. Never present L4 as if a check had run, and
never call a step done because it compiled.
