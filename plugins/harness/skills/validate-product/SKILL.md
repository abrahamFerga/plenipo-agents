---
name: validate-product
description: >
  Audit one Plenipo product repo without touching it: config files parse and agree with each other,
  no committed secrets, the vendored package feed is pinned, the platform pin is not lagging, the
  greppable guardrail invariants hold, the agent-facing run surface exists, and the docs still
  describe the code. Emits a located, per-check pass/fail report and exits non-zero on any failure.
  USE FOR: pre-commit or CI conformance auditing of a single repo, catching a missing tenant query
  filter or an unapproved write tool before it ships, proving config hygiene.
  DO NOT USE FOR: fixing anything it reports (strictly read-only), proving the product actually
  behaves at runtime (/deliver:verify-runtime), or inventorying every repo (/scout:scan-fleet).
license: MIT
---

# Validate a product

Static conformance audit of one product built on Plenipo. Every check below decides on a **file, a
regex, or a count** — never on how the code reads. It reports; it never fixes. A validator that
edits the thing it grades is the Self-Approving Loop wearing a lab coat.

**This is L2 — rule and constraint verification. It does not prove the product works.** A fully
green report means the configuration is coherent and no guardrail is violated in a way that is
visible from disk. It does not mean the solution compiles (that is `dotnet build`, L1), that a chat
turn completes (L1 via the eval harness), or that the approval gate actually fires (L1+L3 through
the integration suite). Proving behaviour is `/deliver:verify-runtime`'s job. Say "conformant", not
"working".

**Terminal states:** `Success` — every check was decided and the report is written; the **exit code
is 0 only if every check passed**, non-zero otherwise. · `No-op` — the target is not a Plenipo
product (no `Plenipo.*` and no `Cortex.*` package reference); nothing in this contract applies, say
which repo you looked at and stop. · `Blocked` — a prerequisite is unreadable: `workflow.json`
missing or unparseable, or the target is not a git working tree so the secret scan cannot be scoped.
· `Stalled` — a check cannot be decided from static files after reading the relevant sources (tools
registered through a loop or reflection, permissions behind an unresolvable constant); record it
`undecidable` with the reason, never as a pass. · `Approval-required` — a finding a rule cannot
adjudicate: a deviation an ADR claims to justify, or a `HasQueryFilter` omission on an entity that
may legitimately not be tenant-owned.

## When to Use

- Before committing, before opening a PR, or as a CI gate on a product repo.
- After a platform upgrade, to see what the new version's invariants now reject.
- Auditing a repo you did not write, or one that predates the current contract.
- A tenant leak, a 403, or an uncallable tool is suspected and you want the cheap check first.

## Stop Signals

- **You want it fixed, not reported** → this skill never mutates. Take the findings to the owning
  skill: `/deliver:install-runbook` for a missing run surface, `/shape:*` for design defects,
  `/deliver:*` for code.
- **You want to know whether it works** → `/deliver:verify-runtime`. Grep cannot answer that.
- **You want the portfolio view, not one repo** → `/scout:scan-fleet`.
- **This is the Plenipo platform repo itself** (it contains `Plenipo.slnx`) → it is the platform,
  not a product; these checks assume a consumer.

## Inputs

| Input | Default | Notes |
|---|---|---|
| Target repo | the current working directory | must be a git working tree — `git ls-files` scopes the secret scan |
| Product config | `<repo>/workflow.json` | the config of record; unparseable ⇒ `Blocked` |
| Claude settings | `<repo>/.claude/settings.json` | must be derivable from `workflow.json` |
| Platform checkout | the sibling directory containing **`Plenipo.slnx`** | for the version comparison only. **Identify by that file, never by directory name** — the checkout may still be called `Cortex` |
| GitHub owner | `workflow.json` → `github.repo`, else `gh api user --jq .login` | never hardcode an owner |
| Severity floor | `fail` | which verdict drives the non-zero exit; `warn` findings are reported but do not fail |

## Workflow

Run the checks in this order — worst blast radius first, so a fatal finding surfaces before the
paperwork. Each numbered step is one check group; every row states its own decision rule.

1. **Scope the target.** Grep `src/**/*.csproj` for `<PackageReference Include="Plenipo.*"`.

   | Finding | Verdict |
   |---|---|
   | one or more `Plenipo.*` references | Plenipo product — continue |
   | `Cortex.*` references | **fail** — pre-rename platform, stale by definition. Not a spelling variant of `Plenipo.*`; the platform was renamed and this pin is many releases behind |
   | neither | `No-op` — not a Plenipo product; stop and say so |

   Read `workflow.json` for `name` and `industry` so every later finding names the product.

