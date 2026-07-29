# Automated loops

How to run products on autopilot: **seven commands, one timer per loop, and a gate list that cannot
be argued with.** This is the operator's manual. [HARNESS.md](HARNESS.md) explains *why* it is
shaped this way; you do not need it to start.

The design goal is a portfolio you supervise in minutes a day, in domains you do not know, without
becoming the bottleneck on ten products at once.

## The whole thing in one command

```bash
/loop 20m /plenipo:fleet
```

That is the steady state. Each tick, `fleet` looks at every product you own, decides which one is
most starved and what it needs — build the next issue, review and merge what is waiting, sweep for
bugs, or refill the backlog — does exactly that one thing, and writes down what it did.

If you only have one product, run its four loops directly instead and skip the scheduler:

```bash
/loop 20m /plenipo:deliver     # next Ready issue → a pull request
/loop 30m /plenipo:ship        # review, gate, merge what passes
/loop 3h  /plenipo:test        # sweep end to end, file the bugs it finds
/loop 6h  /plenipo:define      # keep the backlog full and Ready
```

**Why not `5m`?** A build tick usually runs longer than five minutes, and a sweep boots the whole
stack. The interval is the *gap between ticks*, so 20 minutes for building and hours for sweeping
keeps the token bill proportional to work done rather than to polling. Drop the interval entirely
(`/loop /plenipo:fleet`) to let it pace itself.

## The seven verbs

That is the entire surface. Everything else in this marketplace is an internal the verbs call — you
never type those names.

| Verb | One tick does | How often |
|---|---|---|
| `/plenipo:setup` | make a repo safe to point a timer at: runbook, labels, gate scripts, branch protection, autonomy level | once per repo |
| `/plenipo:launch` | nothing → a product with a Ready backlog. Pauses once, for the go/no-go and the name | once per product |
| `/plenipo:deliver` | pick what deserves this tick, hand it to the build loop, journal it | 20 min |
| `/plenipo:ship` | adversarial review, then merge only what clears every gate | 30 min |
| `/plenipo:test` | boot it, hunt end to end, file deduplicated bug issues | 3 h |
| `/plenipo:define` | triage friction, promote Backlog → Ready, extend the plan only if it would run dry | 6 h |
| `/plenipo:fleet` | one tick on the one product that most needs it, across the whole portfolio | 20 min |

Every verb ends in exactly one named state — `Success`, `No-op`, `Blocked`, `Stalled`, `Exhausted`,
`Approval-required` — and **an error or a spent budget is never `Success`**. A tick that reports
`No-op` because nothing needed doing is a good tick, not a wasted one.

## Setup

Three steps. Nothing here needs an API key, a paid GitHub feature, or a cloud account.

### 1. Your machine, once

Install the marketplace, then put this in each product's `.claude/settings.json` (or your user
settings, to cover every repo). The template is
[`plugins/plenipo/skills/setup/assets/settings.json`](plugins/plenipo/skills/setup/assets/settings.json):

```text
/plugin marketplace add <your-owner>/plenipo-agents
```

```jsonc
{
  "enabledPlugins": {
    "plenipo@plenipo-agents": true,   // the seven verbs
    "harness@plenipo-agents": true,
    "scout@plenipo-agents":   true,
    "define@plenipo-agents":  true,
    "shape@plenipo-agents":   true,
    "deliver@plenipo-agents": true,
    "steward@plenipo-agents": false   // only in the Plenipo platform repo
  }
}
```

**Everything on, always.** An unattended run cannot reload its own plugin set mid-flight, so a
narrower set means a loop that stops halfway and cannot fix itself. The cost is every skill's
description resident in context — a few thousand tokens — and nothing else until a skill runs.

You also need: `gh auth login` (with the `project` scope — `gh auth refresh -s project`), Docker
running, and the .NET 10 SDK. The loops verify all three and report `Blocked` rather than guessing.

### 2. Each product repo, once

```text
/plenipo:setup
```

This is the step that makes autonomy safe rather than reckless. It installs ten things; the four
that matter most:

| What | Where | Why |
|---|---|---|
| `pr-gates.mjs` + `agent-gates.yml` | `.github/` | a **required status check**: the PR must carry its issue, real runtime evidence, and a regression test seen red — and must not quietly edit the spine |
| `merge-gate.mjs` + `agent-merge.yml` | `.github/` | the one implementation of the merge policy, run both locally and on a schedule |
| branch protection | GitHub settings | what makes the above mandatory instead of decorative |
| the `autonomy` block | `workflow.json` | the single number deciding what may merge without you |

It proves both scripts fail before it trusts them to pass. **A check never seen red may be asserting
nothing** — and an inert gate is worse than no gate, because then a green tick implies safety.

### 3. Start the loop

```bash
/loop 20m /plenipo:fleet
```

`/loop` runs inside an open Claude Code session. To survive a reboot, schedule the headless form
instead — one scheduled task per verb, staggered:

