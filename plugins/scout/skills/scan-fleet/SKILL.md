---
name: scan-fleet
description: >
  Inventory every system built on (or adjacent to) the Plenipo platform and produce FLEET.md — which
  repos are true products versus legacy pre-platform systems, which platform version each consumes,
  how many host seams each adopts, which industries are occupied, and where docs have drifted out of
  sync with the code. The discovery loop's first stage and the input to find-industry.
  USE FOR: taking stock before choosing what to build next, auditing platform-version drift across
  products, finding stale architecture docs. DO NOT USE FOR: ranking new industries (that is
  ../find-industry) or researching one industry's competitors (/define:research-industry).
license: MIT
disable-model-invocation: true
---

# Scan the fleet

Before deciding what to build next you need an honest picture of what already exists. This skill
produces that picture as `FLEET.md`, and it is deliberately unflattering: drift, staleness, and
scaffold-stage repos that never shipped all show up.

**Terminal states:** `Success` (FLEET.md written and every repo classified) · `No-op` (nothing
changed since the last scan) · `Blocked` (the search root is unreadable or the platform repo is
missing) · `Stalled` (a repo cannot be classified after reading its csproj, workflow.json, and
module file — record it as `unknown` and move on rather than guessing).

## When to Use

- Starting the discovery loop — you want to know what's taken before looking for what isn't.
- Auditing: which products lag the current platform release, and by how much.
- After a platform release, to see who needs upgrading.
- Suspecting a product's `ARCH.md` or `DECISIONS.md` no longer describes its code.

## Stop Signals

- **You already know which industry you're building** → skip to `/define:research-industry`.
- **You want the market view, not the portfolio view** → this scans *your* repos only.
- **One repo, not the fleet** → just read its `workflow.json` and csproj directly.

## Inputs

| Input | Default | Notes |
|---|---|---|
| Search root | the parent of the platform checkout | every sibling directory is a candidate |
| Platform repo | the checkout containing `Plenipo.slnx` | **may not be named `Plenipo`** — see below |
| Latest platform version | newest entry in the platform's `CHANGELOG.md` | the yardstick for drift |

> **The rename trap.** The platform was renamed **Cortex → Plenipo**. The directory on disk may
> still be called `Cortex` while everything inside it is `Plenipo.*`. Never identify the platform by
> directory name — identify it by the presence of `Plenipo.slnx` / `src/Plenipo.Core`. And treat a
> product referencing `Cortex.*` packages as **pre-rename and stale by definition**, not as a
> spelling variant.

## Workflow

1. **Find the platform.** Locate the checkout containing `Plenipo.slnx`. Read its `CHANGELOG.md` for
   the newest released version — that is the drift yardstick. Read `samples/` and record the sample
   module ids; you will exclude them in step 5.

2. **Enumerate candidates.** Every sibling directory of the platform that contains a `.slnx`, a
   `.sln`, or a `workflow.json`.

3. **Classify each repo — signal A is decisive.** Grep `src/**/*.csproj`:

   | Finding | Classification |
   |---|---|
   | `<PackageReference Include="Plenipo.*"` | **true product** — record the `Version` |
   | `<PackageReference Include="Cortex.*"` | **true product, pre-rename** — flag as stale |
   | neither, but ≥5 `*.Application.*` / `*.Domain` / `*.Infrastructure` projects | **legacy pre-platform** |
   | `workflow.json` says `"cloud": "none"` and there is no web host | **not applicable** (desktop app) |

   Also check `frontend/**/package.json` for `@plenipo/ui` (or the pre-rename `cortex-ui`) to record
   UI-seam adoption.

4. **Read `workflow.json`** for `name`, `industry`, `stage`, `cloud`, `connectors[]`,
   `capabilities[]`, `github{}`. **Its absence is itself a signal** — the repo predates the format.
   Normalize `industry` to kebab-case before comparing; the fleet is currently inconsistent about it.

5. **Read module identity.** In `src/<Brand>.<Domain>/*Module.cs`: the `public const string Id`, the
   `ModuleManifest` initializer, the tool and tab names. The module id is the canonical vertical key.
   **Exclude ids that match the platform's own sample modules** — those are demos that shadow real
   products, not coverage.

