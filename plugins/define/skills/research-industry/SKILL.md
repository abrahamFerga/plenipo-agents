---
name: research-industry
description: >
  Competitive research on one chosen industry, written to research/<industry>.md: who the leading
  commercial vendors are, a capability comparison matrix built only from sources actually opened, the
  recurring UX patterns buyers already expect, the regulatory obligations that shape the build, a
  one-to-one map of the industry's table stakes onto what Plenipo already delivers, an explicit list
  of what it does not, and a must-have / differentiator / out-of-scope split. This is the artifact the
  spec is written from.
  USE FOR: mapping a vendor landscape from cold, separating table stakes from differentiators,
  sourcing the compliance obligations that constrain v1, refreshing stale research.
  DO NOT USE FOR: turning the findings into a specification (../synthesize-spec) or deciding which
  vertical to enter in the first place (/scout:find-industry).
license: MIT
---

# Research an industry

Generic market research produces a document nobody builds from. This one has a second half: after
the vendors and the matrix, it maps the industry's table stakes **one-to-one onto platform
capabilities**, and then names what the platform does **not** give you here. Both halves are
mandatory. An artifact with no gaps section is a sales pitch, and the spec written from it inherits
the blind spot.

Everything produced here is **L4 evidence** — synthesis of secondary sources, the model's reading of
other people's marketing. Say so in the artifact header. No amount of citation upgrades it; the only
L3 signal in this loop is a real buyer.

**Terminal states:** `Success` (`research/<industry>.md` written, every claim cited, gaps section
non-empty) · `No-op` (an artifact exists and nothing material has moved — no new entrant, no pricing
change, no regulatory change) · `Blocked` (no industry chosen, or no web access — do **not**
substitute recall for research) · `Exhausted` (search budget spent before the field was covered —
write what you have and mark coverage partial, never round up) · `Approval-required` (the research
surfaces an obligation the platform supports but does not satisfy — a BAA, a licensed entity, a
validation package — and a human decides whether to take it on).

## When to Use

- The vertical is decided and no `research/<industry>.md` exists yet.
- An existing research artifact predates a new entrant, a pricing shift, or a rule change.
- Someone asserted "X is table stakes" and you want the vendor evidence for it.
- Before `../synthesize-spec`, always — the spec has no other grounded input.

## Stop Signals

- **The vertical isn't chosen** → `/scout:find-industry` ranks candidates; this skill assumes one.
- **You want to write the spec** → `../synthesize-spec`. Research states what the market does; the
  spec states what *this product* will do. Keep the two documents apart.
- **You are naming modules, entities, endpoints, or technology** → that is design, three loops later.
  Stop and put it in *Open questions* instead.
- **No web access** → `Blocked`. Vendor names and prices from memory are how a fabricated matrix gets
  built, and a fabricated matrix is worse than an empty one.

## Inputs

| Input | Source | Used for |
|---|---|---|
| Industry slug (kebab-case) | the human, or `opportunities/SHORTLIST.md` | the file name `research/<slug>.md`, and the search vocabulary |
| The killer workflow sentence | the shortlist entry, if the scout loop ran | the yardstick for "must-have" in step 9 |
| Existing artifact | `research/<slug>.md` | refresh-versus-create, and the `No-op` check |
| Prior coverage | `FLEET.md` §Open gaps | a *researched-but-unbuilt* entry means research already exists — extend it, don't restart |
| Platform capability list | `plenipo-platform` | the mapping table in step 7 and the gaps in step 8 |
| The reasoning template | the platform repo's own `research/legal-ai.md` | the shape to imitate — mapping plus gaps, both halves |
| Live sources | vendor sites, docs, pricing pages, review directories, regulator texts, trade bodies | every citation in the artifact |

## Workflow

1. **Fix the slug and check for a `No-op`.** Normalize the industry to kebab-case — the fleet is
   inconsistent about this and `"property management"` will not match `property-management`. If
   `research/<slug>.md` exists, read it, then look for a change worth the budget: a new entrant, an
   acquisition, a repricing, an amended rule. Nothing moved → `No-op`, and say what you checked.

2. **Enumerate the field wide, then cut.** Reach 12–20 names before ranking, from category
   directories, "alternatives to X" pages, procurement and RFP shortlists, trade-association member
   and sponsor lists, and job postings that name the software people are hired to operate. Cut to
   5–8 leaders. Record for each the URL you actually opened and the date you opened it.

   Classify every one of them:

   | Class | What it is | Why it matters |
   |---|---|---|
   | **Incumbent** | the system of record — owns the data and the buyer relationship | sets the integration surface; usually a connector, not a competitor |
   | **AI-native challenger** | recent, chat- or copilot-shaped | shows what buyers have already been sold on |
   | **Adjacent horizontal** | the spreadsheet, the shared mailbox, the WhatsApp group | **most often the real incumbent**; if you omit it the matrix is fiction |

