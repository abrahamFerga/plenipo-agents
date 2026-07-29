<!-- Template → {{product-repo}}/.claude/skills/run-{{product}}/SKILL.md
     Thin by design: this file exists so an agent DISCOVERS the runbook without being told it
     exists. Depth lives in RUNBOOK.md. Keep this under ~80 lines. -->
---
name: run-{{product}}
description: >
  Run, observe, and test {{Product}} locally — and prove a change actually works at runtime rather
  than merely compiling. Covers the Aspire AppHost, headless/CI mode, the docker-compose image,
  dev-auth headers, exercising the assistant over AG-UI, reading Aspire telemetry, and the five-rung
  test ladder (build → unit → Testcontainers E2E → golden evals → frontend). Zero API keys required.
  USE FOR: starting {{Product}}, reproducing a bug, calling its API, driving its UI, adding or
  running tests, verifying a feature before opening a PR. DO NOT USE FOR: platform-level Plenipo
  development (that lives in the Plenipo repo's own run skill).
license: MIT
---

# Run & test {{Product}}

**[RUNBOOK.md](../../../RUNBOOK.md) is the source of truth.** This skill is the index — read the
runbook section you need rather than guessing.

{{Product}} is a thin product host on the **Plenipo platform**. Auth, multi-tenancy,
RBAC-before-the-model, approvals, audit, jobs, chat transports, documents and RAG come from
platform packages. This repo owns the `{{ModuleId}}` domain module. **Do not rebuild platform
concerns here** — if you find yourself writing a permission checker, an audit log, or a tenant
filter, stop and use the platform's.

## The two commands

```bash
dotnet run --project src/{{Product}}.AppHost      # run it   (Aspire: Postgres, Redis, API, UIs)
dotnet test {{Product}}.slnx                       # prove it (unit + Testcontainers E2E + evals)
```

Docker Desktop must be running. No AI key: the assistant uses Plenipo's `Mock` provider, which
still performs **real, audited tool calls and triggers the approval gate**.

## Where to look

| I need to… | RUNBOOK section |
|---|---|
| start it (Aspire / headless / compose) | §2 Run |
| know when it's ready | §2 Ready signals |
| authenticate a request | §3 Dev authentication |
| call an endpoint | §4 — plus the committed [`{{product}}.http`](../../../{{product}}.http) catalog |
| send a chat turn and read the event stream | §4 AG-UI |
| check a tool's permission wiring | §4 `/api/admin/security/catalog` |
| read logs, traces, metrics | §5 Observe |
| decide which tests to write and run | §6 The test ladder |
| add a behaviour regression for a prompt change | §6 rung 4, golden evals |
| debug a failure methodically | §7 The verification loop |
| a symptom I've seen before | §8 Gotchas |

## Non-negotiables

- **Prove it at runtime.** `dotnet build` proves nothing. Exercise the change through a real
  request or the UI, then lock it in with a test that fails without the fix.
- **Use `AdminClient()` for anything security-shaped.** `AuthorizedScopeAsync()` bypasses RBAC and
  the approval gate by design, so it can never prove they work.
- **A new tool needs three things**: the `ToolDescriptor` in the manifest, the `ModuleTool` in the
  tool source, and the same permission string in both. `/api/admin/security/catalog` shows the gap.
- **Writes are approval-gated.** A tool that changes state sets `RequiresApproval = true`; the
  reply must not claim success before a human approves.
- **Never commit a secret.** Provider keys are per-tenant, entered at runtime under
  **Admin → AI Settings**, and stored write-only in the vault.
