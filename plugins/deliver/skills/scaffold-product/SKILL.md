---
name: scaffold-product
description: >
  Create a brand-new product repo on the Plenipo platform: the four-project skeleton — Aspire
  AppHost, thin Host, the domain module that holds all the real code, optional product-owned
  connectors — plus the two test projects, the vendored `.packages/` NuGet feed with source
  mapping, and the root governance files. A deliberately thin scaffolder: the platform is the
  foundation, so there is no backbone to generate.
  USE FOR: turning a decided brand name and domain into a repo that builds, boots under Aspire,
  and lists its module id. DO NOT USE FOR: adding tools, entities or tabs to a module that
  already exists (`../plenipo-module-sdk/SKILL.md`), or fitting the run-and-prove surface onto a
  repo that already has the skeleton (`../install-runbook/SKILL.md`).
license: MIT
disable-model-invocation: true
---

# Scaffold a product

A Plenipo product is four projects, two test projects, and a folder of documents. Everything that
would normally be "the backbone" — auth, tenancy, RBAC-before-the-model, approvals, audit, jobs,
chat transports, documents, RAG, the admin console — arrives as a package reference. So this skill
generates almost nothing: it lays down a skeleton whose only interesting file is the domain module.

That inversion is the point, and it is the opposite of a foundations epic. There is no backbone to
generate, so the work is **discover the platform primitive and bind to it**, never *build the
primitive*. A scaffold that produces a Domain/Application/Infrastructure quartet has already failed
— it has committed the product to reimplementing a security spine that was already correct.

**Terminal states:** `Success` (all three exit checks in step 9 pass) · `No-op` (the repo already
has `src/<Brand>.Host` and builds — you are extending a product, not creating one) · `Blocked`
(the brand or domain is undecided, the platform nupkgs are unreachable, or Docker is not running so
the AppHost cannot boot) · `Approval-required` (creating the remote GitHub repo, or writing into a
directory that already has files) · `Stalled` (the build fails three times for three different
reasons — the platform version you vendored is probably not the one the code targets; stop and
check it rather than editing more csprojs).

## When to Use

- A vertical is chosen, `SPEC.md` / `PLAN.md` / `ARCH.md` exist, and there is no repo yet.
- An empty or README-only repo exists and must be lifted onto the platform.
- A repo has the documents but no `src/` — the plan was written and never built.

## Stop Signals

- **`src/<Brand>.Host` already exists** → this is not a greenfield scaffold. Adding tools, entities,
  tabs or endpoints is `../plenipo-module-sdk/SKILL.md`.
- **The brand or the module id is not decided** → stop. Both leak permanently into namespaces,
  schema names, migration files, container names, permission strings and the AG-UI route. Renaming
  later is a migration, not a rename.
- **The platform nupkgs cannot be fetched** → `Blocked`. Do **not** fall back to nuget.org; the
  packages are not there, and a package of that name appearing publicly would be an attack.
- **You are inside the platform checkout** (`Plenipo.slnx` at the root) → this skill scaffolds
  *consumers* of the platform, not the platform.

## Inputs

| Input | Source | Used for |
|---|---|---|
| Brand (PascalCase) | a human's product-naming decision | assembly prefix, `<Brand>.slnx`, root namespaces, container names |
| Domain suffix (PascalCase) | the module in `ARCH.md` | `src/<Brand>.<Domain>`, the tests project |
| Module id (lowercase) | `ARCH.md`; becomes `ModuleManifest.Id` | AG-UI route `/api/agui/{moduleId}`, plan `Modules`, permission strings |
| Product id (lowercase slug) | the repo/brand slug | `ProductOffering.ProductId` |
| Platform version | the platform's `CHANGELOG.md` and git tags | the pin in every csproj and the nupkgs to vendor |
| Roles + permissions | `SPEC.md` RBAC model | `AddPlenipoRole(...)` calls |
| Connectors | `PLAN.md` integration surface | `src/<Brand>.Connectors.<X>` projects |
| GitHub owner | `workflow.json` `github.repo`, else `gh api user` | the remote, CI, the marketplace declaration |
| Postgres host port | an unused port you pick and record | `.WithHostPort(...)` — see *AppHost requirements* |

> **There is no naming prefix.** The brand is a real product name. Do not add, require, suggest or
> validate a `the-` prefix — that convention is dead, and a prefix baked into a namespace is
> permanent. Likewise, name projects after the brand, not after the repo folder.

