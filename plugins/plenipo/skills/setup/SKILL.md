---
name: setup
description: >
  Make one repo safe to leave a timer pointed at: the run-and-prove surface, the label vocabulary, the
  `autonomy` block recording what this product has earned, two deterministic gate scripts and the
  workflows that run them, CODEOWNERS, branch protection, and a permission allow-list so a tick never
  blocks on a prompt nobody is there to answer. Run once per repo; re-run after a platform upgrade or
  when raising the autonomy level.
  USE FOR: preparing a product for unattended loops, auditing which pieces of that surface are
  missing. DO NOT USE FOR: creating the repo itself (`../launch/SKILL.md`), reviewing or merging pull
  requests (`../ship/SKILL.md`), or config-only validation of an existing product
  (/harness:validate-product).
license: MIT
---

# Make a repo loop-ready

An unattended loop is only as safe as the parts of it that cannot be talked out of anything. Skill
prose is advisory in every tool that reads it; a required status check is not. So this verb's job is
to move the load-bearing rules **out of markdown and into the repo**: two node scripts with exit
codes, branch protection that makes them mandatory, a label vocabulary the other verbs steer by, and
one number — the autonomy level — that decides what may merge without a human.

Autonomy level 1 or higher needs one write-capable user/App token so GitHub emits the workflow
events that its built-in `GITHUB_TOKEN` deliberately suppresses. The same fine-grained
`COPILOT_GITHUB_TOKEN` used for inference may be used when it has Actions read plus Contents, Issues
and Pull requests write on this repository. Verdict dispatch/rerun uses the workflow's built-in
token with scoped Actions write; the reviewer explicitly permits that bot bootstrap.

**Terminal states:** `Success` (every item in the checklist below is present and the gate scripts
were each seen fail and pass) · `No-op` (already installed and current) · `Blocked` (`gh`
unauthenticated or lacking scopes, or the repo has no remote) · `Approval-required` (changing branch
protection, or raising `autonomy.level`, both of which are decisions about who is allowed to merge
your code).

## When to Use

- A product exists and you want to leave `/loop` running against it.
- A repo merges by hand today and you want the gates that make that unnecessary.
- After `/deliver:upgrade-platform`, to confirm the gates still hold.
- When raising the autonomy level — the ratchet is recorded here.

## Stop Signals

- **There is no repo yet** → `../launch/SKILL.md`.
- **You only want to know whether the config is sane** → `/harness:validate-product` is read-only.
- **The repo has no way to be run or tested** → `install-runbook` is step 1 below and is not
  optional; a product nobody can run is a product nobody can verify, and every gate downstream is
  then decorative.
- **This is the Plenipo platform repo** (`workflow.json` → `stage: platform`) → install items 5–8
  below (the gate scripts, `CODEOWNERS`, branch protection) and **skip items 1 and 3**: the platform
  has no product runbook, and its merge bar is not an autonomy level but the `consumers_green` gate
  in `../steward/SKILL.md`. Run `/steward:install-request-surface` for the queue, registry and
  conformance workflow that gate reads.

## Inputs

| Input | Where it comes from | Used for |
|---|---|---|
| Owner / repo | `workflow.json` → `github`, else `gh repo view --json nameWithOwner` | every `gh` call and `CODEOWNERS` — **never hardcode it** |
| Default branch | `gh repo view --json defaultBranchRef` | branch protection, the diff base |
| Current autonomy level | `workflow.json` → `autonomy.level`; **absent means 0** | what may merge |
| Templates | `assets/` in this skill | the files copied in, verbatim |

## What gets installed

