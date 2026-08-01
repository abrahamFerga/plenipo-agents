---
name: find-industry
description: >
  Rank unclaimed industries as candidates for a new AI-first product on Plenipo by testing two things
  in order: whether the work needs deep AI — multi-agent orchestration, long-horizon agentic
  workflows, document processing over messy artifacts, retrieval that has to cite, judgment under
  ambiguity — and only then whether the workflow matches the platform's spine (tenant isolation,
  RBAC-before-the-model, approval-gated writes, append-only audit, connectors, chat + WhatsApp).
  Rejects the verticals that only sound good, above all CRUD systems with a chatbot bolted on.
  USE FOR: choosing the next vertical, sanity-checking an industry someone proposed, producing a
  ranked shortlist with reasons. DO NOT USE FOR: inventorying existing repos (../scan-fleet) or
  competitive research on a chosen industry (/define:research-industry).
license: MIT
---

# Find the next industry

Most industries can host *an* AI product. Very few have work that genuinely **needs** AI, and fewer
still are shaped like **this** platform. This skill is about both differences, and it is deliberately
biased toward rejection: the output is worth more when the shortlist is short.

Two independent questions, asked in this order, and **a candidate must pass both**:

1. **Is the AI load-bearing?** Would deleting the model break the product, or just make the user type
   more? This is *Test zero* below, and it is the cut that gets skipped.
2. **Does the workflow match the spine?** Tenancy, approvals, audit, RBAC, documents, connectors,
   chat — *The fit test* below.

They fail independently. A vertical can sit perfectly on the spine and still be a database with a
chat window; that is the single most common way this skill produces a bad recommendation.

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

## Test zero — is the AI load-bearing?

Run this **before** the spine test and reject on it alone. Spine fit says the platform *can* carry a
vertical; test zero says the vertical is *worth* carrying. Only test zero asks whether there is
enough reasoning in the work to justify building an AI product at all.

The question is never "could AI help here" — it could help almost anywhere. It is:

> **If you deleted the model, how much of the product would still work?**

If the honest answer is "most of it, the user would just type more", you have found a database with
a chat window. Reject it and say so.

### The worked rejection: rent management

Rent management scores well on the spine — a property is a natural tenant, a rent increase is a write
worth approving, leases are documents, the ledger wants an audit trail, and tenants message from
their phones. It is still a bad candidate, because the actual work is arithmetic and calendars:
prorate a month, apply an escalation clause, chase an overdue balance, serve a notice on a statutory
deadline. Every one of those is a rule a competent developer writes once, correctly, without a model.
The AI would sit beside a CRUD app rephrasing what a form already collects.

**Keep this example in the rejection log permanently.** It is the shape of the whole trap category:
strong spine fit, nothing to reason about.

### The five kinds of real AI work

A candidate needs **at least two** of these, and at least one must be #1, #2, or #3. Name the actual
artifact or decision in every claim — "documents" and "insights" are not findings.

| # | Class of work | What it looks like when it is real |
|---|---|---|
| 1 | **Multi-agent / orchestrated agents** | the job genuinely decomposes — intake, research, drafting, review — because one context cannot hold it, or because two roles must disagree and the disagreement is the value |
| 2 | **Long-horizon agentic workflow** | many steps with tool calls between them, where what step three found changes what step four does. A fixed pipeline with a model in one slot is not this |
| 3 | **Document processing over messy artifacts** | scanned, inconsistent, human-authored input where extraction needs understanding — a payment schedule buried in an appendix, one term stated three different ways across two documents |
| 4 | **Retrieval where retrieval is the work** | a corpus big enough that finding the right passage is the hard part, sources that contradict each other, and answers that must cite or be worthless |
| 5 | **Judgment under ambiguity** | a practitioner bills real hours reading, comparing and deciding — and two competent practitioners would reach different answers |

### The single-prompt baseline

For the candidate's strongest workflow, answer out loud: **what would one good prompt with the
documents pasted in already achieve?**