**Never guess the platform version, and never assume the newest tag is the right one.** Read the
changelog, and rank sources the way the whole fleet has to: **source code > tests > the `.http`
catalog > platform docs > product docs.** The platform's own `BUILDING_A_PRODUCT.md` documents
`AddPlenipo()` / `UsePlenipo()`; those methods **do not exist**.

## The shape

```text
<repo>/
  src/
    <Brand>.AppHost/           Aspire orchestration. Postgres (x2 databases) + Redis.
                               References the Host project and NOTHING else.
    <Brand>.Host/              The product. ONE package reference: Plenipo.AspNetCore.
                               Program.cs is the seam list. No logic.
    <Brand>.<Domain>/          The ONLY real code: IModule + ModuleManifest +
                               IModuleToolSource + Persistence/ (own DbContext, own schema).
    <Brand>.Connectors.<X>/    Optional. Product-owned connectors on Plenipo.Connectors.Sdk.
  tests/
    <Brand>.<Domain>.Tests/    Module guard: manifest integrity, tool/permission parity.
    <Brand>.IntegrationTests/  Testcontainers pgvector + WebApplicationFactory<Program>.
  .packages/                   Vendored platform nupkgs. COMMITTED.
  .claude/settings.json        Marketplace + enabled plugins for this repo.
  .github/workflows/           ci.yml (restore/build/test, no secrets), release.yml.
  docs/  research/
  README.md SPEC.md PLAN.md ARCH.md DECISIONS.md SECURITY.md LICENSE
  workflow.json  global.json  nuget.config  <Brand>.slnx
```

What must **not** appear: a `ServiceDefaults` project (the platform ships `Plenipo.ServiceDefaults`),
`*.Domain` / `*.Application` / `*.Infrastructure` projects, an auth project, an outbox, a job
scheduler, a tenancy filter helper, or a permissions library. Each of those is the platform's.

## Workflow

1. **Confirm the inputs.** Read `ARCH.md` and `DECISIONS.md` for the module, the roles, the
   connectors and any recorded deviation. Write the resolved table above into the session before
   generating anything — every value appears in a dozen files and a late correction is a rename
   across namespaces, schemas and migrations.

2. **Create the repo shell.** Directory, `git init`, `LICENSE`, a README that states the vertical
   in one sentence, and `workflow.json` with `name`, `industry` (kebab-case), `stage`, `cloud`,
   `connectors[]`, `capabilities[]`, `github{}`. Resolve the owner from `gh api user` — **never
   hardcode it**. Write `.claude/settings.json` declaring this marketplace and the plugins the repo
   should enable. Creating the **remote** GitHub repo is a public, irreversible act: ask first, and
   report `Approval-required` until a human says yes.

3. **Vendor the platform, then guard the feed.** Download every `Plenipo.*.nupkg` of the pinned
   version into `.packages/` and commit them — the packages publish to a feed that needs a PAT even
   for public repos, so vendoring is what keeps `dotnet restore` working on a bare clone. Then
   `nuget.config`:

   ```xml
   <packageSources>
     <clear />
     <add key="plenipo-local" value=".packages" />
     <add key="nuget.org" value="https://api.nuget.org/v3/index.json" />
   </packageSources>
   <packageSourceMapping>
     <packageSource key="plenipo-local"><package pattern="Plenipo.*" /></packageSource>
     <packageSource key="nuget.org"><package pattern="*" /></packageSource>
   </packageSourceMapping>
   ```

   The mapping is a **dependency-confusion guard**, not a formality: without it, restore is free to
   prefer a public package that happens to be named `Plenipo.Something`. Add `global.json` pinning
   the .NET 10 SDK with `"rollForward": "latestFeature"`.

4. **Write the module — the only project with real code.** `Microsoft.NET.Sdk`, a
   `FrameworkReference` on `Microsoft.AspNetCore.App`, and package references to `Plenipo.Core`,
   `Plenipo.Application`, `Plenipo.Modules.Sdk` (plus `Plenipo.Connectors.Sdk` if you ship
   connectors) at the pinned version, alongside EF Core and the Npgsql provider. Seed:

   - `<Domain>Module.cs` — `IModule`, the `ModuleManifest` (id, tabs, tools, suggested prompts),
     and the permission string constants.
   - `<Domain>ToolSource.cs` — `IModuleToolSource`. **A tool needs both a `ToolDescriptor` in
     `ModuleManifest.Tools` and a `ModuleTool` here, carrying the same permission string.** One
     without the other is silently uncallable.
   - `Persistence/<Domain>DbContext.cs` — derives from **`ModuleDbContext`** (not `DbContext`, or
     `CreatedAt`/`UpdatedAt` persist as `default`), owns its own schema, and declares
     **`HasQueryFilter` per entity** in `OnModelCreating` with an injected `ITenantContext`.
     `PlatformDbContext` does this by reflection; a module context does not.

   Seed exactly **one read tool and one write tool**, and set `RequiresApproval = true` on the
   write. That gives the integration tests and the golden evals something real to assert against on
   day one. Member-by-member authoring is `../plenipo-module-sdk/SKILL.md`.

