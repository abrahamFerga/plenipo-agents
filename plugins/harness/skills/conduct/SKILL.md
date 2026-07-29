---
name: conduct
description: >
  Drive one product from an idea to merged, runtime-proven code by sequencing the four loops —
  scout, define, shape, deliver — handing each phase off to its own slash command and refusing to
  advance until that phase's exit check passes. Owns the gates, the run journal, the budget and
  stagnation ceilings, and the autonomy level; it delegates every procedure instead of restating one.
  USE FOR: starting or resuming a full end-to-end run, deciding which phase comes next and whether
  the previous one actually finished, draining a GitHub backlog issue by issue under a budget.
  DO NOT USE FOR: doing a single phase's work (invoke that phase's command directly), or grading
  evidence in the abstract (loop-discipline).
license: MIT
disable-model-invocation: true
---

# Conduct the pipeline

Four loops turn an industry into a shipped product: **scout** finds the vertical, **define** decides
what it is, **shape** decides its form, **deliver** builds and proves it. Each loop already has
skills that know how to do their own work. This skill does none of that work. It decides **which
phase runs next, whether the previous one actually finished, and when the whole run stops** — and it
keeps that decision on disk so a fresh session can pick it up.

The failure it exists to prevent: a run that drifts. A phase that "looks done" because a summary
said so, a build loop that spins on the same issue, a board that quietly stops moving, a report of
`Success` while three PRs sit unmerged. Every advance here costs a check with an exit code.

