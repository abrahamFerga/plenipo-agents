---
name: steward
description: >
  One platform tick, safe to fire on a timer or on demand: work the queue the products filed —
  verdict what is untriaged, implement one accepted request, announce a tagged release — and merge
  only behind a conformance gate that rebuilds every consumer in `consumers.json` against the
  candidate. The platform is the one repo whose blast radius is every product built on it, so its
  merge bar is not the product bar plus care, it is a different gate: green conformance across all
  registered consumers, or nothing merges.
  USE FOR: `/loop 45m /plenipo:steward`, a session pointed at the Plenipo platform repo, clearing the
  request backlog from several products at once. DO NOT USE FOR: a product repo (`../deliver/SKILL.md`
  and `../ship/SKILL.md` own those), filing a request from a product
  (/deliver:request-platform-change), or consuming a release inside a product
  (/deliver:upgrade-platform).
license: MIT
---

# One platform tick

The seven other verbs assume a product: a board, a `PLAN.md`, a `RUNBOOK.md`, a Docker boot. The
platform has none of those and never will — it has a **request queue from every product**, a
`consumers.json` registry, and a release train. Pointing `../deliver/SKILL.md` at it fails on a
missing `RUNBOOK.md`, which is a true statement about the wrong question.

This verb is the platform's own loop, and it inverts the product bar in one specific way. A product
merge risks one product. **A platform merge risks every product built on it**, and that cost does
not shrink as the platform's track record improves — it grows, because each new consumer adds to it.
So the extra gate here is not more review. It is `consumers_green`: every repo in `consumers.json`
is rebuilt and retested against the candidate, and a single red consumer blocks the merge.

**Terminal states:**

| State | Here it means |
|---|---|
| `Success` | one thing advanced — requests verdicted, a PR opened, a release announced, or a PR merged behind green conformance |
| `No-op` | the queue is empty, nothing is accepted-and-unbuilt, and no PR is mergeable yet |
| `Blocked` | `gh` unauthenticated, no request surface installed, no gate scripts, or `consumers.json` absent |
| `Stalled` | the same request failed three ticks for three different reasons — the request is the defect, not the code |
| `Exhausted` | the tick budget ran out mid-implementation; the branch is pushed, no PR opened |
| `Approval-required` | the change alters the platform's public shape, or a consumer is red and the fix is a product's to make |

## When to Use

- A session pointed at the platform repo, on demand: `/plenipo:steward`.
- Under a timer: `/loop 45m /plenipo:steward` — slower than a product's `deliver`, because a
  conformance run rebuilds N products and there is no point outrunning it.
- After several products have filed requests and the queue needs draining.

## Stop Signals

- **You are in a product repo** → `../deliver/SKILL.md`. Check `workflow.json` → `stage` before
  assuming; this verb refuses to run anywhere `stage` is not `platform`.
- **No `platform-request` label or issue form** → `/steward:install-request-surface` once, first.
  There is no queue to work.
- **No `consumers.json`** → `Blocked`. An empty registry is not a green conformance run, it is an
  unasked question — the same reason `checks_exist` refuses to merge a repo with no CI.
- **You want to file a request rather than answer one** → `/deliver:request-platform-change`, from
  the product that needs it.

## Inputs

| Input | Where it comes from | Used for |
|---|---|---|
| Repo stage | `workflow.json` → `stage` | refusing to run on a product; this verb is platform-only |
| The request queue | `gh issue list --label platform-request --state open` | what products are asking for |
| Consumer registry | `consumers.json` | who conformance must rebuild, and who a release is announced to |
| Conformance result | the conformance workflow's latest run per consumer | the `consumers_green` gate |
| Open platform PRs | `gh pr list --state open --json number,labels` | what is waiting to merge |
| Gate verdicts | `node .github/scripts/merge-gate.mjs` | every gate `../ship/SKILL.md` uses, unchanged |
| Last tick's outcome | `TICKS.md` at the repo root | stagnation detection |

## The extra gate

Everything `../ship/SKILL.md` enforces applies here unchanged — `checks_exist`, `checks_green`,
`spine_untouched`, `no_human_hold`, `level_permits`, the lot. `merge-gate.mjs` adds two gates on a
repo whose `workflow.json` says `stage: platform`, and removes none:

| Gate | Passes when | Why it exists |
|---|---|---|
| `consumers_green` | a consumer-conformance check ran on the PR **and** concluded success | a platform change that compiles is not a platform change that is safe; the products are the test suite |
| `surface_declared` | the body carries `Surface: additive`, `Surface: breaking` or `Surface: none`; `breaking` also needs the `human-approved` label | an unclassified break is announced without migration steps, which starts N agents down an unverified path |

`consumers_green` is what makes merging here defensible at all, and it is a **named** gate rather
than something `checks_green` covers for a specific reason: `consumer-conformance.yml` carries a
`paths:` filter, so a PR that misses `src/**` never triggers it, the rollup never contains it, and
green would mean *"it did not run"*. **A conformance run that was skipped is a red gate, not a
missing one.**

**The autonomy level still applies.** Conformance decides whether a change is *safe*; the level
recorded in `workflow.json` decides whether this repo may act on that answer *unattended*, and absent
config is level 0. Both, or no merge — do not read "the platform has a stronger gate" as "the
platform skips the level."

**Still human, always:** a breaking public-surface change, and anything `spine_untouched` catches.
Those need the `human-approved` label on the PR — a human act, recorded. The spine is the five
guarantees every product inherits; a platform that can rewrite them unattended has removed the
reason anything was built on it.

## Workflow

