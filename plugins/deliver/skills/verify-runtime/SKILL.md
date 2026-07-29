---
name: verify-runtime
description: >
  Drive one change on a Plenipo product from symptom to proof: reproduce through the narrowest
  surface, diagnose from telemetry before source, fix one variable per turn, then lock the behaviour
  in with a regression test seen red before the fix and green after. Refuses to call anything done
  that was not observed working at runtime, and refuses to let an assertion move instead of the code.
  USE FOR: proving a specific fix or feature actually works, debugging a failing chat turn, endpoint,
  or approval gate, picking which test rung locks a fix in, catching an agent that gamed a pinned
  assertion. DO NOT USE FOR: standing up the verification surface in a repo that has none
  (../install-runbook/SKILL.md), or the product-independent run and test contract (plenipo-runbook).
license: MIT
disable-model-invocation: true
---

# Verify at runtime

`dotnet build` proves nothing. `dotnet test` on rungs your change never touched proves nothing. A
change is done when a check that **fails without it** passes with it, and you watched both happen.
This skill is that loop, driven on one specific change to a Plenipo product.

It is also the skill most exposed to reward hacking, because the fastest route from red to green is
almost always to edit the thing doing the checking. Half of what follows exists to make that route
visible instead of available.

**The six parts, declared before you start:**

| Part | Here |
|---|---|
| **Trigger** | a symptom, or a diff about to be called done |
| **Goal** | the symptom is gone, and a check that catches its return is committed |
| **Execution** | reproduce → observe → diagnose → fix → lock in → re-verify |
| **Verification** | L1 red-before / green-after on the lowest rung that catches the bug |
| **Stopping rule** | fixed and locked in, or three distinct failures on the same rung |
| **Memory** | the regression test, the `.http` request or eval case, the report — all on disk |

**Terminal states.** `Success` — reproduced, fixed, and a regression check went red then green ·
`No-op` — the symptom does not reproduce on current `main` (say so; do not invent a fix) ·
`Blocked` — Docker down, no AppHost, no reproduction surface, missing input the bug needs ·
`Stalled` — the same rung failed three times for three different reasons; the diagnosis is wrong ·
`Exhausted` — the time or token ceiling hit with the loop unclosed · `Approval-required` — the only
route to green edits a frozen assertion, weakens an invariant, or touches data a human must sign off.

## When to Use

- A change is written and you are about to say it works.
- A reported symptom: `RUN_ERROR`, an unexpected 403, a tool never called, an empty tab, a write
  that happened without approval.
- A test went green suspiciously easily, especially right after an assertion was edited.
- Reviewing a PR that claims done and carries no runtime evidence.
- Before moving a board card out of In Progress.

## Stop Signals

- **No `RUNBOOK.md`, no integration fixture, no `.http` catalog** → there is no rung to lock a fix
  into. Install the surface first: `../install-runbook/SKILL.md`.
- **No specific change and no symptom** → this loop needs a target. A general "does it still work"
  is a smoke run; use `plenipo-runbook`.
- **The feature isn't written yet** → this loop starts at a diff or a failure, not at a blank file.
- **Docker isn't running or the AppHost won't boot** → `Blocked`. Reading the code instead is L4 and
  is not a substitute.
- **The repo has no `Plenipo.*` package references** → not a Plenipo product; this contract's
  surfaces (dev auth, Mock provider, AG-UI) don't exist there.

## Inputs

| Input | Where it comes from | Used for |
|---|---|---|
| The change under test | `git diff` against the base branch | blast radius — which rungs the change can reach |
| The symptom | the issue, the user report, the failing test output | the reproduction target |
| Reproduction surface | `<product>.http`, the AG-UI route + module id, a test filter, a UI route | the narrowest thing that still fails |
| Identity to reproduce as | `X-Dev-Subject` / `X-Dev-Tenant` / `X-Dev-Roles` | RBAC-shaped failures need the *failing* role, not `system_admin` |
| Run mode | the product `RUNBOOK.md`; `aspire run` when telemetry is needed | observation |
| The test ladder | the rungs listed in `RUNBOOK.md` | where the lock-in check goes |
| Frozen assertions | pinned manifest tests, golden eval cases, security tests | the yardstick — see *Specification gaming* |

