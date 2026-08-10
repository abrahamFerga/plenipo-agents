---
name: steward
description: >
  One platform tick, safe to fire on a timer or on demand: work the queue the products filed —
  verdict what is untriaged, implement one accepted request, announce a tagged release — and merge
  only behind a conformance gate that rebuilds every consumer in `consumers.json` against the
  candidate. Repair rejected platform pull requests before taking new queue work. The platform is
  the one repo whose blast radius is every product built on it, so its merge bar is not the product
  bar plus care, it is a different gate: green conformance across all registered consumers, or
  nothing merges.
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
| `Success` | one thing advanced — a rejected PR revised, requests verdicted, a PR opened, a release announced, or a PR merged behind green conformance |
| `No-op` | the queue is empty, nothing is accepted-and-unbuilt, and no PR is mergeable yet |
| `Blocked` | `gh` unauthenticated, no request surface installed, no gate scripts, or `consumers.json` absent |
| `Stalled` | the same request failed three ticks for three different reasons — the request is the defect, not the code |
| `Exhausted` | the tick budget ran out mid-implementation; the branch is pushed, no PR opened |
| `Approval-required` | the owner explicitly configured a lower autonomy level or applied `human-hold`; normal review findings route back to an agent instead |

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
| Open platform PRs | `gh pr list --state open --json number,labels,headRefName` plus reviews, comments and checks for loop PRs | what needs revision or is waiting to merge |
| Gate verdicts | `node .github/scripts/merge-gate.mjs` | every gate `../ship/SKILL.md` uses, unchanged |
| Last tick's outcome | `git rev-parse --git-path plenipo-steward-ticks.log` (read legacy `TICKS.md` once when migrating) | stagnation detection without moving protected `main` |

## The extra gate

Everything `../ship/SKILL.md` enforces applies here unchanged — `checks_exist`, `checks_green`,
`spine_untouched`, `no_human_hold`, `level_permits`, the lot. `merge-gate.mjs` adds two gates on a
repo whose `workflow.json` says `stage: platform`, and removes none:

| Gate | Passes when | Why it exists |
|---|---|---|
| `consumers_green` | a consumer-conformance check ran on the PR **and** concluded success | a platform change that compiles is not a platform change that is safe; the products are the test suite |
| `surface_declared` | the body carries `Surface: additive`, `Surface: breaking` or `Surface: none`; `breaking` also needs a live `agent:approved` verdict | an unclassified break is announced without migration steps, which starts N agents down an unverified path |

`consumers_green` is what makes merging here defensible at all, and it is a **named** gate rather
than something `checks_green` covers for a specific reason: `consumer-conformance.yml` carries a
`paths:` filter, so a PR that misses `src/**` never triggers it, the rollup never contains it, and
green would mean *"it did not run"*. **A conformance run that was skipped is a red gate, not a
missing one.**

**The autonomy level still applies.** Conformance decides whether a change is *safe*; the level
recorded in `workflow.json` decides whether this repo may act on that answer *unattended*, and absent
config is level 0. Both, or no merge — do not read "the platform has a stronger gate" as "the
platform skips the level."

**Unattended does not mean self-exempting.** A breaking public surface or protected spine diff needs
the same live, uncontradicted `agent:approved` verdict as every other merge, plus its deterministic
tests and conformance. The reviewer may request a replacement guard, scoped acceptance test or
migration proof; it may never waive the invariant or apply `human-approved` to itself.

## Workflow

1. **Preflight on the trusted base.** `workflow.json` → `stage` is `platform` (anything else → stop,
   and name the right verb) · `gh auth status` exits 0 · `consumers.json` parses · the working tree
   is clean. Resolve the remote default branch, fetch it, switch to it and fast-forward from origin;
   then assert `.github/scripts/merge-gate.mjs` exists there. A previous revision/build checkout is
   never allowed to supply this tick's policy. Any failure is `Blocked`; name which one. A missing
   gate script points at `../setup/SKILL.md`.

2. **Read the last two ticks** from the git-local steward journal. Two consecutive ticks with no
   issue verdicted, PR revision, branch commit or merge is `Stalled` — say so and stop rather than
   firing a third. Never commit a timer heartbeat to `main`: with strict protection, every journal
   commit makes all open PRs `BEHIND` and the loop can never converge.

