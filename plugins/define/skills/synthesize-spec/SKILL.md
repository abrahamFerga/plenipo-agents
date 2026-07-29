---
name: synthesize-spec
description: >
  Turn research/<industry>.md into SPEC.md — the one-sentence framing, jobs to be done, personas and
  their authority tiers, the must-have / differentiator / out-of-scope capability split, an RBAC model
  of dotted action-noun permissions, regulatory constraints, and observable success metrics. Its
  defining move is binding every capability to a named Plenipo seam — module tool (approval-gated if
  it writes), tab, connector, background job, module endpoint, host seam — and deleting outright
  anything the platform already supplies.
  USE FOR: writing or re-scoping a product spec, cutting v1 down to what ships, sketching the shipped
  role baselines. DO NOT USE FOR: the competitive landscape (../research-industry), epics and build
  order (../plan-system), or technology, layout and data-model decisions (/shape:design-architecture).
license: MIT
disable-model-invocation: true
---

# Synthesize the spec

Research says what the market does. The spec says what **you** will build — and on this platform it
says one more thing every other spec format omits: **where each capability plugs in**. A capability
without a named seam is not a capability yet. It is either something the platform already gives you
for free, or a decision nobody has made.

That second half is what makes this skill Plenipo-specific and what makes it worth running. The
default failure of an industry-derived spec is a feature list whose first six items — sign-in, user
management, roles, audit trail, file upload, notifications — are all things the product must never
write a line of. Cutting those is not scope reduction; it is the difference between a thin host on a
platform and a worse re-implementation of a security spine that was already correct.

**Terminal states:** `Success` (SPEC.md written; every must-have carries a named seam and nothing
duplicates a platform feature) · `No-op` (a current SPEC.md already satisfies the exit check for this
research artifact) · `Blocked` (no `research/<industry>.md`, or it has no capability matrix) ·
`Stalled` (a must-have still maps to no seam after a second pass over the platform contract — record
it as an open question and stop rather than inventing a seam) · `Approval-required` (v1 scope implies
a regulatory obligation the platform supports but does not satisfy — a human decides whether to take
it on).

## When to Use

- `research/<industry>.md` exists and the vertical is chosen; you are committing to a product.
- Re-scoping: v1 has grown and you need it cut back to what actually ships.
- A spec written before the product moved onto the platform — it almost certainly lists platform
  features as work.
- Someone handed you a feature list and it needs turning into seams before anyone plans against it.

## Stop Signals

- **No research artifact** → `../research-industry/SKILL.md`. Specifying from memory invents vendors.
- **The vertical isn't actually chosen** → `/scout:find-industry`.
- **SPEC.md exists and is accepted** → epics and build order are `../plan-system/SKILL.md`.
- **You are choosing technologies, project layout, or the data model** → `/shape:design-architecture`.
  The spec names *what* and *which seam*; it never names a library, a table, or a class.

## Inputs

| Input | Source | Used for |
|---|---|---|
| Research artifact | `research/<industry>.md` | table stakes, differentiators, vendors, compliance |
| Platform capability list | `plenipo-platform` § *Do not rebuild these* | the freebie cut in step 5 |
| Host seams | `plenipo-platform` § *The host* | the seam vocabulary in step 7 |
| Reference product | **networthy** — the newest true product | a worked example of the split, and of real permission strings |
| Product name | the chosen vertical | **never a `the-` prefix** — that convention is dead |

If the research artifact has no compliance section and no named vendors, it is not finished. Go back
rather than filling the gap with plausible-sounding claims.

## Workflow

1. **Read the research artifact end to end.** Extract four things: named vendors and what each
   actually does, the recurring UX patterns, the table-stakes / differentiator signals, and the
   regulatory constraints. Every table-stakes claim in the spec must trace back to a line here.