Everything beyond that line is the product. If that line covers most of the workflow, you are
proposing a wrapper, and the only thing left is the approval lane — which every product on this
platform gets for free. Write the answer into the shortlist entry; it is the most useful sentence in
it, and the one a reader will check you on.

## The fit test

Spine fit is the **second** gate, not the first — do not score a candidate that failed test zero.

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

- **The AI is a veneer.** Test zero failed: delete the model and the product still works, because the
  real work is arithmetic, scheduling, or record-keeping that a rules engine does better and cheaper.
  This is the most common trap in the list precisely because it hides behind a *good* spine score —
  see rent management above.
- **Fewer than two classes of real AI work**, or none from classes 1–3. One class of shallow AI is a
  feature somebody else adds to their existing product next quarter.
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
3. **Run test zero on every candidate, first.** For each: which of the five classes of real AI work
   it has (with the artifact named), and the single-prompt baseline answer. Fewer than two classes,
   or none from 1–3, and it is rejected here — before you have spent a paragraph on its tenancy
   story. Most candidates die at this step, and that is the step working.
4. **Apply the remaining disqualifiers** and record every rejection with its reason. The rejections
   are as valuable as the shortlist — they stop the same idea coming back next quarter.
5. **Score the survivors** on the seven spine capabilities. Be concrete: name the actual document,
   the actual approval, the actual role tier. "Has documents" is not a finding; "leases, amendments,
   and estoppels, one RAG collection per property" is.
6. **Name the killer workflow** for each — one sentence, in the shape
   *"user says X → AI proposes Y with citations → role Z approves → the system commits."* If you
   cannot write that sentence, the candidate fails spine test 2 and drops out. Then apply the harder
   half: **would a competent practitioner have to think to produce Y?** If Y is what a form would
   have collected, the sentence is satisfied and the candidate still fails test zero.
7. **Rate difficulty** — engineering effort *and*, separately, compliance burden. Do not blend them;
   a low-effort/high-compliance vertical is a very different decision from the reverse.
8. **Rank and write `opportunities/SHORTLIST.md`.** Top 3–5 with full reasoning, the rest with a
   one-line rationale, plus the rejection log. Every surviving entry leads with its **AI-depth
   verdict** — the classes matched, the artifact behind each, and the single-prompt baseline — before
   any spine score, because that is the order a reader should be able to check them in.
9. **Stop.** Choosing is a human's call. Deep-diving one candidate is `../opportunity-brief`.

## The reasoning template

The platform's own `research/legal-ai.md` is the model to imitate: it argues a vertical by mapping
the industry's table stakes **one-to-one** onto platform capabilities, then names what the platform
does *not* give you. Imitate both halves. An argument that only lists strengths isn't an argument.

## Guardrails

- **AI depth is the first cut; spine fit is the second.** A candidate that fails test zero never gets
  a spine score. Scoring it anyway spends the reader's attention and makes a wrapper look considered.
- **"AI could help here" is not a finding.** Name which of the five classes, and the artifact or
  decision it operates on. If the sentence would be equally true of any other industry, delete it.
- **Never count the platform's own capabilities as the AI value.** Approvals, audit, tenancy, the RAG
  pipeline and the chat surface are the floor every product here starts from. The argument is about
  what the model has to *reason over* on top of them.
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
| Scoring the spine before running test zero | a CRUD vertical with tidy tenancy reads as a top candidate; the trap survives to the brief | test zero first, and reject on it alone |
| "AI could summarize / draft / suggest here" | true of every industry, so it distinguishes nothing and the shortlist stops discriminating | name the class (1–5) and the artifact it reasons over |
| Counting approvals, audit or RAG as the AI value | argues for Plenipo rather than for this vertical — every candidate would score the same | those are the floor; argue what the model reasons over |
| Skipping the single-prompt baseline | a wrapper reaches the brief and burns a week of research | write the baseline answer into every surviving entry |
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
