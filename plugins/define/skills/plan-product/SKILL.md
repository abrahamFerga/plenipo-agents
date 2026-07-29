---
name: plan-product
description: >
  Turn an accepted SPEC.md into PLAN.md — capabilities grouped into epics in build order, the module
  split (default: exactly one domain module), a per-module tool inventory carrying permission strings
  and approval flags, the tab list, the connector surface, background jobs, the refined role model,
  and the open questions the design loop must settle. Epic 1 is the thinnest real slice of the domain
  that proves module loads + tool runs + approval gate fires + tab renders; there is no Foundations
  epic, because the platform already is the foundation.
  USE FOR: sequencing capabilities into epics, deciding how many modules, naming every tool and its
  permission before any code exists, turning spec roles into concrete grants, listing what the design
  loop still has to decide. DO NOT USE FOR: writing the spec itself (../synthesize-spec/SKILL.md),
  publishing epics as GitHub issues on a board (../sync-backlog/SKILL.md), or pinning versions,
  schemas, solution layout and ADRs (/shape:design-architecture).
license: MIT
disable-model-invocation: true
---

# Plan the product

`SPEC.md` says what the product is. `PLAN.md` says what gets built, in what order, and what each
piece is made of — epics, modules, tools, tabs, permissions, jobs — precisely enough that
`../sync-backlog/SKILL.md` can turn it into GitHub issues without a second round of thinking.

The Plenipo-specific move is **subtraction**. Most of what a spec asks for — sign-in, roles, an
audit trail, an approval gate, file upload and OCR, retrieval, a chat surface, an admin console,
per-tenant AI keys — is already running before you write a line. Planning starts by striking all of
it. What remains is smaller and stranger than a greenfield plan: mostly a list of tools an agent may
call, the permission gating each, and which of them park for a human.

**Terminal states:**

| State | Meaning here |
|---|---|
| `Success` | PLAN.md written, every SPEC must-have owned by exactly one epic, epic 1 is a domain slice |
| `No-op` | PLAN.md already covers the current SPEC — the spec has not moved since it was written |
| `Blocked` | no SPEC.md, or SPEC.md has no must-have list to partition |
| `Stalled` | a must-have still has no owning epic after two passes — record it under Open questions and say so; do not invent an epic to absorb it |
| `Approval-required` | the plan is structurally complete but proposes more than one domain module, a new connector, or a platform-level change — a human accepts before the backlog is published |

The Definition loop's verifier is **L2 structural completeness plus L5 human acceptance**. There is
no compiler for a plan; say that rather than implying one ran.

## When to Use

- SPEC.md is accepted and no epics exist yet.
- The spec changed — capabilities added or cut — and the partition no longer covers it.
- The board is about to be created and `sync-backlog` needs epics with capability lists.
- Mid-build a capability turns out to belong to no epic. Re-plan that slice rather than smuggling it
  into whatever issue is open.

## Stop Signals

- **No SPEC.md, or no must-have list in it** → `../synthesize-spec/SKILL.md` first. Planning an
  unwritten spec produces epics nobody agreed to.
- **Choosing packages, schemas, project layout, or writing ADRs** → that is the design loop,
  `/shape:design-architecture`. A plan that pins a version has stolen a decision and left no ADR.
- **Epics already exist and you want issues on a board** → `../sync-backlog/SKILL.md`.
- **About to plan work inside the Plenipo platform repo** → wrong repo. A missing platform primitive
  is an open question with a named decider, never an epic here.

## Inputs

| Input | Where it comes from | Used for |
|---|---|---|
| Must-haves / differentiators / out-of-scope | SPEC.md capability sections | the epic partition; the coverage check compares against this list verbatim |
| Roles | SPEC.md RBAC section | refined into concrete permission strings |
| Product name, brand prefix | SPEC.md and the repo | `<Brand>.<Domain>` module project, `tools.<module>.<name>` permissions |
| Platform seams + the "do not rebuild" table | `plenipo-platform` | step 1's subtraction — the largest scope cut available |
| Reference product | the newest true product on the platform (currently **networthy**) | what a real tool/tab/permission inventory looks like at scale |

Read a reference product before inventing a shape, and discount what you read: **the-lawyer /
Casewell still references pre-rename `Cortex.*` packages** and is stale by definition. The product
name comes from SPEC.md — there is no naming convention to satisfy, and the old `the-*` prefix is
dead; do not add one, suggest one, or check for one.

## Workflow

1. **Subtract the platform, before grouping anything.** Walk every SPEC capability against the "do
   not rebuild" table in `plenipo-platform`. Strike each one the platform already delivers and record
   it in a *Delivered by the platform* table naming the seam that supplies it — auth, tenancy, RBAC
   before the model, approvals, audit, budgets, jobs, chat transports, documents + OCR, RAG,
   connectors, channels, admin console. None of these is an epic. This step routinely removes a third
   of a naive plan, and it is the difference between a two-week product and a two-month one.

