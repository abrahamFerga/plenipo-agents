---
name: plenipo-module-sdk
description: >
  Member-by-member reference for authoring a Plenipo domain module in C#: IModule, the ModuleManifest
  record and every field it accepts, ToolDescriptor versus ModuleTool and why a tool needs both,
  IModuleToolSource, TabDescriptor and its camelCase field binding, ModuleDbContext with per-entity
  HasQueryFilter, and Permissions.ForTool. Reach for it while writing module code — declaring a tool,
  adding a tab, wiring a DbContext, or chasing a tool the agent never calls.
  USE FOR: exact type names, required versus optional manifest fields, the two-place tool
  registration, tab data binding, startup-validation rules. DO NOT USE FOR: what the platform already
  supplies and must not be rebuilt (plenipo-platform), or running and testing the result
  (plenipo-runbook).
license: MIT
---

# Authoring a Plenipo module

A module is the entire product-specific surface: tools the agent may call, tabs the UI renders,
entities the product owns, endpoints those tabs read. Everything else — auth, tenancy, RBAC,
approvals, audit, jobs, chat transports — is the platform's, and a module that reimplements any of it
is a bug. This skill is the member-by-member recipe for the part that *is* yours.

The module is **manifest-first**: tools, tabs, roles, jobs and instructions are static data the
platform reads *before any module code runs*, which is what lets it filter tools by the caller's
permissions before building the model request. The cost of that design is exactness. A manifest that
disagrees with the runtime registration fails silently, and the two most expensive mistakes here — a
tool declared in one place only, an entity with no query filter — both look like working code.

## When to Use

- Writing or changing a module: adding a tool, a tab, an entity, an endpoint, a job.
- A tool the manifest declares is never called, or 403s for `system_admin`.
- A tab renders with the right columns and no rows.
- Reviewing a module for the invariants that startup validation *doesn't* catch.

## Stop Signals

- **Deciding whether the platform already does it** → `plenipo-platform`. Ask that first; most of
  what feels missing is a seam you haven't found.
- **Running, exercising, or proving the change** → `plenipo-runbook`.
- **The repo has no `RUNBOOK.md` or integration fixture** → `../install-runbook/SKILL.md` before you
  can verify anything you write here.
- **Grading how sure you are that it works** → `loop-discipline`. Compiling is not evidence.

## The type surface

| Type | Kind | Yours to | Lives in |
|---|---|---|---|
| `IModule` | interface | implement once per module | `src/<Product>.<Module>/<Module>Module.cs` |
| `ModuleManifest` | sealed record | build as a property initializer | the same file |
| `ToolDescriptor` | record | list in `Manifest.Tools` | the same file |
| `IModuleToolSource` | interface | implement, register as a singleton | `Tools/<X>ToolSource.cs` |
| `ModuleTool` | sealed class | return one per descriptor | the tool source |
| `TabDescriptor` (+ `TabColumn`, `TabEditor`, `TabChart`, `TabAction`, `TabRowAction`) | records | list in `Manifest.Tabs` / `AdminTabs` | the manifest |
| `ModuleDbContext` | abstract class | derive from | `<Module>DbContext.cs` |
| `Permissions.ForTool` | static helper | call in **both** tool places | everywhere |

## `IModule`

```csharp
public interface IModule
{
    ModuleManifest Manifest { get; }
    void RegisterServices(IServiceCollection services, IConfiguration configuration);
    void MapEndpoints(IEndpointRouteBuilder endpoints);
    // optional, default implementations:
    Task MigrateAsync(IServiceProvider services, CancellationToken ct);
    Task SeedAsync(IServiceProvider services, CancellationToken ct);
}
```

- `Manifest` is read at startup, before DI exists. Keep it a pure initializer — no service lookups,
  no configuration reads, no I/O.
- `RegisterServices` is your DI: the module `DbContext`, domain services, the tool-source singleton.
- `MapEndpoints` maps the routes your tabs read, each gated with
  `RequireAuthorization(PermissionRequirement.PolicyName(...))` — never a hand-rolled check.
- `MigrateAsync` / `SeedAsync` are optional. Seed runs per tenant and **must set tenant ids
  explicitly** — background code has no ambient tenant.

