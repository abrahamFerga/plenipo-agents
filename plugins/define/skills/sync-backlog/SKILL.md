---
name: sync-backlog
description: >
  Project PLAN.md into GitHub as the system of record: epic and feature issues upserted by a hidden
  marker so a re-run never fans out duplicates, features linked under their epic as sub-issues, and
  every card on the Projects v2 board in Backlog with its build order. Also reaps the gap the
  predecessor left open — an issue whose capability was deleted from the plan is detected and
  closed or escalated, instead of sitting Ready waiting for someone to build it.
  USE FOR: publishing a finished plan to issues plus a board, re-syncing after the plan changed,
  finding orphaned issues. DO NOT USE FOR: authoring the plan (../plan-product), creating the repo
  or the board (/deliver:scaffold-product), moving cards out of Backlog (/shape:design-product),
  implementing an issue (/deliver:work-next-issue).
license: MIT
disable-model-invocation: true
---

# Sync the backlog

`PLAN.md` is a file one person reads. The backlog is what every later loop actually consumes:
`/shape:design-product` marks cards Ready, `/deliver:work-next-issue` pulls the top Ready card, a
merged PR closes the issue. This skill is the projection between them, and it runs **many times** —
once when the plan is finished, again every time the plan moves.

Which makes the whole design one property: **re-running must converge, not accumulate.** Issues are
identified by a hidden marker, not by their title. Bodies are rewritten only when their content
digest changes. Cards that have moved past Backlog are never dragged back. And capabilities the plan
*dropped* are hunted down — because the loop downstream does not read `PLAN.md`, it reads the board,
and it will happily implement an issue that no longer describes anything the product wants.

**Terminal states:** `Success` (every epic and feature in the plan exists, is linked, is boarded
with a build order, and the orphan sweep is resolved) · `No-op` (the plan is unchanged; the dry
plan is empty and nothing is written) · `Blocked` (no `github` block, no board, `gh`
unauthenticated or missing the `project` scope, a required board field absent, `PLAN.md` missing or
unparsable — publish nothing) · `Stalled` (the same GitHub write fails three times for three
different reasons; stop and report what landed — every object is keyed, so the run resumes) ·
`Approval-required` (orphans that a human must decide on: anything past Backlog, anything in flight,
or an epic with living children).

## When to Use

- `PLAN.md` is finished and you want the backlog live in GitHub.
- The plan changed — capabilities added, renamed, re-ordered, or removed — and the board must
  catch up.
- You suspect the board and the plan have drifted, and want the difference listed before anything
  moves.
- An issue was implemented against a capability nobody can find in the plan any more.

## Stop Signals

- **`workflow.json` has no `github` block, or the board doesn't exist** →
  `/deliver:scaffold-product` creates the repo and the board. This skill populates them; it never
  creates them.
- **The plan isn't written, or a capability is missing from it** → `../plan-product`. Do not paper
  over a plan gap with a guessed issue.
- **You want to move cards Backlog → Ready** → that is a design decision; `/shape:design-product`
  makes it after the architecture delta is written.
- **`gh` is unauthenticated or lacks the `project` scope** → stop. `gh auth login`, then
  `gh auth refresh -s project`. Publish nothing in the meantime.

## Inputs

| Input | Source | Used for |
|---|---|---|
| Epics, build order, module split | `PLAN.md` | the epic issues and the `Build order` field |
| Capabilities per epic | `PLAN.md` | one feature issue each — the unit of work |
| Seam, permission string, approval flag | `PLAN.md` tool inventory + RBAC model | issue body, `seam:*` label, `approval-gated` |
| Acceptance criteria, persona, metric | `SPEC.md` | the feature body's *Acceptance criteria* block |
| `github.owner`, `github.repo`, `github.project` | `workflow.json` | every `gh` call |
| Plan revision | `git log -1 --format=%h -- PLAN.md` | the reason recorded on a closed orphan |

