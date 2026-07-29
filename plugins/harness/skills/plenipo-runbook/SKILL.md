---
name: plenipo-runbook
description: >
  How to run, observe, and prove a change in any product built on the Plenipo platform — the launch
  modes, dev-auth headers, the keyless Mock provider, the AG-UI event contract, Aspire telemetry, and
  the five-rung test ladder from build to golden conversation evals. Reach for this whenever asked to
  start, exercise, debug, or verify a Plenipo product, or when about to claim a change works.
  USE FOR: running the app, reproducing a bug, calling the API, choosing which tests to write, reading
  telemetry, deciding whether something is actually done. DO NOT USE FOR: writing module code (see
  plenipo-module-sdk) or installing this surface into a repo that lacks it (/deliver:install-runbook).
license: MIT
---

# Running and proving a Plenipo product

Every product on this platform runs and tests the same way. This is that contract, product-independent.

**Look for the product's own `RUNBOOK.md` first** — it has the real project names, ports, module id,
and hard-won gotchas. This skill is the fallback and the shared vocabulary. If the repo has no
runbook, that is a gap worth fixing with `/deliver:install-runbook`.

## When to Use

- Asked to start, run, demo, or debug a Plenipo-based product.
- About to say a change "works" — this skill tells you what that has to mean.
- Reproducing a reported bug, or deciding which rung of the ladder to write a test at.
- Reading Aspire logs, traces, or the audit log to find out what actually happened.

## Stop Signals

- **A product `RUNBOOK.md` exists** → read it; it wins on every specific (ports, names, ids).
- **You're in the Plenipo platform repo itself** → it owns `.claude/skills/run-plenipo`; use that.
  The platform's runnable demo is the **sample** AppHost — the bare `src/Plenipo.AppHost` loads no
  modules, so chat there has nothing to talk to.
- **The repo has no `Plenipo.*` package references** → it isn't a Plenipo product; none of this applies.

## Core mental model

A product is a **thin host on platform packages**. The security spine is not yours to build:

```text
your repo:      the domain module (tools, tabs, entities, endpoints)  +  a ~20-line host
the platform:   auth · multi-tenancy · RBAC-before-the-model · approvals · audit · jobs
                chat transports (SignalR, AG-UI) · documents + OCR · RAG · connectors · channels
```

If you are writing a permission checker, an audit trail, or a tenant filter, **stop** — you are
rebuilding the platform, and worse than it does.

**Keyless by default.** The `Mock` AI provider streams deterministic replies *and performs real,
audited tool calls including triggering the approval gate*. That is what makes the whole security
pipeline exercisable on a fresh clone and in CI with no secrets. Real providers are configured
**per tenant at runtime** under Admin → AI Settings, stored write-only. Deployment config carries no
chat key — if you are looking for one, you have misunderstood the model.

## Run

| Mode | Command | Use when |
|---|---|---|
| **Aspire AppHost** | `dotnet run --project src/<Product>.AppHost` | default — Postgres, Redis, API, UIs, dashboard |
| **Aspire CLI** | `aspire run` | same, **plus** the Aspire MCP can see it |
| **Headless** | build, throwaway Postgres container, run the built DLL | scripted verification, CI, no dashboard |
| **Compose** | `docker compose up -d` | verifying the shipping artifact (image + embedded UI) |

Prerequisites: **.NET 10 SDK** and **Docker running**. Node/pnpm only if you touch the frontend.

**The headless trap.** Launch the built DLL with its **working directory set to the build output**.
Otherwise ASP.NET's ContentRoot never finds `appsettings.Development.json`, the provider silently
falls back to `None`, and every turn answers `RUN_ERROR "AI provider is not configured"`. Pass
`--Ai:Provider=Mock` explicitly if you can't control the working directory.

**Postgres must be `pgvector/pgvector`,** not stock `postgres` — the platform's RAG migration creates
a vector column at startup and fails hard without the extension.

**Ready signals:** `GET /alive` → 200 (never calls the LLM, safe to poll) · `GET /health` → 200
(dependencies reachable) · `GET /api/platform/modules` contains your module id (manifest parsed).