2. **Write the one-sentence framing.** Shape: *"<Product> lets <persona> <do the job> from <the raw
   material>, with <the authority tier> approving before anything is committed."* The sentence must
   contain a **write worth approving**. If it does not, the vertical fails the platform's strongest
   fit test and the honest output is to stop and say so, not to soften the sentence.

3. **Name the jobs to be done** — three to six, each as *"when <trigger>, I want to <action>, so I
   can <outcome>"*. Each must end in something observable by someone other than the user. A job whose
   outcome is "feel more organized" cannot be specified, planned, or verified.

4. **Draw personas as authority tiers, not job titles.** For each persona record what they may
   **read**, what they may **draft/propose**, and what they may **commit or approve**. Personas that
   share all three are **one role** — merge them now, before they become three roles nobody can
   configure. This table is the seed of the RBAC model in step 8.

5. **Cut the platform freebies first**, before any must-have/differentiator debate — otherwise you
   will argue about the priority of things you are not going to build.

   | If the list says | The truth |
   |---|---|
   | user management, invites, SSO, sign-in | the platform's auth and admin console |
   | roles, permissions, a role editor | dotted permissions + runtime-editable baselines at `/admin` |
   | audit log, activity history, "who changed what" | the append-only audit database, already recording every tool call |
   | "are you sure?" confirmations for AI actions | `RequiresApproval = true` — the approval lane |
   | tenant/organization separation | `ITenantOwned` + global query filters |
   | file upload, PDF text extraction, OCR | the tenant-scoped file store and platform document tools |
   | semantic search over the customer's documents | the opt-in RAG pipeline with per-collection gating and citations |
   | a chat window, streaming, message history | `/api/chat/stream`, `/api/agui/{moduleId}`, `/hubs/agent` |
   | usage limits, token budgets, cost dashboards | per-tenant usage tracking and budget enforcement |
   | third-party OAuth, webhook receivers | the connector SDK, with per-tenant enable |
   | email/SMS/WhatsApp delivery | notification channels |

   **A spec that lists "audit logging" or "user management" as a capability to build is wrong.**
   Delete the line and record it in the Platform-provided section of the output so it cannot come
   back in the next planning round dressed as a new idea.

