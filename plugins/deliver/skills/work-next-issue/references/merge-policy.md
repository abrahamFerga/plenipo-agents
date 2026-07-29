# Who merges, and what may be automated

The build loop ends at **In Review** with an open PR. That is deliberate, and this file is the
answer to the question it raises: who moves it to Done?

## The rule everything else follows

**The agent that wrote the change must never be the one that approves it.**

This is the *Self-Approving Loop* anti-pattern: the same model produces and grades, and the grade
drifts upward while quality stalls. It is not a hypothetical — the fastest route from a red check to
a green one is almost always to edit the check, and an agent that writes the code, writes the test,
and merges the PR has no adversary anywhere in that chain.

Auto-merge-on-green does exactly this. CI is an **L1 check on the tests that happen to exist**; it
cannot tell you the feature does what was asked, which is an **L5** judgement. Benchmark-passing PRs
have been measured merging at a **24.2 percentage-point lower rate** than the benchmark implied —
machine-green and human-acceptable are different things.

## Merge policy by blast radius

| Change class | Who merges | Gate |
|---|---|---|
| Docs, `RUNBOOK.md`, test-only additions, a green version bump | **auto-merge is fine** | required checks; the diff is the review |
| A product feature — module tool, tab, endpoint | agent reviews, **human approves** | required review + full test ladder |
| Any change to the platform | **human, always** | required review + consumer conformance |
| Anything touching RBAC, approvals, tenant isolation, audit, or secrets | **human, no exceptions** | `CODEOWNERS` on those paths |

The last row is the one that matters. Those five are the platform's entire value proposition, and a
product that can merge a change to them without a human has already lost the thing it was built on.

`CODEOWNERS` is the right mechanism because it is **deterministic and lives in the runtime**, not in
a prompt an agent may skim:

```text
# .github/CODEOWNERS
/src/**/Authorization/    @<owner>
/src/**/Approvals/        @<owner>
/src/**/Persistence/      @<owner>
```

## What GitHub can and cannot do for you

Verified July 2026 — check before relying on any of it, these move:

| Mechanism | Reality |
|---|---|
| **Copilot code review** | Leaves **comments only**. It never "Approves" or "Requests changes," so it **cannot satisfy a required-reviewers rule**. Useful as a second pair of eyes; useless as a gate |
| **Auto-merge + Copilot review together** | **Actively dangerous.** Auto-merge waits only for *explicitly configured* conditions, so the PR can merge while the review is still running. Do not pair them and assume the review gates anything |
| **Branch protection / rulesets** | The real gate. Required checks and required approving reviews, which only a human can give |
| **Merge queue** | Worth enabling on the **platform** repo — the serial shared resource. The queue re-tests batched changes before they land |
| **GitHub Agentic Workflows** (`gh-aw`) | Markdown workflows compiled into Actions, running on Copilot CLI / Claude / Codex / Gemini. **Read-only by default**, writes through preapproved "safe outputs." Public preview |

### Where an agentic workflow belongs

**Triage, not merging.** An event-driven agentic workflow on `issues.labeled: platform-request` that
clusters, verdicts, comments, and labels is an excellent fit — it is read-mostly, its only write is a
comment, and the queue is exactly the kind of thing nobody wants to poll by hand.

**Never grant one merge rights.** Its output is a verdict a human acts on. The moment an automated
agent can merge, every gate above becomes advisory.

Because it is in preview, do not make it load-bearing: the protocol must still work if you triage the
queue by hand.

## What the build loop must do

1. Open the PR with the runtime evidence, not just "tests pass" — the exact request exercised, the
   observed output, and the regression test seen red before the fix.
2. Move the card to **In Review** and stop. That is `Success` for this loop.
3. **Never enable auto-merge on a feature PR**, and never merge your own.
4. If the repo has no human available and the work is genuinely blocked on a merge, that is
   `Approval-required` — not `Success`, and not a reason to lower the gate.

A conductor draining a backlog will therefore accumulate open PRs. That is correct behaviour, not a
stall: the human review capacity is the real constraint, and hiding it behind auto-merge does not
create more of it.
