---
name: ship
description: >
  One review-and-merge tick: for every open pull request the loop produced, get an adversarial second
  opinion from the `pr-reviewer` agent — a context that never saw the code being written and is asked
  to refute it — then merge only what clears a fixed list of deterministic gates at or below the
  autonomy level this repo has actually earned. Nothing merges on an agent's opinion alone, and a
  diff that edits a query filter, an approval flag, a permission grant or CI itself always waits for
  a human.
  USE FOR: `/loop 30m /plenipo:ship`, clearing a review backlog, letting a product merge without you.
  DO NOT USE FOR: writing or fixing the code under review (`../deliver/SKILL.md`), installing the
  branch protection and CI gates this depends on (`../setup/SKILL.md`), or merging platform changes —
  those need a conformance run across every consumer, which is `../steward/SKILL.md`.
license: MIT
---

# One review-and-merge tick

This is the verb that takes you out of the loop, and it is the one most able to hurt you — so it is
built the other way round from the rest: **the agent's judgement is the weakest input, not the
strongest.** A merge happens when a fixed list of checks passes. The review can only ever *block*.

Two facts shape every rule below. CI green is an **L1 check on the tests that happen to exist**, and
those tests were written by the same loop that wrote the code — so green means "nothing adversarial
happened", not "this does what was asked". And the fastest route from a red check to a green one is
to edit the check. Hence: a reviewer that cannot edit anything, gates that live in the repo rather
than in this prose, and an unconditional human stop on the five things the platform exists to
guarantee.

**Terminal states:** `Success` (at least one PR merged, or at least one reviewed and correctly
blocked) · `No-op` (no open PRs, or every one is waiting on a check that has not finished) ·
`Blocked` (`gh` unauthenticated, no branch protection installed, or `main` is red — nothing merges
onto a broken default branch) · `Approval-required` (a PR passed every automated gate but this
repo's autonomy level, or the diff, requires a human) · `Stalled` (the same PR failed review three
times for three different reasons — the *issue* is the defect, not the code).

## When to Use

- Under a timer: `/loop 30m /plenipo:ship`, alongside a `deliver` loop.
- Open PRs are at the `maxOpenPRs` ceiling and the build loop is reporting back-pressure.
- Before you go to bed, to clear what today produced.

## Stop Signals

- **The PR needs code changes** → that is `../deliver/SKILL.md` rule 1. This verb never edits code.
- **The repo has no branch protection or required checks** → `../setup/SKILL.md` first. Every gate
  below that matters is *derived* from branch protection; on an unprotected repo they read nothing
  and pass vacuously.
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
| The PR under review | `gh pr view <n> --json title,body,files` + `gh pr diff <n>` | what the `pr-reviewer` agent reads |
| The issue's acceptance criteria | the issue the body says it closes | the yardstick the review grades against |

## The gates

**You do not evaluate these yourself.** They are two node scripts that `../setup/SKILL.md` installed
into the repo, and running them is the whole of steps 2 and 4 below. That is deliberate: a gate
written as prose is a gate an agent can reason its way around, and the agent doing the reasoning
here is the one that wants the PR merged.

| Where | Script | Gates |
|---|---|---|
| CI, as a **required status check** | `.github/scripts/pr-gates.mjs` | `closes_an_issue` · `has_runtime_evidence` · `has_red_before_green` · `spine_untouched` |
| this tick, and a scheduled workflow | `.github/scripts/merge-gate.mjs` | `is_loop_pr` · `not_draft` · `checks_exist` · `checks_green` · `mergeable` · `no_blocking_review` · `agent_approved` · `no_human_hold` · `main_is_green` · `level_permits` · `under_cap` |

The split is not arbitrary. The first four are assertions about the **body and the diff**, so they
must run where they cannot be skipped — as a check on every push, including a human's. The rest are
assertions about the **world right now** (is CI green, is a hold set, is `main` healthy), so they
are re-read at merge time rather than trusted from an earlier event.

Two consequences worth internalizing:

- **`checks_green` subsumes the first four.** If `pr-gates` is a required check, a green rollup
  already means the evidence and spine gates passed. If it is *not* required, `checks_green` is
  weaker than it looks — which is why `checks_exist` refuses to merge a repo with no CI at all.
- **`spine_untouched` is content-based, not path-based.** *Adding* a `HasQueryFilter` line is
  ordinary feature work; *deleting or editing* one is a tenant-isolation change. A path rule would
  either block every migration or catch nothing.

### What each level may merge

| Level | May merge | Requires |
|---|---|---|
| **0** | nothing — review and label only | the default for any repo without a runbook |
| **1** | docs, `RUNBOOK.md`, test-only additions, a green version bump | every gate except `agent_approved` |
| **2** | product features | all gates, including an `agent:approved` from the reviewer |
| **3** | as level 2, unattended, inside a revert budget | all gates, plus a clean level-2 stretch |