## `ModuleManifest`

A sealed record. Three fields are required; the rest shape what the product can do.

| Field | Required | Notes |
|---|---|---|
| `Id` | **yes** | non-empty, unique across all loaded modules. This is the AG-UI route segment and the permission namespace. |
| `DisplayName` | **yes** | human-facing, shown in the module switcher. |
| `Version` | **yes** | the module's own version, independent of the platform's. |
| `Description` | no | one line, shown in the UI and to the routing agent. |
| `Icon` | no | icon key the frontend resolves. |
| `Tools` | no | `ToolDescriptor[]` — the declarative half of every tool. |
| `Tabs` | no | `TabDescriptor[]` — product UI. Routes must be unique **across all modules**. |
| `AdminTabs` | no | `TabDescriptor[]` under `/admin`. **Each MUST declare `Permission` or startup throws.** |
| `Onboarding` | no | first-run steps shown to a new tenant. |
| `Roles` | no | **declarative only — grants nothing.** Documents the roles the module expects. |
| `NotificationCategories` | no | categories users can subscribe to or mute. |
| `RecurringJobs` | no | `Kind` must be **globally unique across every module**; cadence `Hourly` \| `Daily` \| `Weekly`. |
| `AgentInstructions` | no | system-prompt text for this module's agent. Prompt-shaped — changing it changes behaviour with no code diff, so guard it with a golden eval. |
| `SuggestedPrompts` | no | starter prompts in the chat UI. Good ones name real tools. |
| `Agents` | no | agent profiles. **Narrowing only** — a profile can only shrink what RBAC already allows. |
| `Workflows` | no | multi-step workflows the module offers. |
| `SkillsPath` | no | folder of agent skills the module ships. |

> `Roles` grants nothing. To actually give a role a permission, use the host seam
> `builder.Services.AddPlenipoRole("your_role", [ … ])`, or edit the baseline in the admin console.
> Declaring a role in the manifest and expecting calls to succeed is a common half-day of confusion.

## Tools — the two-place rule

A working tool exists in **two places**, and they must agree:

| Place | Type | Purpose |
|---|---|---|
| `Manifest.Tools` | `ToolDescriptor` | static declaration read before DI — what the platform advertises and gates |
| the tool source | `ModuleTool` | the runtime binding — the actual callable `AIFunction` |

Declared but not sourced: the tool is advertised and never callable. Sourced but not declared: it is
callable and ungoverned. **Neither produces an error.** `GET /api/admin/security/catalog` is the
deterministic check that they line up.

### `ToolDescriptor`

| Member | Default | Notes |
|---|---|---|
| `Name` | — required | snake_case, stable. Renaming it is a behaviour change; add an eval case. |
| `Description` | — required | **model-facing.** This is what the model reads to choose the tool. Write it for selection, not for humans. |
| `Permission` | — required | `Permissions.ForTool(Id, Name)`. |
| `RequiresApproval` | `false` | **`true` for anything that changes state.** Non-negotiable. |
| `Audit` | `true` | leave it on. Turning it off removes the only record the call happened. |

### `IModuleToolSource`

```csharp
public interface IModuleToolSource
{
    string ModuleId { get; }
    IEnumerable<ModuleTool> GetTools(IServiceProvider scopedServices);
}
```

Registered as `services.AddSingleton<IModuleToolSource, LedgerToolSource>()`, but `GetTools` is
invoked **in the request scope** — that is why it is handed a scoped `IServiceProvider` rather than
resolving from a captured root one. Resolve your `DbContext`, `ITenantContext`, and domain services
from `scopedServices` inside the method. Never capture them in the source's constructor: a singleton
holding a scoped `DbContext` is a captive dependency and will hand you another request's tenant.

### `ModuleTool`

A sealed class.

| Member | Default | Notes |
|---|---|---|
| `ModuleId` | — | must match `Manifest.Id`. |
| `Name` | — | must match the descriptor exactly. |
| `Permission` | — | must match the descriptor **string for string**. |
| `Function` | — | an `AIFunction` (`Microsoft.Extensions.AI`), built with `AIFunctionFactory.Create(...)`. |
| `RequiresApproval` | `false` | mirror the descriptor. |
| `Risk` | `ApprovalRisk.High` (`= 0`) | `.Low` (`= 1`) is the other value. **A review-UI ceremony hint only — it never gates anything.** High is the default precisely because a forgotten value should read as "make the human look". |
| `Audit` | `true` | mirror the descriptor. |

