---
name: opportunity-brief
description: >
  Deep-dive ONE shortlisted industry into a go/no-go brief: the named buyer and the pain in units,
  the incumbent landscape and why an AI-first entrant wins or doesn't, the killer approval-gated
  workflow traced end to end, the agent design that carries it and the single-prompt baseline it must
  beat, the document and connector surface, RBAC tiers mapped to real job titles, a v1 that is
  genuinely shippable, regulatory burden rated apart from build effort, and an honest KILL CRITERIA
  check. The last gate before committing weeks of build — it never decides.
  USE FOR: writing opportunities/<industry>.md, pressure-testing a favourite candidate, killing an
  idea cheaply while it is still only prose. DO NOT USE FOR: generating or ranking candidates
  (../find-industry), taking stock of repos already built (../scan-fleet), or the competitor and
  feature matrix that follows a go decision (/define:research-industry).
license: MIT
---

# Opportunity brief

A shortlist entry is a hypothesis with a score attached. A brief is the full argument — *and the
full case against* — written down before anyone spends a month building. It is the last cheap place
to be wrong.

This skill is adversarial by construction: you write down what would kill the idea **before** you go
looking, then check those criteria out loud at the end. A brief that never seriously risked ending
in `No-op` is a sales deck.

**Evidence level: L4 — model as judge.** Everything here is a rubric applied by a model to prose it
gathered. It is an opinion, not field truth. The only real verifier of an opportunity is a built
product finding users, which is L3 and months away. Never report this brief with the confidence of
a check that ran.

**Terminal states**

| State | What it means here |
|---|---|
| `Approval-required` | **the normal ending.** The brief is written and a human decides go/no-go. This skill never decides |
| `No-op` | the deep dive disqualified the industry. **A success for the skill** — report it as one, naming the criterion that fired and the month it saved |
| `Blocked` | no candidate to brief, or the buyer/incumbent set cannot be established without inventing it |
| `Stalled` | three passes and the killer workflow still has no concrete role, record, or artifact — the candidate is vague, not hard. Escalate with what was gathered |
| `Exhausted` | the source budget ran out with sections still unfilled. Ship the partial brief with the gaps marked; **do not close them with plausible prose** |

`Success` is deliberately unavailable. A convincing brief is not a verified outcome.

## When to Use

- `opportunities/SHORTLIST.md` has a favourite and the next step would be real work.
- Someone brought an industry in from outside the loop and it needs the same scrutiny as a ranked
  one.
- A *researched-but-unbuilt* entry in `FLEET.md` is being reconsidered.
- You want to kill an idea cheaply — a `No-op` here costs an afternoon, later it costs a quarter.

## Stop Signals

- **No candidate, or several** → `../find-industry`. This skill briefs exactly one industry.
- **The go decision is already made** → `/define:research-industry` for competitors and the
  capability matrix; the brief is behind you.
- **You are drafting `SPEC.md`** → the brief is a bet, the spec is a commitment. Do not relitigate
  the bet inside the spec.
- **The vertical is already occupied** by a live product in `FLEET.md` → that is a *supersede*
  decision about an existing repo, not a greenfield brief.

## Inputs

| Input | Source | Used for |
|---|---|---|
| The one candidate | `opportunities/SHORTLIST.md`, or a human's proposal | the subject; kebab-case its name for the filename |
| Its spine scores and flagged risks | that shortlist entry | the **hypothesis under test**, never the conclusion |
| Coverage and legacy occupancy | `FLEET.md` | greenfield vs. supersede; is this actually open |
| What the platform already provides | `plenipo-platform` | separating "free" from "you must build it" |
| Real job titles and org charts | job postings, association pages, licensing bodies | the RBAC tiers — this is the highest-signal cheap source |
| Named products and prices | vendor sites, pricing pages, review sites | the incumbent landscape |
| Regulation text | the regulator's own page, cited by section | the compliance burden |

Every claim in the brief traces to one of the bottom four rows. If you cannot cite it, cut it.

## Kill criteria — written first

Write these in step 1, **before** researching, and never edit them afterwards to let the candidate
survive. Rewriting the yardstick mid-run is specification gaming; it is the failure this section
exists to prevent.

