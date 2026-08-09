---
name: fleet
description: >
  One tick across many products: read each repo's board, pull requests and last-swept state, score
  which single product most needs attention right now, run exactly one verb there, and journal it —
  so `/loop 20m /plenipo:fleet` is the only command needed to keep a portfolio moving. Serves the
  least-recently-served product on ties, quarantines any product that fails three ticks in a row
  instead of letting it eat the whole night, and answers "what is the state of everything?" in report
  mode without touching anything.
  USE FOR: driving more than one product from one machine, the nightly portfolio dashboard.
  DO NOT USE FOR: a single product (invoke that verb directly), or creating a new product
  (`../launch/SKILL.md`).
license: MIT
---

# One tick across the fleet

Four timers per product does not survive contact with ten products. This verb collapses them into
one: each tick, it looks at every product, decides which one is most starved and which of `../ship`,
`../deliver`, `../test` or `../define` it needs, runs that, and stops. Ten products come out of one
`/loop`, because the *tick* is the unit of work rather than the product.

Two properties make it safe to leave alone overnight. **It serves the least-recently-served product
on a tie**, so a noisy repo cannot starve a quiet one. And **it quarantines a product that fails
three ticks in a row**, because the alternative — a broken repo consuming every tick until morning —
is the single most expensive failure available to an unattended fleet, and it looks exactly like
activity.

**Terminal states:** `Success` (one verb ran on one product and reported its own state) · `No-op`
(nothing anywhere needs attention — genuinely good news) · `Blocked` (no `fleet.json`, or `gh`
unauthenticated) · `Stalled` (every product is quarantined) · `Exhausted` (the fleet-level tick
budget is spent) · `Approval-required` (the only remaining work everywhere needs a human).

## When to Use

- More than one product: `/loop 20m /plenipo:fleet` and nothing else.
- Morning triage: run it in report mode for a one-screen state of the portfolio.
- After adding a product to `fleet.json`.

## Stop Signals

- **One product only** → the four verbs directly. This adds a scheduling layer you do not need.
- **A product has no board, runbook or gates** → `../setup/SKILL.md` for that repo first; a product
  missing them will be quarantined on its first tick anyway.
- **You want a competitive/coverage inventory of what exists** → `/scout:scan-fleet` writes
  `FLEET.md`. This verb schedules work; it does not survey the estate.
- **Nothing is set up yet** → `../launch/SKILL.md` once, for one product. Earn the fleet.

## Inputs

| Input | Where it comes from | Used for |
|---|---|---|
| The product list | `fleet.json` at the fleet root | which repos exist and where they are on disk |
| Per-product policy | each repo's `workflow.json` → `github`, `autonomy` | ceilings, floors, level — **one source per fact** |
| Board state | `gh project item-list` per product | Ready / In Progress counts |
| PR state | `gh pr list --state open --json number,labels` per product | back-pressure and review debt |
| Bugs | `gh issue list --label type:bug --state open` per product | p0 preemption |
| Last swept commit, last served tick, failure streak | `FLEET-RUN.md` at the fleet root | fairness, sweep cadence, quarantine |

`fleet.json` is deliberately thin — paths only. Everything else is read from the product itself, so
there is never a second copy of an autonomy level to drift:

```json
{
  "products": [
    { "name": "networthy", "path": "networthy" },
    { "name": "casewise",  "path": "casewise" }
  ]
}
```

## Workflow

1. **Preflight.** `fleet.json` parses, `gh auth status` exits 0, and every `path` exists on disk. A
   missing path is not a quarantine — it is a config error; report it and continue with the rest.

2. **Read `FLEET-RUN.md`** for each product's last-served tick, failure streak, and last-swept
   commit. Skip any product whose streak is ≥ 3 and whose quarantine is younger than 24 hours, and
   **name it in the report every tick** — a silent quarantine is a product you will discover is dead
   in a fortnight.

3. **Gather state, read-only, for every non-quarantined product.** One pass per product: board
   counts, open PRs with labels, open p0 bugs, HEAD on the default branch. Do not boot anything
   here. Record open PRs as two numbers — total, and the loop-branch subset the scoring rules
   actually use — so a queue full of PRs no verb can merge is visible rather than merely felt.