> `Risk` is presentation; `RequiresApproval` is permission. Marking a destructive tool `.Low` does
> not weaken the gate — it just tells the human reviewer to stop looking, which is worse.

### Tool method style

The methods behind `AIFunctionFactory.Create` are plain C#. The attributes are not documentation —
they are the model's only input when choosing a tool and filling its arguments.

```csharp
public sealed class LedgerTools(LedgerDbContext db, ITenantContext tenant)
{
    [Description("List the caller's accounts with their current balances.")]
    public async Task<string> ListAccountsAsync(
        [Description("Optional filter: 'checking', 'savings' or 'credit'. Omit for all accounts.")]
        string? accountType = null,
        CancellationToken ct = default)
    {
        var accounts = await db.Accounts
            .Where(a => accountType == null || a.Type == accountType)
            .OrderBy(a => a.Name)
            .ToListAsync(ct);

        return accounts.Count == 0
            ? "No accounts match that filter."
            : string.Join("\n", accounts.Select(a => $"{a.Name}: {a.Balance:C}"));
    }
}
```

Rules that follow:

- `[Description]` on **the method and every parameter**. An undescribed parameter gets guessed.
- Return a **human-readable string** the agent narrates back. Returning JSON makes the model
  paraphrase a data structure, badly.
- Say "no results" in words. An empty string reads as a failure and triggers a retry.
- Do not check permissions inside the method — the runner filtered the tool out before the model ever
  saw it. A second check inside is dead code that will drift.

## Tabs and the server-driven UI

Tabs are declared in the manifest and rendered by the shell — grids, editors, charts, row actions,
and detail panes, with no custom React. The full `TabDescriptor` member table, the editor and chart
records, and **the camelCase trap** (a field-name mismatch yields a table with correct headers and
every cell silently blank) are in [references/tabs-and-ui.md](references/tabs-and-ui.md).

## `ModuleDbContext`

```csharp
public abstract class ModuleDbContext(DbContextOptions options) : DbContext(options);
```

Deriving from it is what stamps `CreatedAt` / `UpdatedAt`. Derive straight from `DbContext` and those
columns persist as `default` — silently, forever.

```csharp
public sealed class LedgerDbContext(DbContextOptions<LedgerDbContext> options, ITenantContext tenant)
    : ModuleDbContext(options)
{
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<Budget>  Budgets  => Set<Budget>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);

        // PlatformDbContext applies these by reflection. A module context does NOT.
        // One line per entity. A missing line is a silent cross-tenant leak.
        b.Entity<Account>().HasQueryFilter(a => a.TenantId == tenant.TenantId);
        b.Entity<Budget>().HasQueryFilter(x => x.TenantId == tenant.TenantId);
    }
}
```

- **`HasQueryFilter` per entity, every entity, no exceptions** — inject `ITenantContext` so the
  filter closes over the live tenant. A new entity without its filter line is the easiest
  catastrophic mistake available in a module.
- If a filter blocks a query you wanted, **the query is wrong**. Never `IgnoreQueryFilters()` to make
  a test pass.

## `Permissions.ForTool`

`Permissions.ForTool(moduleId, toolName)` → `tools.<module>.<tool>`. Call it in both tool places
rather than typing the string; a typo is a 403 that looks like a bug in RBAC.

| Grant | Means |
|---|---|
| `tools.ledger.set_budget` | that one tool |
| `tools.ledger.*` | every tool in the module |
| `*` | everything — this is what `system_admin` resolves to, and it is not customizable |

## Workflow — a minimal complete module