## Authenticate

Development with no IdP registered uses the dev-auth fallback. Every call carries:

```http
X-Dev-Subject: dev-user
X-Dev-Tenant:  dev
X-Dev-Roles:   system_admin
```

`system_admin` holds the `*` permission. **To test RBAC, send a narrower role and assert the 403** —
that is the whole point of the header being per-request.

## Exercise

The repo's committed `<product>.http` catalog is the canonical request list; run it from VS Code
(REST Client) or a JetBrains IDE. Add a request whenever you add an endpoint.

**A chat turn over AG-UI** — `POST /api/agui/{moduleId}`, body
`{ "messages": [{ "id", "role", "content" }] }`,
response is SSE. A healthy turn streams:

```text
RUN_STARTED → TEXT_MESSAGE_START → TEXT_MESSAGE_CONTENT × n →
CUSTOM(token_usage) → TEXT_MESSAGE_END → RUN_FINISHED
```

A tool call adds `TOOL_CALL_START` / `TOOL_CALL_END`. An **approval-gated** tool emits
`CUSTOM(approval_required)`, and the reply must *not* claim the write happened. `RUN_ERROR` is always
a failure — most often the ContentRoot trap above, or a wrong module id.

SignalR (`/hubs/agent`, method `Stream`) is the other transport through the **same** authorized,
audited runner — proving one proves the pipeline.

**The endpoints that answer "is my wiring right?"**

| Question | Endpoint |
|---|---|
| did my module load, with which tabs? | `GET /api/platform/modules` |
| what can this caller actually do? | `GET /api/platform/me` |
| is my new tool registered, and behind which permission? | `GET /api/admin/security/catalog` |
| did the agent really call it? | `GET /api/admin/audit/tool-calls` |
| what did the turn cost? | `GET /api/admin/usage?days=30` (empty until a turn happens) |

## Observe

The **Aspire dashboard** shows console logs, structured logs, distributed traces, and metrics per
resource. A trace shows the tool call, the approval interception, and the DB round-trips on one
timeline — read it before reading source.

The **Aspire MCP/CLI** is the agent-readable view of the same OpenTelemetry (`list_resources`,
`list_console_logs`, `list_structured_logs`). When it claims no AppHost is running:

| Cause | Fix |
|---|---|
| started with `dotnet run` | relaunch with **`aspire run`** — only the CLI opens the backchannel |
| CLI/AppHost SDK version mismatch | update the CLI from the official installer |
| stale zero-byte `~/.aspire/cli/backchannels/aux.sock.*` | delete them |
| just started | discovery is push-based; wait a few seconds |

Resources named `*-installer` (run to completion) and `*-rebuilder` (stay `NotStarted`) are helpers,
not failures. In headless or scheduled runs the dashboard and MCP may be absent — use the headless
mode and read stdout.

## The test ladder

Each rung maps to a level on the verification ladder (see the `loop-discipline` skill).
**Climb to the rung that would actually catch your bug.**

| Rung | Proves | Level | Command |
|---|---|---|---|
| 1. Build | it compiles | L1 | `dotnet build <Product>.slnx` |
| 2. Unit / module guard | domain logic, manifest integrity | L1 | `dotnet test tests/<Product>.<Module>.Tests` |
| 3. Integration E2E | real host, real Postgres, real migrations, real approvals | L1+L3 | `dotnet test tests/<Product>.IntegrationTests` |
| 4. Golden evals | agent *behaviour*: routing, gating, protocol | L1 | runs inside rung 3 |
| 5. Frontend | UI builds, units pass | L1 | `pnpm -C frontend -r lint && -r test && build` |

**Rung 3** boots the real host via `WebApplicationFactory<Program>` against a Testcontainers
pgvector instance. Two entry points, and the choice is load-bearing:

- **`AdminClient()`** — an `HttpClient` with dev-auth headers, going through the *real* pipeline.
  The **only** way to prove RBAC, the approval gate, or the AG-UI protocol. Prefer it.
- **`AuthorizedScopeAsync()`** — a DI scope with tenant/user/permissions set, so you can call tool
  classes directly. Deliberately **bypasses** RBAC and approvals, so it can never prove them.