3. **Build the capability matrix.** Rows are capabilities in the *industry's* vocabulary — "matter
   intake", "trust accounting", "proof of delivery" — never platform vocabulary; step 7 does the
   translation, and mixing them lets a platform feature smuggle itself in as a market requirement.
   Cells are `yes` / `partial` / `no` / `unknown`, each `yes` carrying a source number.

   **`unknown` is a first-class value and you will use it often.** A marketing page is not a feature
   list. Absence of evidence is not evidence of absence, and a matrix of unbroken checkmarks tells
   the spec nothing.

4. **Record the packaging shape**, not just the price: per seat, per matter/case/load, per
   transaction, per document, tiered by entity size, or usage-based. This decides what a v1 must
   include to be sellable at all, and it is the raw material for the product's plan definitions
   later. Note where pricing is hidden behind "contact sales" — that is itself a finding about the
   buyer.

5. **Extract the recurring UX patterns.** What every serious product in the category has, because
   users transfer expectations between them: the primary object (matter, case, load, policy,
   property), the list → detail → timeline spine, the work queue or inbox, the document viewer with
   annotation, the approval or signature step, the one report people actually export.

   Then name the **chat-hostile** parts honestly. If the category's core loop is bulk data entry or
   pixel-precise document markup, it does not become chat-first by wishing, and that belongs in the
   gaps.

6. **Source the compliance constraints from the regulator, not from a vendor's blog about the
   regulator.** For each obligation record who is bound, what it requires — retention period, audit
   trail, data residency, consent, signature validity, record immutability, breach notification —
   and then classify where it lands:

   | Class | Meaning | Example shape |
   |---|---|---|
   | **Platform** | an existing capability satisfies it | "prove who changed this" → append-only audit |
   | **Product** | you must build something specific | a retention job, a jurisdiction-specific export |
   | **Business** | not an engineering problem at all | a signed agreement, a licensed human, a registered entity, an insurance policy |

   Anything landing in **Business** makes the run `Approval-required`. Audit and RBAC *support*
   HIPAA, FERPA, 21 CFR Part 11 and SEC/FINRA regimes; they do not deliver compliance with any of
   them, and writing otherwise is the most damaging sentence this artifact can contain.

7. **Map table stakes one-to-one onto platform capabilities.** This is the step that makes the
   artifact worth writing. One row per table stake from step 3, each resolving to exactly one of
   *delivered* / *delivered with module work* / *not delivered*. A `not delivered` row is not a
   failure of the research — it is the whole point, and it feeds step 8.

   | Platform capability | The table stake it typically covers | What still has to be built |
   |---|---|---|
   | Chat-first UX (SignalR + AG-UI) | "just ask the system about this case" | the tools it routes to, and the suggested prompts |
   | RBAC before the model | real authority tiers — draft versus file, propose versus pay | the permission strings and the role baselines |
   | Approvals on every write | maker–checker on anything consequential | deciding which of your tools are writes |
   | Append-only audit | "prove who did what", for a regulator, court, or client | the export format the regulator actually accepts |
   | Multi-tenancy | the firm / client / household boundary data must never cross | `HasQueryFilter` per entity in your module's `DbContext` |
   | Documents + OCR | the paper: contracts, statements, forms, reports | the extraction schema for your document types |
   | Scoped RAG | per-matter retrieval with citations, not one global index | the collection boundary and the ingestion trigger |
   | Connectors | the ERP / DMS / bank / portal the data already lives in | the connector itself, one per source |
   | WhatsApp channel | field capture from a phone, by people who message already | the conversation design and identity mapping |

   Two rules keep this table honest. **Every row cites the evidence from step 3** that the stake is
   real — not an intuition that it should be. And **a stake that maps to nothing is not deleted**; it
   moves to step 8.

8. **Name the gaps — what the platform does not give you here.** Mandatory, non-empty, and specific
   enough to argue with. The recurring classes:

   - a **domain calculation engine** — pricing, rating, dosing, tax, scheduling optimization;
   - a **real ledger** — double-entry, reconciliation, trust or escrow accounting;
   - a **regulated integration** — payments, e-filing, EDI, HL7, carrier or bureau networks;
   - an **offline or mobile-native surface** for people without connectivity;
   - **real-time multi-user collaboration** on one document;
   - a **network or marketplace effect** that only exists once both sides are present;
   - a **compliance obligation that is a contract or an entity**, not a feature.

   For each: what it would take, whether v1 can ship without it, and whether a connector to an
   incumbent (step 2) removes the need entirely. A gap answered by "integrate with the system of
   record" is a much better outcome than one answered by "build it".