Read all of these from the repo. A reproduction built on a guessed module id or port fails for a
reason that has nothing to do with the bug, and costs a full cycle to notice.

## Workflow

1. **Declare the loop, in one line each.** Trigger, goal, execution, verification, stopping rule,
   memory. If you cannot state the stopping rule, you are improvising and it will not terminate
   cleanly. Write the goal as an observable: *"a request that returns 500 today returns 200 with
   `{…}`"*, never *"the tenant filter is correct"*.

2. **Freeze the yardstick before touching code.** List the checks that decide done — the test
   projects, the specific eval cases, any pinned manifest assertion the change could disturb — and
   record their current state. Anything on that list you later edit is a deliberate, reported act.

3. **Choose the narrowest reproduction surface that still fails.**

   | Surface | How | Use when |
   |---|---|---|
   | `.http` request | the committed catalog, with dev-auth headers | endpoint, payload, status code, RBAC |
   | AG-UI turn | `POST /api/agui/{moduleId}`, read the SSE stream | tool routing, approval gate, protocol shape |
   | Integration test | `dotnet test tests/<Product>.IntegrationTests --filter …` | it reproduces headlessly and you want it permanent |
   | UI interaction | the SPA resource under the AppHost | only the frontend can produce it |

   **Never reproduce through the UI what a request reproduces.** Every layer you add is a layer you
   must later rule out. Record the exact input and the exact wrong output, verbatim — "it errors" is
   not a reproduction. Reproduce **twice**: a failure you cannot repeat on demand is a report, not
   yet a bug, and fixing it will teach you nothing.

4. **Observe telemetry before reading source.** Launch with **`aspire run`** — plain `dotnet run`
   does not open the backchannel, so the Aspire MCP will insist nothing is running. Then read, in
   this order:

   1. the **trace** for the failing request — the tool call, the approval interception, and the DB
      round-trips sit on one timeline;
   2. the **structured logs** on the failing span;
   3. the resource's **console logs**;
   4. only then, **source**.

   Find the first point where reality diverges from what you expected. Everything before it is fine
   and does not need reading. For a chat turn, diff against the healthy sequence —
   `RUN_STARTED → TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT × n → CUSTOM(token_usage) →
   TEXT_MESSAGE_END → RUN_FINISHED` — the first missing or extra event names the layer at fault, and
   `RUN_ERROR` is always a failure. For wiring questions the answer is an endpoint, not a file:
   `GET /api/platform/modules` (did the module load), `GET /api/platform/me` (what can this caller
   do), `GET /api/admin/security/catalog` (is the tool registered, behind which permission),
   `GET /api/admin/audit/tool-calls` (did the agent really call it).

   Reading source first is the most expensive habit available here: you build a theory from code and
   then go looking for evidence that flatters it. Telemetry hands you evidence you did not choose.

5. **Pass the one-sentence diagnosis gate.** State the cause in a single sentence of this shape:

   > *`<component>` does `<wrong thing>` when `<condition>`, because `<mechanism>`.*

   It must name a file and a mechanism. **If you cannot write that sentence, you are still on step 4
   — go back. Do not start editing.** The tells are hedges: "something in the pipeline", "probably a
   race", "likely the query filter". A hedged diagnosis produces a speculative fix, and a speculative
   fix that happens to go green is the beginning of a `Stalled` loop.

6. **Fix one variable per turn.** The smallest change that addresses *that* cause. Then re-run the
   reproduction from step 3 **unchanged** — same command, same input, same identity. Changing the
   fix and the reproduction in one turn destroys attribution: you will not know which one moved the
   outcome. If the fix requires relaxing an invariant — the per-entity `HasQueryFilter`,
   `RequiresApproval = true` on a write, matching permission strings in the manifest and the tool
   source — stop. The invariant is right and the change is wrong.

