---
name: find-industry
description: >
  Rank unclaimed industries as candidates for a new AI-first product on Plenipo, by scoring each
  against what the platform's spine actually provides — chat-first UX, RBAC-before-the-model,
  human approval on every write, append-only audit, tenant isolation, documents + OCR, scoped RAG,
  connectors, and the WhatsApp channel — and rejecting the ones that only sound good.
  USE FOR: choosing the next vertical, sanity-checking an industry someone proposed, producing a
  ranked shortlist with reasons. DO NOT USE FOR: inventorying existing repos (../scan-fleet) or
  competitive research on a chosen industry (/define:research-industry).
license: MIT
---

# Find the next industry

Most industries can host *an* AI product. Very few are a good fit for **this** platform. This skill
is about the difference, and it is deliberately biased toward rejection: the output is worth more
when the shortlist is short.

**Terminal states:** `Success` (a ranked shortlist with reasons and rejections) · `No-op` (no
candidate clears the bar — a legitimate and useful result) · `Blocked` (no `FLEET.md`, so coverage
is unknown) · `Approval-required` (a candidate carries regulatory obligations the platform supports
but does not satisfy — a human decides whether to take that on).

## When to Use

- `FLEET.md` exists and you want to know what to build next.
- Someone proposed an industry and you want an honest fit assessment before committing.
- Deciding between two or three verticals that all seem plausible.

## Stop Signals

- **No `FLEET.md`** → run `../scan-fleet` first; without the coverage map you will propose something
  already built.
- **The industry is already decided** → go to `/define:research-industry`.
- **You need the competitive landscape** → that's the define loop, not this one.

## Inputs

| Input | Source | Used for |
|---|---|---|
| Occupied verticals | `FLEET.md` §Industry coverage | excluding what's taken |
| Researched-but-unbuilt | `FLEET.md` §Open gaps | these start ahead — research already exists |
| The platform's own research | the platform repo's `research/` | the reasoning template |

## The fit test

The platform's spine is a **specific** shape, and the fit question is not "could AI help here" but
**"does this industry's real workflow already look like Plenipo's architecture?"**

Score each candidate on all seven. A candidate strong on 1–3 and weak on the rest is usually a trap.

| # | Spine capability | The question that tests it |
|---|---|---|
| 1 | **Tenant = the customer's organization** | Is there a natural, hard boundary — a firm, household, client, project — that data must never cross? |
| 2 | **Human approval before every write** | Is there work where an AI *proposing* is valuable but AI *committing* is unacceptable? **This is the strongest single signal.** |
| 3 | **Append-only audit** | Does someone already have to prove who did what — a regulator, an auditor, a court, a client? If the audit log is a *deliverable* rather than a safety net, that's the sweet spot |
| 4 | **RBAC before the model** | Are there real authority tiers — a junior who may draft but not file, an adjuster with a payout limit, a tech who may not invoice? |
| 5 | **Documents + OCR + scoped RAG** | Is the raw material paper: contracts, statements, forms, drawings, reports? Does each case/matter/project need its **own** retrieval collection? |
| 6 | **Connectors** | Does the data already live somewhere specific — an ERP, a DMS, a bank, a portal — that an agent must reach rather than replace? |
| 7 | **Chat-first + WhatsApp** | Do the humans in this workflow actually communicate by message today, often from the field or on a phone? |

### The disqualifiers

Reject fast, and say why:

- **No approval-worthy write.** If every useful action is read-only, this is a search product, and
  the platform's best feature is dead weight.
- **Single-tenant reality.** One big customer with one dataset doesn't need the tenancy spine.
- **The judgment can't be checked.** If nobody can say whether the AI's output was right, there is
  no verifier, and per `/harness:loop-discipline` a goal that is pure judgment is not
  loopable at all.
- **Regulatory obligation the platform doesn't satisfy.** Audit and RBAC *support* HIPAA, 21 CFR
  Part 11, FERPA, and SEC/FINRA regimes — they do not deliver compliance. A BAA, a validation
  package, or a registered entity is a business decision, not an engineering one. Rate difficulty by
  compliance burden, and mark it `Approval-required`.
- **Already covered.** Check `FLEET.md`, including legacy repos — a legacy system occupying a
  vertical is a *supersede* decision, not a greenfield one.

## Workflow

1. **Read `FLEET.md`** — occupied verticals (normalized), legacy-occupied ones, and any
   researched-but-unbuilt entries. Those last start with a head start.
2. **Generate broadly, then cut.** Aim for 12–20 candidates before filtering; the good ones are
   rarely the first three that come to mind.
3. **Apply the disqualifiers** and record every rejection with its reason. The rejections are as
   valuable as the shortlist — they stop the same idea coming back next quarter.
4. **Score the survivors** on the seven spine capabilities. Be concrete: name the actual document,
   the actual approval, the actual role tier. "Has documents" is not a finding; "leases, amendments,
   and estoppels, one RAG collection per property" is.
5. **Name the killer workflow** for each — one sentence, in the shape
   *"user says X → AI proposes Y with citations → role Z approves → the system commits."* If you
   cannot write that sentence, the candidate fails test 2 and drops out.
6. **Rate difficulty** — engineering effort *and*, separately, compliance burden. Do not blend them;
   a low-effort/high-compliance vertical is a very different decision from the reverse.
7. **Rank and write `opportunities/SHORTLIST.md`**, top 3–5 with full reasoning, the rest listed with
   one-line rationale, plus the rejection log.
8. **Stop.** Choosing is a human's call. Deep-diving one candidate is `../opportunity-brief`.

## The reasoning template

The platform's own `research/legal-ai.md` is the model to imitate: it argues a vertical by mapping
the industry's table stakes **one-to-one** onto platform capabilities, then names what the platform
does *not* give you. Imitate both halves. An argument that only lists strengths isn't an argument.

## Guardrails

- **Argue from the spine, not from enthusiasm.** Every claim of fit cites one of the seven
  capabilities and a concrete artifact from that industry.
- **Name what the platform doesn't solve.** A brief with no gaps section is a sales pitch.
- **Difficulty is two numbers, not one.** Effort and compliance burden move independently.
- **This is a level-4 judgment** (see `/harness:loop-discipline`) — a rubric score, not
  field truth. Present it that way. The only real verifier is a built product finding users.
- **Never invent market data.** If you cite a market size, a vendor, or a regulation, it comes from
  a source you actually read. Unsourced numbers are worse than none.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Ranking by market size | picks industries the platform fits badly | rank by spine fit; size is a tiebreak |
| Skipping the rejection log | the same weak ideas resurface repeatedly | record every rejection and its reason |
| Blending effort and compliance into one score | a "hard" rating hides which kind of hard | two independent ratings |
| Proposing a vertical a legacy repo already occupies | reopens settled ground unknowingly | check `FLEET.md` including legacy |
| Writing a killer workflow with no approval step | fails the platform's strongest test | if nothing needs approving, reject it |

## Related skills

- `../scan-fleet/SKILL.md` — produces the coverage map this consumes. **Load when:** no `FLEET.md`.
- `../opportunity-brief/SKILL.md` — deep-dives one candidate to a go/no-go. **Load when:** the
  shortlist has a favorite.
- `/define:research-industry` — the competitive landscape, once a vertical is chosen.
