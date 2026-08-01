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

### `merge-pull-request` — what it can and cannot do

gh-aw ships a `merge-pull-request` safe output, and it is **far better gated than "let an agent
merge" sounds.** Verified against the handler source (`actions/setup/js/merge_pull_request.cjs`),
July 2026 — re-verify, it is marked experimental and its ADR is still Draft.

The agent never holds a merge token. It emits a structured request; a separate trusted job evaluates
**sixteen gates** and performs the merge only if every one passes. Gates are accumulated, not
short-circuited, so a blocked merge reports every reason at once.

**Three gates are hardcoded with no opt-out, and they are the ones that matter:**

| Gate | Blocks when |
|---|---|
| `target_branch_protected` | the base branch has branch protection |
| `target_branch_default` | the base branch is the repo's default branch |
| `target_branch_has_no_open_pr` | the base branch is not itself the head of another open PR |

Read those together: **it cannot merge into `main`, and it cannot merge into any protected branch.**
It is built for merging *intermediate* PRs in a stack — never the one that lands on your default
branch. The tool enforces the policy in this file by construction.

The rest are also on your side: `pr_is_draft`, `merge_conflicts`, `not_mergeable`,
`required_checks_missing` / `required_checks_failing` (derived from your branch protection),
`pending_reviewers`, `blocking_review_state` (fires on `CHANGES_REQUESTED` **and** `REVIEW_REQUIRED`),
and `unresolved_review_threads`. So a required review still blocks it — maker-checker survives.

Configurable narrowing: `required-labels` (all must be present), `required-title-prefix`,
`allowed-branches` (globs on the **head** ref), `max` (1–10), and `staged: true` to evaluate the
gates and preview the outcome **without merging** — use that first.

There is **no** merge-method restriction, **no** path/file filter, and **no** author filter. The
agent picks `merge`/`squash`/`rebase` itself, and `allowed-branches` does not constrain the base.

### Where an agentic workflow belongs

**Triage first.** An event-driven workflow on `issues.labeled: platform-request` that clusters,
verdicts, comments, and labels is the strongest fit — read-mostly, its only write is a comment, and
nobody wants to poll that queue by hand.

**Merging: yes, within its gates.** Given it physically cannot touch `main` or a protected branch,
`merge-pull-request` is a reasonable way to automate the low-risk tier and stacked intermediate
merges. The safety comes from the gates, not from the agent's judgement — which is the whole point.

**So protect your branches.** Every gate above that matters is *derived from branch protection*. On
an unprotected repo, `target_branch_protected` never fires and `required_checks_*` have nothing to
read. The policy in this file is only real if branch protection is real.

Because the feature is experimental, do not make it load-bearing: the protocol must still work if
you merge by hand.

## Earning autonomy — how the human comes out of the loop

"A human approves every feature" is the **starting** position, not the destination. At several
products in parallel it makes one person the serializing resource for all of them, which defeats the
point. But the way out is a **stronger verifier**, never a bigger batch.

### Why bigger batches are the wrong escape

Shipping in large chunks instead of PRs does not remove review — it **defers and enlarges** it, and
it costs the agent three things it needs even with no human present:

- **Attribution.** "Change one thing per turn and re-run the checks" exists so a red check points at
  a cause. In a large chunk something breaks and nothing says which change did it.
- **The place checks run.** The PR is where CI, conformance, and the diff live. No PR means the first
  verification happens after the code is already on `main`.
- **Comprehension debt.** The faster a loop ships code nobody read, the wider the gap between what
  exists and what anyone understands.

### What makes an automatic merge legitimate

Auto-merge is unsafe by default because the agent that wrote the code also wrote the tests that gate
it. Green then means only that nothing adversarial happened. Replace that, and the human is out of
the loop honestly:

1. **A separate reviewing agent** — different context, prompted to *refute* rather than confirm, able
   to block. Maker ≠ checker is the structural fix, not a nicety.
2. **Red-before-green evidence in the PR body** — the regression test run against the *unfixed* code
   and observed failing. That is the difference between a test and a decoration.
3. **The consumer conformance gate**, for anything touching the platform.
4. **Cheap revert** — merge queue, green `main`, a rollback path. Autonomy is affordable exactly when
   mistakes are cheap to undo.

### The asymmetry that buys most of it

A bad **product** merge hurts one product. A bad **platform** merge hurts every product built on it.

| | Autonomy |
|---|---|
| Products (many, parallel) | can run **fully unattended** once earned |
| Platform (one, serial) | human on every merge — but it is one change at a time, so it was never the bottleneck |
| The spine — RBAC, approvals, tenancy, audit, secrets | human, always |

So the human reviews one serial stream plus a thin slice of spine changes, not N parallel streams.

### The ratchet

Per product, graduating on artifacts that make green trustworthy — not on a promise:

| Level | May auto-merge | Entry requirement |
|---|---|---|
| **0** | nothing | default for a product with no runbook |
| **1** | docs, runbook, test-only changes | `RUNBOOK.md` installed and rungs 1–3 green |
| **2** | features, on an adversarial reviewer's approval | + golden evals present, + registered in the platform's `consumers.json` |
| **3** | unattended inside a revert budget | + level 2 clean over a stretch, and the owner said so in words |

Record the level in the product's `workflow.json`. **Never infer it** — an agent deciding it has
earned autonomy is the self-approving loop wearing a different hat.

**Spine changes never graduate.** They stay human at every level, because the cost of being wrong
does not shrink with the product's track record.

**Platform changes do not use this ladder at all.** The platform repo has no autonomy level; its
merges are gated on `consumers_green` — every repo in `consumers.json` rebuilt and retested against
the candidate — and a breaking public-surface change still needs a human. That is `/plenipo:steward`,
not this loop.

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
