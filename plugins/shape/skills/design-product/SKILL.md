---
name: design-product
description: >
  Turn PLAN.md into ARCH.md plus DECISIONS.md for a product on the Plenipo platform, where
  architecture is a delta against a stack that is already chosen: the module boundary and manifest,
  the tool surface with its permission strings and approval flags, the tab surface, the module
  DbContext and its per-entity query filters, the host seams used, connectors, and the plan model —
  then mark each backlog item Ready once its shape is settled.
  USE FOR: writing ARCH.md and the ADRs before any code exists, deciding what belongs in the module
  versus a host seam, gating every write, drawing the module's component view. DO NOT USE FOR:
  deciding what the product does or ordering its epics (/define:plan-system), or authoring module
  code member by member (/deliver:plenipo-module-sdk).
license: MIT
disable-model-invocation: true
---

# Design the product

On Plenipo, architecture is a **delta document**, not a from-scratch design. The stack, the layering,
auth, tenancy, RBAC, approvals, audit, observability, resilience, the job processor, the chat
transports and the admin console are already decided — in production, for real users. This skill
records how *this* product plugs into them, and nothing else.

The failure mode it prevents is a 40-page ARCH.md that chooses a web framework, an ORM, a cloud and
an auth provider, none of which were open questions, and buries the six decisions that actually were.
**If you find yourself writing an ADR to justify obeying the platform, that is backwards — delete
it.** The delta is small on purpose. A short ARCH.md here is a sign of understanding, not of laziness.

**Terminal states:** `Success` (ARCH.md + DECISIONS.md written, every epic mapped to a named seam, no
ADR restating a platform default, settled backlog items marked Ready) · `No-op` (PLAN.md unchanged
and every epic already mapped) · `Blocked` (no PLAN.md, or the vendored platform version is unknown
so the seams cannot be confirmed against source) · `Stalled` (an epic maps to no seam after reading
the platform source — record it as an open question, never invent a seam) · `Approval-required` (a
requested shape violates a platform invariant, or takes on a regulatory obligation the platform
supports but does not satisfy — a human decides, you do not design around it).

This phase tops out at **L2** on the verification ladder: rule checks over a document. There is no
L1 evidence at design time, and claiming any is the `Pretending L4 is L1` anti-pattern. The L1 proof
arrives when `/deliver:work-next-issue` builds it.

## When to Use

- PLAN.md exists with epics in build order, and the backlog is published as issues.
- A new capability is being added to a shipped product and its shape is not obvious — which seam,
  which permission, gated or not.
- A product's `ARCH.md` describes infrastructure the platform supplies (its own outbox, its own job
  scheduler, its own tenancy) and needs to be rewritten as a delta.
- Backlog items sit in `Backlog` because nobody has decided their shape.

## Stop Signals

- **No PLAN.md** → `/define:plan-system` first. Shaping an unplanned product invents scope.
- **The repo has no `Plenipo.*` package references** → there is no platform to delta against; either
  scaffold it with `/deliver:scaffold-product` or this is not a Plenipo product.
- **You are choosing what the product does** → that is the define loop, not this one.
- **You are writing module code** → `/deliver:plenipo-module-sdk`.
- **The decision is "should we obey the platform?"** → you already know. `plenipo-platform` lists the
  invariants; none of them are negotiable, and none of them earn an ADR.

## Inputs

| Input | Source | Used for |
|---|---|---|
| Epics, build order, capabilities per epic | `PLAN.md` | the epic → seam map; the exit condition |
| Roles, jobs to be done, regulatory constraints | `SPEC.md` | permission tiers, retention, gating |
| The seven host seams and the invariants | `plenipo-platform` | what is already decided |
| Vendored platform version | `.packages/` + `nuget.config`, cross-checked with the platform `CHANGELOG.md` | which seams and APIs actually exist in *your* pin |
| The reference product's module | the newest true product's `*Module.cs` (currently **networthy**) | a working manifest to imitate |
| GitHub owner + repo | `workflow.json`, else `gh api user` | marking items Ready. **Never hardcode an owner** |
| Existing tab routes across the fleet | other products' manifests | route uniqueness is enforced across *all* modules |

Read the platform's **source** before asserting an API exists. Trust ranking:
**source code > tests > the `.http` catalog > platform docs > product docs.** The platform's own
`BUILDING_A_PRODUCT.md` documents `AddPlenipo()`/`UsePlenipo()`; those methods **do not exist**. The
real ones are `AddPlenipoPlatform()` / `UsePlenipoPlatform()`.

## Already decided — do not re-decide, do not ADR

