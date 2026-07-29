---
name: loop-discipline
description: >
  The operating rules every loop in this marketplace runs under: the five-level verification ladder
  (deterministic → rule → field truth → model-as-judge → human), the six named terminal states, the
  five loop anti-patterns, and the design families that keep an unattended loop honest. Reach for it
  before claiming something is done, when a loop is spinning, or when deciding how far to verify.
  USE FOR: grading how strong your evidence actually is, choosing a stopping rule, naming why a loop
  ended, calling out a self-approving or runaway loop. DO NOT USE FOR: how to run or test a Plenipo
  product specifically (plenipo-runbook) or what the platform provides (plenipo-platform).
license: MIT
---

# Loop discipline

A loop is not a `while` statement. It is a **bounded, reusable artifact** you hand to an agent so it
pursues a goal on its own, in place of step-by-step prompting. Every loop declares six things:

**Trigger · Goal · Execution · Verification · Stopping rule · Memory**

If you cannot name all six for what you are about to do, you are not running a loop — you are
improvising, and it will not terminate cleanly.

## The verification ladder

Grade every claim of "done". **Know which level you are actually on, and say so.**

| Level | Name | What it is | Examples here |
|---|---|---|---|
| **L1** | Deterministic | an assertion, an exit code, a golden output | `dotnet build`, `dotnet test`, the AG-UI event sequence, this repo's `validate-marketplace.mjs` |
| **L2** | Rule / constraint | a linter, a schema, a policy | markdownlint, config validation, a guardrail checklist, `/api/admin/security/catalog` listing a tool |
| **L3** | Delayed field truth | true, but slow | the Testcontainers E2E suite, a deploy, a real user |
| **L4** | Model as judge | **the model's opinion, not field truth** | a rubric score, "I reviewed it and it looks right" |
| **L5** | Human checkpoint | supervision — not automated verification at all | a person approving |

**Zones.** L1–L2 is the *autonomous zone*: checks that run now, on their own. L1–L3 is the
*objective zone*: grounded in reality. L4–L5 is *assisted flow* — a model or human standing in for a
check, which is **not verification**.

Three rules follow:

1. **Prefer the lowest level that can decide the question.** A deterministic check beats any amount
   of careful reading.
2. **Never report an L4 conclusion with L1 confidence.** Say "I read it and it looks right" rather
   than implying something ran.
3. **Prove the verifier.** A regression test must be seen **red before the fix and green after**. A
   test never seen red is not a regression test — it may be asserting nothing.

## Terminal states

Every loop ends in exactly one **named** state. Only the first is success:

| State | Meaning |
|---|---|
| `Success` | the goal was met and verified |
| `No-op` | there was correctly nothing to do |
| `Blocked` | cannot proceed — a missing credential, an absent file, an unanswerable question |
| `Stalled` | no progress detected; repeated failures, unchanged state |
| `Exhausted` | the budget ceiling was reached |
| `Approval-required` | a human must decide before continuing |

> **An error or an exhausted budget never counts as success.**

**Stagnation rule.** If the same step fails three times for three different reasons, you are
`Stalled` — the *diagnosis* is wrong, not the fix. Stop and escalate with everything gathered.
Retrying an identical action after an identical error is not learning; it is spinning.

**Escalate with evidence.** When handing off, carry the reproduction, the observations, and what was
ruled out. A bare "I couldn't do it" wastes the whole run.

## The five anti-patterns

| Anti-pattern | What it looks like | The guard |
|---|---|---|
| **While-True Around a Stranger** | unbounded retry, no named skills, no real check | call sharp, named, tested procedures; ground every turn in an observation |
| **Self-Approving Loop** | the same agent produces and grades; the grade drifts up while quality stalls | separate maker from checker; prefer any L1/L2 check over a judge |
| **Specification Gaming** | optimizes the letter of the check — edits the test instead of the code | the verifier is never the thing being edited; prove it catches the bug |
| **Pretending L4 is L1** | reports the confidence of a deterministic check while relying on opinion | state the true ladder level |
| **Unattended Runaway** | no stopping rule, no stagnation detector, no budget ceiling | named terminal states; human approval for anything irreversible |

**Watch for test-bending most of all.** Visible-test overfitting is the most common reward hack
observed in the field *and* it actively lowers true resolution rates. Making a red test green by
weakening the test is the failure mode this repo is most exposed to, because golden evals and
integration tests are exactly the kind of thing that can be bent instead of satisfied.

## Design families

**A — Define "done" first.** Score against a frozen yardstick — the same check, the same conditions,
every turn. Name the terminal states before starting. A model's unaided judgment that it has
finished is not a dependable signal.

**B — Act without breaking.** Change one thing per turn and re-run the checks. Fix the worst item
first. Keep the edit surgically scoped. Start each turn from a clean state. When exactly one
variable moves, the check actually attributes the outcome.

**C — Earn trust in the result.** The maker is not the approver. Judge on a fresh hold-out, not the
set you edited against. Tie every claim to evidence, with no silent gaps.

**D — Sustain the loop over time.** Persist progress, decisions, and objections **in a file** — the
model forgets everything between runs, and context compaction silently erases constraints that live
only in the transcript. Enumerate the whole surface before acting. Gate irreversible actions behind
explicit human approval.

## Before building a loop, answer five questions

1. Can the result be verified automatically? *(If no — it is not loopable.)*
2. Does the task actually improve with iteration?
3. What exactly does "done" mean?
4. When must it give up?
5. Are the actions safe to repeat?

A goal that is pure judgment — taste, strategy, what the user "really wants" — is not loopable at
all. Use a prompt and a human.

## Phased autonomy

Trust is earned in three steps, each earning the next:

1. **Report-only** — say what you *would* do.
2. **Assisted** — make changes a human approves.
3. **Unattended** — run inside a budget, with named terminal states.

Do not start at three.

## The metric

**Cost per accepted change** — spend divided by changes that survived verification. Not tokens
spent, not tasks attempted, not tests passing. Benchmarks flatter agents; PRs that pass them merge
at a substantially lower rate than the benchmark implies. Only what survived counts.

---

> **Build the loop. Stay the engineer.**

## Related skills

- `plenipo-runbook` — the Plenipo-specific test ladder, mapped onto the levels above.
- `plenipo-platform` — the invariants the platform already enforces for you.
