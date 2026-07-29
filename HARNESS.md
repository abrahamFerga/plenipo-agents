# The harness

Why this repo is shaped the way it is, in the vocabulary of **harness engineering** and **loop
engineering**. Read this once; the skills assume it.

## The four layers, and which one this repo is

The field converged on a nested progression, each layer subsuming the one below:

| Layer | Governing question | Where it lives here |
|---|---|---|
| **Prompt engineering** | What words? | inside each `SKILL.md` body |
| **Context engineering** | What does it see this turn? | which artifacts a skill loads, progressive disclosure via `references/` |
| **Harness engineering** | What guides and sensors does it need? | this marketplace: the skills, the runbook, the validators, the guardrails |
| **Loop engineering** | What lets it run unsupervised? | the five named loops below, and the conductor that drives them |

The nesting rule matters more than the taxonomy: **a harness implements loops → each loop step
assembles context → context contains prompts.** Every layer inherits the weaknesses of the one
below it. *Loop engineering without clean context engineering is iteration theatre.*

The practical triage, when something is going wrong:

- Unreliable on a **single** task → fix the **context**.
- Reliable but misses **quality standards** → expand the **harness**.
- Needs to run **unattended** → introduce a **loop**.

### Inner vs. outer harness

The *inner* harness is what the model vendor ships. The *outer* harness is what you assemble:
configuration, routing, testing surfaces, situational guidelines, MCP servers, custom skills.
**The outer harness is the only part you control, and it is where the leverage is.**

That claim is measured, not rhetorical. Changing *only* the edit-tool format took one model from
6.7% to 68.3% on SWE-bench. Frontier models on that benchmark sit within a single point of each
other; harnesses on the *same* model swing more than nine. Removing 80% of an agent's tools beat
every model upgrade available. Roughly two thirds of enterprise agent failures trace to
harness-level defects rather than model reasoning.

**This repo is the outer harness for building products on Plenipo.**

## The recursion: Plenipo is a harness too

This is the load-bearing idea, and it is why the two disciplines fit this platform so unusually well.

Plenipo is a harness for the *end user's* agent. `plenipo-agents` is a harness for the *developer's*
agent. They are the same discipline at two altitudes, and the platform already implements — in
production, for real users — the exact controls the harness literature prescribes:

| Harness-engineering concept | Plenipo's implementation |
|---|---|
| **Skill–Execution Authority Separation** — capability mention never grants permission | the runner filters tools by the caller's permissions **before** building the model request; the LLM never sees a tool you may not call |
| **Governance layer** — permissions, identities, approvals, audit | dotted permission strings with wildcards, runtime-editable role baselines, append-only audit database |
| **Human checkpoint (verification ladder L5)** | `RequiresApproval = true` — every state-changing tool parks for a human |
| **Progressive disclosure / descriptor-and-body** | manifest-first modules: tools, tabs, roles and instructions are declared statically, read before any module code runs |
| **Observability layer** | OpenTelemetry through ServiceDefaults, the Aspire dashboard, token-usage accounting per tenant |
| **Narrowing, never granting** | agent profiles and tool selections can only shrink what RBAC already allows |
| **HITL streaming protocol** | AG-UI — the open protocol the harness literature names for exactly this |
| **Trust zones / blast radius** | tenant isolation by EF Core global query filter; write-only secrets; keyless-by-default dev and CI |

So when a skill in this repo tells you *"don't rebuild the permission check"*, it is not only saying
the platform has one. It is saying the platform has the **governance layer of a well-built harness**,
and hand-rolling a weaker one inside a module is the single most expensive mistake available here.

## The five loops

A loop is not a `while` statement. It is a **bounded, reusable artifact** you hand to an agent so it
pursues a goal on its own, in place of step-by-step prompting. Every loop in this repo declares the
same six parts:

**Trigger · Goal · Execution · Verification · Stopping rule · Memory**