**Never hardcode the owner, and never infer the repo from the directory name.** Read
`github.owner` from `workflow.json`; fall back to `gh api user --jq .login`. `github.repo` may be
`name` or `owner/name` — normalize both. There is no product-name convention to validate against.

## The backlog model

| Plan element | GitHub object | Boarded |
|---|---|---|
| An epic in build order | `type:epic` issue — a container, body lists what it delivers and its dependencies | no |
| A capability under that epic | `type:feature` issue, **sub-issue** of its epic | yes, in `Backlog` |

> **There is no Foundations epic, and no `stage:foundations` label.** The platform *is* the
> foundation. Epic 1 is a real vertical slice that binds to primitives the platform already ships. A
> backlog whose first epic is "set up the solution" is describing work `/deliver:scaffold-product`
> already did.

### Labels

Create any that are missing with `gh label create --force` (idempotent); never invent one outside
this table.

| Label | Applied to | Derived from |
|---|---|---|
| `type:epic`, `type:feature` | every issue | the object kind |
| `scope:must-have`, `scope:differentiator` | features | SPEC.md's split |
| `priority:p0`, `p1`, `p2` | features | p0 = must-have in epics 1–2 · p1 = other must-haves · p2 = differentiators |
| `seam:module`, `seam:tool`, `seam:tab`, `seam:connector`, `seam:role`, `seam:host`, `seam:frontend` | features | the seam PLAN.md assigns; `unassigned` is reported, never guessed |
| `approval-gated` | features whose capability changes state | the tool inventory — these ship `RequiresApproval = true` |
| `orphaned` | issues whose capability left the plan | the orphan sweep |

### Board columns and fields

Columns are the `Status` single-select, in this order, and each transition has exactly one owner:

`Backlog` → `Ready` → `In Progress` → `In Review` → `Done`

| Transition | Owner |
|---|---|
| → `Backlog` | **this skill**, on first boarding only |
| `Backlog` → `Ready` | `/shape:design-product`, once the feature's architecture delta exists |
| `Ready` → `In Progress` → `In Review` | `/deliver:work-next-issue` |
| → `Done` | the merged PR closing the issue |

| Field | Type | Required | Value written |
|---|---|---|---|
| `Status` | single-select | yes | `Backlog` — **only when the card is first added** |
| `Build order` | number | yes | `epic index × 100 + capability index × 10` |
| `Epic` | text | no | the epic's title, so the board groups without opening sub-issues |
| `Seam` | single-select | no | the platform seam, mirroring the `seam:*` label |
| `Proof` | single-select | no | the rung that will prove it: `unit`, `e2e`, `eval`, `frontend` |

`Status` or `Build order` missing → `Blocked`. The three optional fields missing → skip them and
say so in the report; do not fail the publish over a nice-to-have column.

**The ×100/×10 spacing is deliberate.** Build order is derived — recomputed from `PLAN.md` on every
run — and the gaps mean inserting a capability usually renumbers nothing. A board that churns every
sync teaches people to ignore it.

## Identity and idempotency

Every issue this skill owns ends with two HTML comments:

```html
<!-- plenipo-key: feature/<kebab-capability> -->
<!-- plenipo-rev: <first 8 chars of sha256(rendered body without this line)> -->
```

- **The key is the identity.** Derive it from the capability slug, never the issue title — retitling
  a capability must update one issue, not create a second one. Epics use `epic/<kebab-epic>`.
- **The rev decides whether to write.** Render the body, digest it, compare to the issue's current
  `plenipo-rev`. Equal → skip. This is what makes an unchanged re-run cost zero writes.
- **Re-emit both markers verbatim on every edit.** A dropped key is a guaranteed duplicate on the
  next run, and duplicates are what this skill exists to prevent.
- **Match locally, not by search.** Pull every issue with its body once and match in memory; issue
  search does not reliably index HTML comments.

