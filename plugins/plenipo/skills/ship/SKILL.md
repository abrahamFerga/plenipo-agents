---
name: ship
description: >
  One merge tick: for every open pull request the loop produced, merge only what clears a fixed list
  of deterministic gates at or below the autonomy level this repo has actually earned. Delegate an
  adversarial second opinion to `plenipo:pr-reviewer` only when a person asks or the evidence is ambiguous;
  model availability is never a merge prerequisite. A diff that removes a query filter, approval
  flag or permission grant, or edits the merge-policy trust root itself, stops for an owner
  bootstrap; ordinary protected changes are re-evaluated by the protected-base gate.
  USE FOR: `/loop 30m /plenipo:ship`, clearing a review backlog, letting a product merge without you.
  DO NOT USE FOR: writing or fixing the code under review (`../deliver/SKILL.md`), installing the
  branch protection and CI gates this depends on (`../setup/SKILL.md`), or merging platform changes —
  those need a conformance run across every consumer, which is `../steward/SKILL.md`.
license: MIT
---

# One review-and-merge tick

This is the verb that takes you out of the loop, and it is the one most able to hurt you. A merge
happens when a fixed list of checks passes. Optional model review may find work for the author, but
it cannot authorize a merge and its provider cannot strand the queue.

Two facts shape every rule below. CI green is an **L1 check on the tests that happen to exist**, and
those tests were written by the same loop that wrote the code — so green means "nothing adversarial
happened", not "this does what was asked". And the fastest route from a red check to a green one is
to edit the check. Hence: a reviewer that cannot edit anything, gates evaluated from the protected
base rather than this prose, and a higher automated evidence bar on the things the platform exists
to guarantee.

**Terminal states:** `Success` (at least one PR merged or stale branch updated) · `No-op` (no open
PRs, or every one is waiting on a check that has not finished) ·
`Blocked` (`gh` unauthenticated, protection absent, required-check policy unreadable, or a named
gate cannot be evaluated) · `Approval-required` (the owner recorded autonomy level 0 or placed an
explicit human hold) · `Stalled` (the same PR failed three times for three different reasons — the
diagnosis is wrong, not the gate).

## When to Use

- Under a timer: `/loop 30m /plenipo:ship`, alongside a `deliver` loop.
- Open PRs are at the `maxOpenPRs` ceiling and the build loop is reporting back-pressure.
- Before you go to bed, to clear what today produced.

## Stop Signals

- **The PR needs code changes** → that is `../deliver/SKILL.md` rule 1. This verb never edits code.
- **The repo has no branch protection or required checks** → `../setup/SKILL.md` first. The merger
  reads GitHub's required PR contexts and fails `checks_exist` when none report; an unprotected repo
  therefore blocks rather than passing vacuously.
- **You are in the Plenipo platform repo** (`workflow.json` → `stage: platform`) →
  `../steward/SKILL.md`. Platform merges need `consumers_green` on top of every gate here, and this
  verb cannot evaluate it.
- **You want the policy rationale** → `/deliver:work-next-issue`'s `merge-policy` reference argues
  who may merge and what GitHub can actually gate. This skill implements it.

## Inputs

| Input | Where it comes from | Used for |
|---|---|---|
| Every gate's verdict | `node .github/scripts/merge-gate.mjs` | what may merge, and why not |
| Autonomy level (0–3) | `workflow.json` → `autonomy.level` — **read it, never infer it**; the script reads the same field | which change classes may merge |
| Merge cap per tick | `workflow.json` → `autonomy.maxMergesPerTick` (default 2) | blast-radius limit |
| The PR under review | `gh pr view <n> --json title,body,files` + `gh pr diff <n>` | what the independent reviewer reads |
| The issue's acceptance criteria | the issue the body says it closes | the yardstick the review grades against |

## The gates

**You do not evaluate these yourself.** They are two node scripts that `../setup/SKILL.md` installed
into the repo, and running them is the whole of steps 2 and 4 below. That is deliberate: a gate
written as prose is a gate an agent can reason its way around, and the agent doing the reasoning
here is the one that wants the PR merged.

| Where | Script | Gates |
|---|---|---|
| CI, as a **required status check** | `.github/scripts/pr-gates.mjs` | `closes_an_issue` · `protected_diff_detected` · `has_runtime_evidence` · `has_red_before_green` |
| this tick, and a scheduled workflow | `.github/scripts/merge-gate.mjs` | `trusted_source` · `is_loop_pr` · `not_draft` · `checks_exist` · `checks_green` · `mergeable` · `no_blocking_review` · `trusted_pr_gates` for control changes · `no_human_hold` · `level_permits` · `under_cap` |