7. **Prove the regression check red before it is green.** This is the step that gets skipped, and
   skipping it is why suites grow without catching anything.

   1. Write the check at the rung chosen in step 8.
   2. Remove the fix — `git stash` it, or check out the unfixed file.
   3. Run the check. **Watch it fail, and read the failure message.** It must fail *for the reason
      you diagnosed* — not on a compile error, a missing fixture, a null in setup, or a container
      that never started.
   4. Restore the fix. Run again. Green.
   5. Keep both outputs; they go in the report.

   A check never seen red may be asserting nothing. A check seen red for the *wrong* reason is
   worse: it proves the harness can break, not that the bug gets caught.

8. **Lock in at the lowest rung that would have caught it.**

   | Bug class | Lowest rung that catches it |
   |---|---|
   | domain logic, calculation, validation | rung 2 unit test |
   | manifest ↔ tool-source mismatch, permission-string drift | rung 2 module guard, confirmed against `security/catalog` |
   | RBAC 403, missing approval gate, AG-UI protocol shape | rung 3 **through `AdminClient()`** |
   | migration, query filter, cross-tenant leak | rung 3 — real Postgres, real migrations; assert a second tenant sees nothing |
   | tool routing, agent instructions, tool descriptions, approval flags | rung 4 golden eval |
   | SPA render or state | rung 5 |

   Climbing higher than necessary costs minutes on every future run, forever. Stopping lower than
   necessary means the bug comes back. **`AuthorizedScopeAsync()` bypasses RBAC and approvals by
   design** — a security assertion written there passes while the gate is broken, which is the most
   common false-green in this codebase.

9. **Re-run the ladder as far as the change actually reaches.** Build always. The changed project's
   tests always. Integration when the change touches host wiring, the manifest, entities, or
   permissions. Evals when it touches prompts, tool names, descriptions, or approval flags. Frontend
   when it touches the SPA. A green rung the change never reaches is not evidence of anything —
   report which rungs you ran, not that "the suite passes".

10. **Detect stagnation and stop deliberately.** You are `Stalled` when the same rung fails three
    times for three different reasons: the *diagnosis* is wrong, not the fix, and another attempt is
    spinning. Stop early also when the same action produces the same error twice, when the fix has
    outgrown the blast radius of the diagnosis, or when the only visible route to green edits a
    frozen assertion. Escalate carrying the reproduction, the observations, what you ruled out and
    *how*, and the current diff. A bare "I couldn't fix it" throws away the whole run.

11. **Report.** Evidence rules are below. Commit the reproduction alongside the fix — the `.http`
    request or the eval case is the loop's memory, and it belongs on disk, not in the transcript.

## Specification gaming — the assertion is not yours to move

Visible-test overfitting is the most common reward hack observed in the field, and it actively
*lowers* true resolution rates. This repo hands an agent two loaded guns:

- **The pinned tool manifest.** A product pins its tool list in a test — an exact, ordered assertion
  over `ModuleManifest.Tools`. Add a tool and it goes red. Editing that assertion is a one-line
  "fix", and it is the wrong move by default: the test exists so that growth of the agent's tool
  surface cannot happen without a human seeing it. **Its going red is the feature.**
- **Golden evals.** A case declares `expectToolCalls`, `forbidToolCalls`, `expectApproval`. Loosening
  a case, deleting it, or adding a `forbid` to route around a regression converts a behaviour
  regression into a passing suite.

The rule:

> **The verifier is never the thing being edited.** If the only path to green runs through an
> assertion, that is a finding to report — not a step to take.

When an assertion genuinely must change — you deliberately added a tool, renamed one, changed an
approval flag:

1. Change the code first, and see the assertion go red **for the expected reason**.
2. Update the assertion in its **own commit**, whose message says what changed and why.
3. Call it out in the report under its own heading — *Frozen assertions changed* — with the old and
   the new value.
4. Never bundle it silently into the feature commit.

Frozen by the same rule, and never relaxed to reach green: RBAC baseline assertions, approval-gate
tests, tenant-isolation tests, and the AG-UI event-sequence assertion. If the tenant filter blocks
your query, the query is wrong.

