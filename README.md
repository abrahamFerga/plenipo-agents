# plenipo-agents

**The outer harness for building AI-first products on the [Plenipo](https://github.com/abrahamFerga/Plenipo) platform.**

A Claude Code plugin marketplace of agents and skills that scout unclaimed industries, define and
design a product against the platform, build it one issue at a time, and — the part everyone skips —
**prove each change actually works at runtime**.

Built on two disciplines: **harness engineering** (the guides and sensors an agent needs) and **loop
engineering** (what lets it run unsupervised). [HARNESS.md](HARNESS.md) explains why the repo is
shaped this way; read it once.

## Install

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
  "enabledPlugins": {
    "harness@plenipo-agents": true,    // always on
    "scout@plenipo-agents":   false,
    "define@plenipo-agents":  false,
    "shape@plenipo-agents":   false,
    "deliver@plenipo-agents": true     // the default coding loop
  }
}
```

## The five loops

Each plugin is one loop. A loop declares **Trigger · Goal · Execution · Verification · Stopping rule
· Memory**, and ends in exactly one named state — `Success`, `No-op`, `Blocked`, `Stalled`,
`Exhausted`, or `Approval-required`. *An error or an exhausted budget never counts as success.*

| Plugin | Loop | Goal | Default |
|---|---|---|---|
| **harness** | control plane | the platform contract, the runbook, config validation, the conductor | **on** |
| **scout** | discovery | an unclaimed industry worth a product, with a defensible reason | off |
| **define** | definition | a spec and plan a team could build against | off |
| **shape** | design | every shape decision made once, and justified | off |
| **deliver** | build + verification | one Ready issue → a merged PR, proven at runtime | **on** |

## Skills

### `harness` — always on

| Skill | Invocation | What it does |
|---|---|---|
| `plenipo-platform` | automatic | What the platform already provides, the seven host seams, the invariants, and the trust ranking for its docs |
| `plenipo-runbook` | automatic | How to run, observe, and prove a change in any Plenipo product |
| `loop-discipline` | automatic | The verification ladder, terminal states, and the five loop anti-patterns |
| `conduct` | `/harness:conduct` | Drives the full pipeline, gating on each loop's exit condition |
| `validate-product` | `/harness:validate-product` | Read-only L2 check of config, invariants, and doc drift |

### `scout` — the discovery loop

| Skill | Invocation | What it does |
|---|---|---|
| `scan-fleet` | `/scout:scan-fleet` | Inventories every Plenipo product → `FLEET.md`: membership, version drift, seam adoption, coverage, stale docs |
| `find-industry` | `/scout:find-industry` | Ranks unclaimed verticals against the platform's spine → a shortlist plus a rejection log |
| `opportunity-brief` | `/scout:opportunity-brief` | Deep-dives one candidate to a go/no-go, with kill criteria |

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

## Relationship to `my-skills`

[`my-skills`](https://github.com/abrahamFerga/my-skills) builds greenfield .NET systems from
scratch. `plenipo-agents` builds products **on an existing platform**, where the backbone already
exists and must not be regenerated. The control plane is a descendant; the content is its dual.

For a Plenipo product, use `plenipo-agents` **instead of** `my-skills`' `system-definition`,
`architecture`, and `development` plugins — enabling both makes several skill descriptions compete
for the same intent, and ambiguous routing is the most common marketplace defect.

## License

MIT — see [LICENSE](LICENSE).