5. **Write the host — and keep it boring.** `Microsoft.NET.Sdk.Web`, a `UserSecretsId`, exactly one
   package reference (`Plenipo.AspNetCore`) and project references to the module and connectors.
   `Program.cs` in seam order:

   ```csharp
   var builder = WebApplication.CreateBuilder(args);
   builder.AddPlenipoPlatform();
   builder.AddPlenipoModule<YourModule>();
   builder.AddPlenipoConnector<YourConnector>();          // 0..n
   builder.Services.AddPlenipoProduct(new ProductOffering { /* plans */ });
   builder.Services.AddPlenipoRole("your-role", [ /* permissions */ ]);

   var app = builder.Build();
   app.UsePlenipoPlatform();
   app.Run();

   public partial class Program;   // so WebApplicationFactory<Program> can host it
   ```

   Omitting the trailing `public partial class Program;` costs you the integration-test project
   later, for no visible reason at the time.

6. **Write the AppHost.** `Aspire.AppHost.Sdk`, with `Aspire.Hosting.AppHost`,
   `Aspire.Hosting.PostgreSQL` and `Aspire.Hosting.Redis` (add `Aspire.Hosting.JavaScript` only if
   the product ships its own Vite UI). One Postgres server with **two** databases — the platform
   database and the separate append-only audit database — plus Redis; the API project waits for
   both databases. The AppHost project references **only** the Host. Every item in *AppHost
   requirements* below is mandatory, not advisory.

7. **Add the two test projects.** `tests/<Brand>.<Domain>.Tests` guards the manifest: ids non-empty
   and unique, tab routes unique, every admin tab carrying a permission, and every
   `ToolDescriptor` matched by a `ModuleTool` with the same permission string. `tests/<Brand>.IntegrationTests`
   boots the real host. Do not hand-roll the fixture, the `.http` catalog or the eval harness here —
   create the folder and let `../install-runbook/SKILL.md` own their content, so there is one source
   for that contract.

8. **Root documents and CI.** Carry `SPEC.md`, `PLAN.md`, `ARCH.md`, `DECISIONS.md` in from the
   define and shape loops; write `SECURITY.md`, `docs/`, `research/`, and a `<Brand>.slnx` listing
   every project under `/src/` and `/tests/` folders. `ci.yml` restores, builds and runs both test
   projects **with no secrets configured** — the Mock chat provider, the Mock embedder and dev-auth
   are what make that possible, and a scaffold that needs a key in CI is wrong.

9. **Prove it. This is the exit condition — three checks, all deterministic (L1).**

   ```bash
   dotnet build <Brand>.slnx                          # 1. green, warnings-as-errors
   dotnet run --project src/<Brand>.AppHost           # 2. the stack comes up
   curl -s localhost:<apiPort>/api/platform/modules \
     -H 'X-Dev-Subject: dev-user' -H 'X-Dev-Tenant: dev' -H 'X-Dev-Roles: system_admin'
   ```

   Check 3 must list your module id. `GET /alive` returning 200 is the safe readiness poll — it
   never calls the LLM. **A module that never loads still compiles**, so a green build alone is not
   evidence of anything. If any check fails, report the failing one and its terminal state; do not
   round up to `Success`.

10. **Hand off** to `../install-runbook/SKILL.md`, which installs `RUNBOOK.md`, the Testcontainers
    fixture, the golden evals, the `.http` catalog and the launch config. Do that before the first
    feature issue is worked — a product nobody can run is a product nobody can verify.

## AppHost requirements

Four rules. Each was learned by losing a development database, and each is one line of code.

1. **A FIXED dev Postgres password.** Declare it as a parameter with a literal default —
   `builder.AddParameter("<slug>-pg-password", "<slug>-dev-only", secret: true)` — and pass it to
   `AddPostgres`. Postgres bakes the password into the data volume at first init and never re-reads
   it. Aspire's *generated* password lives in user-secrets, so regenerating or losing them leaves
   the volume unopenable: `28P01 password authentication failed`, health checks never pass,
   `WaitFor` blocks **forever**, and the console shows nothing at all. A fixed default cannot drift.
   It is a local demo container credential and never a production one.