> A test that asserts "this write is approval-gated" but runs through `AuthorizedScopeAsync()` will
> pass while the gate is broken. This is the most common false-green in this codebase.

**Rung 4** guards prompt-shaped changes — agent instructions, tool descriptions, agent profiles —
which alter behaviour without altering code. Each case is a JSON file declaring `module`, `message`,
`role`, `expectToolCalls`, `forbidToolCalls`, `expectApproval`, `replyMustContain` /
`replyMustNotContain`. Every case implicitly asserts `RUN_STARTED` + `RUN_FINISHED` present and
`RUN_ERROR` absent; unknown fields fail loudly. Add a case when you change a tool name or
description, an approval flag, agent instructions, or an RBAC baseline.

Limit: the Mock provider matches tools by name token, so evals prove the **platform contract**
(routing, gating, protocol) — not real-model reasoning quality.

## The verification loop

`dotnet build` proves nothing. A change is done when a test that **fails without it** passes with it.

1. **Reproduce** through the narrowest surface that still shows the failure. Write down the exact
   input and the exact wrong output.
2. **Observe** the trace and logs — not the source. Find the first point where reality diverges.
3. **Diagnose** in one sentence. If you can't, you're still at step 2.
4. **Fix** — the smallest change addressing that cause. One variable at a time, so the check
   attributes the outcome.
5. **Lock in** at the lowest rung that would have caught it. Run it against the **unfixed** code and
   watch it fail first.
6. **Re-run** the ladder as far as the change reaches.

**Terminal states.** End in exactly one, and name it: `Success` · `No-op` · `Blocked` · `Stalled` ·
`Exhausted` · `Approval-required`. An error or a spent budget is never success. If the same rung
fails three times for three different reasons, you are **Stalled** — the diagnosis is wrong, not the
fix. Escalate with everything gathered rather than looping again.

## Guardrails

- **Prove it at runtime**, through a real request or the UI. Compilation is not evidence.
- **Security-shaped assertions go through `AdminClient()`.**
- **A new tool needs three things**: the `ToolDescriptor` in the manifest, the `ModuleTool` in the
  tool source, and the *same* permission string in both. `security/catalog` reveals the gap.
- **Writes are approval-gated** — `RequiresApproval = true`, and the reply must not claim success
  before a human approves.
- **Never commit a provider key.** They are per-tenant runtime settings in a write-only vault.
- **State your verification level.** "I read it and it looks right" is L4. Say so rather than
  implying a test ran.

## Common pitfalls

| Symptom | Cause / fix |
|---|---|
| `RUN_ERROR "AI provider is not configured"` | ContentRoot didn't load dev appsettings — set the working directory to the bin folder, or pass `--Ai:Provider=Mock` |
| `RUN_ERROR "Unknown module"` | wrong module id, or you're on the bare platform AppHost which loads none |
| migration fails on the `vector` type | the image must be **pgvector**, not stock `postgres` |
| Aspire: containers up, API never starts, stack hangs after the banner | stale Postgres data volume with a different baked-in password; health checks never pass and `WaitFor` blocks forever. `docker volume rm` it — dev data is throwaway |
| corrupted data after running two AppHosts | both mounted the same data volume. Host ports are pinned so the second run fails fast instead — don't unpin them |
| new tool never called, no error | missing from the manifest **or** the tool source; both are required |
| tool 403s for `system_admin` | manifest and tool source disagree on the permission string — use `Permissions.ForTool(id, name)` in both |
| admin/usage endpoints empty | token usage exists only after a chat turn |
| UI reaches the API under Aspire but not standalone | `Cors:Origins` binds as an array and stops at the first gap — indices must be **gapless** |

## Related skills

- `/deliver:install-runbook` — write this contract into a product repo as `RUNBOOK.md` plus a
  discoverable run skill, the E2E fixture, and the eval harness. **Load when:** a product has none.
- `/deliver:verify-runtime` — drive the verification loop above on a specific change.
- `plenipo-platform` — what the platform provides and the invariants you must not violate.
