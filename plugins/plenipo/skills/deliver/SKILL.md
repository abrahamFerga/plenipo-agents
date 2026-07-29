---
name: deliver
description: >
  One build tick, safe to fire on a timer: decide whether building is even the right move right now
  — a rejected PR to fix first, a p0 bug ahead of features, or too many PRs already waiting on review
  — then hand the chosen item to the build loop and journal the tick so a repeated timer cannot spin
  invisibly. Admission control and stagnation detection around `/deliver:work-next-issue`, which
  still owns the branch → code → runtime proof → PR procedure.
  USE FOR: `/loop 20m /plenipo:deliver`, a single unattended build tick, resuming after a PR merged.
  DO NOT USE FOR: the implementation procedure itself (`/deliver:work-next-issue`), reviewing or
  merging what a tick produced (`../ship/SKILL.md`), or filling an empty board (`../define/SKILL.md`).
license: MIT
---

# One build tick

`/deliver:work-next-issue` knows how to turn an issue into a pull request. It does **not** know
whether it should run at all — and on a timer that is the only question that matters. Fired blind
every twenty minutes it will happily open a fourth pull request while three sit unreviewed, or
rebuild the same issue after a failed attempt, or produce conversation for an hour with nothing on
the board moving.

This verb is that judgement and nothing else: **what deserves this tick, is there room for it, and
did the last tick actually accomplish anything.** Then it hands off and gets out of the way.

**Terminal states:**

| State | Here it means |
|---|---|
| `Success` | one item advanced — a PR opened, or a rejected PR fixed and pushed |
| `No-op` | nothing to do, and that is correct: nothing Ready, or review is the constraint |
| `Blocked` | Docker down, `gh` unauthenticated, dirty tree, or no `RUNBOOK.md` to prove against |
| `Stalled` | two consecutive ticks moved nothing — stop the timer, the diagnosis is wrong |
| `Exhausted` | the tick budget ran out mid-implementation; the branch is pushed, no PR opened |
| `Approval-required` | the chosen item needs a human decision before code can be written |

## When to Use

- Under a timer: `/loop 20m /plenipo:deliver` — the everyday driver for one product.
- Once, manually, to advance the board by exactly one item.
- Right after a merge, to pick up the next thing.

## Stop Signals

- **The board is empty or nothing is Ready** → `../define/SKILL.md`. Do not promote your own cards.
- **Open PRs are piling up** → that is this skill reporting `No-op`; run `../ship/SKILL.md`
  instead.
- **The repo has no runbook or board yet** → `../setup/SKILL.md`, once.
- **You want the implementation detail** → `/deliver:work-next-issue` owns it. Do not restate it.

## Inputs

| Input | Where it comes from | Used for |
|---|---|---|
| Owner / repo / project | `workflow.json` → `github`, else `gh repo view`, else `gh api user` | every query — **never hardcode an owner** |
| Open PRs and their labels | `gh pr list --state open --json number,labels,headRefName` | admission control, and finding rejected work |
| Board items and columns | `gh project item-list` | what is Ready, what is In Progress |
| Bug issues | `gh issue list --label type:bug --state open` | p0 bugs preempt features |
| Ceilings | `workflow.json` → `autonomy.maxOpenPRs` (default 3) | the back-pressure limit |
| Last tick's outcome | `TICKS.md` at the repo root | stagnation detection |

## Workflow

1. **Preflight.** `gh auth status` exits 0 · Docker is running · the working tree is clean ·
   `RUNBOOK.md` exists. Any failure is `Blocked` — name which one and stop. Do not "fix" a dirty
   tree by committing or stashing someone else's work.

2. **Read the last two ticks** from `TICKS.md`. If the previous two both ended `No-op` or `Success`
   with **no card movement and no commit**, stop as `Stalled` and say so in the journal. A timer
   pointed at a stalled loop is the runaway anti-pattern, and it is expensive precisely because it
   looks like work.