**Self-check before every commit:** `git diff --stat` over test files. Test lines changed and
production lines unchanged means you have an explanation to give, not a fix to ship.

## The report — what evidence has to carry

Every claim carries three things: the **exact command**, the **exact observed output** (pasted, not
paraphrased), and the **ladder level**.

| Claim | Not acceptable | Acceptable |
|---|---|---|
| reproduced | "the endpoint errors" | the exact request, the status, the body, run twice |
| diagnosed | "something in the tenant filter" | the one-sentence cause naming file and mechanism, plus the log line it came from |
| fixed | "it builds" | the red-before and green-after outputs of the regression check |
| verified | "tests pass" | each `dotnet test` command run, with its summary line, per rung |
| reviewed | anything implying a run | "L4: I read the path; no test covers it" |

**Never report an L4 conclusion with L1 confidence.** "I traced the code and it looks correct" is
the model's opinion, not field truth, and must say so in the same sentence — not in a footnote and
not by omission. If Docker was unavailable and rung 3 never ran, the report says rung 3 did not run;
it does not say "verified end to end". Name every rung you skipped and why. **Silent gaps read as
coverage,** which is exactly how unverified changes get merged.

## Guardrails

- **No runtime observation, no "done".** Compilation is not evidence. Careful reading is not
  evidence. A passing suite that does not reach the change is not evidence.
- **Security-shaped assertions go through `AdminClient()`**, through the real pipeline.
- **One variable per turn**, and the reproduction command never changes mid-loop.
- **Never weaken an invariant to get green** — per-entity query filters, approval on writes, matching
  permission strings, write-only secrets. A test that fails because an invariant held is a correct test.
- **Never edit a frozen assertion silently**; if it must change, that is `Approval-required`.
- **State the ladder level of every claim**, in the sentence that makes the claim.
- **Docker down, AppHost dead, no reproduction surface → `Blocked`.** An unverifiable change is not
  a
  verified one, and saying so costs far less than a false green.
- **Leave the reproduction behind.** The request or eval case that exposed the bug gets committed.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Reading source before telemetry | you find evidence for the theory you already had | trace → logs → source, in that order |
| Reproducing through the UI when a request would do | three layers to rule out instead of one | narrowest surface that still fails |
| Editing while the diagnosis is still a hedge | speculative fixes that go green for unknown reasons | the one-sentence gate is a gate |
| Writing the test after the fix and never seeing it red | a test asserting nothing ships as a guarantee | stash the fix, watch it fail, restore |
| Counting a compile error or fixture crash as "red" | proves the harness broke, not that the bug is caught | the failure message must match the diagnosis |
| Editing the pinned tool-list assert to add a tool | the yardstick that made tool growth visible is gone | separate, reviewed, reported commit |
| Proving approvals via `AuthorizedScopeAsync()` | passes while the gate is broken | `AdminClient()` |
| Changing the code and the reproduction in one turn | the outcome is unattributable | one variable per turn |
| Retrying the same action after the same error | spinning, not learning | third distinct failure on a rung = `Stalled` |
| `dotnet run` then wondering why the Aspire MCP sees nothing | debugging blind | `aspire run` opens the backchannel |
| Reproducing as `system_admin` for an RBAC bug | `*` hides the failure you were sent to find | send the narrow role and assert the 403 |
| Stock `postgres` in a reproduction container | the migration dies on the `vector` type before you reach the bug | `pgvector/pgvector` |
| "The suite passes" with no rung list | silent gaps read as coverage | name rungs run and rungs skipped |

## Related skills

- [`../install-runbook/SKILL.md`](../install-runbook/SKILL.md) — installs the surface this loop
  drives: the runbook, the Testcontainers fixture, the eval harness, the request catalog.
  **Load when:** any of them is missing and there is nothing to lock a fix into.
- `plenipo-runbook` — the product-independent run/observe/test contract: launch modes, dev-auth
  headers, the AG-UI event sequence, the five rungs and what each proves.
- `plenipo-platform` — the invariants that are never relaxed to make a check pass.
- `loop-discipline` — the verification ladder, the terminal states, and the anti-patterns this skill
  is built to prevent.
