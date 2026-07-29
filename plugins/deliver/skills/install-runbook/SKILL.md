---
name: install-runbook
description: >
  Install the execution + verification surface into a Plenipo product repo so any agent can run it
  and prove a change works without rediscovering anything: RUNBOOK.md, a discoverable
  `.claude/skills/run-<product>` skill, the Testcontainers integration fixture, the golden-eval
  harness, the committed `.http` request catalog, and `.claude/launch.json`. Re-runnable — it
  reconciles what exists and reports drift instead of clobbering.
  USE FOR: a product with no runbook, a product whose runbook has gone stale, or standardizing a
  repo that predates this contract. DO NOT USE FOR: running or debugging the product (the installed
  runbook does that), or platform-level Plenipo work (the Plenipo repo has its own run skill).
license: MIT
disable-model-invocation: true
---

# Install the runbook

Every Plenipo product must answer two questions the same way, so an agent never has to guess:
**how do I run this, and how do I prove a change works?** This skill writes those answers into the
product repo as durable, discoverable files.

The failure this prevents is real and measured across the existing fleet: the platform repo ships a
run skill, but products built on it ship none — so each new session rediscovers the AppHost command,
the dev-auth headers, the Mock provider, the pgvector requirement, and the WorkingDirectory trap
from scratch, or worse, doesn't and ships unverified.

## When to Use

- A product repo has no `RUNBOOK.md` or no `.claude/skills/run-*`.
- A repo's operations doc references projects or layouts that no longer exist (stale runbook).
- A product has integration tests but no golden evals, or no integration tests at all.
- Right after `/deliver:scaffold-product`, before the first feature issue is worked.

## Stop Signals

- **You want to run or debug the product** → read the installed `RUNBOOK.md`, don't reinstall it.
- **This is the Plenipo platform repo itself** → it owns `.claude/skills/run-plenipo`; leave it alone.
- **The product isn't on Plenipo** (no `Plenipo.*` package references) → this contract assumes the
  platform's dev-auth, Mock provider, and AG-UI surface. Stop and say so.

## Inputs

| Input | Where it comes from | Used for |
|---|---|---|
| Product name (PascalCase) | the `.slnx` / `src/<Product>.Host` folder | `{{Product}}` in every asset |
| Product slug (kebab/lower) | repo folder name | `{{product}}` — container names, ports, file names |
| Module id | the module's `ModuleManifest.Id` | `{{ModuleId}}` in AG-UI routes and evals |
| Module assembly suffix | `src/<Product>.<Module>` | test project naming |
| A sample user prompt | `SuggestedPrompts` in the manifest | `{{SamplePrompt}}` in the AG-UI example |

Read these from the repo — never invent them. If `src/<Product>.Host` doesn't exist, the repo isn't
a Plenipo product host yet; stop.

## Workflow

1. **Detect.** Confirm a Plenipo product: `src/<Product>.Host` exists and references `Plenipo.*`
   packages. Record the five inputs above from the actual files. Read the module's manifest for the
   id, tool names, which tools set `RequiresApproval`, and the suggested prompts.

2. **Inventory what's already there.** For each artifact below, record present / missing / stale.
   *Stale* means it exists but names a project, port, or module id the repo no longer has.

   | Artifact | Path |
   |---|---|
   | Runbook | `RUNBOOK.md` |
   | Discovery skill | `.claude/skills/run-<product>/SKILL.md` |
   | E2E fixture | `tests/<Product>.IntegrationTests/IntegrationFixture.cs` |
   | E2E project | `tests/<Product>.IntegrationTests/<Product>.IntegrationTests.csproj` |
   | Golden evals | `tests/<Product>.IntegrationTests/Evals/cases/*.json` |
   | Request catalog | `<product>.http` |
   | IDE launch | `.claude/launch.json` |

3. **Write what's missing.** Copy from `assets/`, substituting the placeholders:

   | Asset | Destination |
   |---|---|
   | `RUNBOOK.md` | `RUNBOOK.md` |
   | `run-product-SKILL.md` | `.claude/skills/run-<product>/SKILL.md` |
   | `IntegrationFixture.cs.template` | `tests/<Product>.IntegrationTests/IntegrationFixture.cs` |
   | `IntegrationTests.csproj.template` | `tests/<Product>.IntegrationTests/<Product>.IntegrationTests.csproj` |
   | `eval-case.json` | `tests/<Product>.IntegrationTests/Evals/cases/<module>-write-requires-approval.json` |
   | `launch.json` | `.claude/launch.json` |

   Never overwrite an existing file silently. If one is **stale**, show the specific wrong lines and
   ask before replacing.

4. **Seed real content, not placeholders.** A runbook full of `{{…}}` is worse than none — an agent
   will trust it and be wrong. Every substitution must resolve to something you read from the repo.
   The eval case must name a **real** approval-gated tool from the manifest.

5. **Backfill the request catalog.** If `<product>.http` is missing or thin, generate one request
   per mapped endpoint (read the module's `MapEndpoints` plus the platform routes the runbook
   lists), each with the dev-auth headers.

6. **Prove the install.** This is the exit condition — do not report success without it:

   ```bash
   dotnet build <Product>.slnx
   dotnet test  tests/<Product>.IntegrationTests
   ```

   Both must pass, and the run must include the new fixture booting a Testcontainers Postgres.
   If Docker isn't available, say so explicitly and mark the install **unverified** rather than done.

7. **Report drift.** List what you wrote, what you left alone, and anything stale you found but
   didn't change. Drift you stayed silent about is drift the next agent inherits.

## Guardrails

- **Read values, don't guess them.** Ports, project names, module ids, and tool names all come from
  the repo. A confidently wrong runbook is the worst possible output of this skill.
- **The eval case must reference a tool that exists** and is genuinely `RequiresApproval = true`.
  Otherwise rung 4 fails on first run and the next agent deletes the whole harness.
- **pgvector, always.** The fixture image must be `pgvector/pgvector`, never stock `postgres` — the
  platform's RAG migration creates a vector column at startup.
- **No secrets in any generated file.** Provider keys are per-tenant runtime settings.
- **Keep the discovery skill thin.** Depth belongs in `RUNBOOK.md`; the skill is the index that
  makes it findable. If the skill grows past ~80 lines you are duplicating the runbook.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Copying assets with placeholders unresolved | agents follow a runbook that names nothing real | resolve every `{{…}}` from repo files |
| Writing the runbook without running the tests | the harness ships broken | step 6 is mandatory |
| Overwriting a hand-tuned `RUNBOOK.md` | loses product-specific hard-won knowledge | reconcile section by section, ask before replacing |
| Using stock `postgres` in the fixture | migration fails on the `vector` type | `pgvector/pgvector:pg17` |
| Asserting approvals through `AuthorizedScopeAsync()` | test passes while the gate is broken | security-shaped assertions go through `AdminClient()` |
| Generating evals for tools that don't exist yet | rung 4 red on a clean repo | seed from the manifest only |

## Reference Files

- [`assets/RUNBOOK.md`](assets/RUNBOOK.md) — the full contract. **Load when:** writing or
  reconciling the runbook.
- [`assets/IntegrationFixture.cs.template`](assets/IntegrationFixture.cs.template) — the E2E host.
  **Load when:** the product has no integration fixture.
- [`references/verifier-ladder.md`](references/verifier-ladder.md) — which rung catches which class
  of bug, and the cost of each. **Load when:** deciding how far to climb for a given change.

## Related skills

- `/deliver:verify-runtime` — *uses* what this installs, to drive the run → observe → fix → lock-in
  loop.
- `/harness:plenipo-runbook` — the generic, product-independent version of this knowledge.