Start from these defaults, then add two or three candidate-specific ones — the objections a
practitioner in that industry would raise in the first five minutes.

| Kill criterion | Fires when | Why it is fatal |
|---|---|---|
| **The AI is a veneer** | delete the model and the product still works — the real work is arithmetic, scheduling, or record-keeping a rules engine does better | the model is cost, not value; you have built a database with a chat window, and a form-based incumbent beats it on reliability |
| **One good prompt already does it** | the single-prompt baseline covers most of the workflow | there is no product here, only a system prompt — and the approval lane you would sell is free to every competitor on this platform |
| **No approval-worthy write** | every valuable action is read-only | the platform's strongest feature is dead weight; you have built a search box |
| **Nobody can check the output** | no one can say whether a proposal was right, even after the fact | no verifier — the goal is pure judgment, so it is not loopable and you cannot write an eval |
| **The data is unreachable** | the system of record has no API, no export, and the connector needs a partner agreement | v1 degrades into a data-entry product |
| **Incumbents already ship this workflow** | the pitch reduces to nicer UX | UX is not a moat against a vendor who owns the data |
| **Compliance is the product** | the value bought is a certification — a BAA, SOC 2, 21 CFR Part 11 validation, state licensure | engineering is not the bottleneck and a small build cannot clear it |
| **Single-tenant reality** | one large customer, one dataset, bespoke process | the tenancy spine is dead weight; this is a consulting engagement |
| **The buyer never uses it** | the budget holder never touches the product and the user has no budget | a procurement sale, not a product motion |
| **Already occupied** | `FLEET.md` shows a live or legacy product in this vertical | a supersede decision, deliberately taken, or nothing |

An `unknown` verdict on a load-bearing criterion is not a pass. Say `unknown` and treat it as a stop
until it is resolved.

## Workflow

1. **Fix the subject and freeze the yardstick.** One industry, one file: `opportunities/<industry>.md`,
   kebab-case, matching how `FLEET.md` normalizes coverage. Copy the shortlist's spine scores in
   verbatim and label them *hypothesis*. Then write the kill criteria and stop touching them.

2. **Name one buyer and one pain, in units.** A job title, an org size, and who signs. "SMB owners"
   is not a buyer. Separate the **user** (does the work), the **buyer** (owns the budget), and the
   **blocker** (compliance, IT, a partner). State the pain as a number a practitioner would
   recognize — hours per week, rework rate, penalty exposure, days of float — and cite where it came
   from. If the user and buyer are different people, say how the product reaches both.

3. **Map the incumbents.** Four to eight *named* products with what they cost and what they already
   claim about AI. Then answer the entrant question honestly. Only three answers are real:

   | Real reason an AI-first entrant wins | Test that it is true |
   |---|---|
   | The incumbent's record model can't express propose → approve → commit | its AI is a chat panel bolted beside the record, and its audit log has no "proposed by" state |
   | There is no incumbent, only a habit — email, shared drives, spreadsheets | the practitioners you can find describe a manual routine, not a product |
   | The incumbent owns the record but not the *document* work around it | the documents live in inboxes and scanners, outside the system of record |

   "Ours will be easier to use" is not on this list. If that is the best answer, the fourth kill
   criterion has fired.

4. **Trace the killer workflow.** Expand the shortlist's one-liner into a concrete trace:

   > *user says X → AI proposes Y **with citations to named documents** → role Z approves → the
   > system commits **W**.*

   Every letter must be specific: X is a sentence a real person would type, Y names the artifact, Z
   is a job title that exists, W is the record that changes and where it becomes visible. Then name
   the platform pieces that carry it — the tool and its permission string, `RequiresApproval = true`
   on the write, which RAG collection the citations come from, what the audit entry proves. **One
   approval per commit.** If your trace needs a second AI step before the approval, that is two
   workflows; pick the one worth shipping.