```bash
claude -p "/plenipo:fleet" --permission-mode acceptEdits
```

Check the flags against `claude --help` on your version before relying on them; they move.

## What a night actually looks like

```text
02:00  fleet → networthy  rule 5  deliver   #128 → PR #131 (runtime evidence attached)
02:21  fleet → casewise   rule 7  define    ready 1→4, promoted #61 #62, epic 3 added (SPEC §4.2)
02:44  fleet → networthy  rule 2  ship      #131 reviewed → agent:approved → merged (level 2)
03:05  fleet → networthy  rule 6  test      swept 4a91c2f: 2 bugs filed, 1 at p0 (approval gate)
03:28  fleet → networthy  rule 3  deliver   p0 bug #134 → PR #135
03:52  fleet → casewise   rule 4  ship      3 PRs open, review is the constraint
```

Nobody was awake. Six ticks, one product booted at a time, every decision recorded in `TICKS.md` and
`FLEET-RUN.md` — on disk, because the conversation is gone by morning and compaction erases the
rest.

### The loop is closed

This is the part that makes it self-sustaining rather than a queue that drains:

```text
     SPEC.md deferred scope ─┐
   friction from real use ───┼──▶ define ──▶ Ready issues ──▶ deliver ──▶ pull request
        bugs from sweeps ────┘                                               │
              ▲                                                              ▼
              └──────────── test ◀──── merged ◀──── ship (gates + review) ───┘
```

Each arrow is a GitHub object, never a chat message: issues, labels, PR bodies, board columns. That
is deliberate — the agent that arrives next has no memory of the one before it, so if a fact matters
after this tick, it is in GitHub or it does not exist.

**Bugs become work automatically.** `test` delegates the sweep to an agent that *cannot edit code*,
then files each finding with a stable fingerprint (`bug/approvals-write-not-gated`), a reproduction,
and a priority set by consequence — tenant leaks and dead approval gates at p0. Tomorrow's `deliver`
tick picks p0 bugs up **ahead of features**. Re-running the sweep does not refile last night's bug,
and cannot reproduce it any more? It says so and leaves the issue open — a fix you cannot see is not
a fix.

**Features keep coming, but cannot be invented.** `define` may only add capabilities with
*provenance*: a line in `SPEC.md` that was deliberately deferred, or an enhancement issue somebody
hit while using the product. When those run out it reports `Stalled` — "this product has built
everything its spec asked for" — and stops. That is the honest answer, and the one thing an
unattended loop must never paper over with plausible-sounding make-work.

## Review, approve, merge

The rule everything follows: **the agent that wrote the change never approves it.** The same model
producing and grading is the *self-approving loop*, and the grade drifts up while quality stalls.

So there are two planes, and they never share a context:

| | Writes code | Judges code |
|---|---|---|
| **Where** | your machine (needs Docker to prove anything at runtime) | a fresh session's `pr-reviewer` agent, or GitHub Actions |
| **Can** | branch, implement, test, open a PR | read, comment, label, block |
| **Cannot** | merge, approve, label itself approved | edit, push, fix what it found |

### The gates

A merge happens because a **list of checks passed**, not because a reviewer was enthusiastic. The
review can only ever *block*.

| Enforced by | Runs | Checks |
|---|---|---|
| `pr-gates.mjs` | CI, required check on every push | `closes_an_issue` · `has_runtime_evidence` · `has_red_before_green` · `spine_untouched` |
| `merge-gate.mjs` | `/plenipo:ship`, and `agent-merge.yml` every 15 min | `is_loop_pr` · `not_draft` · `checks_exist` · `checks_green` · `mergeable` · `no_blocking_review` · `agent_approved` · `no_human_hold` · `main_is_green` · `level_permits` · `under_cap` |

Two of those are worth understanding, because they are what makes the arrangement honest:

- **`checks_exist`** — a repo with no CI can never auto-merge. If nothing ran, green means nothing.
- **`spine_untouched`** — fires when a diff *removes or edits* a line touching `HasQueryFilter`,
  `RequiresApproval`, `Permissions.`, `AddPlenipoRole`, or anything in `.github/`, `CODEOWNERS`,
  `nuget.config`, `appsettings*.json`. **Adding** a query filter is ordinary feature work;
  **deleting** one is a tenant-isolation change. Override needs the `human-approved` label — a human
  act, recorded on the PR. This is content-based on purpose: a path rule would either block every
  migration or catch nothing.

Merging is never a bare `gh pr merge`. It is `merge-gate.mjs --merge`, which re-evaluates every gate
immediately before touching anything — so a check that turned red after the review still blocks.

### Earning autonomy

One number in `workflow.json`, **written by you, never inferred by an agent**:

| Level | May merge | You get here by |
|---|---|---|
| **0** | nothing — it reviews and labels, you merge | the default for every new repo |
| **1** | docs, tests, the runbook | the runbook is installed and rungs 1–3 are green |
| **2** | product features, on an adversarial approval | golden evals exist, and level 1 was clean for a stretch |
| **3** | unattended, inside a revert budget | level 2 was clean, and you said so in words |