**Terminal states:** `Success` (board drained **and** the runtime proof green on the merged state) ·
`No-op` (every gate already passes — nothing to advance) · `Blocked` (a required plugin is disabled,
`gh` is unauthenticated, or a phase's input artifact is missing and only a human can supply it) ·
`Stalled` (a gate failed three times for three different reasons, or a full build iteration moved no
card) · `Exhausted` (the attempt or issue budget ran out with work still on the board) ·
`Approval-required` (a human must decide: the go/no-go, an ADR, or a PR merge when auto-merge is
off).

## When to Use

- Kicking off a new product and wanting the whole pipeline driven rather than each phase prompted.
- Resuming after a break, a compaction, or a new session — "where are we and what runs next?"
- Draining an existing backlog issue by issue under a stated budget.
- Auditing a stalled run: which gate is actually failing, and at which verification level.

## Stop Signals

- **You know the phase you want** → invoke that phase's command directly. The conductor is overhead
  when the next step is not in question.
- **Only one issue needs building** → `/deliver:work-next-issue`.
- **The question is "is this evidence good enough?"** → `loop-discipline`. This skill applies that
  ladder; it does not teach it.
- **No product and no candidate industry yet** → start at `/scout:scan-fleet`; the conductor has
  nothing to sequence until there is a subject.

## Inputs

| Input | Where it comes from | Used for |
|---|---|---|
| Current phase | `CONDUCT.md` (the run journal), reconciled against artifacts on disk | resuming without re-running a finished phase |
| Product config | the product's `workflow.json` | product name, industry, loop, platform version, repo |
| GitHub owner / repo | that config, else `gh api user` | every board and issue query — **never hardcode an owner** |
| Board | GitHub Projects v2 for the repo | the build queue and each item's position |
| Autonomy level | the user, explicitly | how far a phase may go before asking |
| Budget | the user; defaults below | the `Exhausted` ceiling |
| Enabled plugins | `.claude/settings.json` → `enabledPlugins` | which phases can run at all |

Read the phase from artifacts, not from the conversation. A transcript that says phase 4 finished and
a repo with no `ARCH.md` disagree; the repo wins.

## Fix the plugin set before the run, not during it

Phase commands live in other plugins. A disabled plugin means the command does not exist, and
enabling one mid-run requires a reload the loop cannot perform on its own — the predecessor's
stage-by-stage enabling was self-defeating for exactly this reason.

**A full run enables all five, up front:**

```json
"enabledPlugins": {
  "harness@plenipo-agents": true,
  "scout@plenipo-agents":   true,
  "define@plenipo-agents":  true,
  "shape@plenipo-agents":   true,
  "deliver@plenipo-agents": true
}
```

The cost is small and bounded: only each skill's ~100-token `description` is resident, and every
action skill sets `disable-model-invocation: true`, so its body costs nothing until invoked. Trading
that for a run that never has to stop and reconfigure itself is the right trade.

Narrower sets are for narrower work — `harness` + `scout` to choose a vertical, `harness` + `deliver`
for a long delivery stretch. Choose the set for the run you are about to make, then **do not change
it until the run ends**.

## The phase table

| # | Phase | Loop | Command | In | Out | Exit condition (level) |
|---|---|---|---|---|---|---|
| 1 | Pre-flight | — | *inline glue* | — | a verified environment | `gh auth status` exits 0, Docker is running, and the plugin set above is present (L1) |
| 2 | Discovery | scout | `/scout:scan-fleet` → `/scout:find-industry` → `/scout:opportunity-brief` | sibling repos on disk | `FLEET.md`, `opportunities/SHORTLIST.md`, one brief | a brief exists with an explicit go/no-go **and a human chose** (L5 — say so) |
| 3 | Definition | define | `/define:research-industry` → `/define:synthesize-spec` → `/define:plan-product` | the chosen industry | `research/<industry>.md`, `SPEC.md`, `PLAN.md` | `PLAN.md` names every module, its tools, the RBAC model, and epics in build order (L2) |
| 4 | Ground | deliver | `/deliver:scaffold-product` → `/deliver:install-runbook` | `PLAN.md` | repo + board, the host, `RUNBOOK.md`, the E2E fixture | `dotnet build <Product>.slnx` and `dotnet test tests/<Product>.IntegrationTests` both exit 0, and `/harness:validate-product` exits 0 (L1+L2) |
| 5 | Backlog | define | `/define:sync-backlog` | `PLAN.md` + the repo | epic and feature issues on the board | the board returns ≥1 item and every epic has ≥1 feature under it (L1) |
| 6 | Design | shape | `/shape:design-product` | `SPEC.md`, `PLAN.md` | `ARCH.md`, `DECISIONS.md`, cards moved to Ready | both files exist, ≥1 item is `Ready`, every non-default choice has an ADR (L2) |
| 7 | Build | deliver | `/deliver:work-next-issue` — repeat | one `Ready` issue | a branch, a PR, a merged commit | the PR is merged and the issue closed (`gh pr view --json state,mergedAt`) (L1) |
| 8 | Prove | deliver | `/deliver:verify-runtime` | the merged change | a regression test + runtime evidence | rungs 1–3 green; the test seen **red before, green after**; an AG-UI turn ends `RUN_FINISHED` with no `RUN_ERROR` (L1+L3) |

**Phase 4 sits inside the definition loop on purpose.** Issues need a repo, so the product must be
scaffolded before `sync-backlog` can publish anything. It is the one place the pipeline is not
strictly plugin-ordered — and the clearest reason to have all five plugins enabled from the start.

**Phase 8 runs twice over:** once per issue inside phase 7 (that is what makes a merge honest), and
once more on the final merged state before you may claim `Success`.

### The handoff rule

Everything in the Command column is a **hand-off, not a summary**. Do not read another skill's
`SKILL.md` and re-perform its procedure inline — that is the predecessor's worst flaw: a 200-line
procedure held alongside your own context, executed at half fidelity, with two sources of truth for
one job.

- If the harness lets you invoke a named skill directly, invoke it by its exact name and let it own
  the phase.
- If it does not — action skills set `disable-model-invocation: true`, which makes them
  user-invocable — **print the literal command on its own line and stop**. That pause is
  `Approval-required`, a legitimate terminal state, not a failure. The run resumes when the user runs
  it.
- If the owning plugin is disabled, you are `Blocked`. You are not licensed to improvise the phase
  from memory.

The only work you do yourself is: the pre-flight checks, running each exit-condition command, reading
the board, and appending the journal. **That list is exhaustive.** If you find yourself drafting
`SPEC.md`, you have absorbed a phase instead of conducting it.

## Workflow

1. **Pre-flight.** Confirm `gh auth status` exits 0, Docker is running, and the enabled plugin set
   matches the run you intend. Anything missing here is `Blocked` — fix it before phase 2, never
   mid-run.

2. **Locate the run.** Read `CONDUCT.md` if it exists, then verify it against reality: which
   artifacts are on disk, what the board actually contains. The current phase is the **lowest**
   phase whose exit condition does not currently pass. Say which one, and why.

3. **Declare autonomy and budget in writing** before the first hand-off — level, attempt ceiling,
   issue ceiling. An undeclared budget is an unbounded one, which is the runaway anti-pattern.

4. **Run the phase.** Hand off per the rule above. Do not start a phase whose input artifact is
   missing; a phase's own claim that it produced something is not evidence that it did.

5. **Gate.** Run the exit-condition command. Record the result, the ladder level, and the evidence.
   Pass → advance. Fail → the contract below decides.

6. **Journal.** Append one entry to `CONDUCT.md`: phase, terminal state, the command run, its exit
   code or the artifact path, and the next command. Then continue or stop.

7. **Drain the board** (phase 7, repeated). One issue in flight at a time; re-check the budget and
   the no-progress detector after each iteration.

8. **Close out.** Re-run phase 8 on the merged state, then end in exactly one named terminal state
   and write it into the journal. Unmerged PRs mean `Approval-required`, never `Success`.

## The gate contract

A gate is the only thing standing between phases. It has three rules and no discretion:

1. **The artifact must exist** — as a file on disk or an object in GitHub. Not "was produced".
2. **The check must run** — an exit code, a file's presence, a board query. If the check cannot run
   (no Docker, no auth, no network), the gate does **not** pass; the run is `Blocked`. A check you
   could not run is not a check you passed.
3. **The level must be stated.** Most gates here are L1 or L2. Two are not: the go/no-go in phase 2
   is L5 (a human), and any "the doc looks complete" reading is L4 (your opinion). Report them as
   such. Reporting an L4 gate with L1 confidence is how a whole run becomes fiction.

**On failure:** one retry of the same phase command, with the failure output handed to it. If the
second attempt fails differently, treat it as a fresh diagnosis and retry once more. Three failures
for three different reasons means the *diagnosis* is wrong, not the fix — stop as `Stalled` and
escalate with the reproduction, the outputs, and what you ruled out. Two identical failures is
spinning; stop immediately.

## Where the loop's memory lives

The model forgets everything between runs, and compaction erases what lives only in the transcript.
Every piece of run state is therefore a file or a GitHub object:

| State | Lives in | Written by |
|---|---|---|
| What already exists in the fleet | `FLEET.md` | phase 2 |
| Candidates and the rejection log | `opportunities/SHORTLIST.md`, the brief | phase 2 |
| What the product is | `research/<industry>.md`, `SPEC.md` | phase 3 |
| Modules, tools, RBAC, build order | `PLAN.md` | phase 3 |
| How to run and prove it | `RUNBOOK.md`, the `.http` catalog, the E2E fixture | phase 4 |
| The work queue and its position | GitHub issues + the Projects v2 board | phases 5, 7 |
| Shape decisions and their reasons | `ARCH.md`, `DECISIONS.md` | phase 6 |
| Work in flight | the branch and the open PR | phase 7 |
| That a fix is real | the regression test itself | phase 8 |
| The run's own history | `CONDUCT.md` | this skill |

**The board is the queue; `CONDUCT.md` is the log.** Resuming means reading those two, never
scrolling the conversation. If a fact matters after this session, it is in one of these files or it
does not exist.

## Budget and stagnation

Defaults, all overridable by the user, all stated before the first hand-off:

| Ceiling | Default | On breach |
|---|---|---|
| Attempts per phase command | 2 (a third only for a genuinely new diagnosis) | `Stalled` |
| Distinct failure reasons at one gate | 3 | `Stalled` — the diagnosis is wrong |
| Identical failure repeated | 2 | stop immediately; retrying an identical action after an identical error is spinning |
| Issues per unattended stretch | 3 | `Exhausted` — report the board state and hand back |
| Whole-pipeline runs without a human | 1 | `Approval-required` before a second pass |

**No-progress detector.** After each phase-7 iteration, compare the board: if no card changed
column, no PR merged, and no commit landed, the loop is not making progress. One such iteration is a
warning; two consecutively is `Stalled`. A build loop that produces conversation but not merges is
the most expensive failure mode available here, because it looks like work.

## Phased autonomy

Trust is earned per product, not per model. Each level must earn the next.

| Level | The conductor may | It may not | Entry requirement |
|---|---|---|---|
| **1 — Report-only** | read artifacts, run the gate checks, print the phase table with pass/fail and the exact next command | write any file except `CONDUCT.md`; invoke any phase | the default for a product it has never driven |
| **2 — Assisted** | run phases, stop at every gate, show the evidence, wait for a go | merge, close, or delete anything; skip a gate | level 1 came out clean |
| **3 — Unattended** | drain the board inside the budget, iterating phase 7 → 8 | merge without runtime proof; create a repo; change the plugin set; touch anything irreversible without approval | `RUNBOOK.md` installed, rungs 1–3 green, golden evals present, and the user said so in this session |

**Do not start at three.** Irreversible actions stay behind human approval at every level: repo
creation, PR merge, branch deletion, anything that spends money. This mirrors the platform's own
`RequiresApproval` gate one altitude up — which is a good sign it is the right shape.

## What "Done" means

`Success` requires **both**, and neither substitutes for the other:

1. **The board is drained** — nothing in `Backlog`, `Ready`, or `In Progress` for the milestone
   under conduct. Query it; do not recall it.
2. **The runtime proof passed on the merged state** — phase 8 re-run after the last merge, with
   rungs 1–3 green and an AG-UI turn ending `RUN_FINISHED` with no `RUN_ERROR`.

If PRs are open and waiting on a human, the honest terminal state is **`Approval-required`**. The
work exists but is not merged; nothing is proven on `main`. Reporting `Success` there substitutes an
L5 checkpoint for an L1 fact, and the next session will inherit a board that disagrees with the run
log.

**Do not resolve that by turning on auto-merge.** Feature PRs are meant to wait: the agent that wrote
the change cannot also be the one that approves it, and CI green is an L1 check on the tests that
happen to exist, not evidence the feature does what was asked. A drained backlog with N open PRs is
the *correct* end state — human review capacity is the real constraint, and auto-merging does not
create more of it. `/deliver:work-next-issue`'s `references/merge-policy.md` has the full policy.

A run that ends `Blocked`, `Stalled`, or `Exhausted` is a *useful* outcome when it names the gate, the
evidence, and the single next action. A run that ends `Success` without both conditions above is
worse than a failed one, because nobody goes looking.

## Guardrails

- **Never restate another skill's procedure.** One source per procedure. Hand off by name or stop.
- **Never advance on a narrative.** A phase's summary is not evidence; the artifact and the exit code
  are. "It said it wrote SPEC.md" is not "SPEC.md exists".
- **Never change the plugin set mid-run.** Decide it in pre-flight; a run that needs a reload to
  continue has already failed its own design.
- **Never edit a gate to make it pass.** Loosening the exit condition of a phase you are conducting
  is specification gaming with extra steps — you are both the maker and the checker at that moment,
  which is exactly when the check must be the least negotiable thing in the room.
- **One issue in flight.** The board carries the parallelism, not the conversation.
- **Read the GitHub owner from the product config or `gh api user`.** Never hardcode it; a hardcoded
  owner silently targets the wrong account on a fork.
- **State the level of every gate you report** — L1, L2, L4, L5. The three L4/L5 gates in this
  pipeline are the ones a reader will over-trust unless you label them.
- **Products are not named `the-<something>`.** That convention is dead; do not enforce, suggest, or
  validate a prefix.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Inlining a phase's procedure "to save a hop" | half-fidelity execution, two sources of truth, silent drift from the real skill | invoke the command, or stop and print it |
| Enabling a plugin mid-run | the command still does not exist until a reload nobody can trigger from inside the loop | fix the plugin set in pre-flight |
| Advancing because the previous phase said it finished | phases build on artifacts that were never written | run the exit check every time |
| Publishing the backlog before the repo exists | `sync-backlog` has nothing to write to | phase 4 precedes phase 5 |
| Reporting `Success` with PRs unmerged | the board and the journal disagree; nobody investigates | `Approval-required` |
| Looping phase 7 with no card movement | tokens spent, nothing merged — the runaway anti-pattern | the no-progress detector; two flat iterations is `Stalled` |
| Skipping phase 8 because the build was green | `dotnet build` proves compilation, not behaviour | a regression test seen red before the fix |
| Keeping run state in the conversation | compaction erases it; the next session restarts blind | `CONDUCT.md` plus the board |

## Related skills

- `loop-discipline` — the ladder, the terminal states, and the anti-patterns this skill enforces.
  **Load when:** a gate's evidence level is in question.
- `plenipo-runbook` — the run and test contract behind the phase 4 and phase 8 exit conditions.
- `plenipo-platform` — what the platform already provides, so no phase builds a weaker copy of it.
- `../validate-product/SKILL.md` — the read-only L2 audit the phase 4 gate calls, and worth re-running
  before any merge. **Load when:** a gate needs a config- or guardrail-level verdict.
- `/deliver:work-next-issue` — the per-issue loop phase 7 iterates.
- `/deliver:verify-runtime` — the runtime proof phase 8 depends on.