**Never at any level:** anything `spine_untouched` catches. That does not get safer as a product's
track record improves, because the cost of being wrong does not shrink.

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
   every open PR, evaluates each gate, and checks the default branch is healthy on the way (a red
   `main` blocks everything: merging onto a broken base multiplies one failure into N, and fixing it
   is a p0 `type:bug`, not a merge).

   ```bash
   node .github/scripts/merge-gate.mjs
   ```

   It prints `READY` / `BLOCK` per PR with every failed gate accumulated, and exits 0 either way (a
   queue full of PRs waiting on CI is a healthy queue, not a failed run). For anything blocked,
   comment the reasons once — **edit your previous gate comment rather than adding another**, or a
   PR that waits two days collects a hundred identical comments.

3. **Review what survives, and only that.** For each remaining PR with no `agent:approved` or
   `agent:changes-requested` label, delegate to the `pr-reviewer` agent with the PR number. It reads
   the diff, the issue's acceptance criteria, and the evidence in the body — never this conversation
   — and returns `approve`, `request-changes`, or `escalate` with reasons. Apply its verdict as a
   label and post its reasoning as a PR comment.

   **Never review a PR whose code you wrote in this same session.** If you are running `ship` in a
   context that also ran `deliver`, the review is worth nothing: the agent boundary is the only
   thing making maker ≠ checker true here. Start a fresh session, or let the timer do it.

4. **Merge by re-running the script with `--merge`.** It re-evaluates every gate before touching
   anything — the label you just applied does not exempt it from a check that turned red in between
   — merges lowest PR number first so dependencies land in build order, squashes, deletes the
   branch, and stops at `maxMergesPerTick`:

   ```bash
   node .github/scripts/merge-gate.mjs --merge
   ```

   Then confirm each issue closed and its card moved to `Done`; `Closes #<n>` does both, but verify
   rather than assuming — a board that lies is worse than an empty one. **Never merge with a bare
   `gh pr merge`**: that path skips every gate above, and it is the one action in this plugin with
   no undo.

5. **Escalate honestly.** A PR that passed every gate but is above the repo's level is
   `Approval-required`: label it `needs-human`, comment what a human is being asked to decide, and
   leave it. Do not raise the level to unblock yourself — an agent deciding it has earned autonomy
   is the self-approving loop wearing a different hat.

6. **Journal the tick** in `TICKS.md`:

   ```text
   2026-07-29T23:02Z · ship · 3 open · #131 merged · #132 changes-requested · #133 checks_green
   ```

7. **Report**: what merged, what was blocked and by which named gates, what needs a human and why.
   Cite the level of every claim — the gates are L1/L2, the review is **L4**.

## Guardrails

- **The review can only block.** An approval is a *necessary* condition for a feature merge, never
  a sufficient one. If you ever find yourself merging because the reviewer was enthusiastic, the
  design has been inverted.
- **Never edit a gate to let a PR through.** The gates are the frozen yardstick; loosening one
  while holding a PR you want merged is specification gaming with extra steps.
- **Never approve or merge code written in this same context.** Different session, or no merge.
- **Never merge onto a red default branch**, and never merge more than the cap in one tick.
- **Never touch a PR a human opened**, or one carrying `human-hold`.
- **Never raise the autonomy level, and never write it.** A human records it in `workflow.json`.
- **Spine changes are human, always.** Not configurable, not levelled.
- **Platform changes are never this verb's.** Hand them to `../steward/SKILL.md`, which owns the
  conformance gate; do not merge one here because every gate you *can* see happens to be green.
- **Never hand-evaluate a gate the script owns.** Paste its output. The moment you start deciding
  for yourself whether a check "basically passed", the gate is gone.
- **Report gate names, not vibes.** "Blocked by `checks_green` and `spine_untouched`" is
  actionable; "looks risky" is not.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Reviewing in the session that wrote the code | the grade drifts up while quality stalls | a fresh context, or the `pr-reviewer` agent only |
| Relying on GitHub's own AI review as the gate | it leaves comments and cannot Approve, so it satisfies no required-reviewers rule | it is a second pair of eyes; `agent_approved` is the label this skill sets, not a GitHub review |
| Enabling GitHub auto-merge as well | auto-merge waits only for configured conditions, so a PR can merge while review is still running | never pair them; this tick is the only merger |
| Ignoring `checks_exist` on a repo with no CI | green means nothing and every gate below it is vacuous | no checks, no merge |
| Path-based spine rules | blocks every migration, or catches nothing | `spine_untouched` is content-based |
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