2. **Choose the module split — the default is exactly one.** One cohesive domain module,
   `<Brand>.<Domain>`. Propose a second only when all three hold: disjoint entity sets with no
   foreign keys between them, disjoint audiences with disjoint permission surfaces, and independent
   release cadence. Two extra facts make splitting expensive here:

   - Every module gets its own `DbContext`, and **a module `DbContext` must declare `HasQueryFilter`
     per entity** (`PlatformDbContext` does it by reflection; a module context does not). Each extra
     module multiplies the highest-consequence mistake available in this codebase — a silent
     cross-tenant leak.
   - Tab **routes are unique across all modules** and recurring-job `Kind` values are globally
     unique. More modules means more startup-validation surface for no domain benefit.

   Splitting by layer — Domain / Application / Infrastructure — is **not** a module split. That
   Clean-Architecture instinct is exactly what the platform replaced; layers are files inside the
   one module. Proposing more than one module is an `Approval-required` outcome.

3. **Sketch the entities the module owns.** One line each: name, the fields that matter, and a
   `PII` marker where the field is personal. Confirm every entity is `ITenantOwned`. This is
   conceptual only — the schema is the design loop's output — but the tool inventory in step 4 is
   unwritable without it.

4. **Inventory the tools, per module.** This is the highest-value table in PLAN.md: it is the
   product's real API to the agent, and it determines RBAC.

   | Tool | Does | Permission | Approval | Epic |
   |---|---|---|---|---|
   | `list_accounts` | read, for routing by the model | `tools.finance.list_accounts` | no | 1 |
   | `log_transaction` | writes one row | `tools.finance.log_transaction` | **yes** | 1 |

   Rules: `snake_case` verb_noun names; the *Does* column is what the model actually routes on, so
   write it as a description, not a label; permission strings are `tools.<module>.<name>` and each
   appears in **two** places at build time (the manifest `ToolDescriptor` and the `ModuleTool`) — plan
   it once so both copies agree. **Every state-changing tool sets `RequiresApproval = true`**, decided
   here, not discovered later.

5. **Inventory the tabs.** id, route, permission, epic. Routes must be unique across every module in
   the product. **Admin tabs must declare a permission** or startup validation throws. A tab that
   only renders what a tool already returns is a thin epic, not a separate one.

6. **Epic 1 is a walking skeleton through the platform. There is no Foundations epic.** Say this in
   PLAN.md explicitly, because the instinct to bootstrap a backbone is strong and wrong here — the
   backbone is `AddPlenipoPlatform()`. Epic 1 picks the thinnest *true* capability from the must-have
   list and proves four things end to end:

   1. the module loads — `GET /api/platform/modules` lists its id;
   2. one read tool answers a real domain question over real domain data;
   3. one write tool parks on the approval gate — the AG-UI turn emits `CUSTOM(approval_required)`
      and the reply does **not** claim the write happened;
   4. one tab renders that data.

   **The test:** if epic 1's description would read identically for a product in any other industry,
   it is a bootstrap epic and it is wrong. Rewrite it around a capability a user would name.

7. **Group the remaining must-haves into epics and order them.** Each must-have has exactly **one**
   owning epic; a capability another epic needs is a dependency edge, not a second listing. Order by,
   in priority: what the next epic needs to already exist (entities before the views over them), then
   risk (unknowns early — but never ahead of the skeleton), then differentiators last so they can
   slip without blocking v1. State each epic's dependency edges explicitly; `sync-backlog` turns them
   into build order on the board. A capability that is a structural fact rather than work — "open
   source", "self-hostable" — gets no epic; say so in one line instead of manufacturing one.

8. **Refine the permission model.** SPEC's roles become the concrete strings from step 4. The shape
   that works: a wildcard grant for the admin role (`tools.<module>.*`), an **enumerated allowlist**
   for each narrower role, plus module-level policy constants for tabs and endpoints, which are
   separate from tool permissions. `system_admin` is never customizable — it always resolves to `*`
   and it is not a product role. Roles narrow what RBAC allows; nothing in a plan may grant.

9. **Define the connector surface — or write "none".** A connector is for a third-party system whose
   data or actions the product needs. It is a separate project, `<Brand>.Connectors.<Vendor>`,
   registered with `AddPlenipoConnector<T>()`: not a module, not a platform change. Table: vendor,
   direction, purpose, webhook route, per-tenant config. Every credential is write-only via
   `ISecretVault`. An empty connector surface is a perfectly good answer — most v1 products have one.

10. **Inventory background jobs.** Table: job, `Kind` (globally unique — this is startup-validated),
    trigger (scheduled or reactive), cadence, what it reads and writes, and whether it crosses a
    tenant boundary. Background code sets tenant ids explicitly; a job with no stated tenant story is
    a leak waiting to happen. Jobs run on the platform's processor — do not plan a scheduler.

