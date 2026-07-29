---
name: work-next-issue
description: >
  Take exactly one Ready issue off the GitHub project board and drive it to an open pull request:
  select the top item by build order, move the card to In Progress, cut a branch, implement it
  against the platform contract, climb the test ladder, prove the change at runtime, then open a PR
  that closes the issue and leave the card In Review. Never more than one issue in flight — a second
  run resumes the one already started instead of opening another.
  USE FOR: implementing the next feature off the board, resuming an interrupted issue, running the
  branch → code → runtime proof → PR cycle. DO NOT USE FOR: creating or ordering the backlog
  (/define:sync-backlog), deciding architecture or moving cards Backlog → Ready (the `shape` loop),
  or debugging behaviour that has no issue behind it (`../verify-runtime`).
license: MIT
---

# Work the next issue

The build loop — the only loop here that writes product code. It takes **one** Ready issue from the
GitHub project board to an **open PR**, and stops there.

Two rules make it a loop instead of a queue. **One issue in flight, ever**: the board must never show
two In Progress cards from this loop, and a re-run resumes rather than restarts. And **runtime proof
gates the PR**: a green `dotnet build` is not a reason to open one. Compilation says the code is
well-formed; it says nothing about whether the tool is registered, the permission matches, the
approval gate fires, or the tenant filter holds.

**Terminal states:**

| State | Here it means |
|---|---|
| `Success` | a PR is open, it says `Closes #<n>`, it carries runtime evidence, and the card is In Review |
| `No-op` | nothing is Ready, or the top item is already covered by an open PR from a previous run |
| `Blocked` | a prerequisite is missing — `gh` unauthenticated, no project board, Docker down so runtime proof is impossible, or every Ready item depends on an issue that is not closed |
| `Stalled` | three refinement passes failed for three different reasons; the **issue** is the defect, not the code |
| `Exhausted` | the budget ceiling was hit mid-implementation — push the branch, open no PR, say where you stopped |
| `Approval-required` | the change needs a human decision first: a deviation from `DECISIONS.md`, a new role baseline or permission string, or a destructive migration |

**This loop ends at In Review.** Merging and the move to Done belong to a human reviewer or to
auto-merge. Do not wait for them, do not poll for them, and never report `Success` as "Done".

## When to Use

- The board has Ready items and you want the next one implemented.
- A previous run was interrupted — a branch or an In Progress card exists and nobody finished it.
- A PR merged and you want the loop to pick up the following item.

## Stop Signals

- **Nothing is Ready** → the backlog exists but nothing has been shaped. That is the `shape` loop's
  job, not this one. Report `No-op` rather than promoting a card yourself.
- **There is no board or no issues** → publishing the backlog is `/define:sync-backlog`.
- **A card is already In Progress from this loop** → resume it. Do not select a second item.
- **The repo has no `RUNBOOK.md` and no integration fixture** → you cannot gate on runtime proof.
  Install the surface first with `../install-runbook/SKILL.md`, then come back.
- **You are debugging something with no issue behind it** → `../verify-runtime/SKILL.md` directly.

## Inputs

| Input | Where it comes from | Notes |
|---|---|---|
| Repo owner + name | `workflow.json` → `github.owner`, else `gh repo view --json nameWithOwner`, else `gh api user --jq .login` | **never hardcode an owner** — it breaks every fork |
| Project number | `workflow.json` → `github.project`, else `gh project list --owner "$OWNER"` | Projects v2 |
| Status + Build order fields | `gh project field-list <n> --owner "$OWNER" --format json` | you need the field **ids** and option ids to move a card |
| Default branch | `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` | the PR base and the branch point |
| Acceptance criteria | the issue body | the frozen yardstick — do not restate it more loosely |
| Architecture decisions | `ARCH.md`, `DECISIONS.md` | a contradiction is `Approval-required`, not a judgement call |
| Product specifics | `RUNBOOK.md` | project names, ports, module id, launch mode |
| Module id + manifest | `src/<Product>.<Module>/*Module.cs` | needed for the AG-UI route and the tool catalog check |

## Workflow

1. **Preflight.** `gh auth status` succeeds; the working tree is clean; Docker is running (rung 3 and
   the runtime proof both need it); `RUNBOOK.md` exists. Resolve the repo coordinates from the table
   above. A failure here is `Blocked` — say which one, and stop.

2. **Check what is already in flight.** This step is what makes the skill re-runnable.

   ```bash
   gh project item-list "$PROJECT" --owner "$OWNER" --limit 200 --format json
   gh pr list --state open --json number,headRefName,title
   git branch --list 'feat/*'
   ```

   - An **In Progress** card with an open PR → the loop already finished that item; move the card to
     In Review, report `Success`, stop.
   - An **In Progress** card with no PR → resume it at the step it reached. Do not select a new item.
   - More than one In Progress card → the invariant is already broken. Report it and ask which to
     resume; do not silently pick.
   - An **In Review** card whose PR has unresolved threads, `CHANGES_REQUESTED`, or a red check →
     **that PR is the work**, not a new item. Hand to `../revise-pr/SKILL.md` and stop. Starting
     something new while a PR waits is how a board fills with abandoned PRs nobody owns.