| # | Item | Where | Why it is load-bearing |
|---|---|---|---|
| 1 | the run-and-prove surface | `RUNBOOK.md`, integration fixture, `.http` catalog, evals | nothing downstream can prove anything without it |
| 2 | cross-tool rules | `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md` | the cloud reviewer and Copilot read different files |
| 3 | the `autonomy` block | `workflow.json` | the only place the merge level is recorded |
| 4 | labels | the repo | the verbs' state machine — without them the loops cannot find work |
| 5 | `pr-gates.mjs` + `agent-gates.yml` | `.github/` | **the evidence and spine checks, loaded from the protected base — the real gate** |
| 6 | `approval-proof.mjs` + `merge-gate.mjs` + `verdict-retry.mjs` + `triage-retry.mjs` + `agent-merge.yml` | `.github/` | approval provenance, one merge policy and bounded recovery when the model provider fails |
| 6b | `agent-approval-reset.yml` | `.github/` | expires `agent:approved` on new commits — **required before any cloud approval is trusted** |
| 7 | `CODEOWNERS` | repo root | records ownership of spine paths; `pr-gates.mjs` remains the unattended enforcement |
| 8 | branch protection | GitHub settings | what makes 5 and 6 mandatory instead of advisory |
| 9 | `.claude/settings.json` | the repo | plugins on, permissions scoped, destructive verbs denied |
| 10 | gh-aw verdict workflow | `.github/workflows/` | required at autonomy 1+; it is the independent approval authority the merger can prove |

## Workflow

1. **Install the run surface.** Invoke `/deliver:install-runbook` unless `RUNBOOK.md` already
   exists and matches the repo. Then invoke `/harness:install-agent-config` for `AGENTS.md` and
   the `.github/` instruction files. Both own their own procedures; do not restate them.

2. **Record the autonomy block** in `workflow.json`, creating it at level 0. Never write a higher
   level than a human asked for in this session:

   ```jsonc
   "autonomy": {
     "level": 0,              // 0 nothing · 1 docs+tests · 2 features on review · 3 unattended
     "maxOpenPRs": 3,         // build back-pressure: the ceiling ../deliver stops at
     "maxMergesPerTick": 2,   // blast radius per ship tick
     "readyFloor": 3,         // ../define refills below this
     "maxIssuesPerSweep": 8,  // ../test flood protection
     "maxNewCapabilities": 5  // ../define scope cap per tick
   }
   ```

3. **Create the labels.** `gh label create --force` is idempotent, so this is safe to re-run:

   ```bash
   for L in "agent:ready:0E8A16" "agent:in-progress:FBCA04" "agent:blocked:B60205" \
            "agent:done:6E7781" "agent:needs-triage:D4C5F9" "agent:approved:0E8A16" \
            "agent:changes-requested:D93F0B" "human-hold:B60205" "human-approved:5319E7" \
            "needs-human:B60205" "type:bug:D73A4A" "type:enhancement:A2EEEF" \
            "regression:D73A4A" "security:B60205"; do
     gh label create "${L%:*}" --color "${L##*:}" --force
   done
   ```

   The `type:*`, `scope:*`, `priority:*` and `seam:*` families come from `sync-backlog`; do not
   duplicate its taxonomy here, only add what the loop verbs need.

4. **Copy the gate, verdict-recovery and policy-test files** from `assets/` into `.github/scripts/`
   and their workflows into `.github/workflows/`. This includes `approval-proof.mjs`,
   `verdict-retry.mjs`, `triage-retry.mjs`, all six `*.test.mjs` files,
   `fixtures/check-rollup.json`, and
   `agent-approval-reset.yml`. Copy them
   **verbatim** — resist
   "improving" them in transit, because the one property that matters is that the same file runs in
   CI and locally.

   `agent-merge.yml` runs issue-triage recovery as a separate scheduled job. It discovers only
   open, target-labeled, unheld issues, correlates versioned per-issue runs, and retries at a capped
   backoff with at most two Actions mutations per tick. It renews with a fresh dispatch before the
   workflow-rerun age or attempt ceiling. It is intentionally independent of `AGENT_AUTOMERGE`; use
   the separate `AGENT_TRIAGE_RECOVERY=off` repository variable only as an explicit kill switch for
   that repair path.

   Verbatim cuts both ways, and the direction people forget is the one that bit this marketplace:
   if a product has already improved its copy, **port the improvement up to `assets/` and re-vendor
   from there** rather than overwriting it. Three products were once found running a gate 47 lines
   ahead of the asset while two others were ~100 lines behind, and CI was green in all five because
   nothing compared a copy to its source. Diff before you copy.