| Concern | Decided by the platform | Your only remaining choice |
|---|---|---|
| Host, web framework, layering | ASP.NET Core under `AddPlenipoPlatform()`; a ~20-line host | which endpoints your module maps |
| Database + ORM | EF Core 10 + Npgsql on **`pgvector/pgvector`** | your entities and their filters |
| Identity + dev auth | platform auth; `X-Dev-Subject` / `X-Dev-Tenant` / `X-Dev-Roles` fallback | which product roles you add |
| Authorization | dotted permission strings; tools filtered **before** the model request is built | your permission strings and tiers |
| Multi-tenancy | `ITenantOwned` + global query filters | declaring `HasQueryFilter` **per entity** in your context |
| Human-in-the-loop | `RequiresApproval = true` parks the call | *which* of your tools are writes |
| Audit | append-only audit database | nothing |
| Observability, resilience | OpenTelemetry via ServiceDefaults, the Aspire dashboard | nothing |
| Background work | recurring jobs declared in the manifest, run by the platform processor | your job `Kind`s and cadence |
| Chat transports | `POST /api/agui/{moduleId}` (SSE) and `/hubs/agent` (SignalR) | your module id, instructions, prompts |
| Admin console | the fixed `/admin` surface plus `AdminTabs` | which admin tabs you declare |
| Documents, OCR, RAG | the platform pipeline with per-collection gating | your collection granularity |
| Secrets | `ISecretVault`, write-only | nothing |
| Frontend shell | React 18 / Vite 6 / Tailwind **v3** + the platform UI | whether a tab needs custom React |
| Distribution | vendored nupkgs in `.packages/` with `<packageSourceMapping>` | the pinned version |

**There is no foundations or bootstrap epic here.** The platform *is* the foundation. Whenever you
feel the urge to generate a backbone, the correct move is the dual: **discover the existing primitive
and bind to it.**

## The delta — what is genuinely yours

Eight things, and only these, belong in ARCH.md:

1. **The module boundary** and its manifest shape.
2. **The tool surface** — name, description, permission, approval flag, risk tier.
3. **The tab / UI surface**, including any tab that needs custom React.
4. **The data model** and the module `DbContext`.
5. **Which host seams** the product uses, and which it deliberately does not.
6. **Connectors** — which data already lives elsewhere and must be reached, not replaced.
7. **The plan and entitlement model.**
8. **Product-specific decisions** — retention, an ethical wall, a tamper-evident log, a domain risk
   tier. These are the ones that earn an ADR.

## Workflow

1. **Load the ground truth.** Read `PLAN.md` and `SPEC.md`. Read `plenipo-platform` for the seams and
   invariants. Read the vendored platform version and confirm the seams you intend to use exist *in
   that version* — not in the newest tag, and not in the docs.

2. **Strike the pre-decided.** Walk every epic and cross out everything the table above already
   settles. What survives is the delta. If an epic disappears entirely, say so — it is a binding
   task, not a design task, and it goes straight to `/deliver`.

3. **Draw the module boundary.** Default to **one module per product**. Split only when two tool sets
   share no permission root and no entities. Fix the module id now: lowercase, stable, and the
   canonical vertical key — it appears in AG-UI routes, permission strings, eval cases and the fleet
   scan. Renaming it later breaks all four.