3. **Select the item.** From the item list, keep `Status == Ready`, sort by **Build order** ascending,
   tie-break on issue number. Field names come back lowercased in the JSON — inspect one item before
   filtering rather than assuming. Then check dependencies: if the issue body or its parent references
   an issue that is still open and that this work compiles against, skip it and take the next. If every
   Ready item is blocked that way, report `Blocked` and name the blocker.

4. **Claim it.** All three, in this order:

   ```bash
   gh issue edit <n> --add-assignee @me
   gh project item-edit --project-id "$PID" --id "$ITEM" --field-id "$STATUS_FIELD" \
     --single-select-option-id "$IN_PROGRESS"
   git fetch origin && git switch -c "feat/<n>-<slug>" "origin/$DEFAULT_BRANCH"
   ```

   Branch from the freshly fetched default branch, never from whatever was checked out.

5. **Restate "done" before writing code.** Copy the acceptance criteria into the working notes and
   turn each one into the check that will prove it — a test name, an HTTP request, an event in the
   AG-UI stream. If a criterion cannot be turned into a check, that criterion is prose, and the issue
   needs refinement (see the three-pass rule). Fix the yardstick now; scoring against a moving target
   is how loops drift.

6. **Implement.** Load `plenipo-platform` for the seams and invariants, and
   `../plenipo-module-sdk/SKILL.md` for the member-by-member recipe. The scope is the acceptance
   criteria and nothing adjacent — an unrelated defect you notice becomes `gh issue create`, not an
   extra commit. The invariants that silently pass a green build:

   - a module `DbContext` derives from `ModuleDbContext` **and** declares `HasQueryFilter` **per
     entity** (`PlatformDbContext` does it by reflection; a module context does not);
   - a new tool needs a `ToolDescriptor` in `ModuleManifest.Tools` **and** a `ModuleTool` from
     `IModuleToolSource`, with the **same** permission string;
   - anything that changes state sets `RequiresApproval = true`.

7. **Climb the test ladder** (`plenipo-runbook` has the rungs). Build, unit/module guards,
   Testcontainers integration, golden evals if the change is prompt-shaped, frontend if you touched
   it. Climb only as far as the change reaches — but security-shaped assertions go through
   `AdminClient()`. `AuthorizedScopeAsync()` bypasses RBAC and approvals, so it can never prove them.

8. **Prove it at runtime — this is the gate.** Drive `../verify-runtime/SKILL.md`: run the product,
   exercise the *new* behaviour through a real request, and read what actually happened.

   | Question | Evidence |
   |---|---|
   | did the module load? | `GET /api/platform/modules` lists the module id |
   | is the new tool registered, behind the right permission? | `GET /api/admin/security/catalog` |
   | does a turn work end to end? | `POST /api/agui/{moduleId}` streams `RUN_STARTED → TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT* → CUSTOM(token_usage) → TEXT_MESSAGE_END → RUN_FINISHED`, with **no** `RUN_ERROR` |
   | did the agent really call it? | `GET /api/admin/audit/tool-calls` |
   | is the write gated? | `CUSTOM(approval_required)`, and the reply does **not** claim the write happened |

   Dev-auth headers on every call: `X-Dev-Subject`, `X-Dev-Tenant`, `X-Dev-Roles`. Postgres must be
   `pgvector/pgvector`. Record the exact request and the exact observed output — that text goes in
   the PR body verbatim. **No runtime evidence, no PR.**

9. **Lock in the regression.** Add the test at the lowest rung that would have caught the failure,
   and run it against the **unfixed** code first. A test never seen red is not a regression test.
   Add a `.http` request for every new endpoint and an eval case for every new tool name, description,
   or approval flag.

10. **Open the PR.** Idempotent: `gh pr view --json url` on the branch first, and `gh pr edit` if one
    already exists.

    ```bash
    git push -u origin "feat/<n>-<slug>"
    gh pr create --base "$DEFAULT_BRANCH" --title "<type>: <issue title>" --body-file pr-body.md
    ```

    **The body is parsed, not just read.** A repo prepared by `/plenipo:setup` runs
    `.github/scripts/pr-gates.mjs` as a required check, and it fails the PR when the envelope, the
    `Closes` line, or either heading below is missing — so this shape is a contract, not a convention:

    ```markdown
    <!-- plenipo-agent kind=handoff from=<repo> ref=<repo>#<n> status=open -->

    What changed, and why — one paragraph.

    Closes #<n>

    ## Runtime evidence

    The exact request exercised and the exact output observed, verbatim from step 8.

    ## Regression test

    `<TestClass>.<TestName>` — seen **red** against the unfixed code, **green** after. The ladder
    level each claim above actually rests on: L1 for exit codes, L3 for what was observed running,
    L4 for anything concluded by reading.
    ```

    Without `Closes #<n>` the issue never closes and the board rots; without the two headings the PR
    cannot merge, by design — the check exists because "tests pass" is not evidence a feature works.