1. **Preflight.** `workflow.json` → `stage` is `platform` (anything else → stop, and name the right
   verb) · `gh auth status` exits 0 · `consumers.json` parses · `.github/scripts/merge-gate.mjs`
   exists · the working tree is clean. Any failure is `Blocked`; name which one. A missing gate
   script points at `../setup/SKILL.md`.

2. **Read the last two ticks** from `TICKS.md`. Two consecutive ticks with no issue verdicted, no
   commit and no merge is `Stalled` — say so and stop rather than firing a third.

3. **Pick what deserves the tick.** First match wins; say which rule fired and what the runner-up
   was.

   | Rule | Condition | Action |
   |---|---|---|
   | 1 | a merged platform change left a consumer red | fix that first — the platform broke its own products, and every further merge compounds it |
   | 2 | an open PR clears every gate **and** `consumers_green` | merge it, step 6 |
   | 3 | open requests carry `needs-triage` | triage them, step 4 |
   | 4 | a request is `triage:accepted` with no linked implementation | build it, step 5 |
   | 5 | a tag is pushed and its consumers were never told | announce it, step 7 |
   | 6 | otherwise | `No-op`, with the reason |

4. **Triage** by invoking `/steward:triage-requests`. It owns clustering by capability, the verdict
   vocabulary, and the seam ladder that resolves most requests as `already-possible`. **Do not
   restate its procedure here** — and do not soften its bias: "you can already do that" and "no" are
   the answers that keep a platform coherent while N products push need into it.

5. **Build one accepted request.** One request per tick, on its own branch, with the requester's
   acceptance test attached as a conformance test — that test is what makes the next release's
   `consumers_green` mean something for this capability. Climb the test ladder, then open a PR whose
   body carries the classification line `surface_declared` reads — literally, on its own line:

   ```text
   Surface: additive
   ```

   `additive`, `breaking` or `none`. Never start a second request while one is in flight.

6. **Merge, behind conformance.** Re-run the gate script with `--merge`, and confirm the conformance
   run is green for **every** consumer at the candidate SHA before it:

   ```bash
   node .github/scripts/merge-gate.mjs --merge
   ```

   A consumer that is red because the *product* is broken rather than the platform is
   `Approval-required`, not an override: say which consumer, link its failing run, and leave the PR.
   **Never merge with a bare `gh pr merge`**, and never merge past `maxMergesPerTick`.

7. **Announce** by invoking `/steward:announce-release`. It owns classification, the migration
   instructions a breaking release must carry, and closing the requests the release satisfied. It
   stops at `Approval-required` when it cannot state a migration precisely, and that stop is correct
   — an unverified migration is worse than silence.

8. **Journal the tick** in `TICKS.md`:

   ```text
   2026-08-01T14:05Z · steward · rule 4 · request #71 · Success · PR #204 · conformance pending
   ```

9. **Report** the terminal state, which rule fired, and — for anything blocked — the named gate and
   the single next action. Cite evidence levels: the gates and conformance are L1, the triage
   verdicts are L4.

## Guardrails

- **Never merge with a consumer red, or with conformance unrun.** That gate is the entire argument
  for this verb existing; without it this is a product loop pointed at the blast radius.
- **Never treat an empty `consumers.json` as green.** No consumers means the question was not asked.
- **Never merge a breaking public-surface change** without `human-approved` on the PR.
- **Never edit a product repo from here.** The platform pushes *messages* — issues in consumer repos
  via `/steward:announce-release`. A platform that edits its consumers directly has become a monorepo
  with extra steps.
- **One request in flight.** Same rule as the product loop, same reason.
- **Never review code you wrote in this session.** Maker ≠ checker holds here too; delegate to the
  `pr-reviewer` agent from a fresh context or let the next tick do it.
- **Never raise the autonomy level, and never write it.** A human records it in `workflow.json`.
- **Never restate a steward skill's procedure.** This verb decides *what* deserves the tick; the
  three `steward` skills own *how*.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Merging on green CI alone | the platform's own tests pass while three products stop compiling | `consumers_green` before every merge |
| Skipping conformance because it is slow | the expensive gate becomes decorative, exactly as `checks_exist` warns | a skipped run is a red gate |
| Announcing a break without migration steps | N agents start down an unverified path at once | `Approval-required` until the steps are written |
| Building a request before triaging the queue | you implement the one that was easiest to describe | rule 3 outranks rule 4 |
| Draining the queue by accepting everything | the platform becomes the union of every product's wishes | most requests are `already-possible` or `rejected` |
| Running this in a product repo | a `RUNBOOK.md` error that hides the real answer | preflight reads `stage` first |
| Treating a red consumer as the platform's bug by default | the platform absorbs product defects | classify it, then `Approval-required` if it is the product's |

## Related skills

- `/steward:triage-requests` — the verdict procedure rule 3 hands off to. **Load when:** the queue
  has `needs-triage` items.
- `/steward:announce-release` — the push side rule 5 hands off to. **Load when:** a tag exists whose
  consumers were never told.
- `/steward:install-request-surface` — the one-time installer for the queue, labels, registry and
  conformance workflow this verb depends on. **Load when:** preflight finds no request surface.
- `../ship/SKILL.md` — the gate list this inherits wholesale. **Load when:** you need what a named
  gate actually asserts.
- `../setup/SKILL.md` — installs the gate scripts and branch protection. **Load when:** preflight
  finds no `merge-gate.mjs`.
- `platform-protocol` — the contract behind the queue: what the platform guarantees consumers and
  why shims come before requests. **Load when:** deciding whether a request is the platform's to
  answer.
- `loop-discipline` — the terminal states and the verification ladder cited in step 9.
