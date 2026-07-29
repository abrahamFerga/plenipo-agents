<!-- Cross-tool agent instructions. Read by OpenAI Codex, GitHub Copilot (VS Code, cloud agent,
     code review), Cursor, Jules, Gemini CLI and others. NOT read by Claude Code — CLAUDE.md
     imports this file instead.

     Codex stops loading the concatenated AGENTS.md chain at project_doc_max_bytes (32 KiB by
     default). Keep this file short and push depth into the linked skills. -->

# plenipo-agents

A Claude Code plugin marketplace of agents and skills for building AI-first products on the
**Plenipo** platform (.NET 10 + Aspire + React), organized around **harness engineering** and
**loop engineering**. See [HARNESS.md](HARNESS.md) for why it is shaped this way.

This repo contains **no application code** — it is markdown skills plus one Node validator.

## Build and test

```bash
node eng/validate-marketplace.mjs                      # L1 — structural invariants; must exit 0
npx markdownlint-cli2 "**/*.md" "#node_modules"        # L2 — prose conventions
```

Both run in CI on every push. **Run them before saying you are done.** There is nothing else to
build: no compile step, no package install.

## Repository layout

```text
plugins/<plugin>/
  .claude-plugin/plugin.json    manifest — ONLY this lives in .claude-plugin/
  skills/<name>/SKILL.md        a skill; optional references/ and assets/ alongside
eng/validate-marketplace.mjs    the repo's own verifier
```

Six plugins, one per loop: `harness` (always on), `scout`, `define`, `shape`, `deliver`, `steward`.

## Authoring rules

[AUTHORING.md](AUTHORING.md) is the full contract and the validator enforces most of it. The rules
that are most often broken:

- `name` in frontmatter **must equal the folder name**. Kebab-case, no `claude`/`anthropic`.
- `description` is the only thing loaded for routing. Keep it under 1024 chars and **always include
  a `DO NOT USE FOR:` clause** — overlapping descriptions are the most common marketplace defect.
- Action skills (anything that mutates or is a pipeline phase) set `disable-model-invocation: true`
  and **name their terminal states**. Knowledge skills omit it.
- Body under 450 lines; depth goes in `references/`.
- **Never link outside your own plugin.** Plugins install in isolation, so `../../<other-plugin>/…`
  and `../../../../HARNESS.md` do not exist at runtime. Use `/<plugin>:<skill>` for another
  plugin's skill, and a bare skill name for a model-invokable one in `harness`.
- Never hardcode a GitHub owner — read it from `workflow.json` or `gh api user`.
- Verify API names and versions **against source**, not documentation. See below.

## How work is judged here

Every claim of "done" is graded on a five-level ladder, and you must say which level you are on:

| Level | Meaning |
|---|---|
| L1 | deterministic — a command's exit code decided it |
| L2 | rule/constraint — a linter or schema decided it |
| L3 | delayed field truth — an E2E suite, a deploy, a real user |
| L4 | **model as judge — your opinion, not field truth** |
| L5 | human checkpoint — not automated verification at all |

Two rules follow, and they are not negotiable:

1. **Never report an L4 conclusion with L1 confidence.** "I read it and it looks right" is level
   four — say so rather than implying something ran.
2. **Prove the verifier.** A new check must be seen **red before the fix and green after**. A check
   never seen red may be asserting nothing.

End work in exactly one **named** state: `Success`, `No-op`, `Blocked`, `Stalled`, `Exhausted`, or
`Approval-required`. **An error or an exhausted budget never counts as success.** If the same step
fails three times for three different reasons you are `Stalled` — the diagnosis is wrong, not the
fix; escalate with the evidence rather than looping.

## Facts verified against source — do not contradict these

The Plenipo platform's own documentation is wrong in at least two places, so the trust ranking is
**source > tests > `.http` catalog > platform docs > product docs**.

- The host API is `builder.AddPlenipoPlatform()` / `app.UsePlenipoPlatform()`.
  `BUILDING_A_PRODUCT.md` documents `AddPlenipo()` / `UsePlenipo()` — **those do not exist.**
- **Platform packages are not on nuget.org.** Products vendor nupkgs into a local `.packages/`
  feed pinned by `packageSourceMapping`.