11. **Move the card to In Review**, unassign nothing, and report the terminal state. Stop. Do not
    merge your own PR — the maker is not the approver.

### The three-pass rule

Refinement is bounded at **three passes** over the same failing criterion. One pass = one diagnosis,
one scoped change, one re-run of the check.

- Passes 1–3 fail for the **same** reason → the fix is wrong. Keep going only if the diagnosis
  changed.
- Three failures for three **different** reasons → you are `Stalled`. The diagnosis is wrong, and
  usually the issue is: the acceptance criteria are ambiguous, contradict `ARCH.md`, or describe
  behaviour the platform deliberately does not allow.

When you hit `Stalled`, **surface the issue rather than polishing the code**: push the branch so
nothing is lost, open **no** PR, comment on the issue with the reproduction, the three diagnoses, and
what each ruled out, and move the card back to `Ready` so the board stops claiming work is in flight.
A human re-specifies. Rewriting the criteria yourself is scoring against a target you moved.

## Guardrails

- **One issue in flight.** Check step 2 before anything else. Two branches racing the same board is
  how a loop starts lying about its own state.
- **Runtime proof gates the PR.** `dotnet build` proves the code is well-formed and nothing else. A
  tool missing from `IModuleToolSource` compiles perfectly and is never callable.
- **Never edit the check to make it pass.** Weakening a test, loosening an eval assertion, or
  deleting a query filter to get green is specification gaming — the most common reward hack in the
  field, and it lowers real resolution rates. The verifier is never the thing being edited.
- **Never weaken an invariant.** If the tenant filter blocks your query, the query is wrong.
- **Read the owner, never hardcode it.** `workflow.json` first, `gh api user` as the fallback.
- **Every step re-checks state before acting.** A second run must not create a second branch, a
  second PR, or a duplicate card.
- **State the ladder level for every claim in the PR.** "I read it and it looks right" is L4 — write
  that, rather than implying something ran.
- **Scope is the acceptance criteria.** Adjacent fixes become new issues, not extra commits.
- **No secrets, ever.** Provider keys are per-tenant runtime settings in a write-only vault; the whole
  loop runs keyless on the `Mock` provider.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Opening the PR on a green build | ships a tool nobody can call, or a gate that never fires | step 8 gates step 10 |
| Taking a Ready item out of build order | the branch compiles against code that isn't merged yet | sort by Build order, then check open dependencies |
| Starting a second issue "while this one is reviewed" | rebase conflicts, and the board no longer describes reality | one in flight; `No-op` is a legitimate result |
| Proving the approval gate through `AuthorizedScopeAsync()` | passes while the gate is broken — the most common false-green here | `AdminClient()` for anything security-shaped |
| Adding the tool to the manifest only | never registered, no error, and the runtime check "passes" because nothing was called | assert on `GET /api/admin/security/catalog` |
| Polishing past pass 3 | budget burned on a specification defect | `Stalled` — comment on the issue with evidence |
| Omitting `Closes #<n>` | the issue stays open forever and the board rots | put it in the PR body, not the title |
| Moving the card to Done | the loop claims an outcome it never verified | In Review is the end **of this pass**; a human closes it — see `references/merge-policy.md` |
| Treating In Review as the end of the item | review feedback is never acted on and the PR rots | when it comes back — comments, `CHANGES_REQUESTED`, a red check — that is `../revise-pr/SKILL.md`, not a new item |
| Enabling auto-merge on a feature PR at autonomy level 0–1 | the agent becomes its own approver, and auto-merge does not wait for a review still running | check the product's recorded level; features auto-merge only from level 2, and only on an adversarial reviewer's approval |
| Deciding you have earned a higher autonomy level | the self-approving loop wearing a different hat | the level is recorded in `workflow.json` by a human; read it, never infer it |
| Committing the branch name or owner into a script | breaks on every fork and every other product | derive both at run time |

## Related skills

- `../verify-runtime/SKILL.md` — the run → exercise → observe → diagnose → fix → lock-in loop that
  step 8 gates on. **Load when:** you reach step 8, or a rung goes red.
- `../plenipo-module-sdk/SKILL.md` — the member-by-member module authoring recipe. **Load when:**
  step 6 touches a manifest, tool, tab, entity, or endpoint.
- [`references/merge-policy.md`](references/merge-policy.md) — who merges, what may be automated, and
  what GitHub's review automation can and cannot gate. **Load when:** deciding whether a PR may
  auto-merge, or wiring branch protection.
- `../install-runbook/SKILL.md` — installs the runbook, fixture, eval harness, and `.http` catalog.
  **Load when:** preflight finds no runtime surface to prove anything against.
- `plenipo-platform` — the seams and the invariants a module may not violate.
- `plenipo-runbook` — the run modes, dev-auth, AG-UI contract, and the five-rung ladder.
- `loop-discipline` — the verification ladder and the terminal states this loop reports in.