The split is not arbitrary. The first four are assertions about the **body and the diff**, so they
must run where they cannot be skipped — as a check on every push, including a human's. The rest are
assertions about the **world right now** (is required CI green, is a hold set, is the PR
mergeable), so they are re-read at merge time rather than trusted from an earlier event.

Two consequences worth internalizing:

- **`checks_green` normally subsumes the first four.** If `pr-gates` is a required check, a green
  rollup means the evidence and spine gates passed. A control-plane PR can change its own workflow
  wrapper, so the merger also downloads and executes `pr-gates.mjs` from the protected base before
  merging it. If the check is not required, `checks_green` is weaker than it looks — which is why
  `checks_exist` refuses to merge a repo with no required CI at all.
- **`protected_diff_detected` is content-based, not path-based.** *Adding* a `HasQueryFilter` line is
  ordinary feature work; *deleting or editing* one is a tenant-isolation change. A path rule would
  either block every migration or catch nothing.

### What each level may merge

| Level | May merge | Requires |
|---|---|---|
| **0** | nothing — report only | the default for any repo without a runbook |
| **1** | docs, `RUNBOOK.md`, test-only additions, a green version bump | every deterministic gate |
| **2** | product features | every deterministic gate |
| **3** | as level 2, unattended, inside a revert budget | all gates, plus a clean level-2 stretch |

Anything the protected-diff scan catches must carry substantive runtime and red-before-green
evidence, then pass the evaluator downloaded from the protected base. A PR can propose the next
policy, but it cannot use that proposal to judge itself.

**Never in this verb:** anything in the platform repo. Not because a platform change can never
merge — `../steward/SKILL.md` merges them — but because this verb stops at preflight on
`stage: platform` and never reaches the gates. The two that make a platform merge defensible,
`consumers_green` and `surface_declared`, are in the same `merge-gate.mjs` you run here; the script
switches them on by reading `stage` itself, so they are never something this verb decides to skip.

## Workflow

1. **Preflight.** Read `workflow.json` → `stage` **first**: if it is `platform`, stop as `No-op` and
   name `../steward/SKILL.md` — do not proceed to check anything else, and do not report a missing
   product artifact as the reason. Then `gh auth status` green · branch protection exists on the
   default branch (`gh api repos/{owner}/{repo}/rulesets` or `.../branches/<default>/protection`) ·
   read `autonomy.level` from `workflow.json`. No protection, or no recorded level → `Blocked`, and
   point at `../setup/SKILL.md`. An unrecorded level is **0**; never infer a higher one from how well
   the loop has been doing.

2. **Run the gate script in dry-run — it is free, and it decides what deserves a review.** It lists
   every open PR and evaluates each gate. Required contexts come from `gh pr checks --required`, not
   the Administration-only branch-protection REST endpoint and not every optional check in the
   rollup.

   ```bash
   node .github/scripts/merge-gate.mjs
   ```

   It prints `READY` / `STALE` / `BLOCK` per PR with every failed gate accumulated. A queue full of
   PRs waiting on CI exits 0; inability to read the required-check policy exits non-zero because a
   merger that cannot evaluate its contract is broken infrastructure. For anything
   blocked, comment the reasons once — **edit your previous gate comment rather than adding
   another**, or a PR that waits two days collects a hundred identical comments.

   `STALE` means the PR clears every gate but is behind the base branch; step 3 updates it rather
   than merging it. `BLOCK` always names a deterministic repair or explicit hold; there is no
   implicit wait for a positive label.

   The run ends with a warning naming any PR blocked for two days or more. **Treat that as the
   output, not as decoration.** This script exits 0 whatever it finds, so a frozen queue and a
   fully drained one produce the same green checkmark on the schedule; that line is the only thing
   distinguishing them, and a fleet once ran this cron successfully every fifteen minutes for weeks
   while merging nothing at all. Policy-read failures now make that schedule red.

