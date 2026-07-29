---
name: launch
description: >
  Take a product from nothing to a repo with a Ready backlog in one attended run, driving the whole
  scout → define → shape → scaffold chain through the conductor rather than restating it, and pausing
  at exactly one human decision: the go/no-go on the vertical and the brand name. Everything after
  that pause is automatic, and the run ends by making the repo loop-ready so the timers can take over.
  USE FOR: starting a new product, optionally from an industry you name, resuming a half-built one.
  DO NOT USE FOR: steady-state work on a product that already has a board (`../deliver/SKILL.md`,
  `../define/SKILL.md`), or driving many products at once (`../fleet/SKILL.md`).
license: MIT
---

# Launch a product

Everything else in this plugin is a tick you can put on a timer. This one is not: it is a single
run, once per product, and it contains the only decision an unattended fleet genuinely cannot make
for you — **is this vertical worth a product, and what is it called.** Both leak permanently into
namespaces, schemas, permission strings and a public repo name, so both stop and ask.

The chain itself is already specified, gated, and journaled by `conduct`. This verb sets the
conditions and hands over: an industry (or the instruction to pick one), an autonomy level, a
budget, and the requirement that it ends by making the repo loop-ready. **It never re-performs a
phase.**

**Terminal states:** `Success` (the repo builds, boots, lists its module id, the board has at least
one `Ready` item, and `../setup/SKILL.md` has run) · `No-op` (the product already exists with a
Ready backlog — you wanted a steady-state verb) · `Blocked` (no `gh` auth, Docker down, or the
platform packages are unreachable) · `Stalled` (a phase gate failed three times for three different
reasons) · `Approval-required` (waiting at the go/no-go, the brand name, or the creation of the
remote repo).

## When to Use

- You have an industry in mind and want a product built against it.
- You have **no** industry in mind and want one chosen and justified — pass nothing and the
  discovery loop ranks candidates first.
- A previous launch stopped part-way and you want it resumed from wherever the artifacts actually
  are.

## Stop Signals

- **A board with Ready items already exists** → `../deliver/SKILL.md`. This verb is not a way to
  "start fresh"; it will report `No-op`.
- **You want to step each gate yourself** → `conduct` directly. It is the same engine with the
  human in every seat.
- **Several products need attention** → `../fleet/SKILL.md`.
- **The repo exists but cannot be run or has no board** → `../setup/SKILL.md` alone is what you
  need.

## Inputs

| Input | Where it comes from | Used for |
|---|---|---|
| Industry | the invocation argument, else the discovery loop ranks and proposes | the whole chain's subject |
| Brand + module id | **a human**, at the pause | namespaces, schema, permission strings, the repo name |
| GitHub owner | `gh api user`, or an existing `workflow.json` | the remote and the board — **never hardcode it** |
| Autonomy level for the run | declared here, in writing, before the first phase | how far each phase may go alone |
| Budget | default: 2 attempts per gate, one whole-pipeline run | the `Exhausted` ceiling |

## Workflow

1. **Preflight.** `gh auth status` exits 0, Docker is running, and every plugin this chain needs is
   enabled — `harness`, `scout`, `define`, `shape`, `deliver`, and this one. A disabled plugin means
   a phase's skill does not exist, and enabling one mid-run needs a reload the run cannot perform on
   itself. Fix the set now or report `Blocked`; never mid-run.

2. **Declare the run in writing** before anything else: the industry (or that it will be chosen),
   the autonomy level, the attempt ceiling, and that the run will pause once. An undeclared budget
   is an unbounded one.

3. **Hand the chain to `conduct`.** It owns the phase table, the gates, the exit checks and the
   `CONDUCT.md` journal: discovery → definition → ground → backlog → design. Let it run and let it
   gate. Your only jobs while it runs are to answer the pause and to refuse to advance a phase whose
   exit check did not actually pass.

4. **Answer the one pause.** Discovery ends in a go/no-go, which is **L5 — a human decision, not a
   check**. Present the brief's recommendation and its kill criteria, ask for the brand name and
   module id at the same moment, and stop. Say plainly that this is the only pause: everything after
   it is automatic, and the next thing that will happen is a public GitHub repo being created under
   the resolved owner.

5. **Let the rest run.** Scaffolding creates the repo, installs the run-and-prove surface,
   publishes the backlog, and shapes the first epic to `Ready`. Do not narrate these; `conduct`
   gates each one and the artifacts are the evidence.

6. **Make it loop-ready.** Invoke `../setup/SKILL.md`. Until it has run, the product has no
   autonomy level, no labels, no gates and no branch protection — which means the timers would
   either refuse to merge anything or, worse, be tempted to.

7. **Report the handover.** The repo URL, the board URL, the number of `Ready` items, the recorded
   autonomy level (it will be **0**), and the exact commands that now drive the product:

   ```text
   /loop 20m /plenipo:deliver
   /loop 30m /plenipo:ship
   /loop 3h  /plenipo:test
   /loop 6h  /plenipo:define
   ```

## Guardrails

- **One pause, and it is a real one.** Do not choose a brand yourself, and do not create the remote
  repo before a human has answered. A rename afterwards is a migration across namespaces, schemas
  and permission strings, not a rename.
- **Never re-perform a phase.** If this file starts explaining how to write `SPEC.md`, it has
  absorbed a phase instead of launching one. `conduct` hands off; so do you.
- **Never advance on a narrative.** "It said it wrote `PLAN.md`" is not "`PLAN.md` exists".
- **The autonomy level starts at 0.** A brand-new product has no runbook history, no golden evals
  and no track record. It cannot merge anything yet, and it does not get to decide otherwise.
- **Read the owner, never hardcode it.**
- **There is no naming prefix.** Products get real brand names; do not add, require or suggest one.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Enabling plugins as each phase arrives | the phase's command does not exist until a reload nobody can trigger from inside the run | enable all of them in preflight |
| Choosing the brand to avoid stopping | a permanent name nobody agreed to, embedded in schemas | stop; it is one question |
| Skipping `setup` because the code builds | the timers have no gates, no labels, and no recorded level | step 6 is part of `Success` |
| Reporting `Success` with an empty board | the build loop starts by reporting `No-op` forever | at least one `Ready` item, verified by query |
| Launching a second product before the first runs a night | two half-driven products and no evidence either loop works | earn the fleet one product at a time |

## Related skills

- `conduct` — the phase table, gates and journal this delegates to. **Load when:** step 3.
- `../setup/SKILL.md` — the loop-readiness install step 6 runs. **Load when:** the chain is green.
- `../define/SKILL.md`, `../deliver/SKILL.md`, `../test/SKILL.md`, `../ship/SKILL.md` — the four
  timers that own the product from here on.
- `loop-discipline` — why the go/no-go is L5 and must be labelled as such.