6. **Split what survives.** Must-have = table stakes without which nobody switches vendor; keep it
   small enough to ship. Differentiator = the reason to pick you over the vendors the research named
   — two or three, and on this platform they are almost always agentic (propose-then-approve,
   cited retrieval, a channel the incumbents don't have). Out-of-scope = named explicitly, each with
   **the reason** and **the trigger that would reopen it**.

7. **Bind every capability to exactly one primary seam.** This is the load-bearing step.

   | Seam | What it is | Right when | Obligation the spec must state |
   |---|---|---|---|
   | **Module tool** | a `ToolDescriptor` in the manifest **plus** a `ModuleTool` from `IModuleToolSource`, same permission string in both | the user would ask for it in words and the agent acts | if it changes state → `RequiresApproval = true`, and the reply must not claim success before a human approves |
   | **Tab** | a module UI surface with a route and a declared `Permission` | a human needs to see or drive it directly, not narrate it | routes are unique across **all** modules; admin tabs must declare a permission or startup throws |
   | **Connector** | an external system that owns the data | the source of record is somebody else's product | per-tenant enable and delegated OAuth are the platform's — you supply the mapping, not the dance |
   | **Background job** | a recurring job declared in the manifest | it happens on a clock, not on a request | the job `Kind` is globally unique; it must set the tenant id explicitly |
   | **Module endpoint** | a mapped route on the module | machine-to-machine, or UI data with no agent story | authorize it with the same permission the equivalent tool would use |
   | **Host seam** | plans, product roles, tenant-provisioned hook, notification channel, product-wide tools | product-level, above any one module | it belongs in the ~20-line host, and the spec should say which of the seams |
   | **Platform-provided** | — | — | **not a capability.** Cut it (step 5) |

   Rules that decide the ambiguous cases:

   - **Most real capabilities are a tool *and* a tab.** State both, with the tool first. A capability
     that is only a tab is a CRUD screen with a chatbot bolted on beside it.
   - **Every state-changing tool is approval-gated.** There is no "low-risk write" exception in the
     spec; if you want one, that is an argument to have with a human, not a default.
   - **If it cannot be phrased as a tool, a tab, a connector, a job, an endpoint, or a host seam**,
     it is not specified yet. Push it back to a job-to-be-done and re-derive, or move it out of scope.

8. **Write the RBAC model in the platform's own shape.** Roles are shipped baselines registered at
   the host (`AddPlenipoRole("<role>", [ … ])`) and are **runtime-editable per tenant** in the admin
   console — so what the spec fixes is the *starting* baseline, not immutable policy.

   - Permissions are **dotted action-noun strings**. A module tool's permission becomes
     `tools.<module>.<tool>`, and that exact string must later appear in **both** the manifest
     descriptor and the `ModuleTool`. `GET /api/admin/security/catalog` is where a mismatch surfaces.
   - **Wildcards are the grouping mechanism** — `tools.<module>.*` for "everything this module does".
     Use them for role baselines; use exact strings when a role must be narrower.
   - **`system_admin` is never customizable** and always resolves to `*`. Do not respecify it.
   - **Narrowing, never granting.** Agent profiles and tool selections can only shrink what RBAC
     already allows. A spec that says "the assistant can do X for this user" is describing a
     permission that role must already hold.
   - **Do not invent a parallel model** — no "permission levels", no per-record ACL matrix, no
     custom scopes. If the dotted-string model genuinely cannot express a rule the industry requires,
     that is an **open question for the shape loop**, not a licence to design your own.
   - Produce a **role × capability matrix** with two distinct columns: *may call* and *may approve*.
     At least one role must be able to **propose but not approve** — otherwise the approval lane is
     ceremony, and the platform's best property is unused. Record who decides on a parked approval as
     an intent; bind the exact approval permission against the admin console later rather than
     minting a string here.

9. **Separate regulatory *support* from regulatory *delivery*.** Audit, RBAC, tenant isolation, the
   write-only secret vault and deployment-level residency **support** regimes like HIPAA, SEC/FINRA,
   FERPA or 21 CFR Part 11. They do not deliver a BAA, a validation package, a registered entity, or
   a certification. For each constraint write: the regime, the concrete obligation, whether the
   platform supports or does not deliver it, and the seam it touches. If a must-have depends on an
   obligation in the "does not deliver" column, end `Approval-required`.

10. **Give every success metric an instrument.** Prefer things the platform already emits, so the
    metric is measurable on day one rather than after a telemetry project:

    | Metric | Instrument |
    |---|---|
    | is the agent actually used | `GET /api/admin/audit/tool-calls` |
    | **is the agent right** — the strongest product signal | approval accept/reject rate, and time-to-decision, on the approval lane |
    | cost per tenant | `GET /api/admin/usage?days=30` |
    | retrieval quality | citation rate on RAG-backed answers |
    | adoption of a capability | that capability's own tool or endpoint counter |

    Every metric names what is measured, by which endpoint or telemetry, the target, and by when.
    A metric nothing can falsify is not a metric.

11. **Write `SPEC.md`** in the section order below, then run the exit check.

## Exit check

Do not report `Success` until all five hold. This is an **L2 rule check** on a document — say so, and
do not present it with the confidence of a test run:

1. Every **must-have** capability names exactly one primary seam from the step-7 table, and none of
   them names *Platform-provided*.
2. Every capability that changes state is marked approval-gated.
3. Every entry in step 5's freebie table that appeared in the research capability matrix now appears
   in the spec's **Platform-provided** section — cut, not silently dropped.
4. Every permission string is dotted and lowercase; every module-tool permission reads
   `tools.<module>.<tool>`; no parallel authorization concept appears anywhere in the document.
5. At least one role may **call** a state-changing capability and may **not** approve it.

The human accepting the spec is `L5`, and it is the only signal that actually closes this loop.

## Output — `SPEC.md`

1. **Framing** — the one sentence, plus the approval-worthy write it implies.
2. **Jobs to be done** — 3–6, each with its observable outcome.
3. **Personas and authority tiers** — read / draft / commit, with merges noted.
4. **Capabilities** — three tables (must-have, differentiator, out-of-scope). Must-have and
   differentiator rows carry: capability, seam, approval-gated?, permission string, the job it serves.
   Out-of-scope rows carry: the reason and the reopening trigger.
5. **Platform-provided** — everything cut in step 5, named, so it cannot return as a feature request.
6. **RBAC model** — the shipped baselines, their permission strings and wildcards, and the
   *may call* / *may approve* matrix.
7. **Regulatory constraints** — supported vs. not delivered, each with its obligation and seam.
8. **Success metrics** — metric, instrument, target, date.
9. **Open questions for the shape loop** — anything that needs a technology, data-model, or
   platform-capability answer. Unmapped capabilities live here, explicitly.

## Guardrails

- **Never list a platform feature as a capability.** Cut it and record the cut. Silent removal means
  it comes back next quarter as somebody's good idea.
- **State-changing means approval-gated, without exception in the spec.** "The agent files the
  claim" is an incorrect sentence; "the agent drafts the claim, the adjuster approves, the system
  files it" is the correct one.
- **Permission strings are the platform's shape or they are an open question.** Never a third option.
- **One named seam per capability.** "AI-powered triage" is a slogan; "module tool
  `tools.claims.triage_intake`, approval-gated, surfaced on the Queue tab" is a capability.
- **Cite the research for every table-stakes claim.** Do not invent vendors, market sizes, or
  regulations. An unsourced number is worse than no number.
- **The spec is a level-4 judgment** until a human accepts it (see `loop-discipline`). Do not report
  it as verified because it is internally consistent.
- **Do not name the product `the-<something>`.** The old prefix convention is dead — do not apply it,
  suggest it, or validate against it.
- **No technology in the spec.** No library, no table name, no class name, no cloud service. If a
  choice feels forced, it is an open question for `/shape:design-architecture`.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| "Audit logging" / "user management" / "SSO" as capabilities | weeks spent rebuilding a weaker copy of the security spine | cut them in step 5 and list them under Platform-provided |
| A write capability with no approval statement | the agent mutates customer data unreviewed — a platform invariant violated at the spec level | mark it approval-gated and name who approves |
| Inventing permission levels or an ACL matrix | the plan cannot be implemented; RBAC gets rebuilt inside the module | dotted `tools.<module>.<tool>` strings plus wildcards |
| Every capability is a tab | you specified a CRUD app with a chatbot beside it, on a chat-first platform | if a human would ask for it in words, it is a tool first |
| Ten differentiators in the must-have list | v1 never ships | must-have is table stakes only; two or three differentiators |
| One role per persona | roles proliferate and no one is left who can approve | roles are authority tiers; merge personas that share all three |
| A metric like "improve efficiency" | nothing can falsify the product | name the instrument and its endpoint |
| Treating audit + RBAC as compliance | ships an obligation nobody agreed to carry | supported ≠ delivered; end `Approval-required` |
| Leaving one must-have unmapped and calling it done | the gap surfaces mid-build as an architecture emergency | `Stalled` — record it in Open questions |

## Related skills

- `../research-industry/SKILL.md` — produces the input this consumes. **Load when:** there is no
  `research/<industry>.md`.
- `../plan-system/SKILL.md` — turns this spec into epics, build order, and the module list.
  **Load when:** the exit check passes and a human has accepted the spec.
- `plenipo-platform` — the freebie list, the seam list, and the invariants this skill cuts against.
  **Load when:** unsure whether a capability is yours to build.
- `loop-discipline` — the ladder that grades how strong "the spec is done" actually is.
- `/scout:find-industry` — if the vertical turns out not to fit the platform's spine after all.