9. **Split must-have / differentiator / out-of-scope.**

   - **Must-have** — present in a majority of the leaders **and** required by the killer workflow.
     Both conditions. Not "present in one leader and interesting".
   - **Differentiator** — what the platform makes cheap that the field does badly. Usually the
     approval lane, the audit trail as a *deliverable* rather than a safety net, per-matter retrieval
     with citations, and capture from a phone. Say which incumbent does it badly, and cite it.
   - **Out-of-scope** — every exclusion names its reason: a gap from step 8, or a capability that is
     somebody else's system of record and should become a connector. An unexplained exclusion is
     scope that walks straight back in during planning.

10. **Write `research/<slug>.md`** with the sections below, and stop. Framing, personas, RBAC roles
    and success metrics are `../synthesize-spec`'s job, and doing them here means doing them twice,
    differently.

## Output — `research/<industry>.md`

1. **Header** — industry, slug, date researched, and one line stating this is L4 evidence.
2. **Sources** — numbered, each with URL and the date it was read. Every claim in the document
   references one of these numbers. A claim with no number is a bug.
3. **The field** — vendor table: name, class (incumbent / AI-native / adjacent horizontal), who buys
   it, packaging shape, source.
4. **Capability matrix** — capabilities × vendors, in industry vocabulary, `unknown` where unknown.
5. **UX patterns** — including the chat-hostile ones.
6. **Compliance constraints** — each classified platform / product / business.
7. **Platform mapping** — the one-to-one table from step 7.
8. **Gaps** — what the platform does not give you here. Never empty.
9. **Must-have / differentiator / out-of-scope** — with a reason on every exclusion.
10. **Open questions for the spec** — everything you wanted to decide and correctly didn't.

## Guardrails

- **Every vendor claim and every number comes from a source you actually opened**, cited by number
  and dated. Unsourced numbers are worse than no numbers: they survive into the spec, the plan, and
  eventually a pitch, with nobody able to trace them.
- **Never invent a market size, a customer count, a growth rate, or a price.** If you could not find
  it, the artifact says you could not find it. That sentence is a legitimate research finding.
- **Present it as L4.** State the level in the header and again anywhere the artifact reads as
  confident. "I read their site and it looks like they do X" is not "they do X".
- **The gaps section is not optional and is not a formality.** If you cannot name a gap you have not
  finished researching.
- **Industry vocabulary in the matrix, platform vocabulary only in the mapping.** The one-way
  translation is what stops the platform's strengths from being restated as market requirements.
- **Summarize sources, never reproduce them.** Link and paraphrase; a long quotation from a vendor's
  copy is both a copyright problem and lazy synthesis.
- **Read-only outside `research/`.** This skill writes exactly one file and touches no code, no
  config, and no other repo.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Listing only AI-native startups | the incumbents own the data and the buyer; the whole plan targets the wrong field | include the system of record and the horizontal tool people actually use |
| Filling cells from marketing pages | `yes` everywhere; the matrix carries no information | `yes` only with a source number; use `unknown` freely |
| Citing a market size you did not read | one fabricated figure discredits the entire artifact | drop it, or cite the report and its date |
| A mapping table with no `not delivered` rows | the artifact becomes a pitch and the spec inherits the blind spot | the mapping must be able to fail; step 8 is mandatory |
| Deriving must-haves from platform strengths | you build what is easy rather than what is table stakes | must-have = majority of leaders **and** the killer workflow |
| Treating a regime as a feature | "we're HIPAA compliant because there's an audit log" | classify every obligation platform / product / business |
| Out-of-scope items with no reason | the scope quietly returns during planning | name the gap or the connector that replaces it |
| Sliding into module and entity design | the spec and architecture loops get pre-empted by unreviewed decisions | park it in *Open questions* |
| Re-researching an unchanged market | budget burned, artifact churned, nothing learned | `No-op` unless vendors, pricing, or regulation moved |

## Related skills

- `../synthesize-spec/SKILL.md` — turns this artifact into `SPEC.md`. **Load when:** the gaps section
  and the three-way split are written.
- `/scout:find-industry` — ranks and chooses the vertical this skill then researches. **Load when:**
  the industry is not actually decided yet.
- `plenipo-platform` — the verified capability list and invariants the mapping table maps onto.
  **Load when:** filling in steps 7 and 8.
- `loop-discipline` — the verification ladder that makes this artifact L4, and the terminal states
  named above.
