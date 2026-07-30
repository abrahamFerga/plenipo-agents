---
name: plenipo-platform
description: >
  What the Plenipo platform already provides — auth, multi-tenancy, RBAC-before-the-model, approvals,
  audit, jobs, chat transports, documents, RAG, connectors, channels — the host seams a product
  extends it through, and the invariants a product may never violate. Reach for it before writing any
  code in a Plenipo product, so you extend the platform instead of rebuilding a weaker copy of it.
  USE FOR: deciding whether something is yours to build, finding the right seam, checking an invariant,
  getting verified package and API names. DO NOT USE FOR: running or testing a product
  (plenipo-runbook), or the line-by-line module authoring recipe (/deliver:plenipo-module-sdk).
license: MIT
---

# The Plenipo platform contract

A product is a **thin host on platform packages**. The single most expensive mistake available here
is rebuilding something the platform already does — you will spend days and end up with a weaker
version of a security control that was already correct.

```text
your repo:      the domain module (tools, tabs, entities, endpoints) + a ~20-line host
the platform:   auth · multi-tenancy · RBAC-before-the-model · approvals · audit · budgets · jobs
                chat (SignalR + AG-UI) · documents + OCR · RAG · connectors · channels · admin console
```

## Trust ranking — read this before believing anything

Platform documentation has been observed to be wrong about its own API. Rank your sources:

**source code > tests > `plenipo.http` > the platform's docs > a product's docs**

Verified examples of the failure, as of July 2026:

| Claim | Where | Reality |
|---|---|---|
| `builder.AddPlenipo()` / `app.UsePlenipo()` | `BUILDING_A_PRODUCT.md` | **These methods do not exist.** The real ones are `AddPlenipoPlatform()` / `UsePlenipoPlatform()` |
| "packages publish to nuget.org" | the platform's `publish.yml` comment | **Not on nuget.org.** Products vendor nupkgs into a local `.packages/` feed |
| a product's `ARCH.md` / `OPERATIONS.md` | some product repos | may describe a Clean-Architecture layout **deleted** when the product moved onto the platform |

When a doc and the source disagree, the source wins and the doc is a bug worth reporting.

## When to Use

- Before writing any code in a Plenipo product — to find out whether it is yours to write.
- Choosing where a capability plugs in (module? connector? host seam? platform tool?).
- Reviewing a change for invariant violations.
- Needing a *verified* package name, API name, or version.

## Stop Signals

- **Running or testing** → `plenipo-runbook`.
- **Writing the module itself, member by member** → `/deliver:plenipo-module-sdk`.
- **Platform-level work** (changing the platform, not consuming it) → this is the wrong repo; the
  platform has its own contribution guide.

## Do not rebuild these

If you are writing one of these, stop:

| You're tempted to build | The platform already has it |
|---|---|
| a permission check in an endpoint or tool | `RequireAuthorization(PermissionRequirement.PolicyName(...))`; tools are filtered by permission **before** the model request is built |
| an audit trail | every tool invocation, data change, and token spend goes to a separate append-only audit database |
| a "are you sure?" confirmation for an AI action | `RequiresApproval = true` — the platform parks the call for a human |
| tenant filtering in queries | `ITenantOwned` + global query filters |
| a chat endpoint or streaming protocol | `/api/chat/stream`, `/api/agui/{moduleId}` (AG-UI), `/hubs/agent` (SignalR) |
| a job scheduler | recurring jobs declared in the manifest, run by the platform's processor |
| a file store or PDF reader | the tenant-scoped file store and platform document tools |
| a vector store or retrieval pipeline | the opt-in RAG pipeline with per-collection gating, hybrid search, and citations |
| a role editor or user admin screen | the admin console at `/admin` |
| token accounting or budgets | per-tenant usage tracking and budget enforcement |
| a secrets store | `ISecretVault` — write-only, never echoed back |
| an OAuth dance for a third-party data source | the connector SDK, with per-tenant enable and delegated OAuth |

## The host

The whole product host is roughly this. **These are the verified method names:**

```csharp
var builder = WebApplication.CreateBuilder(args);
builder.AddPlenipoPlatform();                              // the platform

builder.AddPlenipoModule<YourModule>();                    // 1. your domain
builder.AddPlenipoConnector<YourConnector>();              // 2. data sources you offer

builder.Services.AddPlenipoProduct(new ProductOffering { /* 3. plans */ });
builder.Services.AddPlenipoRole("your_role", [ /* … */ ]); // 4. product roles
builder.Services.AddPlenipoTenantProvisionedHook<T>();     // 5. post-provisioning
builder.Services.AddPlenipoNotificationChannel<T>();       // 6. delivery channels
builder.Services.AddPlenipoPlatformTools<T>();             // 7. product-wide tools

var app = builder.Build();
app.UsePlenipoPlatform();
app.Run();
```

Everything a product customizes is one of those seams. If your change doesn't fit a seam, that is a
strong signal it belongs in the module — or that you are fighting the platform.

## Invariants — non-negotiable

Violating any of these breaks a security property the platform guarantees by construction.

1. **Narrowing, never granting.** Agent profiles and tool selections can only *shrink* what RBAC
   already allows. No seam bypasses a permission gate — by design.