3. **Merge by re-running the script with `--merge`.** It re-evaluates every gate before touching
   anything — no earlier report exempts it from a check that turned red in between
   — merges lowest PR number first so dependencies land in build order, squashes, deletes the
   branch, and stops at `maxMergesPerTick`:

   ```bash
   node .github/scripts/merge-gate.mjs --merge
   ```

   The same run also updates any `STALE` branch — a PR that passes everything but has fallen behind
   the base — and deliberately does **not** merge it in that tick. The update writes a new head
   commit, so the checks that just passed refer to a base that no longer exists; the next tick
   merges it once they have re-run green. A `ship` run reporting only `UPDATE` lines is `Success`,
   not `No-op`: it moved the queue.

   Then confirm each issue closed and its card moved to `Done`; `Closes #<n>` does both, but verify
   rather than assuming — a board that lies is worse than an empty one. **Never merge with a bare
   `gh pr merge`**: that path skips every gate above, and it is the one action in this plugin with
   no undo.

4. **Respect the recorded boundary.** A PR that passed every other gate but is above the repo's
   configured level is `Approval-required` because the owner explicitly chose that policy; leave it
   without inventing a verdict label. Do not raise the level to unblock yourself — an agent deciding
   it has earned autonomy is the self-approving loop wearing a different hat.

5. **Journal the tick** in `TICKS.md`:

   ```text
   2026-07-29T23:02Z · ship · 3 open · #131 merged · #132 changes-requested · #133 checks_green
   ```

6. **Report**: what merged, what was blocked and by which named gates, and which agent repair route
   owns each actionable blocker.
   Cite the level of every claim — the gates are L1/L2, the review is **L4**.

## Guardrails

- **Review never merges.** The deterministic merger independently rechecks required CI,
  mergeability, holds and policy; optional model comments grant no authority.
- **Never edit a gate to let a PR through.** The gates are the frozen yardstick; loosening one
  while holding a PR you want merged is specification gaming with extra steps.
- **Never approve or merge code written in this same context.** Different session, or no merge.
- **Never merge past failed required checks**, and never merge more than the cap in one tick.
- **Never touch a PR a human opened**, or one carrying `human-hold`.
- **Never raise the autonomy level, and never write it.** A human records it in `workflow.json`.
- **Spine changes keep the higher bar, always.** Protected-diff evidence, protected-base evaluation,
  and every required check; never an exemption issued by the maker context.
- **Platform changes are never this verb's.** Hand them to `../steward/SKILL.md`, which owns the
  conformance gate; do not merge one here because every gate you *can* see happens to be green.
- **Never hand-evaluate a gate the script owns.** Paste its output. The moment you start deciding
  for yourself whether a check "basically passed", the gate is gone.
- **Report gate names, not vibes.** "Blocked by `checks_green` and `has_runtime_evidence`" is
  actionable; "looks risky" is not.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Reviewing in the session that wrote the code | the grade drifts up while quality stalls | a fresh context, or the Sonnet 5 `plenipo:pr-reviewer` agent only |
| Relying on GitHub's own AI review as the gate | provider availability becomes merge availability, and since September 2026 Copilot code review can be switched to submit counting approvals — a model satisfying a human gate | keep review optional and comment-only, leave the approval setting off, and let deterministic checks decide |
| Enabling GitHub auto-merge as well | auto-merge waits only for configured conditions, so a PR can merge while review is still running | never pair them; this tick is the only merger |
| Ignoring `checks_exist` on a repo with no CI | green means nothing and every gate below it is vacuous | no checks, no merge |
| Path-based spine rules | blocks every migration, or catches nothing | protected content plus control paths decide when evidence is mandatory |
| Merging newest PR first | a dependency lands after the thing that needs it | lowest issue number first |
| One reason per comment | a whole tick burned per blocking reason | accumulate all failures, comment once |
| Inferring the autonomy level from a good streak | the loop grants itself permission it was never given | read it; absent means 0 |

## Related skills

- `../setup/SKILL.md` — installs branch protection, the required deterministic checks, the labels,
  and `CODEOWNERS` that both gate scripts depend on. **Load when:** preflight finds no protection.
- `../deliver/SKILL.md` — fixes what this rejects; its rule 1 is the other half of this loop.
- `../steward/SKILL.md` — the same job for the platform repo, plus the `consumers_green` gate.
  **Load when:** preflight finds `stage: platform`.
- `/deliver:work-next-issue` — writes the PR body this reads, and its `merge-policy` reference is
  the argument behind these gates. **Load when:** a PR body lacks the sections `pr-gates.mjs`
  requires.
- `agent-protocol` — the envelope gate 1 looks for, and the label vocabulary used throughout.
- `loop-discipline` — the self-approving-loop and specification-gaming anti-patterns this verb is
  shaped by. **Load when:** tempted to loosen a gate.