Issues without a `plenipo-key` are **not yours**. Never edit, close, label, or board them — a human
filed them.

## Orphans — the gap this closes

An orphan is an issue carrying a `plenipo-key` whose key no longer appears in `PLAN.md`. Left alone
it is worse than harmless: it sits in `Ready`, and `/deliver:work-next-issue` picks it up and builds
a capability the product deliberately dropped.

| Orphan's state | Action | Contributes |
|---|---|---|
| `Backlog`, unassigned, no linked PR or branch, no human comment | label `orphaned`, comment the reason and plan revision, **close as `not planned`** | `Success` |
| `Backlog`, but assigned / linked PR or branch / has a human comment | label + comment, **leave open** | `Approval-required` |
| `Ready`, `In Progress`, `In Review` | label + comment, **leave open** — design or build effort was already spent | `Approval-required` |
| Closed as completed, or `Done` | report only, no label, no comment | — |
| An epic with at least one non-orphan child | never closed; report it | `Approval-required` |
| Key **returns** to the plan and its issue is closed with `orphaned` | reopen, remove the label, re-sync body and board | `Success` |

**Never delete an issue.** Closing is reversible and keeps the audit trail; deletion destroys the
only record that the capability was ever planned. The closing comment must name the plan revision
that dropped it, so the decision is traceable to a commit rather than to this run.

## Workflow

1. **Resolve identity.** Read `workflow.json` for `github.owner`, `github.repo`, `github.project`.
   Fall back to `gh api user --jq .login` for the owner. Normalize `owner/name`. If the `github`
   block or the project number is absent → `Blocked`, point at `/deliver:scaffold-product`.

2. **Verify the surface before writing anything.** `gh auth status` (must include the `project`
   scope), `gh repo view`, `gh project view`, `gh project field-list`. Confirm `Status` exists with
   all five options and `Build order` exists. Any failure here → `Blocked`, zero writes.

3. **Parse the plan.** From `PLAN.md`: each epic in order (title, what it delivers, dependencies)
   and the capabilities under it. From `SPEC.md`: each capability's acceptance criteria, persona, and
   metric. Preserve order — epic index and capability index are the build order.

4. **Derive the desired state, entirely in memory.** For every epic and feature: key, title,
   rendered body, labels, build order, board field values. This is the yardstick; nothing past this
   point consults the plan again.

5. **Refuse to invent.** Every issue traces to a line in `PLAN.md` and every acceptance criterion
   to `SPEC.md`. A capability with no epic, or an epic with no capabilities, is a plan defect:
   report it and send the user to `../plan-product`. A capability with no seam is recorded as `unassigned`
   and reported — never guessed.

6. **Secret-scan every rendered body.** Issues are world-readable. Tokens, connection strings, keys,
   tenant data, real customer names: on any hit, publish nothing and report the offending line.

7. **Read the current state.** One pass: `gh issue list --state all --limit 500` with bodies and
   labels, existing sub-issue children per epic, and `gh project item-list`. Build the key → issue
   map, and the set of keys present on GitHub.

8. **Compute the diff and print it first.** Creates, body updates (rev differs), label changes,
   missing sub-issue links, missing board items, field corrections, and orphans with their decided
   action. If the diff is empty → `No-op`, stop, write nothing. Anything in the
   `Approval-required` column is presented before it is acted on.

9. **Reconcile labels.** `gh label create --force` for every label in the taxonomy that the repo
   lacks. Cheap, idempotent, and it stops label-not-found from aborting a create halfway.

10. **Upsert epics, then features.** Epics first so a feature always has a parent to attach to.
    Create when the key is absent; edit only when the rev differs. Re-emit both markers.

11. **Link sub-issues.** For each epic, read its existing children and attach only the missing ones.
    The `sub_issue_id` is the child's **database `id`** from the REST issue object — not its number,
    not its GraphQL node id.

