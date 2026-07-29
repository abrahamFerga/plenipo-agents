---
name: revise-pr
description: >
  Close the loop on a pull request that came back — review comments, requested changes, a failing
  check, or a merge conflict. Reads every thread, classifies each point as must-fix, discuss, or
  out-of-scope, fixes what it accepts, re-proves it at runtime, and replies to every thread so the
  reviewer can see what happened without re-reading the diff.
  USE FOR: a PR with unresolved review threads, CHANGES_REQUESTED, red checks, or a conflict.
  DO NOT USE FOR: starting the next backlog item (../work-next-issue/SKILL.md) or the first-pass
  verification of a change you just wrote (../verify-runtime/SKILL.md).
license: MIT
disable-model-invocation: true
---

# Revise a pull request

Opening a PR is not the end of a work item — it is the end of the *first pass*. This skill is what
happens when it comes back, and without it the build loop leaks: an agent opens a PR, declares
`Success`, and never learns that anyone objected.

**Terminal states.** `Success` — every thread resolved or answered, checks green, the PR re-requests
review · `No-op` — nothing to revise (no unresolved threads, checks green) · `Blocked` — the
feedback needs information you do not have · `Stalled` — three revision passes without converging;
the disagreement is about the *requirement*, not the code · `Approval-required` — a reviewer is
asking for something that changes scope, weakens an invariant, or contradicts the issue.

## When to Use

- A PR has unresolved review threads, or `CHANGES_REQUESTED`.
- A required check went red after the PR opened (a merge from `main`, a flaky test, a real break).
- The PR has a merge conflict.
- A reviewing agent left findings and nobody has acted on them.

## Stop Signals

- **The PR is approved and green** → nothing to do here; it is waiting on a merge.
- **You have not read the reviewer's actual words** → do that first. Acting on a summary of feedback
  is how a revision misses the point and burns a second round.
- **The disagreement is about what the feature should be** → that is the issue's scope, not the PR's
  code. `Approval-required`; take it back to the issue.

## Inputs

| Input | Where from | Used for |
|---|---|---|
| Review threads | `gh pr view <n> --json reviews,comments` and the GraphQL `reviewThreads` | what to answer |
| Review decision | `gh pr view <n> --json reviewDecision` | whether changes are formally requested |
| Check runs | `gh pr checks <n>` | what is red, and since when |
| The originating issue | the PR's `Closes #n` | the scope boundary |
| `RUNBOOK.md` | the product repo | how to re-prove the fix |

## Workflow

1. **Read everything before changing anything.** Every thread, in the reviewer's own words, plus the
   check output. Resist fixing the first comment you see — the third one often reframes the first.

2. **Classify each point.** Write the classification down; it becomes your replies.

   | Class | Meaning | Response |
   |---|---|---|
   | **must-fix** | a real defect, a missed requirement, a violated invariant | fix it |
   | **discuss** | a reasonable alternative, or the reviewer misread something | reply with the reasoning; change it if they are right |
   | **out-of-scope** | true, but not this issue's job | reply, and **file it** rather than absorbing it |
   | **scope change** | the reviewer wants different behaviour than the issue specified | `Approval-required` — do not quietly widen the PR |

   Scope creep in review is how a 200-line PR becomes 900 and stops being reviewable. Absorbing an
   out-of-scope request feels helpful and makes the change harder to judge.

3. **Fix the must-fix items — one at a time.** Each with its own commit, so a reviewer re-reading can
   follow what moved. Do **not** force-push over the reviewed history; the reviewer needs to see the
   delta, not a rewritten branch.

4. **Re-prove at runtime.** A revision is a change like any other: if it fixes a behaviour, add or
   adjust a test and watch it go red before it goes green. If the original PR's evidence no longer
   holds because the code moved, redo it — stale evidence in a PR body is worse than none.

5. **If a check is red, find out whether it is yours.** A check that broke after a merge from `main`
   is not necessarily your change. Say which it is; do not "fix" someone else's break inside your PR.

6. **Reply to every thread**, including the ones you did not act on. A silent thread reads as ignored
   and gets re-raised next round. Use the shared envelope so a reviewing agent can parse it:

   ```markdown
   <!-- plenipo-agent kind=handoff from=networthy ref=networthy#122 status=answered -->
   **must-fix** — fixed in `abc1234`. The filter now runs per entity; added a test that fails
   without it (L1, watched it red first).
   **out-of-scope** — agreed, but it is a different behaviour; filed as #131.
   **discuss** — kept as-is: the platform gates that write already, so a second check would be
   dead code. Source: `ToolInvocationMiddleware.cs:87`.
   ```

7. **Update the PR body** so it still describes what the PR now does — the evidence section
   especially. A reviewer should never have to reconstruct the current state from a comment thread.

8. **Re-request review** and leave the card in **In Review**. Do not move it, and do not merge.

9. **Count your passes.** Three rounds without converging means the disagreement is not about the
   code — stop and say so. Escalate with what each round changed and what the reviewer still wants.

## Guardrails

- **Never resolve a thread you did not address.** Resolving is a claim that it is handled.
- **Never force-push over reviewed commits.** The reviewer loses their place, and re-reviews from
  scratch or, worse, doesn't.
- **Never widen scope to satisfy a reviewer.** File it, link it, move on.
- **Never weaken a test or an assertion to turn a check green.** That is specification gaming, and it
  is the single most likely way this skill goes wrong: the fastest path from red to green is almost
  always to edit the check. If a pinned assertion must change, say so explicitly in the reply and
  explain why the *behaviour* legitimately changed.
- **Never merge**, however small the fix and however green the checks. The maker is not the approver.
- **Never argue a reviewer down without evidence.** Cite the file, the test, or the run.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Fixing comments in order without reading them all | rework, because a later comment changes the first | read everything, classify, then act |
| One commit fixing eight comments | the reviewer cannot tell what addressed what | one commit per point |
| Silently absorbing out-of-scope requests | the PR balloons and stops being reviewable | reply and file it |
| Editing an assertion to clear a red check | specification gaming | fix the code, or justify the assertion change in the open |
| Leaving threads unanswered | they come back next round | reply to every one, even "no change, because…" |
| Stale evidence in the PR body | reviewers trust a result that no longer holds | re-run and update it |
| Endless revision rounds | nobody notices the requirement is the problem | stop at three; escalate |

## Related skills

- `../work-next-issue/SKILL.md` — opened this PR; hands here when it comes back. **Load when:**
  starting the *next* item instead.
- `../verify-runtime/SKILL.md` — the loop for proving each fix. **Load when:** a revision changes
  behaviour.
- `agent-protocol` — the reply envelope and terminal-state vocabulary.
- [`../work-next-issue/references/merge-policy.md`](../work-next-issue/references/merge-policy.md) —
  who may merge once this is green.