5. **Prove both scripts before trusting either.** This is not optional and it is not ceremony: a
   check never seen red may be asserting nothing.

   ```bash
   # pr-gates: red, then green
   printf 'diff --git a/x.cs b/x.cs\n--- a/x.cs\n+++ b/x.cs\n-  b.HasQueryFilter(x => true);\n' > /tmp/d
   PR_HEAD_REF=feat/1-x PR_BODY='' node .github/scripts/pr-gates.mjs /tmp/d   # expect exit 1, 4 gates
   PR_HEAD_REF=feat/1-x PR_LABELS=agent:approved \
     PR_BODY="$(printf 'Closes #1\n## Runtime evidence\nPOST /api/agui/x streamed RUN_FINISHED, no RUN_ERROR.\n## Regression test\nXTests.Y seen red before, green after.\n')" \
     node .github/scripts/pr-gates.mjs /tmp/d                                  # expect exit 0

   # merge-gate: it must refuse at level 0
   node .github/scripts/merge-gate.mjs        # expect every open PR BLOCKed on level_permits

   # policy regression suite: no network and no writes
   node .github/scripts/pr-gates.test.mjs
   node .github/scripts/approval-proof.test.mjs
   node .github/scripts/merge-gate.test.mjs
   node .github/scripts/verdict-retry.test.mjs
   node .github/scripts/triage-retry.test.mjs
   node .github/scripts/agent-approval-reset.test.mjs
   ```

   Record both outcomes in the report. If the first command exits 0, the gate is inert and
   installing it has made things **worse** than having none, because now a green check implies
   safety.

6. **Turn on branch protection** — and understand that this step is what makes steps 5–7 real.
   `merge-gate.mjs` reads the protected contexts through `gh pr checks --required`; unlike the
   Administration-only branch-protection REST endpoint, that PR GraphQL surface is available to the
   scheduled `GITHUB_TOKEN`. On an unprotected repo `checks_exist` fails closed. Require the status
   checks, and **do
   not** require approving reviews if you want the scheduled merger to work — a required human
   review is a deliberate choice to keep merging manual, which is a legitimate setting and the right
   one at level 0.

   ```bash
   gh api --method PUT "repos/$OWNER/$NAME/branches/$DEFAULT/protection" \
     --input - <<'JSON'
   {
     "required_status_checks": { "strict": true, "contexts": ["PR gates", "build"] },
     "enforce_admins": false,
     "required_pull_request_reviews": null,
     "restrictions": null,
     "allow_force_pushes": false,
     "allow_deletions": false
   }
   JSON
   ```

   Set `contexts` to the **actual** check names from `gh pr checks` on a real PR — a context name
   that never appears is a required check that never runs, and GitHub will happily wait forever.
   Verify with `gh api repos/$OWNER/$NAME/branches/$DEFAULT/protection`. Changing protection is
   `Approval-required`: ask before you write it.

7. **Copy `CODEOWNERS`**, substituting the resolved owner. Enabling *Require review from Code
   Owners* is a separate, human decision — it forces a human on every spine PR, which is exactly
   right for some products and too slow for others.

8. **Write `.claude/settings.json`** from `assets/settings.json`, substituting the owner. Its
   Sonnet 5 default keeps the outer loop cheap; `deliver:product-developer` selects Opus 5 only for
   code in its own context. Keep the deny list; it is what stops an improvised force-push or repo
   deletion. Note in the report that the deny list matches Bash strings only and cannot see inside
   the gate script, so `autonomy.level` remains the authoritative control over merging.