11. **Write the open questions for the design loop.** Each one names the decision, the realistic
    options, and **who or what decides it**. A question with no decider is a wish. The highest-value
    question you can ask here is always *"is this capability ours, or a missing platform primitive?"*
    — asked now it costs a paragraph; discovered mid-build it blocks an issue.

12. **Check the exit condition, then stop.** Two gates, both mechanical:

    - **Coverage.** PLAN.md carries a two-column *Coverage* table: one row per SPEC must-have, one
      epic id per row. The check is a set comparison — sort the capability names out of SPEC.md's
      must-have sections, sort the first column of the coverage table, `diff` them. Empty diff, or
      the plan is incomplete. Zero unplaced, zero appearing twice.
    - **Skeleton.** Epic 1 names a domain capability and lists the four proofs from step 6; no epic
      anywhere describes auth, tenancy, audit, approvals-as-mechanism, a job scheduler, a chat panel,
      or a connector registry.

    Then hand PLAN.md to a human. This is an **L2** check plus **L5** acceptance — report it that
    way, and do not publish the backlog before the human accepts.

## Output — `PLAN.md`

1. **Epics in build order** — number, name, the capabilities it delivers (verbatim from SPEC),
   dependency edges, and one sentence of *why here*.
2. **Delivered by the platform** — every capability struck in step 1, with its seam.
3. **Module list** — project name, bounded context, capabilities served; the justification if there
   is more than one.
4. **Entity sketch** — conceptual, PII-marked, `ITenantOwned` confirmed.
5. **Tool inventory** — the step 4 table.
6. **Tab inventory** — id, route, permission, epic.
7. **Permission model** — role → grants, as strings.
8. **Connector surface** — or an explicit "none".
9. **Background jobs**.
10. **Coverage** — must-have → owning epic, the table the exit check diffs.
11. **Open questions for the design loop** — decision, options, decider.

## Guardrails

- **No Foundations epic, ever.** If an epic body describes sign-in, tenancy, audit, job scheduling,
  a chat panel, an admin screen, or a connector registry, delete it — that work is one method call.
- **Plan in capabilities a user would name.** "Accounts & Transactions" is an epic; "Domain layer" is
  not. Layer-shaped epics produce issues nobody can accept.
- **Every write is approval-gated at plan time.** The gate is the product, not a build-time detail.
- **One capability, one owning epic.** Duplicates become duplicate issues, then duplicate code.
- **Do not decide shape here.** No package versions, no schemas, no C4, no solution layout. Deciding
  them in a plan strands the decision without an ADR to explain it.
- **Never plan a change to the platform repo.** A gap there is an open question with a named decider.
- **The plan lives on disk.** PLAN.md is the memory of this loop; the conversation is not. Anything
  agreed in chat and not written down is lost at the next compaction.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| A "Foundations" or bootstrap epic 1 | regenerates a backbone the platform ships — weeks of work ending in weaker security | epic 1 is the thinnest real domain slice, proving module + tool + approval + tab |
| One epic per SPEC capability | twenty epics, no build order, a board nobody reads | group by shared entities and shared surface |
| A capability listed under two epics | built twice or by neither; `sync-backlog` creates duplicate issues | exactly one owning epic; the rest are dependency edges |
| Splitting the module by layer | five projects, no bounded context, and the platform's shape fought at every turn | one domain module; layers are files inside it |
| Several small modules "for cleanliness" | each is another `DbContext` needing per-entity `HasQueryFilter` — multiplying a silent cross-tenant leak | default to one; justify each extra, and expect approval |
| Tools planned without permission strings | RBAC gets invented per tool at build time, inconsistently | the permission belongs in the tool table, one per tool |
| A write tool with no approval flag | the agent mutates user data unreviewed | `RequiresApproval = true` on every state change |
| Treating a third-party integration as a module | it lands inside the domain module, or gets proposed for the platform | it is a connector project registered with `AddPlenipoConnector<T>()` |
| An "AI assistant" or "chat" epic | chat, streaming, and the runner are the platform's | the epic is the *tools* chat calls, and their permissions |
| Deferring "is this a platform gap?" | discovered mid-build, blocking an open issue | ask it in Open questions, with a named decider |
| Declaring the plan done by reading it over | that is L4 opinion reported as completeness | run the coverage diff; state the level |

## Related skills

- `../synthesize-spec/SKILL.md` — produces the SPEC.md this consumes. **Load when:** there is no
  accepted spec, or the capability lists are missing.
- `../sync-backlog/SKILL.md` — publishes these epics and their capabilities as GitHub issues on the
  project board. **Load when:** a human has accepted PLAN.md.
- `/shape:design-architecture` — answers the open questions and turns this plan into ARCH.md plus
  ADRs.
- `plenipo-platform` — the "do not rebuild" table step 1 subtracts against, the seven host seams, and
  the invariants an epic must never plan around.
- `loop-discipline` — the ladder this skill's L2/L5 exit condition is graded on, and the terminal
  states above.