| Loop | Plugin | Goal | Primary verifier | Memory |
|---|---|---|---|---|
| **Discovery** | `scout` | an unclaimed industry worth a product, with a defensible reason | L2 coverage rules + L4 judged platform-fit rubric | `FLEET.md`, `opportunities/` |
| **Definition** | `define` | a spec and plan a team could build against | L2 structural completeness + L5 human accepts | `SPEC.md`, `PLAN.md`, GitHub issues |
| **Design** | `shape` | every shape decision made once, and justified | L2 guardrail conformance + L5 | `ARCH.md`, `DECISIONS.md` |
| **Build** | `deliver` | one Ready issue → a merged PR | L1 build + tests, L3 E2E | the board, the branch, the PR |
| **Verification** | `deliver` | the change provably works at runtime | L1 red-before / green-after | the regression test itself |

### The verification ladder

Every claim this repo makes about "done" is graded on the same five-level ladder. **Know which level
you are actually on, and say so.**

| Level | Name | Example here |
|---|---|---|
| **L1** | Deterministic | `dotnet build`, `dotnet test`, an exit code, a golden AG-UI event sequence |
| **L2** | Rule / constraint | a linter, `workflow.json` validation, the guardrail checklist, `/api/admin/security/catalog` listing a tool |
| **L3** | Delayed field truth | the Testcontainers E2E suite, a deploy, a real user — true but slow |
| **L4** | Model as judge | a rubric score. **The model's opinion, not field truth** |
| **L5** | Human checkpoint | supervision. Not automated verification at all |

**Zones:** L1–L2 is the *autonomous zone* — checks that run now, on their own. L1–L3 is the
*objective zone* — grounded in reality. L4–L5 is *assisted flow*: a model or human standing in for a
check, which is **not verification**.

Two rules that follow, and are not negotiable:

- **Never report an L4 conclusion with L1 confidence.** "I reviewed it and it looks right" is level
  four. Say so.
- **Prove the verifier.** A regression test must be seen **red before the fix and green after**. A
  test never seen red is not a regression test.

### Terminal states

A loop ends in exactly one **named** state. Only the first is success:

`Success` · `No-op` · `Blocked` · `Stalled` · `Exhausted` · `Approval-required`

> **An error or an exhausted budget never counts as success.**

In the field, only about three quarters of real loops name their terminal states — meaning a quarter
of them cannot tell failure from completion. Every skill here names its own.

## The five anti-patterns

Named, so they can be called out in review:

| Anti-pattern | What it looks like | The guard |
|---|---|---|
| **While-True Around a Stranger** | raw model in unbounded retry, no named skills, no real check | call sharp, tested, named skills; ground every turn |
| **Self-Approving Loop** | the same model produces and grades; the grade drifts up while quality stalls | separate maker from checker; prefer an L1/L2 check over any judge |
| **Specification Gaming** | optimizes the letter of the check — edits the test instead of the code | the verifier is never the thing being edited; prove it catches the bug |
| **Pretending L4 is L1** | reports the confidence of a deterministic check while relying on model opinion | state the true ladder level |
| **Unattended Runaway** | no stopping rule, no stagnation detector, no budget ceiling | named terminal states, no-progress detection, human approval for anything irreversible |

Visible-test overfitting is the most common reward hack in the wild (~30% of trajectories) *and* it
actively **lowers** true resolution rates. It is the one to watch for here, because a golden eval or
an integration test is exactly the kind of thing an agent can bend instead of satisfy.

## Design principles the skills enforce

Four families, drawn from the corpus of real loops, restated for this repo:

**A — Define "done" first.** Score against a frozen yardstick. Name the terminal states. Stop on
stagnation or budget, never on an invented count. A model's unaided judgment that it has finished is
not a dependable signal.

**B — Act without breaking.** Change one thing per turn and re-run the checks. Fix the worst item
first. Keep the edit surgically scoped. Start each turn from a clean state. When exactly one variable
moves, the check actually attributes the outcome.

