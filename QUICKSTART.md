# Quickstart

Five minutes from nothing to an agent that can build, run, and prove a Plenipo product.

## 1. Install

Choose the agent you use. The marketplace carries the same Plenipo workflows to all three tools.

### Claude Code

```text
/plugin marketplace add abrahamFerga/plenipo-agents
```

### OpenAI Codex

```bash
codex plugin marketplace add abrahamFerga/plenipo-agents
codex plugin add harness@plenipo-agents
codex plugin add deliver@plenipo-agents
```

Start a new Codex session after installation.

### GitHub Copilot CLI

```bash
copilot plugin marketplace add abrahamFerga/plenipo-agents
copilot plugin install harness@plenipo-agents
copilot plugin install deliver@plenipo-agents
```

Copilot CLI recognizes the marketplace's existing `.claude-plugin` manifests.

## 2. Turn on the two Claude Code plugins you need

Paste this into your product's `.claude/settings.json`:

```jsonc
{
  "extraKnownMarketplaces": {
    "plenipo-agents": { "source": { "source": "github", "repo": "abrahamFerga/plenipo-agents" } }
  },
  "enabledPlugins": {
    "plenipo@plenipo-agents": true,     // the seven verbs
    "harness@plenipo-agents": true,     // always on
    "deliver@plenipo-agents": true,     // the coding loop
    "scout@plenipo-agents": false,
    "define@plenipo-agents": false,
    "shape@plenipo-agents": false,
    "steward@plenipo-agents": false     // only in the Plenipo platform repo
  }
}
```

For Codex and Copilot CLI, the install commands above already select the same pair. `harness` +
`deliver` is the right pair for ~90% of days.

The examples below use Claude Code's `/<plugin>:<skill>` syntax. In Codex, mention the same skill as
`$<plugin>:<skill>`; in Copilot CLI, invoke it as `/<skill>` or select it from the skill picker.

That's the whole setup. Turn everything on instead if you intend to leave a timer running — see
[AUTOMATED_CLAUDE_LOOPS.md](AUTOMATED_CLAUDE_LOOPS.md).

## 3. Do the one thing that saves the most time

```text
/deliver:install-runbook
```

Run it once per product. It writes `RUNBOOK.md` and a `run-<product>` skill, so **every future
session already knows how to start your app and how to prove a change** instead of reverse-engineering
it from `AppHost.cs` comments.

Then check it worked:

```bash
dotnet run --project src/<Product>.AppHost     # run it
dotnet test <Product>.slnx                      # prove it
```

---

## What to say, depending on what you want

Seven verbs cover the whole lifecycle, and each one is a single bounded tick you can put on a timer:

| You want… | Say this |
|---|---|
| a repo ready to run unattended | `/plenipo:setup` |
| a whole new product, from an industry | `/plenipo:launch` |
| the next feature built | `/plenipo:deliver` |
| the open PRs reviewed and merged | `/plenipo:ship` |
| the product swept for bugs, filed as issues | `/plenipo:test` |
| the backlog kept full | `/plenipo:define` |
| all of it, across every product, forever | `/loop 20m /plenipo:fleet` |

Underneath, those call the skills below — you can also invoke one directly when you know exactly what
you want:

| You want… | Say this |
|---|---|
| one issue implemented, nothing else | `/deliver:work-next-issue` |
| to know if a change really works | `/deliver:verify-runtime` |
| the whole system swept for bugs | *"use the e2e-tester agent"* |
| the product made nicer to use | *"use the product-improver agent"* |
| the platform to add something you need | `/deliver:request-platform-change` |
| to move onto a newer platform release | `/deliver:upgrade-platform` |
| to check the repo is in good shape | `/harness:validate-product` |

You don't have to memorize these. `harness` is always on, so Claude already knows how the platform
works, how to run a product, and how "done" is defined — just describe what you want.

## Starting a brand-new product instead

Turn on `scout`, `define`, and `shape` as well, then walk the loops in order:

```text
/scout:scan-fleet          → what's already built, what's still open
/scout:find-industry       → a shortlist of verticals worth doing
/define:research-industry  → the competitive picture
/define:synthesize-spec    → SPEC.md
/define:plan-product       → PLAN.md
/define:sync-backlog       → the backlog, as GitHub issues
/shape:design-product      → ARCH.md + ADRs
/deliver:scaffold-product  → the repo
/deliver:install-runbook   → the run/test surface
/deliver:work-next-issue   → …then repeat this one
```

Or just `/harness:conduct` and let it drive, stopping at each gate.

## Working on the Plenipo platform itself

Different repo, different plugins — `harness` + `steward`:

```text
/steward:install-request-surface   → once: the request queue and the consumer safety gate
/steward:triage-requests           → work the queue from your products
```

## Two rules worth knowing on day one

**Never edit the platform from a product.** If Plenipo is missing something, run
`/deliver:request-platform-change` — it applies a local workaround so you're not blocked, tags it,
and files the request. Ten products editing one repo is how that repo becomes unmergeable.

**Compiling isn't proof.** A change is done when a test that *fails without it* passes with it, and
you watched both happen. Every skill here holds you to that.

## Give every agent the same repository rules

| Agent | Invocation |
|---|---|
| Claude Code | `/harness:install-agent-config` |
| OpenAI Codex | `$harness:install-agent-config` |
| GitHub Copilot CLI | `/install-agent-config` |

Run that skill once from any host where `harness` is installed. It writes `AGENTS.md` for Codex and
Copilot, a `CLAUDE.md` that imports it, and the `.github/` instruction files for Copilot. Plugin
installation supplies reusable workflows; these committed files supply the durable facts for one
repository. Each fact lives in exactly one place, so the tools cannot contradict each other.

## Where to go deeper

- **[README.md](README.md)** — every skill, and what each loop is for
- **[HARNESS.md](HARNESS.md)** — why the repo is shaped this way *(read once, when curious)*
- **[AUTHORING.md](AUTHORING.md)** — only if you're writing a skill yourself