2. **Secrets.** Scan **tracked files only** — `git ls-files` — excluding `.packages/`, `bin/`,
   `obj/`, `node_modules/`, and lock files. Any hit is a **fail**, located to file and line, with
   the matched span truncated in the report (never print a live credential in full).

   | Pattern | What it catches |
   |---|---|
   | `sk-ant-[A-Za-z0-9_-]{20,}` / `sk-[A-Za-z0-9]{20,}` | model-provider keys |
   | `gh[pousr]_[A-Za-z0-9]{30,}` | GitHub tokens |
   | `AKIA[0-9A-Z]{16}` | AWS access key ids |
   | `-----BEGIN [A-Z ]*PRIVATE KEY-----` | private keys |
   | `eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.` | JWTs |
   | `"(ApiKey\|ClientSecret\|Password\|ConnectionString)"\s*:\s*"[^"$#{][^"]{7,}"` in `appsettings*.json` | a real value where a placeholder belongs |

   Empty strings, `${VAR}`, `#{token}#`, and `<user-secrets>` references are not hits. **Any chat
   provider key at all is a fail regardless of shape** — provider credentials are per-tenant runtime
   settings in the write-only vault, so a key in the repo means the model is wrong, not just leaked.

3. **Invariant conformance.** The expensive ones. Each is greppable; each failure is a security
   property the platform otherwise guarantees by construction.

   | Invariant | How to decide | Fails when |
   |---|---|---|
   | Module context derives from `ModuleDbContext` | `grep -rn "class [A-Za-z]*DbContext" src/` | any module context declares `: DbContext` — timestamps then persist as `default` |
   | **Per-entity `HasQueryFilter`** | in each module context, collect `DbSet<T>` where `T : ITenantOwned`, and every `HasQueryFilter` in `OnModelCreating`, **matched by entity type** | any tenant-owned `DbSet<T>` has no filter naming `T`. `PlatformDbContext` applies filters by reflection; **a module context does not** — a miss is a silent cross-tenant leak |
   | Admin tabs declare a `Permission` | every `AdminTab` initializer in the manifest | any lacks `Permission =` — startup validation throws, so this is the cheap preview |
   | State-changing tools are approval-gated | a `ModuleTool` whose body contains `SaveChangesAsync`, `Add(`, `Update(`, `Remove(`, `ExecuteUpdate`, `ExecuteDelete`, or an outbound `POST`/`PUT`/`PATCH`/`DELETE` | its `ToolDescriptor` omits `RequiresApproval = true`. Verb-shaped names (create/send/pay/schedule) are a secondary signal; the body is the evidence |
   | Descriptor ↔ tool pairing | name set from `ModuleManifest.Tools` vs. name set from `IModuleToolSource`; then compare the permission string per name | the sets differ, or one name's permission strings are not character-identical. A tool present on only one side is never callable **and raises no error** |
   | Recurring-job `Kind` uniqueness | collect every `Kind =` in the manifest's recurring jobs | two share a value. `Kind` is globally unique across all loaded modules, so an in-repo duplicate is certain; a collision with a platform sample only appears at startup |

   Resolve constants before comparing permissions — `Permissions.ForTool(ModuleId, name)` on one
   side and a string literal on the other are equal only if you expanded both. If you cannot,
   verdict `undecidable`, not `pass`.

   `GET /api/admin/security/catalog` is the authoritative view of the descriptor/tool pairing, but
   it needs a running app. **Do not start one here** — record the grep result and note the runtime
   check as deferred to `/deliver:verify-runtime`.

4. **`workflow.json` shape.**

   | Rule | Fails when |
   |---|---|
   | parses as JSON | it does not — everything downstream is `Blocked` |
   | `name`, `industry`, `stage`, `cloud`, `github.repo` present and non-empty | any missing |
   | `connectors` and `capabilities` are arrays if present | either is a scalar or object |
   | `industry` matches `^[a-z0-9]+(-[a-z0-9]+)*$` | it contains a space, a capital, or an underscore. **The fleet is currently inconsistent — at least one product's value uses a space.** Report the exact string |
   | `cloud` ∈ `azure` \| `aws` \| `none` | anything else |
   | `github.repo` is `<owner>/<name>`, and `<owner>` matches the `origin` remote (or `gh api user`) when one exists | the owners disagree. **Read the owner; never hardcode one** |

   There is **no product-name convention to enforce.** The old `the-*` prefix is dead — do not
   require it, suggest it, or flag its absence.