3. **Pick what deserves the tick**, in this order. The first match wins; say which rule fired.

   | Priority | Condition | Action |
   |---|---|---|
   | 1 | an open PR labelled `agent:changes-requested` | fix that PR — it is closer to done than anything else, and an unaddressed rejection blocks the merge queue |
   | 2 | a card `In Progress` with no PR | resume it; never start a second item |
   | 3 | an open `type:bug` issue at `priority:p0` | a shipped defect outranks new scope |
   | 4 | `Ready` cards exist and open PRs < `maxOpenPRs` | take the top one by Build order |
   | 5 | otherwise | `No-op`, with the reason |

4. **Check the back-pressure ceiling before rule 4.** If open PRs ≥ `maxOpenPRs`, report `No-op`
   with *"review is the constraint, not build capacity"* and name the waiting PRs. This is the
   single most important line in the skill: an unattended builder with no ceiling converts a review
   backlog into an unreviewable one, and every extra branch makes the next rebase worse.

5. **Hand off.** Invoke `/deliver:work-next-issue` and let it own the whole procedure — branch, implement,
   climb the ladder, prove at runtime, open the PR, move the card to In Review. Pass it the issue
   number you selected. **Do not re-perform any of its steps here**, and do not summarize its
   procedure into this tick; one source per procedure.

   For rule 1 (a rejected PR), instead: check out the branch, read the reviewer's comments, make the
   smallest change that answers each one, re-run the checks the review named, push, and reply on the
   PR pointing at the commit that answers each comment. Then remove `agent:changes-requested` so
   `../ship/SKILL.md` re-evaluates it.

6. **Journal the tick.** Append one line to `TICKS.md`:

   ```text
   2026-07-29T22:14Z · deliver · rule 4 · #128 · Success · PR #131 opened · L1 build+tests, L3 e2e
   ```

   That file is the loop's memory. The conversation is not: compaction erases it, and the next tick
   is usually a fresh session.

7. **Report the terminal state** and, if `No-op` or `Blocked`, the single next action a human or
   another verb should take.

## Guardrails

- **Never open a PR past the ceiling.** Back-pressure is the feature.
- **Never merge anything.** The maker is not the approver; merging is `../ship/SKILL.md`, which
  runs in a different context on purpose.
- **Never promote a card from `Backlog` to `Ready`.** That is a shape decision —
  `../define/SKILL.md`.
- **One item in flight.** If two cards are In Progress the invariant is already broken: report it,
  do not silently pick one.
- **Never restate the build procedure.** If this file starts describing how to write a module,
  delete that text — it is drifting from `/deliver:work-next-issue`, and the drift is invisible
  until it produces wrong work.
- **Read the owner, never hardcode it.**
- **A tick that ends `No-op` is a good tick.** Manufacturing work to look productive is the failure
  this ordering exists to prevent.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Firing on a timer with no ceiling | ten open PRs nobody reviewed, all conflicting | `maxOpenPRs`, then `No-op` |
| Ignoring `agent:changes-requested` | rejected work rots while new work piles on top | rule 1 outranks everything |
| Building a feature while a p0 bug is open | shipping scope onto a broken product | rule 3 |
| No journal | the loop cannot tell a stalled night from a productive one | append to `TICKS.md` every tick |
| Summarizing the build procedure here | two sources for one job, executed at half fidelity | hand off by name |
| Treating `No-op` as failure and forcing work | invented scope, and a board that stops meaning anything | report it and stop |

## Related skills

- `/deliver:work-next-issue` — the procedure this tick delegates to. **Load when:** step 5.
- `../ship/SKILL.md` — reviews and merges what this produces. **Load when:** PRs are piling up.
- `../define/SKILL.md` — refills the board this drains. **Load when:** nothing is Ready.
- `../test/SKILL.md` — files the bug issues rule 3 prioritizes.
- `loop-discipline` — the ladder and the terminal states named above.