**C — Earn trust in the result.** The maker is not the approver. Judge on a fresh hold-out, not the
set you edited against. Tie every claim to evidence, with no silent gaps. Prove the verifier itself.

**D — Sustain the loop over time.** Persist progress, decisions, and objections in a file — not in
the conversation. Enumerate the whole surface before acting. Gate irreversible actions behind
explicit human approval.

## Context discipline

Memory lives **on disk**, not in the window. The model forgets everything between runs.

- **Guardrails go in `CLAUDE.md`, never in a conversational turn.** Context compaction silently
  erases safety constraints that live only in the transcript — a documented failure mode called
  *governance decay*. Anything that must survive compaction lives in a file that is re-read.
- **Progressive disclosure by construction.** A skill's `description` is ~100 tokens and is all that
  loads at startup; the body loads on activation; `references/` load only when the body points at
  them. Action skills set `disable-model-invocation: true` so they cost *nothing* until invoked.
- **Structured state beats prose state.** JSON is rewritten less casually by a model than Markdown.
- **Overlapping descriptions are the most common marketplace defect** — they cause wrong activation
  or hesitation between options. Each skill here states what it does *and when*, plus its sharpest
  exclusions.

## Phased autonomy

Trust is earned in three steps, and each phase must earn the next:

1. **Report-only** — the loop says what it *would* do.
2. **Assisted** — it makes changes you approve.
3. **Unattended** — it runs on its own, inside a budget, with named terminal states.

Do not start at three. The platform's own approval gate is the product-level version of exactly this
ratchet, which is a good reminder that it works.

## The metric

**Cost per accepted change** — tokens or money spent, divided by the number of changes that survived
verification. Not tokens spent. Not tasks attempted. Not tests passing.

Benchmarks flatter agents: PRs that pass benchmarks merge at a rate 24 points lower than the
benchmark implies. The only score that counts is what survived.

---

> **Build the loop. Stay the engineer.**

## Sources

The claims above are drawn from, in rough order of how load-bearing they are here:

- *Stop Hand-Holding Your Coding Agent: Engineering the Loops that Replace Step-by-Step Prompting* —
  [arXiv:2607.00038](https://arxiv.org/abs/2607.00038). The loop specification, the five-level
  verification ladder, the named terminal states, the anti-patterns, the four design families, and
  the corpus statistics.
- *Agent Harness Engineering: A Survey* — the ETCLOVG layer taxonomy (Execution, Tooling, Context,
  Lifecycle, Observability, Verification, Governance).
- *Harnessing Agent Skills: Architectural Patterns and a Reference Architecture for Skill-Mediated
  LLM Agents* — [arXiv:2606.20631](https://arxiv.org/abs/2606.20631). Skill-in-use, progressive
  skill activation, and Skill–Execution Authority Separation.
- *The Verification Horizon: No Silver Bullet for Coding Agent Rewards* —
  [arXiv:2606.26300](https://arxiv.org/abs/2606.26300). Verifier construction, reward-hacking rates,
  and the co-evolution argument.
- [Loop Engineering](https://addyosmani.com/blog/loop-engineering/) — Addy Osmani. The practitioner
  definition, comprehension debt, and "Build the loop. Stay the engineer."
- [Harness Engineering for Self-Improvement][weng] — Lilian Weng. Filesystem as persistent memory;
  the self-harness discipline.
- [Loop, Harness, Context Engineering: The Terms Explained][cc] — the nesting rule and the triage
  table.
- [What Is Loop Engineering](https://kilo.ai/articles/what-is-loop-engineering) — kilo.ai. Stop rules
  and the named machine-side failure modes.
- [Agent harness](https://en.wikipedia.org/wiki/Agent_harness) — Wikipedia. Inner vs. outer harness.

[weng]: https://lilianweng.github.io/posts/2026-07-04-harness/
[cc]: https://www.codecentric.de/en/knowledge-hub/blog/loop-harness-context-engineering-explained