5. **`workflow.json` ↔ `.claude/settings.json`.** Derive the expected settings from the config and
   compare sets; do not diff the files textually.

   | Rule | Fails when |
   |---|---|
   | `settings.json` parses | it does not |
   | every marketplace in `skills.self` and `skills.external[]` has an `extraKnownMarketplaces` entry whose `source.repo` equals the declared repo | one is missing, or the repos disagree |
   | every declared plugin has an `enabledPlugins` key `<plugin>@<marketplace>` | a key is absent |
   | no `enabledPlugins` key names a marketplace that `workflow.json` does not declare | an orphan key exists — it will fail to install |

   A key whose value is `false` is **not** drift: stage-gating plugins off is the intended use.
   Only presence and absence are checked.

6. **Package feed pinning.** The platform packages are **not on nuget.org**; a product vendors the
   nupkgs locally, and the mapping is also the dependency-confusion guard.

   | Rule | Fails when |
   |---|---|
   | `nuget.config` exists with `<clear />` and a source pointing at `.packages` | either is absent |
   | `<packageSourceMapping>` maps `Plenipo.*` to the local source and `*` to nuget.org | the mapping block is missing, or `Plenipo.*` is unmapped — restore then reaches the public feed for a package that does not exist there |
   | every referenced `Plenipo.*` package has a matching nupkg in `.packages/` at the referenced version | one is absent — a clean clone cannot restore |
   | all `Plenipo.*` references pin the **same** version | versions are mixed across csprojs |

7. **Platform version lag.** Find the checkout containing `Plenipo.slnx`, read its `CHANGELOG.md`
   for the newest released version, and compare with the product's pin. **Report the gap in
   releases**, not just the two strings.

   | Gap | Verdict |
   |---|---|
   | 0 releases | pass |
   | 1–2 releases | warn — name the intervening entries with breaking changes |
   | 3+ releases, or any `Cortex.*` pin | fail |
   | platform checkout not found | `undecidable` — skip this check only, and say so |

8. **Runbook surface.** Presence is the whole rule. **Absence means the product is unrunnable by an
   agent**: every session rediscovers the AppHost command, the dev-auth headers, the Mock provider,
   and the pgvector requirement from scratch — or does not, and ships unverified.

   | Artifact | Path | Rule |
   |---|---|---|
   | Runbook | `RUNBOOK.md` | exists |
   | Run skill | `.claude/skills/run-*/SKILL.md` | at least one |
   | Integration tests | `tests/*.IntegrationTests/*.csproj` | at least one |
   | Golden evals | `tests/*.IntegrationTests/Evals/cases/*.json` | at least one case |
   | Request catalog | `*.http` at the repo root | exists |

   Also flag **stale**: a `RUNBOOK.md` naming a project, port, or module id that no longer exists in
   the repo is worse than a missing one, because an agent will trust it.

9. **The loop can close its own loop.** Only when `.github/workflows/agent-merge.yml` exists. Every
   rule here fails **silently, on the happy path** — the run is green, the merge lands, and only the
   board shows the damage days later.

   | Detector | Fails when |
   |---|---|
   | `agent-merge.yml` `permissions:` omits `issues: write` | GitHub closes a `Closes #N` issue as the *merging actor*; a `GITHUB_TOKEN` merge without it closes the PR and leaves the issue open forever |
   | `merge-gate.mjs` never mentions `closingIssuesReferences` | the merger predates the explicit close and is trusting the implicit behaviour that failed |
   | `agent-gates.yml`'s job name is not a required status check on the default branch | `checks_exist` is then the only thing between the loop and a vacuous green |

   Confirm the first one against the **live** repo, not just the file: read
   `gh api repos/<owner>/<repo>/actions/permissions/workflow` and check whether the default
   `GITHUB_TOKEN` scope is restricted below what the workflow asks for.