6. **Score seam adoption.** Count occurrences in `src/<Brand>.Host/Program.cs` of the host seams:
   `AddPlenipoPlatform`, `AddPlenipoModule<`, `AddPlenipoConnector<`, `AddPlenipoProduct`,
   `AddPlenipoRole`, `AddPlenipoTenantProvisionedHook`, `AddPlenipoNotificationChannel`,
   `AddPlenipoPlatformTools`. A low score on a mature repo means the product is leaving platform
   capability on the table.

7. **Take a maturity vector**: commit count, `.cs` files under `src/` (excluding `bin`/`obj`), test
   project count, CI workflow count, README present. Empirically, **no README plus zero CI workflows
   means scaffold-stage** — the repo was planned but never shipped. Say so plainly.

8. **Run the drift detectors.** These are the highest-signal, lowest-cost checks and the most
   valuable part of the output:

   | Detector | Meaning |
   |---|---|
   | csproj references the platform but `DECISIONS.md` has no ADR mentioning it | **undocumented platform migration** |
   | `ARCH.md` describes infrastructure the platform supplies (own outbox, own job scheduler, own tenancy, own SAS tokens) | **stale architecture doc** describing deleted code |
   | platform package version < newest in the platform `CHANGELOG.md` | **version lag** — report the gap in releases |
   | `research/<industry>.md` exists with no corresponding module in `src/` | **researched but unbuilt** — the highest-value gap class |
   | product exists but ships no `RUNBOOK.md` / run skill | **unrunnable by an agent** → `/deliver:install-runbook` |

9. **Write `FLEET.md`** with the sections in *Output* below, and stop. Ranking new industries is
   `../find-industry`'s job, not this skill's.

## Output — `FLEET.md`

1. **Fleet table** — name, directory, industry, platform membership (+ version), maturity,
   distinguishing capability.
2. **Classification rollup** — true products / legacy pre-platform / not applicable, with the reason
   for each.
3. **Reference product** — the true product on the newest platform version with the highest seam
   score. Name it explicitly; docs that point elsewhere are drift.
4. **Seam-adoption matrix** — products × the eight host seams.
5. **Industry coverage** — occupied verticals, normalized, with sample module ids and `cloud: none`
   repos excluded. This is the input `find-industry` consumes.
6. **Drift report** — every detector hit from step 8, each with the file and the specific wrong line.
7. **Open gaps** — researched-but-unbuilt, scaffold-stage, and version-lagging repos.

## Guardrails

- **Classify from files, never from names.** A directory called `Cortex` may be the platform; a
  directory called `the-anything` may be legacy. Only the csproj settles it.
- **Never count sample modules as coverage.** The platform ships demo verticals that deliberately
  mirror real products; counting them double-books an industry and hides an opening.
- **Report drift even when it is embarrassing** — especially in docs that name a reference
  implementation, since those actively misdirect the next agent.
- **`unknown` is a valid classification.** Recording it is honest; guessing is not.
- **Read-only.** This skill writes exactly one file, `FLEET.md`. It never edits a scanned repo.
  Fixing what it finds is a separate, deliberate act.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Identifying the platform by directory name | scan finds nothing, or scans the wrong tree | look for `Plenipo.slnx` |
| Treating `Cortex.*` refs as equivalent to `Plenipo.*` | a 14-release-stale product reads as current | flag pre-rename explicitly |
| Comparing `industry` values verbatim | `"property management"` ≠ `property-management`; coverage looks emptier than it is | normalize to kebab-case |
| Counting a repo as covering an industry because a doc says so | scaffold-stage repos claim verticals they never built | require a real module in `src/` |
| Trusting `ARCH.md` over the csproj | you inherit an architecture that was deleted | code wins over docs, always |

## Related skills

- `../find-industry/SKILL.md` — consumes the coverage map to rank unclaimed verticals.
  **Load when:** FLEET.md is written and you want candidates.
- `/deliver:install-runbook` — fixes the "unrunnable by an agent" gap this scan reports.