2. **Approval-first writes.** Any tool that changes state declares `RequiresApproval = true` and
   rides the human-in-the-loop lane. The reply must not claim success before approval.
3. **Secrets are write-only.** Never echo a stored secret to any caller. Credentials go through
   user-secrets / Key Vault at deploy time, or `ISecretVault` at runtime. No secret in
   `appsettings*.json`.
4. **Tenant isolation by construction — and a module must do its part.** Entities implement
   `ITenantOwned`. **`PlatformDbContext` applies the global query filter by reflection; a module's
   `DbContext` does not.** A module must declare `HasQueryFilter` **per entity** in `OnModelCreating`,
   injecting `ITenantContext`. Background code sets tenant ids explicitly. *This is the easiest
   catastrophic mistake in the codebase — a missing filter leaks another tenant's data silently.*
5. **A module `DbContext` derives from `ModuleDbContext`**, never straight from `DbContext` — else
   `CreatedAt`/`UpdatedAt` persist as `default`.
6. **Keyless by default.** Everything must work with the `Mock` chat provider, the `Mock` embedder,
   and dev-auth. A product's CI needs no external accounts.
7. **Admin tabs always declare a `Permission`** — startup validation throws otherwise.
8. **`system_admin` is never customizable** — it always resolves to `*`.
9. **A tenant's own AI connection never falls back to the deployment endpoint or key.** BYO-key
   traffic must not silently bill the operator.
10. **Warnings are errors.** Nullable enabled, code style enforced. New types `sealed` by default.

### Startup validation will reject

Module ids non-empty and unique · tab ids unique per module · tab **routes unique across all
modules** · admin tabs with a permission · recurring-job `Kind` **globally unique** · row-action
`EndpointTemplate` containing a `{field}` placeholder.

## Deliberately not extensible

Do not attempt these; the platform rejects them on purpose:

- **Admin-console pages** beyond `AdminTabs` — the console is a fixed surface.
- **Inbound channels** beyond the supported set.
- **Container-per-module** — explicitly rejected in an ADR; it would break the pre-model-call tool
  filtering that is the platform's whole security thesis.

## Packages and versions

**Platform packages are not on nuget.org.** A product vendors the nupkgs into a local `.packages/`
folder and pins them with `<packageSourceMapping>` in `nuget.config` — which is also a
dependency-confusion guard. To find the version a product should target, read the platform's
`CHANGELOG.md` and its git tags; do not guess, and do not assume the newest tag is what the product
has vendored.

Verified pins as of July 2026 — **re-check rather than trusting this table**, these move:

| Thing | Version |
|---|---|
| .NET | `net10.0` |
| Aspire | 13.4.x (`Aspire.Hosting.JavaScript` provides `AddViteApp`/`WithPnpm`) |
| EF Core | 10.0.x, Npgsql provider 10.0.x |
| Microsoft Agent Framework | `Microsoft.Agents.AI` 1.13.x |
| React / Vite / Tailwind | 18 / 6 / **v3, not v4** |
| Postgres | **`pgvector/pgvector`** — required for the RAG pipeline |

> A product referencing **`Cortex.*`** packages is on the pre-rename platform and is stale by
> definition — the platform was renamed Cortex → Plenipo. Its checkout directory may still be called
> `Cortex`; identify the platform by `Plenipo.slnx`, never by folder name.

## Guardrails

- **Read the source before asserting an API exists.** Docs have been wrong about method names.
- **When a capability feels missing, look for the seam before building it.** Seven seams cover most
  of what a product needs.
- **A permission string appears in exactly two places** — the manifest's `ToolDescriptor` and the
  `ModuleTool` — and they must match. `GET /api/admin/security/catalog` shows the truth.
- **Never weaken an invariant to make a test pass.** If tenant filtering blocks your query, the query
  is wrong.

## Common pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Module `DbContext` without per-entity `HasQueryFilter` | **cross-tenant data leak**, silent | declare the filter per entity, inject `ITenantContext` |
| Deriving a module context from `DbContext` | timestamps persist as `default` | derive from `ModuleDbContext` |
| Copying `AddPlenipo()` from the docs | does not compile | `AddPlenipoPlatform()` / `UsePlenipoPlatform()` |
| Adding a tool to the manifest only | never callable, no error | add the `ModuleTool` too, with the same permission |
| Writing state without `RequiresApproval` | the AI mutates user data unreviewed | flag it; the gate is the product |
| Building a "confirm" dialog for an AI action | duplicates the approval lane, inconsistently | use `RequiresApproval` |
| Trusting checkout metadata for entitlements | plan bypass | the plan is authoritative |

## Related skills

- `plenipo-runbook` — how to run the thing and prove a change works.
- `loop-discipline` — the verification ladder and terminal states every claim is graded on.
- `/deliver:plenipo-module-sdk` — the member-by-member module authoring recipe.
- `report-harness-gap` — **Load when:** source contradicts something on this page. This skill is a
  snapshot of a moving platform, so it is the one most likely to go stale — and the "do not rebuild
  these" table going stale is how a product quietly rebuilds a weaker copy of a seam that exists.
