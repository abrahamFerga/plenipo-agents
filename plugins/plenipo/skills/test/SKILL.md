---
name: test
description: >
  One sweep tick: boot the product, delegate an end-to-end hunt to the `e2e-tester` agent, then turn
  what it observed into deduplicated GitHub bug issues that the build loop will pick up — each with a
  reproduction, a stable fingerprint key so tonight's sweep does not refile last night's bug, and a
  priority derived from consequence rather than from how easy it was to describe. Skips entirely when
  nothing has merged since the last sweep.
  USE FOR: `/loop 3h /plenipo:test`, sweeping after a merge or an upgrade, converting observed
  breakage into board work. DO NOT USE FOR: debugging one known failure (/deliver:verify-runtime),
  proving a single change works before its PR (that is inside /deliver:work-next-issue), or inventing
  improvements from reading code (the `product-improver` agent).
license: MIT
---

# One sweep tick

A build loop verifies **what it just built**. Nothing in it looks at whether the product as a whole
still works — and that is where the interesting failures live: the approval gate that stopped firing
three features ago, the tab that white-screens on a stale CSP hash, the second tenant that can see
the first one's rows.

This verb closes that gap and, more importantly, **converts what it finds into work**. A finding in
a chat transcript is lost by morning; a filed issue with a reproduction is picked up by the next
`../deliver/SKILL.md` tick without anyone relaying it. The sweep itself belongs to the `e2e-tester`
agent, which cannot edit code — this verb never fixes what it finds either.

**Terminal states:** `Success` (swept; issues filed, or nothing broken — say which journeys you
covered) · `No-op` (nothing merged since the last sweep, so there is nothing new to break) ·
`Blocked` (could not boot: Docker down, migrations fail, no `RUNBOOK.md`) · `Stalled` (the product
is too unstable to sweep — one `Blocked`-class defect filed at p0, and stop) · `Approval-required`
(a finding is a scoping question, not a defect).

## When to Use

- Under a timer: `/loop 3h /plenipo:test`, or once a night.
- After a batch of merges, before you trust the product.
- After `/deliver:upgrade-platform`, where the whole point is finding what the release broke.

## Stop Signals

- **You already know what is broken** → `/deliver:verify-runtime` reproduces and fixes one defect.
- **Nothing has merged since the last sweep** → this skill reports `No-op` by design; do not force
  it.
- **You want the product to be nicer, not less broken** → delegate the `product-improver` agent. UX
  friction is not a finding here; a finding is something *wrong*.
- **The product will not boot** → `Blocked`. A sweep of a dead app is theatre.

## Inputs

| Input | Where it comes from | Used for |
|---|---|---|
| How to run and exercise it | `RUNBOOK.md` | the boot command, ports, module id, dev-auth headers |
| Owner / repo / project | `workflow.json` → `github`, else `gh api user` | filing and boarding |
| Last swept commit | `TICKS.md`, the most recent `test` line | the `No-op` skip check |
| Current HEAD | `git rev-parse --short HEAD` on the default branch | what this sweep is evidence about |
| Existing bug issues + bodies | `gh issue list --label type:bug --state all --json number,body,labels` | deduplication by key |
| Filing cap | `workflow.json` → `autonomy.maxIssuesPerSweep` (default 8) | flood protection |

## Workflow

1. **Skip check.** Compare HEAD on the default branch against the last swept commit in `TICKS.md`.
   Equal → `No-op`, journal it, stop. Sweeping an unchanged product burns tokens to re-derive
   yesterday's answer.

2. **Preflight.** Read `workflow.json` → `stage` first: `platform` means there is no product to
   sweep — stop as `No-op` and name `../steward/SKILL.md`, whose `consumers_green` gate is the
   platform's equivalent of a sweep. Then: Docker running, `RUNBOOK.md` present, `gh auth status`
   green. Any failure is `Blocked`, not a finding — a finding is a claim about the product, and you
   have not observed the product yet.

3. **Delegate the sweep** to the `e2e-tester` agent. It boots the product, walks real journeys
   (first-run, the domain's core loop, the approval gate, RBAC with a narrowed role, the read
   surfaces, the admin surfaces), drives the UI, reads telemetry, and returns ranked findings with
   reproductions. **Do not sweep inline** — the agent exists so a hundred requests and their output
   never enter this context, and so the thing that reports breakage is not the thing that files it.

4. **Discard what is not a finding.** Keep only what the agent actually observed, with a
   reproduction. Drop style opinions, "this could be faster" without a measurement, and anything it
   inferred from reading source. A finding without a reproduction is a rumour, and a rumour filed as
   an issue costs the build loop a whole tick to disprove.

5. **Fingerprint each finding.** The key must be stable across sweeps and independent of wording,
   because it is the only thing standing between you and refiling the same bug every night:

   ```text
   bug/<surface>-<symptom>        e.g. bug/approvals-write-not-gated
                                       bug/tabs-balances-stale-after-approve
   ```

   Derive `<surface>` from where it happens (`approvals`, `tabs`, `rbac`, `tenancy`, `import`,
   `agui`) and `<symptom>` from what is wrong, in three words or fewer. Never include a number, a
   date, a tenant id, or a commit sha — those change every run and every change forks a duplicate.