- Postgres must be `pgvector/pgvector` — the RAG migration creates a vector column at startup.
- The platform was renamed **Cortex → Plenipo**. Its checkout may still be called `Cortex`;
  identify it by `Plenipo.slnx`, never by folder name.
- **Products are not named `The…`.** There is no name prefix to enforce.

## Working on a Plenipo product (not this repo)

If you are in a *product* repo rather than this one:

- Read that repo's `RUNBOOK.md` first — it is the source of truth for how to run and test it.
- `dotnet build` proves nothing. Exercise the change through a real request or the UI, then lock it
  in with a test that fails without the fix.
- **Never edit the Plenipo platform from a product.** If the platform is missing something, climb
  the escalation ladder (is it already there? does a product seam cover it? can a local shim carry
  it?) and only then file a platform request. Apply the shim first, tagged `TODO(plenipo#N)`, so
  you are never blocked. The full contract is in the `platform-protocol` skill.
- Never weaken an invariant to unblock yourself: RBAC before the model, approval-first writes,
  tenant isolation, write-only secrets, append-only audit.

## Skill index

Each skill below is a markdown file you can read directly. Claude Code loads them automatically;
other tools should **open the file when its description matches the task**.

<!-- BEGIN GENERATED SKILL INDEX — do not edit by hand; run `node eng/generate-agent-docs.mjs` -->

### `define`

- **plan-product** *(action)* — Turn an accepted SPEC.md into PLAN.md — capabilities grouped
  into epics in build order, the module split (default: exactly one domain module), a per-module
  tool inventory carrying permission strings and approval flags, the tab list, the…  
  → [`plugins/define/skills/plan-product/SKILL.md`](plugins/define/skills/plan-product/SKILL.md)
- **research-industry** *(action)* — Competitive research on one chosen industry, written to
  research/<industry>.md: who the leading commercial vendors are, a capability comparison matrix
  built only from sources actually opened, the recurring UX patterns buyers already expe…  
  → [`plugins/define/skills/research-industry/SKILL.md`](plugins/define/skills/research-industry/SKILL.md)
- **sync-backlog** *(action)* — Project PLAN.md into GitHub as the system of record: epic and
  feature issues upserted by a hidden marker so a re-run never fans out duplicates, features
  linked under their epic as sub-issues, and every card on the Projects v2 board in Ba…  
  → [`plugins/define/skills/sync-backlog/SKILL.md`](plugins/define/skills/sync-backlog/SKILL.md)
- **synthesize-spec** *(action)* — Turn research/<industry>.md into SPEC.md — the one-sentence
  framing, jobs to be done, personas and their authority tiers, the must-have / differentiator /
  out-of-scope capability split, an RBAC model of dotted action-noun permissions, re…  
  → [`plugins/define/skills/synthesize-spec/SKILL.md`](plugins/define/skills/synthesize-spec/SKILL.md)

### `deliver`

- **install-runbook** *(action)* — Install the execution + verification surface into a Plenipo
  product repo so any agent can run it and prove a change works without rediscovering anything:
  RUNBOOK.md, a discoverable `.claude/skills/run-<product>` skill, the Testcontainers…  
  → [`plugins/deliver/skills/install-runbook/SKILL.md`](plugins/deliver/skills/install-runbook/SKILL.md)
- **plenipo-module-sdk** *(reference)* — Member-by-member reference for authoring a Plenipo
  domain module in C#: IModule, the ModuleManifest record and every field it accepts,
  ToolDescriptor versus ModuleTool and why a tool needs both, IModuleToolSource, TabDescriptor and
  its c…  
  → [`plugins/deliver/skills/plenipo-module-sdk/SKILL.md`](plugins/deliver/skills/plenipo-module-sdk/SKILL.md)
- **request-platform-change** *(action)* — Handle a gap where the Plenipo platform cannot do
  what a product needs: climb the escalation ladder first, apply a tagged local shim so the
  product loop keeps moving, and only then file a structured platform request that the steward
  can…  
  → [`plugins/deliver/skills/request-platform-change/SKILL.md`](plugins/deliver/skills/request-platform-change/SKILL.md)