4. **Design the tool surface first — the tools are the product.** One row per tool:

   | Column | Rule |
   |---|---|
   | Tool name | verb-noun, stable; the Mock provider matches tools by name token, so evals depend on it |
   | Description | what the *model* reads to route; a vague description is a routing bug |
   | Permission | one dotted string, from `Permissions.ForTool(id, name)` |
   | `RequiresApproval` | **`true` for every state-changing tool**, no exceptions |
   | Risk tier | `read` · `propose` · `write-reversible` · `write-irreversible` · `external-effect` |
   | Why gated | one sentence naming what a bad write costs the user |

   `external-effect` (sends a message, files a document, moves money in the customer's world) is the
   tier to argue about: it is irreversible *outside* your database, so it deserves the narrowest
   permission you can justify, not merely an approval.

   Record that each permission string lands in **two** places — the `ToolDescriptor` in
   `ModuleManifest.Tools` and the `ModuleTool` from `IModuleToolSource` — and must be identical. The
   later L2 check is `GET /api/admin/security/catalog`, which reveals a tool declared in one place
   only. A tool present in just one is never callable and raises no error.

5. **Design the permission model.** Group the strings into tiers that match the roles in `SPEC.md`,
   then decide which product roles the host registers via `AddPlenipoRole`. Remember that agent
   profiles and tool selections can only **narrow** what RBAC already allows — never design a seam
   that grants. `system_admin` is not customizable; it always resolves to `*`.

6. **Design the tab surface.** For each tab: route, permission, and **server-driven or custom
   React**.

   - Default to server-driven. Custom React through the `moduleUi` seam is a real, recurring cost —
     a frontend build, a test surface, and a second place the product can rot.
   - Justify each custom tab in one sentence naming the interaction the declarative surface cannot
     express. "It will look nicer" is not that sentence.
   - **Tab routes must be unique across *all* modules in the deployment**, not just yours; startup
     validation rejects a collision. Admin tabs must declare a `Permission` or startup throws. A row
     action's `EndpointTemplate` must contain a `{field}` placeholder.
   - Confirm the exact `moduleUi` registration name against the platform's frontend package before
     committing to it in ARCH.md.

7. **Design the data model.** One row per entity, and make the query filter a **column**, not a
   sentence buried in prose:

   | Entity | Owns | `ITenantOwned` | Query filter declared | Notes |
   |---|---|---|---|---|

   Non-negotiables to state explicitly in ARCH.md, because they are the easiest catastrophic mistakes
   available: the module `DbContext` derives from **`ModuleDbContext`** (deriving straight from
   `DbContext` makes `CreatedAt`/`UpdatedAt` persist as `default`), and it declares **`HasQueryFilter`
   per entity** in `OnModelCreating`, injecting `ITenantContext`. `PlatformDbContext` does this by
   reflection; **a module context does not.** A missing filter is a silent cross-tenant leak, and the
   entity table is what makes an omission visible on review.

8. **Choose the host seams, explicitly.** One row per seam — `AddPlenipoModule<>`,
   `AddPlenipoConnector<>`, `AddPlenipoProduct`, `AddPlenipoRole`,
   `AddPlenipoTenantProvisionedHook<>`, `AddPlenipoNotificationChannel<>`,
   `AddPlenipoPlatformTools<>` — marked used or not used, each with a reason. *Not used, because…* is
   a decision; silence is an omission, and it is how products end up leaving half the platform on the
   table. If a capability fits no seam and no module surface, that is a strong signal you are
   fighting the platform: stop and re-read `plenipo-platform` before designing around it.

9. **Decide connectors and RAG granularity.** Name the systems the data already lives in and which
   need per-tenant OAuth. Decide the retrieval collection granularity — per tenant, per case, per
   document set — because it is a permission boundary, not a performance knob.

10. **Design plans and entitlements.** Define the `ProductOffering` tiers and which capability each
    gates. The plan on the server is authoritative; **never derive an entitlement from checkout
    metadata.**

11. **Design the agent surface.** Module instructions, suggested prompts, and any agent profile — all
    narrowing only. Note which prompt-shaped assets exist, because changing one later requires a
    golden eval case (rung 4 of the test ladder in `plenipo-runbook`).

12. **Write only the ADRs that survive the test.** See below.

13. **Draw one C4 diagram: the component view of the module.** Context and container are the
    *platform's* and are the same for every product — redrawing them adds pages and zero information,
    and the copy goes stale the moment the platform moves. The component view shows your tools, tabs,
    entities, endpoints and the seams they cross.

14. **Map every epic to a seam.** A table with a row per epic and a column naming the module surface,
    seam, tool, tab or entity that delivers it. **An epic with an empty cell is unshaped** — that is
    the exit condition, and it is the one thing in this skill that is mechanically checkable.

15. **Mark the settled backlog items Ready.** Only the items whose row is complete. Read the owner and
    repo from `workflow.json` (fall back to `gh api user`); never hardcode an owner. Moving everything
    to Ready at once hands `/deliver` work whose shape nobody decided.

16. **Report the terminal state** and the open questions. Unmapped epics stay open questions in
    ARCH.md — never a guessed seam.

## The ADR test

Write an ADR only when **all three** are true:

1. There was a **real alternative** you could have chosen.
2. The choice is **not implied** by a platform invariant.
3. Someone reading the code in six months would otherwise ask **"why is it like this?"**

Delete on sight: *"we will use EF Core"*, *"we will use Postgres"*, *"we will use RBAC"*, *"writes
will be approval-gated"*, *"we will be multi-tenant"*, *"we will use React"*, *"we will use the
platform's audit log"*. All of those are the platform, restated. An ARCH.md whose ADRs are all of
this kind is indistinguishable from every other product's, which means it says nothing about *this*
one.

ADRs that usually **do** earn their place: a retention or deletion policy the domain demands; an
ethical wall or conflict-check rule between tenants' own users; a tamper-evident or externally
verifiable log on top of the platform audit; a domain risk tier that makes one write need two
approvers; choosing to *not* use a seam a similar product uses; picking a connector over a manual
import; and any deliberate, documented deviation — which, for an invariant, is `Approval-required`
rather than yours to record.

Keep each ADR short: title, status, context, decision, consequences. A long ADR is usually a design
that has not converged.

## Output

**`ARCH.md`**

1. **Delta statement** — one paragraph: what the platform provides, what this product adds.
2. **Module boundary** and manifest sketch (id, tabs, tools, roles, instructions, jobs).
3. **Tool surface table** — the six columns from step 4.
4. **Permission model** — strings, tiers, product roles registered via `AddPlenipoRole`.
5. **Tab surface** — route, permission, server-driven or custom React, with the reason.
6. **Data model** — the entity table with the query-filter column, plus the `DbContext` note.
7. **Host seams** — seven rows, used or not, each with a reason.
8. **Connectors and RAG collections.**
9. **Plans and entitlements.**
10. **Background jobs** — `Kind` (globally unique across the deployment), cadence, tenancy.
11. **Agent surface** — instructions, prompts, profiles.
12. **C4 component view** of the module only.
13. **Epic → seam map** — the exit condition.
14. **Open questions.**

**`DECISIONS.md`** — the ADRs that passed the test, newest last, plus a short *"considered and not an
ADR"* list so the next agent does not re-litigate the platform.

## Guardrails

- **Delta, not design.** Any section that describes the stack rather than this product's use of it is
  drift. Cut it.
- **Never restate an invariant as a decision.** Obeying the platform is the baseline, not a choice.
- **Every state-changing tool is `RequiresApproval = true`.** A request for an ungated write is not
  a
  design trade-off; it is `Approval-required`, escalated to a human, and it stays gated meanwhile.
- **One permission string per tool, in both places.** Design it once and write it down once.
- **The query-filter checklist is per entity.** A context-level statement proves nothing.
- **Confirm APIs against source.** Docs in this ecosystem have been wrong about their own method
  names, and a confidently wrong ARCH.md is worse than none — everything downstream inherits it.
- **Do not copy layering from an older product's `ARCH.md`.** Several describe a Clean-Architecture
  split that was deleted when the product moved onto the platform. Code wins over docs, always.
- **No secrets, no keys, no connection strings** in any artifact this skill writes.
- **Read the GitHub owner, never hardcode it.**
- **State the ladder level.** Everything here is L2 at best; say so instead of implying something ran.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| An ADR for "we will use EF Core" | the real decisions drown in boilerplate; ARCH.md is interchangeable | apply the three-question ADR test |
| A Foundations / bootstrap epic | regenerates a weaker copy of the backbone the platform ships | discover the primitive and bind to it |
| Entity list with no per-entity query filter | **silent cross-tenant leak** shipped in the first build | a query-filter column per entity row |
| Deriving the module context from `DbContext` | timestamps persist as `default` | derive from `ModuleDbContext` |
| A tool designed into the manifest only | never callable, and no error anywhere | manifest + tool source, same permission string |
| A different permission string at each call site | tool 403s even for `system_admin` | `Permissions.ForTool(id, name)` in both |
| Custom React as the default for tabs | frontend cost and rot with no justification | server-driven unless a named interaction demands it |
| A tab route chosen without checking other modules | startup validation rejects the whole deployment | routes are unique across *all* modules |
| Reusing a recurring-job `Kind` | startup throws; the job never runs | `Kind` is globally unique |
| Redrawing the C4 context and container | pages of platform diagram that go stale | component view of the module only |
| Entitlements read from checkout metadata | plan bypass | the server-side plan is authoritative |
| Marking every backlog item Ready | `/deliver` picks up work whose shape nobody decided | Ready per item, once its row is complete |
| Guessing a seam for an unmapped epic | the guess becomes a build instruction | leave it an open question; that is `Stalled` |

## Related skills

- `plenipo-platform` — the seams, the invariants, and the verified API names. **Load when:** deciding
  whether something is yours to design at all.
- `plenipo-runbook` — the test ladder your design will later be proved against, including the golden
  evals that guard prompt-shaped assets.
- `loop-discipline` — the ladder level and terminal states every claim here is graded on.
- `/define:plan-system` — produces the `PLAN.md` this consumes.
- `/deliver:plenipo-module-sdk` — turns this design into module code, member by member.
- `/deliver:work-next-issue` — picks up the items this skill marked Ready.