12. **Board the features.** Epics are not boarded; they are tracked through sub-issues. Add missing
    items, set `Build order` every run (it is derived), set `Epic` / `Seam` / `Proof` when those
    fields exist. Set `Status = Backlog` **only on items you just added** — never on an existing
    card, whatever column it is in.

13. **Sweep the orphans** per the table above: close the safe ones, label and escalate the rest,
    reopen any key that came back.

14. **Prove convergence.** Re-run steps 7–8. The second diff must be empty:
    `0 created · 0 updated · 0 linked · 0 boarded · 0 closed`. A non-empty second diff means a key
    or a rev is unstable — that is a defect in this sync, not in the plan. Report it rather than
    claiming success.

15. **Report the tree.** Each epic → its features, with issue number, priority, seam, build order,
    and board status. Then the counts, the orphan decisions, any skipped optional field, any plan
    gap, and the board URL. Name the terminal state.

## gh commands

```bash
# ── identity — read it, never hardcode it ─────────────────────────────────────
OWNER=$(jq -r '.github.owner // empty' workflow.json); : "${OWNER:=$(gh api user --jq .login)}"
NAME=$(jq -r '.github.repo' workflow.json | sed 's#.*/##')
REPO="$OWNER/$NAME"; PROJECT=$(jq -r '.github.project' workflow.json)
REV=$(git log -1 --format=%h -- PLAN.md)

# ── preflight (step 2) — every one must pass before any write ─────────────────
gh auth status                                        # must list the `project` scope
gh repo view "$REPO" --json name
PID=$(gh project view "$PROJECT" --owner "$OWNER" --format json --jq '.id')
gh project field-list "$PROJECT" --owner "$OWNER" --format json   # field ids + option ids

# ── current state (step 7) ────────────────────────────────────────────────────
gh issue list -R "$REPO" --state all --limit 500 \
  --json number,title,body,state,stateReason,labels,assignees,url
gh api "repos/$REPO/issues/$EPIC/sub_issues" --jq '.[].number'
gh project item-list "$PROJECT" --owner "$OWNER" --limit 500 --format json \
  --jq '.items[] | {id, url: .content.url, status}'

# ── labels (step 9) — --force makes create idempotent ─────────────────────────
gh label create "seam:tool" -R "$REPO" --color BFD4F2 --description "Binds a platform tool" --force

# ── upsert (step 10) — body from a file so markers survive shell quoting ──────
gh issue create -R "$REPO" --title "<Capability>" --body-file body.md \
  --label type:feature --label priority:p1 --label seam:tool --label approval-gated
gh issue edit <n> -R "$REPO" --body-file body.md --add-label scope:must-have

# ── sub-issue link (step 11) — database id, not the number ────────────────────
CHILD=$(gh api "repos/$REPO/issues/<child#>" --jq '.id')
gh api --method POST "repos/$REPO/issues/<epic#>/sub_issues" -F sub_issue_id="$CHILD"

# ── board (step 12) ───────────────────────────────────────────────────────────
ITEM=$(gh project item-add "$PROJECT" --owner "$OWNER" --url <issue-url> --format json --jq '.id')
gh project item-edit --id "$ITEM" --project-id "$PID" --field-id <status-fid> \
  --single-select-option-id <backlog-oid>          # ONLY for an item you just added
gh project item-edit --id "$ITEM" --project-id "$PID" --field-id <order-fid> --number <N>
gh project item-edit --id "$ITEM" --project-id "$PID" --field-id <epic-fid> --text "<Epic title>"

# ── missing optional field (step 2) ───────────────────────────────────────────
gh project field-create "$PROJECT" --owner "$OWNER" --name "Build order" --data-type NUMBER

# ── orphan checks + close (step 13) ───────────────────────────────────────────
gh api "repos/$REPO/issues/<n>/timeline" \
  --jq '[.[] | select(.event=="cross-referenced" or .event=="connected")] | length'
gh issue view <n> -R "$REPO" --json comments --jq '.comments | length'
gh issue close <n> -R "$REPO" --reason "not planned" \
  --comment "Capability removed from PLAN.md as of $REV. Reopen if the plan takes it back."
gh issue reopen <n> -R "$REPO"
```