1. **The module class and manifest.**

   ```csharp
   public sealed class LedgerModule : IModule
   {
       public const string ModuleId = "ledger";

       public ModuleManifest Manifest { get; } = new()
       {
           Id = ModuleId,
           DisplayName = "Ledger",
           Version = "1.0.0",
           Description = "Accounts, budgets and spending analysis.",
           AgentInstructions = "You help the user understand and control their spending. " +
                               "Never state that a budget was changed before approval.",
           SuggestedPrompts = ["What did I spend on groceries last month?"],
           Tools =
           [
               new ToolDescriptor
               {
                   Name = "list_accounts",
                   Description = "List the caller's accounts with their current balances.",
                   Permission = Permissions.ForTool(ModuleId, "list_accounts"),
               },
               new ToolDescriptor
               {
                   Name = "set_budget",
                   Description = "Set the monthly budget for a spending category.",
                   Permission = Permissions.ForTool(ModuleId, "set_budget"),
                   RequiresApproval = true,          // it writes
               },
           ],
           Tabs =
           [
               new TabDescriptor
               {
                   Id = "accounts",
                   Label = "Accounts",
                   Route = "/ledger/accounts",       // unique across ALL modules
                   Home = true,
                   DataEndpoint = "/api/ledger/accounts",
                   Columns =
                   [
                       new TabColumn("name", "Name"),
                       new TabColumn("monthlyLimit", "Monthly limit"),   // camelCase!
                       new TabColumn("iban", "IBAN", Masked: true),
                   ],
               },
           ],
       };
   ```

2. **Registration** — the DbContext, the domain services, and the tool source.

   ```csharp
       public void RegisterServices(IServiceCollection services, IConfiguration configuration)
       {
           // Read the connection-string name from the host's appsettings — do not guess it.
           services.AddDbContext<LedgerDbContext>(o =>
               o.UseNpgsql(configuration.GetConnectionString(ConnectionName)));
           services.AddScoped<LedgerTools>();
           services.AddSingleton<IModuleToolSource, LedgerToolSource>();
       }
   ```

3. **Endpoints** — one per `DataEndpoint` / `DetailEndpoint`, returning a JSON array (an object for
   a
   detail route), each behind a permission policy.

   ```csharp
       public void MapEndpoints(IEndpointRouteBuilder endpoints)
       {
           endpoints.MapGet("/api/ledger/accounts",
                   async (LedgerDbContext db, CancellationToken ct) =>
                       await db.Accounts.OrderBy(a => a.Name).ToListAsync(ct))
               .RequireAuthorization(PermissionRequirement.PolicyName("ledger.accounts.read"));
       }
   }
   ```

4. **The tool source** — one `ModuleTool` per descriptor, resolved from the request scope.

   ```csharp
   public sealed class LedgerToolSource : IModuleToolSource
   {
       public string ModuleId => LedgerModule.ModuleId;

       public IEnumerable<ModuleTool> GetTools(IServiceProvider scopedServices)
       {
           var tools = scopedServices.GetRequiredService<LedgerTools>();
           return
           [
               new ModuleTool
               {
                   ModuleId = ModuleId,
                   Name = "list_accounts",
                   Permission = Permissions.ForTool(ModuleId, "list_accounts"),
                   Function = AIFunctionFactory.Create(tools.ListAccountsAsync),
               },
               new ModuleTool
               {
                   ModuleId = ModuleId,
                   Name = "set_budget",
                   Permission = Permissions.ForTool(ModuleId, "set_budget"),
                   Function = AIFunctionFactory.Create(tools.SetBudgetAsync),
                   RequiresApproval = true,
                   Risk = ApprovalRisk.High,
               },
           ];
       }
   }
   ```

5. **Bind it in the host** — `builder.AddPlenipoModule<LedgerModule>();`. That is the whole wiring.

6. **Prove it loaded.** `GET /api/platform/modules` contains `ledger` with its tabs;
   `GET /api/admin/security/catalog` lists both tools with matching permissions. Neither is optional.

## Adding one tool — the checklist

Every item, every time. Skipping any one of them fails silently.

1. `ToolDescriptor` in `Manifest.Tools` — `Name`, a **model-facing** `Description`,
   `Permission = Permissions.ForTool(ModuleId, name)`.
2. `RequiresApproval = true` if the tool changes any state. Ask "would a user want to see this before
   it happened?" — if yes, it writes.
3. The method: `[Description]` on the method **and on every parameter**; returns a readable string.
4. `ModuleTool` in the tool source — **same name, same permission string, same approval flag**.
5. Grant the permission to whichever role baseline needs it (`AddPlenipoRole`, or the admin console).
   The manifest's `Roles` grants nothing.