2. **A PINNED host port.** `.WithHostPort(15432)` (or whatever you recorded). `.WithDataVolume()` is
   shared by every AppHost instance on the machine, and two instances mounting it at once destroy
   the cluster — the second container clears the first's `postmaster.pid` as stale, the first
   self-kills mid-write, and you get corrupted indexes and ghost rows. With the port pinned, the
   second run fails fast at bind time with a clear error. **Never unpin a port to resolve a
   conflict**; that conflict is the guard doing its job.

3. **`pgvector/pgvector`, never stock `postgres`.** `.WithImage("pgvector/pgvector").WithImageTag("pg17")`.
   The platform's RAG migration creates a vector column at startup and fails hard without the
   extension. A volume created by a different Postgres major needs `docker volume rm` to reset —
   dev data is throwaway, so that is the fix, not a mystery to debug.

4. **GAPLESS `Cors__Origins__N` indices.** `IConfiguration` binds them as an array and stops at the
   first missing index, so a reserved-but-unfilled slot silently drops every origin after it — the
   UI reaches the API under Aspire and mysteriously fails standalone. Number them with a counter
   incremented **at the point of use**, never by pre-assigning a slot to a conditional front-end.

## Guardrails

- **Thin host, thick module.** If `Program.cs` grows past the seam list, the code belongs in the
  module — or you are fighting the platform.
- **One package reference in the Host.** A second one is a decision, and decisions go in
  `DECISIONS.md` with a reason.
- **Never scaffold what the platform provides.** No permission checks, no audit trail, no tenant
  filter helper, no chat endpoint, no job scheduler, no secrets store. Rebuilding one of those is
  the most expensive mistake available in this codebase.
- **Read the source before asserting an API exists.** Platform docs have been observed wrong about
  their own method names.
- **Keyless by default.** The scaffold must build, boot and test with the Mock provider, the Mock
  embedder and dev-auth. No provider key belongs in `appsettings*.json` or in CI.
- **Never hardcode the GitHub owner** or any project-name pattern. Read the owner from
  `workflow.json` or `gh api user`.
- **Do not write placeholder values into shipped files.** A scaffold containing `{{Module}}` or
  `TODO` in a manifest is worse than an absent file: the next agent trusts it.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Aspire's generated Postgres password + a data volume | the stack hangs forever after the banner, with no error | a fixed dev password parameter |
| Unpinned Postgres host port | two AppHosts corrupt the shared data volume | `.WithHostPort(...)`, and treat a bind failure as the guard working |
| Stock `postgres` image | startup migration fails on the `vector` type | `pgvector/pgvector:pg17` |
| Reserving a CORS index for a conditional UI | works under Aspire, breaks standalone, no error | gapless indices from a running counter |
| `nuget.config` without `packageSourceMapping` | restore may prefer a public package of the same name | map `Plenipo.*` to `.packages` |
| Generating a Domain/Application/Infrastructure quartet | a weaker copy of the platform, plus docs that describe deleted code | four projects; the module holds the code |
| Module `DbContext` without per-entity `HasQueryFilter` | **silent cross-tenant leak**, baked into every future entity | declare it per entity, injecting `ITenantContext` |
| Tool in the manifest but not the tool source (or vice versa) | never callable, and no error anywhere | both, same permission string; verify with `GET /api/admin/security/catalog` |
| Omitting `public partial class Program;` | integration tests cannot host the app | add it at the end of `Program.cs` |
| Declaring done at `dotnet build` | a module that never loads compiles fine | `/api/platform/modules` must list the id |

## Related skills

- `plenipo-platform` — the seams this skeleton is shaped by and the invariants it must not violate.
  **Load when:** deciding whether something belongs in the host, the module, or a connector.
- `../plenipo-module-sdk/SKILL.md` — the member-by-member module authoring recipe. **Load when:**
  step 4, and for every tool added afterwards.
- `../install-runbook/SKILL.md` — installs the run-and-prove surface on top of this skeleton.
  **Load when:** step 9 is green.
- `plenipo-runbook` — where the exit-condition checks, the dev-auth headers and the AG-UI event
  contract come from.
- `loop-discipline` — the ladder these exit checks sit on, and the terminal states named above.
