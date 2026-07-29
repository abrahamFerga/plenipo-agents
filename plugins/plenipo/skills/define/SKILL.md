---
name: define
description: >
  One backlog tick that keeps a build loop fed: count what is actually Ready, promote shaped items out
  of Backlog, triage the enhancement issues real usage produced, and — only when the queue would
  otherwise run dry — extend the plan by one epic drawn from the spec's own deferred scope rather than
  from imagination. Every new capability must cite where it came from, which is what stops an
  unattended loop from inventing work forever.
  USE FOR: `/loop 6h /plenipo:define`, refilling a board the build loop drained, promoting Backlog to
  Ready. DO NOT USE FOR: the first plan of a new product (`../launch/SKILL.md`), implementing an issue
  (`../deliver/SKILL.md`), or filing defects found by a sweep (`../test/SKILL.md`).
license: MIT
---

# One backlog tick

A build loop is only as good as the queue in front of it, and an empty queue is the quietest way for
an unattended product to stop. This verb keeps that queue non-empty **without letting it become
fiction** — which is the entire difficulty, because a model asked to invent five more features will
always succeed, and the result is a board full of work nobody wanted that looks exactly like
progress.

The defence is provenance. Every capability this verb adds must trace to something already written
down: a differentiator the spec deliberately deferred, an out-of-scope item flagged for revisit, or
an enhancement issue that came out of somebody using the product. **Nothing gets added because it
seemed like a good idea during this tick.**

**Terminal states:** `Success` (the board has at least `readyFloor` Ready items, and every change
traces to a source) · `No-op` (already above the floor with nothing to triage — the common and
correct outcome) · `Blocked` (no `SPEC.md`/`PLAN.md`, no board, or `gh` unauthenticated) · `Stalled`
(the sources are exhausted: nothing deferred, nothing triaged, nothing to promote — the product is
feature complete against its spec, and that is a decision for a human) · `Approval-required` (the
only remaining scope changes what the product *is*).

## When to Use

- Under a timer: `/loop 6h /plenipo:define`, slower than the build loop by design.
- `../deliver/SKILL.md` reported `No-op` because nothing was Ready.
- Enhancement issues have accumulated from `product-improver` runs and nobody triaged them.
- Cards sit in `Backlog` because no one decided their shape.

## Stop Signals

- **There is no `SPEC.md` or `PLAN.md`** → `../launch/SKILL.md`. Extending a plan that does not
  exist invents a product.
- **The board is already above the floor** → `No-op`. Do not top it up "while you are here".
- **A defect needs filing** → `../test/SKILL.md` owns bugs; this verb only handles scope.
- **The next thing needed is architecture for a whole new surface** → `/shape:design-product`
  directly; this tick promotes items whose shape is settled, it does not design a subsystem in
  passing.

## Inputs

| Input | Where it comes from | Used for |
|---|---|---|
| Board counts by column | `gh project item-list <n> --owner <owner> --format json` | the floor check and what to promote |
| Ready floor | `workflow.json` → `autonomy.readyFloor` (default 3) | when to act at all |
| Capability cap | `workflow.json` → `autonomy.maxNewCapabilities` (default 5) | one tick cannot double the backlog |
| Deferred scope | `SPEC.md` — the differentiator list and the out-of-scope list | the first and best source of new work |
| Usage-derived scope | `gh issue list --label type:enhancement --label agent:needs-triage` | friction logged by someone actually using it |
| Current plan | `PLAN.md` | what is already owned by an epic |
| Shaped-ness | `ARCH.md` | whether a Backlog item may be promoted to Ready |

## Workflow

1. **Preflight and count.** `gh auth status`, the board exists, `SPEC.md` and `PLAN.md` are
   present. Then count items per column. Report the counts before doing anything — every decision
   below is a function of them.

2. **Triage first; it is cheap and it is the best source of scope.** For each open issue labelled
   `agent:needs-triage`:

   | The issue is | Do |
   |---|---|
   | a defect with a reproduction | relabel `type:bug` with a priority, board it Ready — `../test/SKILL.md`'s table sets the priority |
   | real friction, in scope for the spec | keep `type:enhancement`, label `agent:ready`, and record it as a candidate for step 4 |
   | real friction, but out of scope | comment why, label `agent:blocked`, leave for a human |
   | a duplicate | comment with the surviving issue number and close as `not planned` |
   | not reproducible and not specific | comment asking for the missing reproduction, label `agent:blocked` |