4. **Score each product** by the first rule that matches. The rule number *is* the priority — lower
   wins:

   | Rule | Condition | Verb |
   |---|---|---|
   | 1 | `main` is red, or a merged PR broke the default branch | `../deliver/SKILL.md` (fix first) |
   | 2 | a PR is `agent:changes-requested` | `../deliver/SKILL.md` — its rule 1 owns a rejected PR |
   | 3 | a PR is `agent:approved`, or one carries no verdict label yet | `../ship/SKILL.md` |
   | 4 | an open `type:bug` at `priority:p0` | `../deliver/SKILL.md` |
   | 5 | open loop PRs ≥ `maxOpenPRs` | `../ship/SKILL.md` — review is the constraint, not build capacity |
   | 6 | `Ready` > 0 and open loop PRs < `maxOpenPRs` | `../deliver/SKILL.md` |
   | 7 | HEAD moved since the last sweep, or the last sweep is older than 24 h | `../test/SKILL.md` |
   | 8 | `Ready` < `readyFloor` | `../define/SKILL.md` |
   | — | nothing matched | idle |

   Two of those rules are worth stating plainly, because getting either wrong stops a product
   without ever reporting a failure:

   - **A rejected PR goes to `deliver`, not `ship`.** `ship` reviews PRs that carry *no* verdict
     label and skips the rest, so routing `agent:changes-requested` there spends the tick and
     changes nothing — the product looks served and stands still. `deliver` rule 1 is the owner:
     it hands to `/deliver:revise-pr` and strips the label so `ship` picks the PR up next time.
   - **Rules 5 and 6 count only loop PRs** — head branch `feat/`, `fix/` or `chore/`. A Dependabot
     PR fails `is_loop_pr` in `merge-gate.mjs`, so no verb in this marketplace can ever clear it;
     counting it against `maxOpenPRs` makes rule 5 fire forever and starves rule 6 of every tick.
     Report both numbers per product so the filter is visible.

5. **Pick one product**: lowest rule number wins; on a tie, the one served longest ago. Say which
   product, which rule fired, and what the runner-up was — a fleet whose scheduling is inspectable
   is one you can correct, and this line is the whole reason to prefer this over four blind timers.

6. **Run that one verb in that one repo**, and let it own everything: its own preflight, its own
   ceilings, its own terminal state. **Never run two verbs in one tick**, and never run a verb on
   two products in one tick. One product boots at a time — they pin different Postgres host ports,
   so parallel booting is possible but pointless, and serialising is what makes the no-progress
   detector mean something.

7. **Update `FLEET-RUN.md`**: the product served, the rule, the verb, its terminal state, and the
   new failure streak — reset to 0 on `Success` or `No-op`, incremented on `Blocked` or `Stalled`.
   At 3, record the quarantine and the reason.

   ```text
   2026-07-30T02:20Z · networthy · rule 6 · deliver · Success · PR #131 · streak 0
   2026-07-30T02:41Z · casewise  · rule 7 · test    · Blocked (docker) · streak 3 → QUARANTINED
   ```

8. **Report**: the product served and why, its verb's terminal state, and a one-line-per-product
   table of the whole fleet — Ready, In Progress, open PRs (loop / total), p0 bugs, autonomy level,
   last swept,
   quarantine. That table is the deliverable in report mode, and the reason a portfolio can be
   supervised in a couple of minutes a day.

### Report mode

Asked for a status rather than a tick, do steps 1–5 and stop: print the table and the ranking, act
on nothing. This is the honest starting point for a new fleet — watch what it *would* have chosen
for a few days before letting it choose.

## Guardrails

- **One product, one verb, one tick.** Batching removes the only thing that makes a failure
  attributable.
- **Never boot two products at once.** Serialise; a shared Docker daemon and a pinned host port are
  not hypothetical constraints.
- **Never let one product monopolise the fleet.** Least-recently-served on ties, and quarantine
  after three consecutive failures.
- **Never hide a quarantine.** Name every quarantined product in every report, with its reason.
- **Never merge here.** `../ship/SKILL.md` merges, under that product's own recorded level.
- **Never copy a policy value into `fleet.json`.** Levels, ceilings and floors live in each
  product's `workflow.json`; a second copy will drift and the drift silently raises somebody's
  autonomy.
- **Never invent a product path.** A missing directory is a config error to report, not a repo to
  create.
- **Read each owner from its own repo.** Ten products may not share one GitHub owner.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Running every verb on every product each tick | hours of tokens, one boot fighting another, nothing attributable | one product, one verb |
| No quarantine | a repo with a broken Docker setup eats every tick all night | streak of 3, then skip for 24 h |
| Silent quarantine | a product is dead for a fortnight and the reports looked fine | name it every tick |
| Newest-first or alphabetical selection | the last product in the list never gets served | least-recently-served on ties |
| Duplicating autonomy levels into `fleet.json` | a stale copy quietly grants a product permission it never earned | read `workflow.json` |
| Skipping rule 5 | every product accumulates unreviewable PRs in parallel | review debt outranks new work |
| Counting PRs no verb can merge | the ceiling becomes a deadlock and the build loop reports `No-op` forever | count loop branches only |
| Starting a fleet before one product has run a night unattended | ten products' worth of the same undiagnosed failure | one product, one night, then add |

## Related skills

- `../deliver/SKILL.md`, `../ship/SKILL.md`, `../test/SKILL.md`, `../define/SKILL.md` — the four
  verbs this schedules. Each owns its own preflight and ceilings.
- `../setup/SKILL.md` — what a product needs before it can be in the fleet at all.
- `/scout:scan-fleet` — the estate survey (`FLEET.md`), which answers a different question from
  this scheduler's journal (`FLEET-RUN.md`). **Load when:** asking what exists rather than what to
  do next.
- `loop-discipline` — the no-progress detector and the named terminal states behind the streak
  logic.