- **revise-pr** *(action)* — Close the loop on a pull request that came back — review comments,
  requested changes, a failing check, or a merge conflict.  
  → [`plugins/deliver/skills/revise-pr/SKILL.md`](plugins/deliver/skills/revise-pr/SKILL.md)
- **scaffold-product** *(action)* — Create a brand-new product repo on the Plenipo platform: the
  four-project skeleton — Aspire AppHost, thin Host, the domain module that holds all the real
  code, optional product-owned connectors — plus the two test projects, the vendored…  
  → [`plugins/deliver/skills/scaffold-product/SKILL.md`](plugins/deliver/skills/scaffold-product/SKILL.md)
- **upgrade-platform** *(action)* — Move a product onto a newer Plenipo release deliberately:
  re-vendor the platform packages, bump the single version property, unwind the TODO(plenipo#N)
  shims whose requests that release closed, and prove the whole test ladder still passe…  
  → [`plugins/deliver/skills/upgrade-platform/SKILL.md`](plugins/deliver/skills/upgrade-platform/SKILL.md)
- **verify-runtime** *(action)* — Drive one change on a Plenipo product from symptom to proof:
  reproduce through the narrowest surface, diagnose from telemetry before source, fix one variable
  per turn, then lock the behaviour in with a regression test seen red before the…  
  → [`plugins/deliver/skills/verify-runtime/SKILL.md`](plugins/deliver/skills/verify-runtime/SKILL.md)
- **work-next-issue** *(action)* — Take exactly one Ready issue off the GitHub project board and
  drive it to an open pull request: select the top item by build order, move the card to In
  Progress, cut a branch, implement it against the platform contract, climb the test la…  
  → [`plugins/deliver/skills/work-next-issue/SKILL.md`](plugins/deliver/skills/work-next-issue/SKILL.md)
- **e2e-tester** *(agent — delegate)* — Boots a Plenipo product and exercises it end to end the
  way a real household or firm would, hunting for what is actually broken rather than confirming
  what was just built.  
  → [`plugins/deliver/agents/e2e-tester.md`](plugins/deliver/agents/e2e-tester.md)
- **product-improver** *(agent — delegate)* — Runs a Plenipo product, uses it as its intended
  user would, and improves what it finds — features that stop half-finished, screens that make the
  user do the system's work, flows where the assistant is unhelpful.  
  → [`plugins/deliver/agents/product-improver.md`](plugins/deliver/agents/product-improver.md)

### `harness`

- **agent-protocol** *(reference)* — The shared language agents use to talk to each other
  through GitHub — the message envelope, the closed set of message kinds, the label vocabulary
  that is the state machine, and the rules for replying and handing off.  
  → [`plugins/harness/skills/agent-protocol/SKILL.md`](plugins/harness/skills/agent-protocol/SKILL.md)
- **conduct** *(action)* — Drive one product from an idea to merged, runtime-proven code by
  sequencing the four loops — scout, define, shape, deliver — handing each phase off to its own
  slash command and refusing to advance until that phase's exit check passes.  
  → [`plugins/harness/skills/conduct/SKILL.md`](plugins/harness/skills/conduct/SKILL.md)
- **install-agent-config** *(action)* — Give a repo cross-tool agent configuration so OpenAI
  Codex, GitHub Copilot (VS Code, cloud agent, code review) and Claude Code all work from the same
  rules: AGENTS.md as the single source, a CLAUDE.md that imports it, a thin .github/copi…  
  → [`plugins/harness/skills/install-agent-config/SKILL.md`](plugins/harness/skills/install-agent-config/SKILL.md)
- **loop-discipline** *(reference)* — The operating rules every loop in this marketplace runs
  under: the five-level verification ladder (deterministic → rule → field truth → model-as-judge →
  human), the six named terminal states, the five loop anti-patterns, and the design f…  
  → [`plugins/harness/skills/loop-discipline/SKILL.md`](plugins/harness/skills/loop-discipline/SKILL.md)
- **platform-protocol** *(reference)* — The contract between products and the Plenipo platform
  when many products are being built at once: the escalation ladder a product climbs before asking
  for a platform change, the shape of a platform request, what the platform steward gua…  
  → [`plugins/harness/skills/platform-protocol/SKILL.md`](plugins/harness/skills/platform-protocol/SKILL.md)
- **plenipo-platform** *(reference)* — What the Plenipo platform already provides — auth,
  multi-tenancy, RBAC-before-the-model, approvals, audit, jobs, chat transports, documents, RAG,
  connectors, channels — the host seams a product extends it through, and the invariants a pr…  
  → [`plugins/harness/skills/plenipo-platform/SKILL.md`](plugins/harness/skills/plenipo-platform/SKILL.md)
- **plenipo-runbook** *(reference)* — How to run, observe, and prove a change in any product
  built on the Plenipo platform — the launch modes, dev-auth headers, the keyless Mock provider,
  the AG-UI event contract, Aspire telemetry, and the five-rung test ladder from build to…  
  → [`plugins/harness/skills/plenipo-runbook/SKILL.md`](plugins/harness/skills/plenipo-runbook/SKILL.md)
- **validate-product** *(action)* — Audit one Plenipo product repo without touching it: config
  files parse and agree with each other, no committed secrets, the vendored package feed is
  pinned, the platform pin is not lagging, the greppable guardrail invariants hold, the ag…  
  → [`plugins/harness/skills/validate-product/SKILL.md`](plugins/harness/skills/validate-product/SKILL.md)

### `scout`

- **find-industry** *(action)* — Rank unclaimed industries as candidates for a new AI-first
  product on Plenipo, by scoring each against what the platform's spine actually provides —
  chat-first UX, RBAC-before-the-model, human approval on every write, append-only audit,…  
  → [`plugins/scout/skills/find-industry/SKILL.md`](plugins/scout/skills/find-industry/SKILL.md)
- **opportunity-brief** *(action)* — Deep-dive ONE shortlisted industry into a go/no-go brief:
  the named buyer and the pain in units, the incumbent landscape and why an AI-first entrant wins
  or doesn't, the killer approval-gated workflow traced end to end, the document and…  
  → [`plugins/scout/skills/opportunity-brief/SKILL.md`](plugins/scout/skills/opportunity-brief/SKILL.md)
- **scan-fleet** *(action)* — Inventory every system built on (or adjacent to) the Plenipo
  platform and produce FLEET.md — which repos are true products versus legacy pre-platform
  systems, which platform version each consumes, how many host seams each adopts, which i…  
  → [`plugins/scout/skills/scan-fleet/SKILL.md`](plugins/scout/skills/scan-fleet/SKILL.md)

### `shape`

- **design-product** *(action)* — Turn PLAN.md into ARCH.md plus DECISIONS.md for a product on
  the Plenipo platform, where architecture is a delta against a stack that is already chosen: the
  module boundary and manifest, the tool surface with its permission strings and a…  
  → [`plugins/shape/skills/design-product/SKILL.md`](plugins/shape/skills/design-product/SKILL.md)

### `steward`

- **announce-release** *(action)* — Push a Plenipo release out to every product built on it:
  classify what changed, then open an issue in each consumer repo — carrying step-by-step
  migration instructions when the release breaks them, or the shims it now retires when it doe…  
  → [`plugins/steward/skills/announce-release/SKILL.md`](plugins/steward/skills/announce-release/SKILL.md)
- **install-request-surface** *(action)* — Stand up the platform side of the request protocol in
  the Plenipo repo: the platform-request issue form, the triage label taxonomy, the consumer
  registry, and the conformance workflow that builds and tests every registered product agains…  
  → [`plugins/steward/skills/install-request-surface/SKILL.md`](plugins/steward/skills/install-request-surface/SKILL.md)
- **triage-requests** *(action)* — Work the platform-request queue from every product: cluster
  requests by capability so demand across products is visible, give each one a verdict the
  requesting agent can act on without a human relaying it, and convert what is accepted in…  
  → [`plugins/steward/skills/triage-requests/SKILL.md`](plugins/steward/skills/triage-requests/SKILL.md)

> *action* skills are deliberate operations a human triggers; *reference* skills are knowledge to
> read while working. Open the file whose summary matches your task before starting.

<!-- END GENERATED SKILL INDEX -->