10. **Doc drift.** A product that moved onto the platform usually deleted infrastructure its own docs
   still describe. Condition every rule on the csproj referencing `Plenipo.*`.

   | Detector | Fails when |
   |---|---|
   | `ARCH.md` / `OPERATIONS.md` describes an own outbox, own job scheduler, own tenant resolution, own audit trail, or own SAS-token issuance | that code is absent from `src/` and the platform supplies the capability — a stale doc describing deleted code |
   | those docs describe an `Application` / `Domain` / `Infrastructure` layering | no such projects exist under `src/` |
   | `DECISIONS.md` has no ADR mentioning the platform | the csproj references it — an undocumented platform migration |
   | a doc names a different product as the reference implementation | that product is not the newest platform consumer — actively misdirecting |

11. **Report and exit.** Write the report described below to stdout. **Exit non-zero if any check
    failed.** Do not fix anything, do not open a PR, do not stage a change.

## The report

1. **Verdict line** — product name, the terminal state, the count of fail / warn / undecidable, and
   the exit code.
2. **Check table** — one row per numbered step: check, verdict (`pass` / `fail` / `warn` /
   `undecidable` / `skipped`), and a one-line reason. `skipped` must say why.
3. **Findings**, worst first: secrets, then tenant-filter gaps, then approval gaps, then descriptor
   mismatches, then config, then surface, then drift. **Every finding carries `path:line` and the
   exact offending text.** A finding without a location is an opinion, not a check.
4. **Deferred** — checks that need a running app, each naming the endpoint or test that would settle
   it, handed to `/deliver:verify-runtime`.
5. **Level statement** — one line, verbatim in spirit: *this is L2 conformance; it does not prove
   the product builds, runs, or behaves correctly.*

## Guardrails

- **Read-only, without exception.** No edits, no `git add`, no formatting fixes "while you're in
  there". Fixing is a separate, deliberate act by a different skill — the maker is not the approver.
- **Never adjust the target to make a check pass.** Editing the code you are grading is
  Specification Gaming; editing the check is worse.
- **`undecidable` is a valid, honest verdict.** A guessed `pass` on the query-filter check is how a
  cross-tenant leak ships with a green report attached.
- **Locate everything.** File, line, offending text. Findings the next agent cannot act on cost more
  than they save.
- **Never hardcode the GitHub owner**, and never enforce a product-name pattern. Owners come from
  `workflow.json` or `gh api user`; the `the-*` convention is dead.
- **Never print a matched secret in full**, and never copy one into the report, a commit message, or
  an issue. Truncate to a prefix and give the location.
- **Do not run the app, build the solution, or execute tests.** Those are other rungs. Mixing them
  in makes a fast check slow and a static check flaky.
- **Say the level out loud.** "Validated" here means L2. Reporting a green run as evidence the
  product works is pretending L4/L2 is L1.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Treating `Cortex.*` as a spelling variant | a pre-rename, many-releases-stale product reads as current | classify pre-rename as a stale finding |
| Counting `HasQueryFilter` occurrences in total | two filters on one entity and none on another passes | match filters to entities by type |
| Assuming the platform's reflection covers module entities | silent cross-tenant leak with a green report | a module context declares its own filter per entity |
| Comparing `industry` verbatim | `"personal finance"` slips through while the format is kebab-case | assert the regex, print the exact string |
| Treating `false` in `enabledPlugins` as drift | every stage-gated repo fails for nothing | check presence, not value |
| Calling the descriptor/tool grep conclusive | a reflectively registered tool is missed | grep is the preview; `security/catalog` is the proof, at runtime |
| Scanning `.packages/`, `bin/`, `node_modules` for secrets | thousands of false positives drown the real one | scope to `git ls-files` |
| Fixing what you find | the checker becomes the maker; nobody reviews the fix | report, then hand off |
| Reporting a green run as "the product works" | an L2 result carried at L1 confidence | say "conformant"; behaviour is `/deliver:verify-runtime` |
| Requiring a `the-` prefix on the product name | rejects every current product | there is no naming convention to enforce |

## Related skills

- `plenipo-platform` — the invariants step 3 checks statically, and why each one is load-bearing.
- `plenipo-runbook` — the run/test contract whose artifacts step 8 looks for.
- `loop-discipline` — the ladder this report's L2 claim is graded on, and the terminal states above.
- `/deliver:install-runbook` — fixes the missing run surface step 8 reports. **Load when:** step 8
  failed.
- `/deliver:verify-runtime` — the L1/L3 counterpart: proves the product actually behaves.
- `/scout:scan-fleet` — the fleet-wide, shallower version of the same drift detectors.
