# Who merges, and what may be automated

The maker's build pass ends at **In Review** with an open PR. The deterministic merger moves it to
Done only after every live gate passes. A local or cloud reviewer can add a useful second opinion,
but a model opinion never grants merge authority and provider availability never blocks the queue.

## The rule everything else follows

**Authorization comes from repository policy, not from a positive label.**

CI is an L1 check on the tests that exist; it cannot prove every product judgement. The unattended
path therefore layers several independent constraints:

- the PR comes from the same repository, targets its default branch, has a valid protocol envelope,
  and was opened by an actor explicitly listed in `autonomy.trustedAuthors`;
- GitHub's required checks exist and are green at the current head;
- the PR is mergeable, not a draft, and has no `CHANGES_REQUESTED` review or explicit hold;
- the body closes its issue and records runtime plus red-before-green evidence;
- the recorded autonomy level permits the change class and the tick stays under its merge cap;
- a control change is evaluated by `pr-gates.mjs` downloaded from the protected base.

That prevents a fork, a branch-name lookalike, a model label, or a PR-owned workflow from granting
itself authority.

## Merge policy by blast radius

| Change class | Who merges | Gate |
|---|---|---|
| Docs, `RUNBOOK.md`, tests, a green version bump | deterministic merger at level 1+ | required checks + evidence + provenance |
| A product feature — module tool, tab, endpoint | deterministic merger at level 2+ | full test ladder + required checks + evidence + provenance |
| An ordinary platform change | deterministic merger at the recorded level | product gates + consumer conformance + surface declaration |
| A breaking platform surface | deterministic merger at the recorded level | above + substantive `## Migration evidence` |
| The merge policy itself, or removal of an RBAC/approval/tenant/audit invariant | owner/admin bootstrap only | `control_policy_locked` fails closed; no label overrides it |

The last row is deliberately rare and manual. A proposed gate cannot safely be the authority that
decides whether its own weakening is acceptable. This is not a per-PR approval ritual: ordinary
feature, documentation, test, manifest, and platform work stays label-free and unattended.

`CODEOWNERS` documents ownership. `pr-gates.mjs` is the enforceable protected-base policy, while the
repository ruleset makes its status check mandatory. Requiring a GitHub approving review is a
separate owner choice and deliberately makes the queue human-dependent.

## What GitHub can and cannot do for you

| Mechanism | Reality |
|---|---|
| **Required status checks** | The server-side contract. Name only deterministic contexts that really report |
| **Copilot, Bugbot, Codex or agent review** | A useful, optional second opinion. Keep it comment-only. Copilot code review can now submit a counting approval (off by default, since September 2026); leave that off, because a model approval satisfying a required-review rule is the self-approving loop in GitHub's own clothes. Cursor's Bugbot comments and can fail a status check but never approves |
| **GitHub auto-merge** | Waits only for configured conditions and can race optional review; do not pair it with this loop |
| **Scheduled `merge-gate.mjs`** | The only default-branch merger: re-reads required checks, provenance, holds, mergeability, policy, level, and cap immediately before merging |
| **Merge queue** | Useful on the serial platform repo, where batched candidates must be retested |

The scheduled merger uses `--match-head-commit`, so a push between evaluation and merge cannot land
an unexamined revision. A stale-but-otherwise-ready branch is updated in one tick and considered for
merge only after its checks rerun on the next tick.

## Earning autonomy

The way out of manual merging is a stronger deterministic verifier, never a bigger batch.

| Level | May auto-merge | Entry requirement |
|---|---|---|
| **0** | nothing | default for a repo with no earned autonomy |
| **1** | docs, runbook, and test-only changes | run surface installed and required checks proven |
| **2** | product features | golden evals present and level 1 stayed clean |
| **3** | the same classes unattended inside a revert budget | level 2 stayed clean and the owner explicitly recorded it |

Record the level and `trustedAuthors` in `workflow.json`. Never infer either. An agent deciding it has
earned more authority is the self-approving loop wearing a different hat.

Platform changes add `consumers_green`; breaking surfaces add migration evidence. Locked control or
security-invariant removals remain owner/admin bootstrap changes at every level because their blast
radius is the mechanism that defines the levels themselves.

## What the build loop must do

1. Open the PR with the exact request exercised, observed output, and regression test seen red then
   green—not merely “tests pass.”
2. Put a valid `plenipo-agent` envelope first, include `Closes #N`, and move the card to **In Review**.
3. Stop the maker pass. A later deterministic `ship` tick owns merge; an optional reviewer may leave
   comments but is not a prerequisite.
4. Route a formal `CHANGES_REQUESTED` review or `agent:changes-requested` hold to
   `/deliver:revise-pr` before taking new work.
5. Never call bare `gh pr merge`; it bypasses the repository's live gate list and merge cap.

The build loop applies back-pressure while open loop PRs reach `maxOpenPRs`. Open PRs are bounded
work-in-progress, not a human inbox.