5. **Design the agent surface, and name the baseline it must beat.** The shortlist claimed this
   vertical has real AI work; here you say what actually gets built, and it is the section that most
   often turns a confident brief into a `No-op`.

   - **The agents.** One, or several — and if several, *why*: what one context cannot hold, or which
     two roles must disagree for the output to be trustworthy. A drafting agent and a reviewing agent
     that never disagree are one agent with extra latency.
   - **What each one reasons over.** Named documents, retrieved passages, tool results, prior
     decisions. "The case data" is not an answer.
   - **Why it is multi-step.** Which step's output changes what the next step does. A fixed sequence
     with a model in one slot is a pipeline, not an agent — say so if that is what it is.
   - **The single-prompt baseline.** What would one good prompt, with the documents pasted in,
     already achieve? State it plainly and without flattery. Everything past that line is the
     product; if that line covers most of the workflow, the *one good prompt already does it*
     criterion has fired.
   - **How anyone knows the output was right.** The approval accept/reject rate is the platform's
     built-in verifier; name what else — a downstream outcome, a checkable fact in a source document,
     a number that reconciles. If nothing can check it, *nobody can check the output* has fired too.

   This is where a vertical proves it needs an AI product rather than a well-designed form.

6. **Inventory the document surface.** For each document type: who produces it, the format you will
   actually receive (scanned PDF, spreadsheet, portal screen), rough volume per tenant per month,
   whether it needs OCR, and **which RAG collection it lands in** — per case, per client, per tenant.
   Per-case scoping is the platform's shape; a single tenant-wide collection is a smell worth
   arguing. Tie each type back to step 5: which agent reads it, and what it extracts that a template
   could not.

7. **Inventory the connector surface.** For each system of record: name it, then state the access
   path — public API, OAuth app with a review queue (say how long), CSV export, screen-scrape, or
   nothing. A connector gated behind a partner agreement is a **schedule risk, not a task**; label it
   that way. Rank the surface by what v1 truly needs versus what sounds impressive.

8. **Derive RBAC tiers from job titles.** Three to five roles taken from real postings or org charts.
   For each, the **one write action** it may take that the tier below may not. If two roles differ
   only in what they can read, they are one role. Map each to a `AddPlenipoRole` baseline and the
   permission strings the module's tools will carry. This is where a vertical proves it has genuine
   authority structure rather than a single power user.

9. **Scope a v1 that ships.** One module, the step-4 workflow end to end, a handful of tools of which
   **at least one is approval-gated**, one document type, and one connector — or zero connectors plus
   upload. Everything else goes to an explicit *deliberately not v1* list, which is the more useful
   half. The test: could this be demoed to a real buyer in one sitting and earn "when can I have it?"
   If v1 needs two connectors or two document types before it is demoable, it is not v1.

   **Cut connectors and screens before you cut the reasoning.** The step-5 agent surface is what the
   buyer is being sold; a v1 that trims it down to a form with a chat panel is a different, weaker
   product that will not earn that sentence.

10. **Rate the two burdens separately.** Engineering effort and regulatory burden move independently
    and must never be averaged into one "difficulty". For compliance, a row per regime:

    | Regime | What it obliges | What the platform contributes | What stays a business act |
    |---|---|---|---|
    | *(e.g. a records rule)* | retention, attribution, tamper evidence | append-only audit, RBAC before the model, tenant isolation, write-only secrets | the attestation, the insurance, the entity, data residency, the signed agreement |

    The platform *supports* these regimes; it does not deliver compliance. Anything in the last
    column is a decision for a human, and it is why this brief ends `Approval-required`.

11. **Check the kill criteria out loud.** Walk the step-1 list one by one — `fired` / `not fired` /
    `unknown`, each with the evidence. This section is the reason the brief is trustworthy; a brief
    where nothing even came close is usually a brief that did not look.

12. **Write the file, state the level, name the state.** Include a recommendation if you have one,
    labelled as the L4 opinion it is. End `Approval-required`, or `No-op` if a criterion fired —
    and in the `No-op` case say plainly that the skill succeeded.

## Output — `opportunities/<industry>.md`

1. **Verdict line** — recommend / kill / undecided, the ladder level (L4), and the terminal state.
2. **Buyer and pain** — user, buyer, blocker; the pain in units, with sources.
3. **Incumbents** — the named table, prices, their AI claims, and the entrant argument from step 3.
4. **The killer workflow** — the four-arrow trace, expanded, with the platform pieces named.
5. **Agent design** — the agents and why there is more than one, what each reasons over, why it is
   multi-step, the single-prompt baseline, and what verifies the output.
