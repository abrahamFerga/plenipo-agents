# plenipo-agents

**The outer harness for building AI-first products on the [Plenipo](https://github.com/abrahamFerga/Plenipo) platform.**

A Claude Code plugin marketplace of agents and skills that scout unclaimed industries, define and
design a product against the platform, build it one issue at a time, and — the part everyone skips —
**prove each change actually works at runtime**.

Built on two disciplines: **harness engineering** (the guides and sensors an agent needs) and **loop
engineering** (what lets it run unsupervised). [HARNESS.md](HARNESS.md) explains why the repo is
shaped this way; read it once.

> **New here? → [QUICKSTART.md](QUICKSTART.md).** Five minutes, two plugins, one command that saves
> the most time. Come back here when you want the full map.
>
> **Want it to run itself? → [AUTOMATED_CLAUDE_LOOPS.md](AUTOMATED_CLAUDE_LOOPS.md).** Eight verbs,
> one timer, and the gate list that lets a product merge without you.
>
> **Want the GitHub workflows? → [WORKFLOWS.md](WORKFLOWS.md).** Every reusable issue-triage, PR-review,
> escalation and merge-gate template, ready to copy into a repo.

## Install

### Claude Code

The pinned Sonnet 5 and Opus 5 routes require Claude Code 2.1.219 or newer. Check with
`claude --version` and upgrade with `claude update` before installing. The provider must expose
both model IDs.

```text
/plugin marketplace add abrahamFerga/plenipo-agents
```

Then enable the plugins for the loop you're in:

```jsonc
// <your-product>/.claude/settings.json
{
  "extraKnownMarketplaces": {
    "plenipo-agents": { "source": { "source": "github", "repo": "abrahamFerga/plenipo-agents" } }
  },
  "model": "claude-sonnet-5",                // cheap outer coordinator
  "enabledPlugins": {
    "plenipo@plenipo-agents": true,    // the front door: eight loop verbs
    "harness@plenipo-agents": true,    // always on
    "scout@plenipo-agents":   false,
    "define@plenipo-agents":  false,
    "shape@plenipo-agents":   false,
    "deliver@plenipo-agents": true     // the default coding loop
  }
}
```

### OpenAI Codex

Register the marketplace, then install only the loops you need:

```bash
codex plugin marketplace add abrahamFerga/plenipo-agents
codex plugin add harness@plenipo-agents
codex plugin add deliver@plenipo-agents
```

Codex records the marketplace and plugin state in `~/.codex/config.toml`. Start a new session after
installation so the bundled skills appear. The marketplace currently ships Claude-compatible
manifests; Codex accepts them through its legacy plugin compatibility path. See the
[Codex plugin commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli#cli-codex-plugin).

### GitHub Copilot CLI

Copilot CLI can install the same marketplace and its existing `.claude-plugin` manifests:

```bash
copilot plugin marketplace add abrahamFerga/plenipo-agents
copilot plugin install harness@plenipo-agents
copilot plugin install deliver@plenipo-agents
```

See GitHub's
[Copilot plugin installation guide](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-finding-installing).
For Copilot in VS Code, the cloud agent, and code review, also commit the repository instruction
files described in [Codex and Copilot](#codex-and-copilot). Plugin installation makes workflows
available; instruction files carry the durable rules of one repository.

## The five loops

Each plugin is one loop. A loop declares **Trigger · Goal · Execution · Verification · Stopping rule
· Memory**, and ends in exactly one named state — `Success`, `No-op`, `Blocked`, `Stalled`,
`Exhausted`, or `Approval-required`. *An error or an exhausted budget never counts as success.*

| Plugin | Loop | Goal | Default |
|---|---|---|---|
| **plenipo** | the front door | eight loopable verbs that drive the others, so you never type their names | **on** |
| **harness** | control plane | the platform contract, the runbook, config validation, the conductor | **on** |
| **scout** | discovery | an unclaimed industry worth a product, with a defensible reason | off |
| **define** | definition | a spec and plan a team could build against | off |
| **shape** | design | every shape decision made once, and justified | off |
| **deliver** | build + verification | one Ready issue → a merged PR, proven at runtime | **on** |
| **steward** | platform | the request queue from every product, triaged and answered | platform repo only |

## Skills

The invocation column uses Claude Code syntax. In Codex, mention the same bundled skill as
`$<plugin>:<skill>`; in Copilot CLI, invoke it as `/<skill>` or select it from the skill picker.

### `plenipo` — the only surface you need to remember

One tick per invocation, each safe on a timer: `/loop 20m /plenipo:fleet` is the whole steady state.
Full operator's manual in **[AUTOMATED_CLAUDE_LOOPS.md](AUTOMATED_CLAUDE_LOOPS.md)**.

| Skill | Invocation | One tick does |
|---|---|---|
| `setup` | `/plenipo:setup` | Makes a repo safe to leave a timer on: runbook, labels, two gate scripts, branch protection, the autonomy level |
| `launch` | `/plenipo:launch` | Nothing → a product with a Ready backlog. Pauses once: the go/no-go and the name |
| `deliver` | `/plenipo:deliver` | Admission control, then one build tick — rejected PRs and p0 bugs before features, and a ceiling on PRs in flight |
| `ship` | `/plenipo:ship` | Recovers an exact-revision verdict, then merges only what clears every deterministic gate at the recorded autonomy level |
| `test` | `/plenipo:test` | Boots it, sweeps end to end, files deduplicated bug issues with reproductions |
| `define` | `/plenipo:define` | Triages friction, promotes Backlog → Ready, extends the plan only from scope with provenance |
| `steward` | `/plenipo:steward` | In the platform repo, works one request/release tick behind consumer conformance |
| `fleet` | `/plenipo:fleet` | One tick on whichever product most needs it; least-recently-served, and quarantines a repo that keeps failing |

### `harness` — always on

| Skill | Invocation | What it does |
|---|---|---|
| `plenipo-platform` | automatic | What the platform already provides, the seven host seams, the invariants, and the trust ranking for its docs |
| `plenipo-runbook` | automatic | How to run, observe, and prove a change in any Plenipo product |
| `loop-discipline` | automatic | The verification ladder, terminal states, and the five loop anti-patterns |
| `conduct` | `/harness:conduct` | Drives the full pipeline, gating on each loop's exit condition |
| `validate-product` | `/harness:validate-product` | Read-only L2 check of config, invariants, and doc drift |
| `install-github-agentic-workflows` | `/harness:install-github-agentic-workflows` | Installs bounded Copilot triage, PR-review, and cross-repo routing workflows |

### `scout` — the discovery loop

| Skill | Invocation | What it does |
|---|---|---|
| `scan-fleet` | `/scout:scan-fleet` | Inventories every Plenipo product → `FLEET.md`: membership, version drift, seam adoption, coverage, stale docs |
| `find-industry` | `/scout:find-industry` | Ranks unclaimed verticals against the platform's spine → a shortlist plus a rejection log |
| `opportunity-brief` | `/scout:opportunity-brief` | Deep-dives one candidate to a go/no-go, with kill criteria |
| `name-product` | `/scout:name-product` | Probes brand candidates against registries, live products and trademark classes → survivors with their residual risk |

### `define` — the definition loop

| Skill | Invocation | What it does |
|---|---|---|
| `research-industry` | `/define:research-industry` | Competitive landscape → `research/<industry>.md`, mapped onto platform capabilities |
| `synthesize-spec` | `/define:synthesize-spec` | → `SPEC.md`, with every capability assigned to a seam |
| `plan-product` | `/define:plan-product` | → `PLAN.md`, epics in build order |
| `sync-backlog` | `/define:sync-backlog` | Publishes the backlog as GitHub issues on a Projects v2 board |

### `shape` — the design loop

| Skill | Invocation | What it does |
|---|---|---|
| `design-product` | `/shape:design-product` | → `ARCH.md` + ADRs, as a *delta* against the platform, and marks the backlog Ready |

### `deliver` — the build and verification loops

| Skill | Invocation | What it does |
|---|---|---|
| `plenipo-module-sdk` | automatic | The module authoring reference — manifest, tools, tool source, tabs, DbContext |
| `work-next-issue` | `/deliver:work-next-issue` | One Ready issue → branch → implement → prove → PR |
| `verify-runtime` | `/deliver:verify-runtime` | The verification loop: reproduce → observe → diagnose → fix → lock-in |
| `install-runbook` | `/deliver:install-runbook` | Installs a product's execution + verification surface |
| `scaffold-product` | `/deliver:scaffold-product` | Creates a new product repo on the platform |

**Agents** — delegate these; they run in their own context and return a report, not a transcript.

| Agent | Claude route | Delegate when |
|---|---|---|
| `deliver:product-developer` | Opus 5 · medium · 60 turns | `/plenipo:deliver` has selected one issue or rejected PR. Loads the one matching build/revision skill on demand, writes and proves the change, never reviews or merges it |
| `deliver:product-improver` | Opus 5 · high · 60 turns | you want the product made *better* rather than an issue closed — uses the app as its intended user, logs friction, and ships **one** proven improvement as a PR |
| `plenipo:pr-reviewer` | Sonnet 5 · medium · 24 turns | a pull request needs an independent second opinion — reads the issue, evidence and diff, tries to *refute* it, and cannot edit, push, label or merge |
| `deliver:e2e-tester` | Sonnet 5 · medium · 40 turns | the system needs a sweep for observed breakage — boots it, walks real journeys, drives the UI, and returns ranked findings with reproductions; never edits |

#### Token-efficient Claude Code routing

Run the outer session on Sonnet 5 so polling, admission control, board reads and `No-op` ticks stay
cheap. The launch flag changes this session only:

```bash
claude --model claude-sonnet-5
```

If Claude Code is already open, use `/model` and press `s`. Typing `/model claude-sonnet-5`
directly also saves Sonnet 5 as your user default, which may be broader than intended.

The worker boundary promotes only code-changing work to pinned Opus 5: `/plenipo:deliver` does its
cheap checks first, then delegates a real issue or rejected PR to `deliver:product-developer`.
`/plenipo:test` delegates its sweep to Sonnet 5. The unattended `ship` path uses one
revision-bound cloud verdict rather than paying for a duplicate local reviewer; invoke the Sonnet 5
`plenipo:pr-reviewer` only for an attended second opinion. Every Claude Code worker requests an
exact `claude-sonnet-5` or `claude-opus-5` model ID so a provider alias cannot silently select an
older generation. Claude Code 2.1.219 or newer and provider access to both models are therefore hard
requirements. Exact frontmatter is routing intent, not enforcement: when an organization policy
blocks that subagent model, Claude Code can fall back to the inherited coordinator model. Make sure
the effective model policy permits both exact IDs.

Do not set `CLAUDE_CODE_SUBAGENT_MODEL` or pass a per-invocation model override when you want this
routing, because both take precedence over agent frontmatter. Invoking `/deliver:work-next-issue`
directly also bypasses the worker boundary and uses the current session model: launch that direct
session with `claude --model claude-opus-5`, or use `/plenipo:deliver` to route automatically. See
Claude Code's
[subagent reference](https://code.claude.com/docs/en/sub-agents) and
[model configuration](https://code.claude.com/docs/en/model-config).

Keep only the plugins for the current phase enabled. Skill and agent descriptions are always-on
context even when their bodies never run:

| Phase | Enabled plugins |
|---|---|
| everyday delivery, review and testing | `plenipo`, `harness`, `deliver` |
| backlog definition or shaping | add `define` and `shape` for that session |
| discovering or launching a product | add `scout`, `define` and `shape` |
| platform stewardship | `plenipo`, `harness`, `steward` |

The fully unattended, cross-phase fleet in `AUTOMATED_CLAUDE_LOOPS.md` is the deliberate exception:
it keeps every phase available because a timer cannot reload plugins after the session starts.

The turn limits above are conservative L4 circuit breakers, not measured optima or token budgets.
Raise one only after an observed good run exhausts it; an arbitrary tight limit that forces a restart
spends more than it saves.

#### Coding with fewer tokens

- Freeze one issue's acceptance checks before reading broad source; one behaviour and one PR per
  tick keep failures attributable.
- Run cheap deterministic gates before asking any model to review. Classification, status checks
  and exact transforms belong in scripts, not even in Haiku.
- Search by symbol or `rg`, open relevant ranges, and batch related reads and checks. Repository-wide
  tours and repeated single-file reads spend context without changing the decision.
- Load skills through the Skill tool when their branch is reached. A `skills:` preload injects the
  complete body into every agent run, including runs that stop at preflight.
- Return issue numbers, SHAs, paths, terminal states and evidence — never command transcripts. Keep
  the noisy exploration inside the worker context.
- Resume a branch that hit a circuit breaker instead of restarting from zero, and escalate model
  tier once for a named ambiguity rather than repeatedly retrying with longer prompts.

## The part that saves the most time

**Every product gets a `RUNBOOK.md` and a `run-<product>` skill**, so an agent asked to add a feature
already knows how to start the app and how to prove the change — instead of reverse-engineering it
from `AppHost.cs` comments every session.

Run `/deliver:install-runbook` in a product repo. It writes:

```text
RUNBOOK.md                                    the contract: run, exercise, observe, test, debug
.claude/skills/run-<product>/SKILL.md          the thin index that makes it discoverable
tests/<Product>.IntegrationTests/              Testcontainers + WebApplicationFactory fixture
  IntegrationFixture.cs                        AdminClient() (real pipeline) + AuthorizedScopeAsync()
  Evals/cases/*.json                           golden conversation evals
<product>.http                                 the committed request catalog
.claude/launch.json
```

The two commands every product answers to:

```bash
dotnet run --project src/<Product>.AppHost      # run it
dotnet test <Product>.slnx                       # prove it
```

No API key, no cloud account, no Plenipo checkout: the assistant runs on the platform's `Mock`
provider, which still performs **real, audited tool calls and triggers the approval gate**.

## Ten products, one platform

Products build in parallel; the platform does not. That asymmetry is the whole design.

A product agent that hits a platform gap **never edits the platform and never waits for it**. It
climbs an escalation ladder — is it already there? does a product seam cover it? can a local shim
carry it? — applies the shim tagged `TODO(plenipo#N)`, files a structured request, and **carries on**.
On the platform side a single steward works that queue: clustering the same need across products
(demand outranks argument), answering each with a verdict the requesting agent can parse without a
human relaying, guarding the invariants, and refusing shapes that serve only one product. When a
release lands, each product's upgrade PR unwinds the shims whose requests it closed.

| Skill | Side | What it does |
|---|---|---|
| `platform-protocol` | both | the contract: the ladder, the request fields, what each verdict obliges |
| `/deliver:request-platform-change` | product | climb, shim, tag, file — without blocking |
| `/deliver:upgrade-platform` | product | consume a release and retire the shims it made unnecessary |
| `/steward:triage-requests` | platform | cluster, verdict, guard the invariants, adopt the acceptance test |
| `/steward:install-request-surface` | platform | the issue form, labels, consumer registry, and the CI gate |

The gate matters as much as the queue: `consumer-conformance.yml` packs the platform as a release
candidate and **builds and tests every registered product against it** before a change can merge.

This isn't theoretical. Measured on this platform with *one* product active: **~22% of platform
commits were already product-driven** (the largest single category), **zero issues had ever been
filed** against 62 PRs, and one product carries **235 lines of middleware rewriting platform JSON**
to patch four platform bugs — marked deletion-ready, with nothing tracking when to delete it.

## Codex and Copilot

Cross-tool support has two separate layers:

1. **Plugin installation** makes the reusable Plenipo skills available to Codex or Copilot.
2. **Repository instructions** give every agent the durable facts for the product it has opened.

Each durable fact still lives in exactly one file — duplication across these is the top cause of
contradictory agent behaviour.

| File | Codex | Copilot agent surfaces¹ | github.com Chat | Copilot code review | Claude Code |
|---|---|---|---|---|---|
| `AGENTS.md` — the source | ✅ | ✅ | ❌ | ✅ | ❌ |
| `CLAUDE.md` — `@AGENTS.md` + Claude specifics | ❌ | ✅ | ❌ | ❌ | ✅ |
| `.github/copilot-instructions.md` — Copilot-wide + Chat standalone | ❌ | ✅ | ✅ | ✅ | ❌ |
| `.github/instructions/*.instructions.md` — path-scoped | ❌ | ✅ | ❌ | ✅ | ❌ |
| `.github/agents/*.agent.md` — assignable custom agents | ❌ | ✅ | ❌ | ❌ | ❌ |

¹ Copilot agent surfaces here means VS Code, Copilot CLI, and the cloud agent. Support varies in
other IDEs; consult GitHub's current
[custom-instructions support matrix](https://docs.github.com/en/copilot/reference/custom-instructions-support).

Three facts shape this arrangement:

- **Claude Code does not read `AGENTS.md`.** `CLAUDE.md` imports it with `@AGENTS.md`; a symlink
  would require Developer Mode or Administrator privileges on Windows.
- **github.com Chat reads `.github/copilot-instructions.md`, not `AGENTS.md`.** It therefore needs
  the minimum repository facts inline.
- **Codex stops adding project instructions at `project_doc_max_bytes`, which defaults to 32 KiB.**
  The limit is configurable, but a shared repository cannot depend on every user raising it. Keep
  the chain comfortably below the default. See the
  [Codex `AGENTS.md` guide](https://learn.chatgpt.com/docs/agent-configuration/agents-md).

The skill index is generated, kept small, and checked in CI:

```bash
node eng/generate-agent-docs.mjs           # regenerate the skill index in AGENTS.md
node eng/generate-agent-docs.mjs --check   # CI: fail if it is out of sync
```

The bundled `install-agent-config` skill installs this shape into any repo. The steward also ships
as a **Copilot custom agent**, so a platform request can be triaged on github.com by assigning it —
no checkout, no local session.

## What this repo will not do

Deliberate exclusions, most of them learned the expensive way by its predecessor:

- **No CLI.** A compiled tool is a procedural carve-out that contradicts the agentic shape.
- **No catalog or manifest file** listing the skills. Auto-discovery is the catalog.
- **No composable persona/protocol/format layers.** Each skill is self-contained; the indirection
  costs more than the duplication saves.
- **No "Foundations" epic.** The platform *is* the foundation. The dual is *discover the existing
  primitive and bind to it* — never *generate the backbone*.
- **No `the-` naming convention.** Products get real brand names.
- **No exit condition that is only model-judged prose.** Where a command's exit code can decide, it
  decides.

## Verifying this repo

The repo holds itself to the ladder it preaches:

```bash
node eng/validate-marketplace.mjs
```

Deterministic (L1) checks: manifests parse and agree with the directory tree; frontmatter is valid
and `name` matches its folder; descriptions fit the budget and carry a `DO NOT USE FOR:` clause;
bodies stay under the size limit; **no link escapes its plugin root** (plugins install in isolation,
so a path to a sibling plugin or the repo root simply does not exist at runtime); descriptions don't
overlap enough to make routing ambiguous; nothing hardcodes a GitHub owner. It runs in CI on every
push.

Pull requests intentionally have **two automatic required checks**. `Validate marketplace` runs
the structural validator, generated-index check, unattended-loop regression suites, asset-drift
check and Markdown lint. `PR gates` checks evidence and protected-diff policy using the evaluator
from the protected base branch.

The unattended profile also runs a bounded approval verdict and deterministic merger. The model
verdict is not itself a required status check: a provider failure withholds the revision-bound
approval artifact and is retried later. The older, comment-only marketplace reviewer is not
installed because it duplicated model work without adding merge authority.

## Known limitations

Stated plainly, because a harness that hides its own gaps is not one:

- **No eval harness yet.** The skills were designed from a codebase audit and the loop/harness
  literature, **not** from recorded observations of an agent failing to author a Plenipo module.
  Until there are evals, every claim about how well this routes is level-4 evidence — a considered
  opinion, not a measurement. This is the largest unpaid debt, and it is the same debt the
  predecessor never paid.
- **`validate-marketplace.mjs` checks structure, not correctness.** It proves a skill is
  well-formed and its links resolve. It cannot prove the advice inside is right.
- **The platform is a moving target.** Package versions and API names in these skills were verified
  against source in July 2026. Re-verify rather than trusting them; the `plenipo-platform` skill
  says as much and gives the trust ranking for doing it.
- **Two of the platform's own products are inconsistent** — one is the current reference, the other
  still consumes pre-rename packages and ships architecture docs describing code that was deleted.
  `/scout:scan-fleet` reports this rather than pretending otherwise.
- **The request protocol is designed for ten products and there is currently one.** That is a real
  over-fit risk, so `platform-protocol` stages adoption by consumer count: only the tagged
  self-failing shim and the conformance gate are load-bearing at n=1. Clustering, demand counting and
  queue ceremony are scaffolding for a scale you may not reach — turn them on when a second requester
  makes them mean something.
- **The conformance gate cannot see the highest-risk break.** A product pinning a CSP hash of
  platform-authored inline HTML white-screens when that HTML changes, and no managed-API check, and
  no compile-and-test gate, catches it. Only a browser smoke test would. The workflow says so in its
  own header rather than letting a green check imply safety.
- **Cross-tool instructions are advisory in every tool that reads them.** `AGENTS.md` has no include
  syntax in Codex, and no vendor guarantees an agent follows a prose pointer — which is why the
  operating rules are inline in `AGENTS.md` rather than behind a link, and why anything that must be
  *enforced* lives in CI, not in markdown.

## License

MIT — see [LICENSE](LICENSE).