A single-select that exists but is missing an option cannot be extended by `gh` — that is a
`Blocked`, fixed in the board UI or with the `updateProjectV2Field` GraphQL mutation, not worked
around by writing a different value.

## Guardrails

- **Idempotent or nothing.** Issues match by `plenipo-key`, sub-issues by the existing children
  list, board items by issue URL. Step 14 is the check, not a formality: an unchanged plan must
  produce a literally empty second diff.
- **All-or-clean.** Preflight fully before writing. GitHub gives you no transaction, so idempotency
  *is* the recovery mechanism: if a write fails mid-run, stop, report precisely what landed, and let
  the operator re-run — never leave a half-populated board and call it done.
- **Never rewrite `Status` on an existing card.** Dragging an `In Progress` card back to `Backlog`
  because the plan was re-synced destroys the one signal `/deliver:work-next-issue` depends on.
- **No invented scope.** Every issue traces to `PLAN.md`; every criterion to `SPEC.md`. Missing
  input is a `Blocked` pointing at `../plan-product`, not a plausible-sounding issue body.
- **Touch only what you own.** An issue with no `plenipo-key` is a human's. Do not edit, label,
  close, or board it.
- **Public-repo hygiene.** Bodies are world-readable. Secret-scan before publishing; never paste
  tenant data, credentials, or real customer names.
- **This is an L2 projection, not proof of anything.** A populated board says the plan was
  published, not that the plan is good and certainly not that anything works. See
  `loop-discipline` before claiming more.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Matching issues by title | a renamed capability forks into two issues, both live | match on `plenipo-key` only |
| Dropping a marker while editing a body | the next run duplicates that issue | re-emit both comments verbatim on every edit |
| Passing the issue **number** as `sub_issue_id` | the link silently attaches the wrong issue or 404s | use the REST `.id` from `gh api repos/$OWNER/$NAME/issues/<n>` |
| Re-setting `Status = Backlog` on every sync | in-flight work is yanked back to the queue | set `Status` only on newly added items |
| Leaving removed capabilities on the board | the build loop implements dropped scope | run the orphan sweep; nothing else will |
| Auto-closing an orphan that is `In Progress` | throws away work in flight | anything past `Backlog` is `Approval-required` |
| Boarding the epics | the queue fills with containers nobody can implement | features only; epics live in the sub-issue tree |
| Skipping `Build order` | the board has no stable order and the build loop picks arbitrarily | write it every run — it is derived |
| Creating a `stage:foundations` epic out of habit | scaffolds a backbone the platform already ships | epic 1 is a real slice; bind, don't generate |
| Hardcoding the owner, or guessing it from the folder name | the sync targets the wrong repo, or works only on one machine | `workflow.json` first, `gh api user` second |

## Related skills

- `../plan-product/SKILL.md` — writes the `PLAN.md` this publishes, and is where a plan gap or a
  removed capability gets decided. **Load when:** the plan is missing, incomplete, or the orphan
  sweep found scope that shouldn't have been dropped.
- `../synthesize-spec/SKILL.md` — the source of acceptance criteria, personas, and metrics.
  **Load when:** a feature body has nothing to assert against.
- `/deliver:scaffold-product` — creates the repo and the Projects v2 board this populates.
  **Load when:** `workflow.json` has no `github` block.
- `/shape:design-product` — reads these feature issues and moves them `Backlog` → `Ready`.
  **Load when:** the backlog is published and the design loop starts.
- `/deliver:work-next-issue` — consumes the top `Ready` card. The reason orphans matter.
- `loop-discipline` — the terminal states above, and why a published board is an L2 claim.