6. **Set the priority from consequence**, not from severity of tone. This table is the yardstick;
   do not renegotiate it per finding:

   | Observed | Priority | Extra label |
   |---|---|---|
   | data crossed a tenant boundary | `priority:p0` | `security` |
   | an approval gate did not fire, or a reply claimed a write that never happened | `priority:p0` | `security` |
   | an RBAC check passed where it should have returned 403 | `priority:p0` | `security` |
   | a write silently did nothing | `priority:p1` | — |
   | a read surface showed a wrong number, or disagreed with another surface | `priority:p1` | — |
   | a UI defect, console error, or broken empty state | `priority:p2` | — |
   | cosmetics | **not filed** | report in the summary only |

7. **Dedupe against every existing bug issue, open or closed.** Pull them once with bodies and
   match on the key in memory — issue search does not reliably index HTML comments.

   | Match | Action |
   |---|---|
   | no issue with this key | file it (step 8) |
   | an **open** issue with this key | do nothing unless the newest comment is older than 7 days or the reproduction changed — then add **one** comment: still reproduces on `<sha>` |
   | a **closed** issue with this key | reopen, label `regression`, comment the new reproduction and the sha it returned on |
   | an issue with this key that you can no longer reproduce | comment *not reproducible on `<sha>`*, label `agent:needs-triage`, **leave it open** — a fix you cannot see is not a fix |

8. **File, up to the cap.** Body in this order, with the marker last:

   ```markdown
   <!-- plenipo-agent kind=finding from=<repo> status=open -->

   **Observed on** `<sha>` via <the narrowest surface that reproduces it>

   **Input** — the exact request, prompt, or click
   **Observed** — the exact wrong output
   **Expected** — and why: the spec line, the invariant, or the platform contract it violates
   **Reproduction** — numbered, from a cold start, copy-pasteable
   **Evidence level** — L3 (observed at runtime). Nothing here is inferred from source.

   <!-- plenipo-key: bug/<surface>-<symptom> -->
   ```

   Labels: `type:bug`, the priority, `agent:ready`, plus `security` where the table says so. Board
   it with `Status = Ready` and `Build order = <priority rank>` — `1` for p0, `2` for p1, `3` for p2
   — so a defect sorts ahead of every planned feature without renumbering the plan's build order.

   At the cap, file the highest-consequence ones and **say in the report exactly how many you
   dropped**. A silent truncation reads as "that's all of them", which is the one thing it is not.

9. **Journal the tick** in `TICKS.md`, with the swept sha:

   ```text
   2026-07-29T03:10Z · test · swept 4a91c2f · Success · 2 filed (1 p0) · 1 still-reproduces · L3
   ```

10. **Report**: the verdict, the journeys actually walked (that is the coverage of any "nothing
    broken"), the issues filed with numbers, what was deduped, what you dropped at the cap, and
    **what you could not reach**. Gaps you stay silent about are gaps the next agent inherits.

## Guardrails

- **Never fix what you find in this tick.** Filing and fixing in one pass means the same context
  decides both what is broken and whether it is fixed. The `e2e-tester` agent cannot edit files at
  all; keep that property at this level by handing every fix to `../deliver/SKILL.md`.
- **Never file without a reproduction.** No exceptions, however confident the agent sounded.
- **Never file a cosmetic issue.** The board is a queue, not a diary.
- **Never weaken a check to get past it during a sweep.** A 403 that blocks the sweep may be the
  system working correctly; note it and route around.
- **Dev-auth headers only**, never real credentials, and never echo a secret into an issue body —
  issues are world-readable.
- **Everything filed is L3 evidence** (observed at runtime). Never dress up an L4 reading of source
  as an observation; that is the one field the next agent cannot check.
- **Read the owner, never hardcode it.**

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Wording-derived keys | the same bug refiles nightly under a new name | fingerprint from surface + symptom, never prose |
| A sha or tenant id inside the key | every sweep forks a duplicate | keys carry no volatile values |
| Sweeping every tick regardless | tokens spent re-deriving the same answer | the step 1 skip check |
| Commenting "still reproduces" every night | a 60-comment issue nobody reads | one comment per 7 days, or on a changed reproduction |
| Auto-closing what you cannot reproduce | real bugs vanish because a flake hid them | comment, label `agent:needs-triage`, leave open |
| Filing 40 findings from one sweep | the board becomes noise and the build loop stalls | the cap, plus the consequence table |
| Filing UX friction as a bug | features get rewritten to answer an opinion | that is `product-improver`'s job, not this one |
| Treating `Blocked` as a finding | an issue that says "the app does not start", with no reproduction | `Blocked` names the environment problem and stops |

## Related skills

- `../deliver/SKILL.md` — picks up the p0 bugs this files, ahead of features. **Load when:**
  filing.
- `/deliver:verify-runtime` — the reproduce → observe → fix → lock-in loop for one known defect.
- `plenipo-runbook` — the launch modes, dev-auth headers, AG-UI contract, and the test ladder the
  agent sweeps against. **Load when:** `RUNBOOK.md` is missing and you must fall back.
- `agent-protocol` — the `kind=finding` envelope, the label vocabulary, and the evidence-level rule
  used above. **Load when:** writing an issue another agent will act on.
- `loop-discipline` — why an observation is L3 and a code reading is L4.