6. **Document surface** — types, formats, volumes, OCR, RAG collection scoping.
7. **Connector surface** — systems of record, access path, and schedule risks.
8. **RBAC tiers** — job title → the write it owns → permission string.
9. **v1 scope** — what ships, and the longer *deliberately not v1* list.
10. **Burdens** — effort rating and the compliance table, separately.
11. **What the platform does not give you** — the honest gaps. A brief without this section is a
    pitch.
12. **KILL CRITERIA** — the frozen list from step 1, each marked fired / not fired / unknown.
13. **Sources** — every one you actually read.

## Guardrails

- **Say L4 every time.** "I researched it and it looks strong" is a model's opinion. Reporting it
  with the confidence of something that ran is the *Pretending L4 is L1* anti-pattern.
- **Maker is not approver.** This skill produces the brief; a human decides. Never write a
  recommendation as though the loop concluded it — that is a self-approving loop with a month of
  build as the payout.
- **Kill criteria are frozen.** Written first, checked last, never softened in between.
- **No invented numbers.** A market size, a vendor claim, a price, or a regulation summary comes from
  a source you read. An unsourced TAM is worse than no TAM — it survives into the spec.
- **Concrete or cut.** Name the actual document, the actual role, the actual system of record, the
  actual rule. "Has compliance requirements" is not a finding.
- **Name what the platform does not solve.** Audit and RBAC support a regime; they do not satisfy it.
- **Do not claim the platform's capability as the product's value.** Approvals, audit, tenancy, and
  RAG are the floor every product on this platform starts from. The brief argues about the *module*,
  and above all about what the model has to reason over inside it.
- **Answer the single-prompt baseline honestly.** It is the cheapest way to discover there is no
  product here, and the easiest question to quietly not ask. A brief that skips it is not a brief.
- **`No-op` is a win.** Killing an industry in an afternoon is the highest return this loop produces.
  Report it as a success with the criterion that fired, not as a failure to find something.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Writing kill criteria after the research | none of them fire, by construction | freeze them in step 1 |
| A persona instead of a buyer | nobody to sell to, discovered late | one job title, one budget line, one signer |
| "The AI will just handle X" | hides a missing approval step or a missing verifier | write the four-arrow trace with a real role and a real record |
| Naming a multi-agent design because it sounds ambitious | three agents that never disagree, built and paid for | say what one context cannot hold; otherwise it is one agent |
| Skipping the single-prompt baseline | a wrapper gets a go decision and a quarter | answer it in step 5, in plain words, before scoping v1 |
| Trimming the reasoning to make v1 smaller | ships the form the incumbent already has | cut connectors and screens first; the agent surface is the product |
| Two AI steps before one approval | the gate stops meaning anything | one approval per commit; split the workflow |
| Blending compliance into the effort rating | a single "hard" hides which kind of hard | two ratings, never averaged |
| A v1 that spans the whole shortlist workflow | never ships, never gets feedback | one workflow, one document type, one connector |
| Counting platform features as differentiation | the brief argues for Plenipo, not for this vertical | argue the module |
| Presenting the brief as the decision | commits without a human | end `Approval-required` |
| Skipping `FLEET.md` | recommends a vertical a legacy repo already occupies | check coverage, including legacy repos |
| Filling a thin section with plausible prose | the spec inherits fiction as fact | mark the gap and end `Exhausted` |

## Related skills

- `../find-industry/SKILL.md` — produces the shortlist this deep-dives, and the one-line workflow
  sentence step 4 expands. **Load when:** there is no candidate, or more than one.
- `../scan-fleet/SKILL.md` — the coverage map that settles greenfield vs. supersede.
  **Load when:** `FLEET.md` is missing or older than the last build.
- `plenipo-platform` — what the platform already provides, so the brief neither rebuilds it nor takes
  credit for it.
- `loop-discipline` — the ladder level this brief sits at and the terminal states it may end in.
- `/define:research-industry` — the competitive landscape and capability matrix, once a human says go.