3. **If Ready ≥ `readyFloor`, stop.** `No-op`. The build loop is fed; nothing else here is free.

4. **Promote before you invent.** If Backlog has items, take them in Build order and check whether
   each one's shape is settled — does `ARCH.md` say which seam it uses, which permission gates it,
   and whether its writes are approval-gated? Settled items are exactly what `Backlog → Ready`
   means.

   Invoke `/shape:design-product` to shape and promote them. It owns that transition; do not edit
   the board column yourself for an item whose shape you have not written down, and do not
   promote an item whose acceptance criteria you cannot restate as a check.

5. **Only if Ready + Backlog is still below the floor, extend the plan.** In this source order, and
   stop at the first that yields enough:

   1. **Deferred differentiators in `SPEC.md`** — scope already agreed, deliberately postponed.
   2. **Enhancement issues marked `agent:ready` in step 2** — friction from real use, which is
      worth more than anything invented, because someone hit it.
   3. **Out-of-scope items in `SPEC.md` explicitly marked for revisit.** Anything else in that list
      stays out: it is out-of-scope on purpose, and quietly promoting it is how a product loses its
      shape.

   Invoke `/define:plan-product` to append **one** epic, with at most `maxNewCapabilities`
   capabilities, and every capability carrying its provenance in one line — the spec section or
   the issue number it came from. Then invoke `/define:sync-backlog` to publish it, and return to
   step 4 to shape and promote.

6. **If every source is empty**, stop as `Stalled` and say exactly that: the product has built
   everything its spec asked for. The next move is a human's — a new spec round, a new industry, or
   *done* — and it is not this tick's to make. Report it, do not fill the gap.

7. **Journal the tick** in `TICKS.md`:

   ```text
   2026-07-30T04:00Z · define · ready 1→4 · promoted #118 #119 · epic 4 added (2 caps, SPEC §4.2) · L2
   ```

8. **Report**: the counts before and after, what was triaged, what was promoted, what was added and
   its provenance, and the terminal state. If anything was added, name the source line for each — a
   reader must be able to check that you did not invent it.

## Guardrails

- **No capability without provenance.** One line naming the spec section or issue number, or it
  does not go in the plan. This is the whole reason the verb is safe to run on a timer.
- **Never promote out-of-scope items** unless the spec marks them for revisit. Out-of-scope is a
  decision that was made; overriding it is a product decision, which is `Approval-required`.
- **One epic per tick, capped capabilities.** A tick that triples the backlog has removed the
  human's ability to notice it happened.
- **Never write acceptance criteria you cannot turn into a check.** A criterion that cannot be
  tested is prose, and it will stall the build loop three passes later.
- **Never move a card past `Ready`.** Everything after that belongs to the build loop.
- **`Stalled` is a legitimate, useful ending here.** A backlog that has honestly run out is a
  milestone. Manufacturing scope to avoid reporting it is the worst thing this verb can do.
- **Never restate the planning procedure.** `plan-product` owns `PLAN.md`, `sync-backlog` owns the
  issues, `design-product` owns shape and the `Ready` transition.
- **Read the owner, never hardcode it.**

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Inventing features to keep the loop busy | a board of make-work that looks identical to progress | provenance, or nothing |
| Extending the plan while Backlog still has items | the backlog grows while shaped work sits unstarted | promote first, extend last |
| Promoting an unshaped item to Ready | the build loop stalls three refinement passes later on ambiguity | shape it via `design-product`, or leave it |
| Pulling in out-of-scope items | the product drifts into a different product | only what is marked for revisit |
| Skipping triage | friction from real use is the best backlog input, and it rots | triage first, every tick |
| Filing bugs here | two paths create defect issues, with two dedupe schemes | `../test/SKILL.md` owns bugs |
| Reporting `Success` after adding an epic nobody asked for | the human loses the chance to say "no, ship it" | `Stalled` when sources are dry |

## Related skills

- `/define:plan-product` — appends the epic in step 5 and owns `PLAN.md`. **Load when:** extending scope.
- `/define:sync-backlog` — publishes plan changes as issues, idempotently. **Load when:** the plan moved.
- `/shape:design-product` — shapes items and owns `Backlog → Ready`. **Load when:** step 4.
- `../deliver/SKILL.md` — the consumer of everything this makes Ready.
- `../test/SKILL.md` — files the defects; this verb only triages the ones already filed.
- `loop-discipline` — why `Stalled` beats invented work.