6. A golden eval case naming the tool: `expectToolCalls`, plus `expectApproval` when it is gated.
7. Run it and check `GET /api/admin/security/catalog`, then call it and check
   `GET /api/admin/audit/tool-calls`. Catalog proves registration; audit proves invocation.

## Startup validation rejects

The platform fails fast on a bad manifest. These throw at startup — treat them as the free half of
your L2 checks, and remember they are the *only* things checked:

- Module `Id` empty, or duplicated across loaded modules.
- Tab `Id` duplicated within a module.
- Tab `Route` duplicated **across all modules**.
- An `AdminTabs` entry with no `Permission`.
- A recurring job `Kind` duplicated **across all modules**.
- A row action whose `EndpointTemplate` has no `{field}` placeholder.

**Nothing validates that a `ToolDescriptor` has a matching `ModuleTool`, that their permission
strings agree, that a `DbSet` has a query filter, or that a `TabColumn.Field` matches the endpoint's
JSON.** Those four are on you, and they are where the real bugs live.

## Guardrails

- **Read the platform source before asserting a member exists.** The platform's own docs have been
  wrong about method names; source > tests > `.http` catalog > platform docs > product docs.
- **A permission string appears in exactly two places and must be identical in both.** Generate it
  with `Permissions.ForTool` in both, never by hand.
- **Every write is `RequiresApproval = true`,** and the tool's reply must not claim the write
  happened. The approval lane is the product feature; a "confirm?" prompt in your tool text is not.
- **A module `DbContext` derives from `ModuleDbContext` and declares `HasQueryFilter` per entity.**
  Both halves. Either one missing is a defect that ships.
- **Tab fields are camelCase.** Verify against the endpoint's actual response body.
- **Never hand-roll a permission check, an audit write, a tenant filter in a query, or a job
  scheduler.** Those exist; see `plenipo-platform`.
- **Prove security-shaped changes through `AdminClient()`.** `AuthorizedScopeAsync()` bypasses RBAC
  and approvals, so a gate test written against it passes while the gate is broken.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Tool in the manifest only | advertised, never callable, **no error** | add the `ModuleTool` too |
| Tool in the source only | callable and ungoverned | add the `ToolDescriptor` |
| Permission strings differ by a character | 403 even for `system_admin` | `Permissions.ForTool` in both places |
| `TabColumn("MonthlyLimit", …)` | table renders with rows and **blank cells** | camelCase — `"monthlyLimit"` |
| New entity, no `HasQueryFilter` | **silent cross-tenant leak** | one filter line per entity, always |
| Deriving from `DbContext` | `CreatedAt`/`UpdatedAt` persist as `default` | derive from `ModuleDbContext` |
| Capturing scoped services in the tool source's constructor | another request's tenant | resolve from `scopedServices` inside `GetTools` |
| Thin or human-flavoured tool `Description` | the model picks the wrong tool, or none | write it for tool selection |
| `Risk = ApprovalRisk.Low` on a destructive tool | reviewer relaxes; the gate still holds but the human stops looking | `Risk` is ceremony, `RequiresApproval` is the control |
| Declaring a role in `Manifest.Roles` and expecting access | grants nothing; calls still 403 | `AddPlenipoRole` or the admin console |
| Returning JSON from a tool method | the model paraphrases a data structure badly | return a readable sentence or list |
| Reusing a job `Kind` from another module | startup throws | prefix with the module id |
| Changing a tool name or description with no eval | behaviour changes with a green build | add a golden eval case |

## Related skills

- `plenipo-platform` — what the platform already provides and the invariants a module must not
  violate. **Load when:** unsure whether a capability is yours to build at all.
- `plenipo-runbook` — run the host, call the tool, read the AG-UI stream, check the catalog and audit
  endpoints. **Load when:** you want to prove any of the above actually works.
- `loop-discipline` — the verification ladder your "it works" claim is graded on.
- [`../install-runbook/SKILL.md`](../install-runbook/SKILL.md) — installs the fixture and eval
  harness this skill's checklist assumes. **Load when:** the product has none.