3. **Pick what deserves the tick.** First match wins; say which rule fired and what the runner-up
   was.

   | Rule | Condition | Action |
   |---|---|---|
   | 1 | an open loop PR has `agent:changes-requested`, a `CHANGES_REQUESTED` review, a failed required check, or a merge conflict | revise it before taking new work, step 4 |
   | 2 | a merged platform change left a consumer red | route the product-side repair first — every further release compounds it |
   | 3 | an open PR clears every gate **and** `consumers_green` | merge it, step 7 |
   | 4 | open requests carry `needs-triage` | triage them, step 5 |
   | 5 | a request is `triage:accepted` with no linked implementation | build it, step 6 |
   | 6 | a tag is pushed and its consumers were never told | announce it, step 8 |
   | 7 | otherwise | `No-op`, with the reason |

4. **Revise a rejected platform PR.** Invoke `/deliver:revise-pr` with the selected PR number. It
   owns reading every review thread and failed check, classifying each finding, fixing accepted
   defects, re-proving the behavior, updating evidence and replying to every thread. The revision
   push triggers approval reset and a fresh verdict automatically; do not merge from the maker
   context and do not start a new request while a rejected PR is closer to done. End this tick after
   journaling the revision result. The next tick's preflight returns to the trusted default branch
   before it reads policy or considers a merge.

5. **Triage** by invoking `/steward:triage-requests`. It owns clustering by capability, the verdict
   vocabulary, and the seam ladder that resolves most requests as `already-possible`. **Do not
   restate its procedure here** — and do not soften its bias: "you can already do that" and "no" are
   the answers that keep a platform coherent while N products push need into it.

6. **Build one accepted request.** One request per tick, on its own branch, with the requester's
   acceptance test attached as a conformance test — that test is what makes the next release's
   `consumers_green` mean something for this capability. Climb the test ladder, then open a PR whose
   body carries the classification line `surface_declared` reads — literally, on its own line:

   ```text
   Surface: additive
   ```

   `additive`, `breaking` or `none`. Never start a second request while one is in flight.

7. **Merge, behind conformance.** First assert the checkout is the freshly fetched default branch
   from preflight. Re-run that trusted gate script with `--merge`, and confirm the conformance run is
   green for **every** consumer at the candidate SHA before it:

   ```bash
   node .github/scripts/merge-gate.mjs --merge
   ```

   A consumer that is red because the *product* is broken rather than the platform is `Blocked`,
   not an override: say which consumer, route one evidence-rich issue to that product's delivery
   loop, and leave the PR. The consumer agent repairs it; the platform steward never edits a product.
   **Never merge with a bare `gh pr merge`**, and never merge past `maxMergesPerTick`.

8. **Announce** by invoking `/steward:announce-release`. It owns classification, the migration
   instructions a breaking release must carry, and closing the requests the release satisfied. It
   stops as `Blocked` and files a precise migration-evidence task when it cannot state a migration;
   another agent resolves that task before announcement. An unverified migration is worse than
   silence, but it is not a reason to insert a permanent human relay.

9. **Journal the tick outside the branch** so a timer heartbeat never moves protected `main`:

   ```text
   journal=$(git rev-parse --git-path plenipo-steward-ticks.log)
   printf '%s\n' '2026-08-01T14:05Z · steward · rule 5 · request #71 · Success · PR #204 · conformance pending' >> "$journal"
   ```

10. **Report** the terminal state, which rule fired, and — for anything blocked — the named gate and
   the single next action. Cite evidence levels: the gates and conformance are L1, the triage
   verdicts are L4.

## Guardrails

- **Never merge with a consumer red, or with conformance unrun.** That gate is the entire argument
  for this verb existing; without it this is a product loop pointed at the blast radius.
- **Never treat an empty `consumers.json` as green.** No consumers means the question was not asked.
- **Never merge a breaking public-surface change** without a live `agent:approved` verdict and
  reproducible migration evidence.
- **Never commit the tick journal to `main`.** A journal entry is observation, not product code; it
  must not invalidate every in-flight PR.
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
| Announcing a break without migration steps | N agents start down an unverified path at once | file a migration-evidence task and block until an agent proves the steps |
| Building a request before triaging the queue | you implement the one that was easiest to describe | rule 4 outranks rule 5 |
| Draining the queue by accepting everything | the platform becomes the union of every product's wishes | most requests are `already-possible` or `rejected` |
| Running this in a product repo | a `RUNBOOK.md` error that hides the real answer | preflight reads `stage` first |
| Treating a red consumer as the platform's bug by default | the platform absorbs product defects | classify it, then route a product-owned repair issue if it is the product's |

## Related skills

- `/steward:triage-requests` — the verdict procedure rule 4 hands off to. **Load when:** the queue
  has `needs-triage` items.
- `/steward:announce-release` — the push side rule 6 hands off to. **Load when:** a tag exists whose
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
- `loop-discipline` — the terminal states and the verification ladder cited in step 10.