Start at 0 for a week and read the reviews it would have posted. The way out of the loop is a
**stronger verifier**, never a bigger batch: shipping in large chunks does not remove review, it
defers and enlarges it, and it costs the loop the one thing it needs even with nobody watching —
attribution, so a red check points at a cause.

**Two things never graduate**, at any level, for any product with any track record:

- **Anything in the Plenipo platform.** A bad product merge hurts one product; a bad platform merge
  hurts every product built on it.
- **The spine** — RBAC before the model, approval-first writes, tenant isolation, append-only
  audit, write-only secrets. Those five *are* the platform's value. A product that can merge a
  change to them unsupervised has already lost the thing it was built on.

### Do not add GitHub's auto-merge

It waits only for conditions you explicitly configured, so a PR can merge while a review is still
running. And GitHub's own AI review leaves **comments only** — it never Approves, so it satisfies no
required-reviewers rule. Useful as a second pair of eyes; useless as a gate.

## Ten products, one machine

`fleet.json` at the directory holding your repos — paths only, so no policy value is ever
duplicated:

```json
{ "products": [ { "name": "networthy", "path": "networthy" },
                { "name": "casewise",  "path": "casewise" } ] }
```

Everything else is read from each product's own `workflow.json`. Two properties keep it honest
overnight: it serves the **least-recently-served** product on ties, so a noisy repo cannot starve a
quiet one; and it **quarantines** a product after three consecutive failed ticks, naming it in every
report afterwards. A broken repo consuming every tick until morning is the most expensive failure
available here, and it looks exactly like activity.

Ask for a status instead of a tick and it prints the whole portfolio — Ready, in flight, open PRs,
p0 bugs, autonomy level, last swept, quarantined — and touches nothing. That report is your daily
supervision, and it is the honest way to start: watch what it *would* have chosen for a few days
before letting it choose.

## When you want it to stop

| Lever | Effect | Scope |
|---|---|---|
| `human-hold` label on a PR | that PR never merges | one PR |
| `human-approved` label | overrides `spine_untouched`, deliberately | one PR |
| `AGENT_AUTOMERGE=off` repo variable | the scheduled merger no-ops, no commit needed | one repo |
| `autonomy.level: 0` | nothing merges anywhere in that repo | one repo |
| stop the `/loop` | everything stops; the board and journals hold the state | everything |

Nothing is lost by stopping. Every piece of state lives in GitHub or in a journal file, so the next
tick — tonight or next month — reads where things stand instead of asking you.

## What to watch weekly

The metric is **cost per accepted change**: tokens spent divided by changes that survived
verification. Not tokens, not PRs opened, not tests passing. Benchmarks flatter agents — PRs that
pass them merge at a rate 24 points lower than implied — so the only score is what survived.

Five minutes, once a week:

1. `/plenipo:fleet` in report mode — anything quarantined? any product not served in days?
2. Open PRs older than two days — is review the constraint, or is a gate stuck?
3. Skim two merged PRs: was the runtime evidence real, or a heading with prose under it?
4. Any `agent:blocked` or `needs-human` issue is a decision waiting on you. That queue *is* your
   job.
5. Did any product report `Stalled`? A backlog that honestly ran out is a milestone, not a fault.

## Honest status

This document argues for a system; here is what is actually proven about it, at the level it
deserves:

- **The gate scripts work** — L1. Both were run against fixtures and observed failing before
  passing: the evidence gates on an empty body, the spine guard on a diff deleting a
  `HasQueryFilter`, and the merge gate refusing at every autonomy level including a missing config.
- **The marketplace is structurally sound** — L1/L2. `node eng/validate-marketplace.mjs` exits 0,
  and it now catches two classes of defect it previously could not: a `/plugin:skill` reference to a
  skill that does not exist, and a backticked relative path that does not resolve. Both were seen
  red against real stale references in this repo before being fixed.
- **The verbs have never driven a real product end to end** — this is the largest gap. The dispatch
  chain, the tick ordering and the fleet scheduling are **L4**: reasoned, internally consistent, and
  unobserved. Run one product at level 0 for a week before believing any of it.
- **`agent-review.yml` is unverified** — it depends on Claude Code CLI flags that move, and it is
  the one optional piece. The local reviewer needs no secret and no bill; prefer it.
- **Building needs your machine.** Runtime proof means booting the product under Docker, so the
  build and sweep loops are local. Review and merge keep working in the cloud while the machine is
  off, but no new code gets written.
- **The instructions in every skill are advisory.** No tool enforces markdown. Anything that must
  be enforced is in CI or in a gate script — which is exactly why the load-bearing parts of this
  design are two node files with exit codes rather than three paragraphs of prose.

---

> **Build the loop. Stay the engineer.**