9. **Install the approval authority before setting autonomy above 0.** Point at
   `/harness:install-github-agentic-workflows`; do not hand-roll it. The merger verifies the exact
   reviewer run's safe-output artifact, head, base and body revision, so a local label or a generic
   successful run is intentionally insufficient. Configure `COPILOT_GITHUB_TOKEN` with Copilot
   Requests read, Actions read, and Contents, Issues and Pull requests write. That user token is
   used for labels, branch updates and merges so downstream workflows run; the scoped built-in token
   owns verdict dispatch/rerun because it already has Actions write.

10. **Report the checklist** — each of the ten items as present or missing, the recorded autonomy
    level, both gate-script outcomes from step 5 with their exit codes, the protection state, and
    the exact `/loop` commands that now drive this repo. State which claims are L1 (the exit codes),
    L2 (the config is present and parses) and L4 (that the whole arrangement is *wise*).

## Guardrails

- **Never install the gates without proving them red.** An inert check is worse than no check: it
  converts "nobody looked" into "it passed".
- **Never set `autonomy.level` above what a human said in this session**, and never raise it
  because the loop has been doing well. That judgement is the one thing the loop is structurally
  unfit to make.
- **Never let a proposed gate or reviewer judge the PR that introduces it.** The cloud verdict runs
  without checkout from the protected base; `merge-gate.mjs` verifies its approval-specific
  safe-output artifact for every merge, and independently downloads/runs the base `pr-gates.mjs`
  for control paths (including old paths on rename/delete). `CODEOWNERS` records the same boundary.
- **Never require an approving review *and* expect the scheduled merger to work.** Choose: a human
  gate, or an automated one. Configuring both and assuming the automation still runs is how a queue
  silently stops. If an owner deliberately wants a repo to merge by hand, say so with autonomy
  level 0; blast radius raises the deterministic proof bar, but it does not silently reinsert a
  human into a repository the owner explicitly configured for unattended operation.
- **Never install a cloud approver without `agent-approval-reset.yml`.** `safe-outputs.add-labels`
  can only add, so nothing in the reviewer can withdraw a verdict that its own later commits
  invalidated: approve at commit A, push commit B, and every gate is green over code nothing read.
  The reviewer and the reset ship as a pair.
- **Never pair GitHub's own auto-merge with any of this.** Auto-merge waits only for explicitly
  configured conditions, so a PR can merge while a review is still running.
- **Never commit a secret.** The reviewer and mutation path read the fine-grained PAT from repository
  secrets; the agent runtime never receives that write credential.
- **Read the owner, never hardcode it** — in `CODEOWNERS`, in settings, in every `gh` call.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Copying the workflows but skipping branch protection | every gate reads nothing and passes; the loop merges freely | step 6 is the point of steps 4–7 |
| Naming a required check that does not exist | PRs wait forever on a context that never reports | read the names from `gh pr checks` |
| "Improving" the gate scripts while copying them | CI and the local verb now disagree about what green means | copy verbatim; change the asset, then re-copy |
| Starting at autonomy level 2 | a product with no track record merging its own features | 0, then earn each step |
| Autonomy above 0 without the cloud verdict | labels have no independently provable authority and nothing can merge | install and stage the verdict workflow first |
| Skipping the runbook because the code builds | nothing downstream can produce runtime evidence, so gate 4 blocks every PR forever | step 1 first |
| Treating this as install-once | an upgrade moves check names and package pins; the gates rot silently | re-run after every platform upgrade |

## Related skills

- `/deliver:install-runbook` — step 1's run-and-prove surface. **Load when:** `RUNBOOK.md` is absent.
- `/harness:install-github-agentic-workflows` — the approval authority from step 9. **Load when:**
  autonomy is above 0 or review must keep running with the machine off.
- `/harness:install-agent-config` — step 1's cross-tool rules. **Load when:** the repo is Claude-only.
- `../ship/SKILL.md` — runs `merge-gate.mjs`; every gate it reports comes from here. **Load when:**
  deciding what may merge.
- `../launch/SKILL.md` — creates the repo this prepares, and calls this verb last.
- `/deliver:work-next-issue` — its `merge-policy` reference is the argument these gates implement.
- `/harness:validate-product` — the read-only audit to run after this. **Load when:** verifying.
