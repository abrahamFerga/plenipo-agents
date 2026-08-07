---
name: name-product
description: >
  Clear a brand name before it is spent. Generate candidates that escape the naming grammar every
  vendor in the category has already mined out, sweep the cheap registries (slug, GitHub org,
  NuGet, npm, `.com`), then run the probes that actually catch a live commercial product — fetching
  the exact `.com`, an exact-phrase search, near-neighbour spellings, the trademark classes
  software sits in — and sort every hit into fatal, survivable or ignorable with its evidence. Ends
  with at most three survivors and their residual risk, for a human to choose.
  USE FOR: naming a product before the launch pause, checking a name someone proposed, deciding
  whether a collision is fatal, re-probing before the repo is created. DO NOT USE FOR: choosing the
  vertical (../find-industry) or arguing it is worth building (../opportunity-brief); naming
  modules, tools or permissions (/define:plan-product); and never for registering a domain, filing
  a mark, or creating the repo.
license: MIT
---

# Clear a product name

A name is spent the moment it is used. It becomes the repo, the assembly prefix, every root
namespace, the database schema, the container names, the `ProductOffering.ProductId` and every
permission string — so changing it later is a migration, not a rename. That makes naming the one
decision in this pipeline that is cheap to research and expensive to redo.

And the names that feel obviously right are, for that exact reason, the ones already taken. Every
founder in a category reaches into the same two bags — the category's noun and a virtue suffix —
so the product of those two bags was enumerated and claimed years ago. **The generator is the
problem, not the luck.** This skill exists because a run proposed three names for an accounting
product, all three were live commercial products, and nothing in the pipeline had looked.

**Evidence levels, and they are not the same:**

| Finding | Level |
|---|---|
| A registry probe fired — the slug, org, package or domain is taken | **L1** — a status code decided it |
| "No live product found" | **L4** — absence of evidence from the searches *you* ran |
| Which collisions are fatal, and which name to spend | **L5** — a human |

Reporting "the registries are clean" as "the name is free" is the *pretending L4 is L1* anti-pattern
with a permanent cost attached. All three of the names below were free on NuGet and npm, and not one
of the code registries pointed at what was actually there.

**Terminal states**

| State | What it means here |
|---|---|
| `Approval-required` | **the normal ending.** Surviving candidates and their residual risk are written down; a human chooses |
| `No-op` | the name is already chosen and recorded, and nothing has changed — re-probing would decide nothing |
| `Blocked` | no network, or `gh` is unauthenticated, so the probes cannot run. A probe you could not run is not a probe you passed |
| `Exhausted` | the round budget ran out. Present the best survivors **with the residual risk named** — never by quietly lowering the bar |
| `Stalled` | three rounds died the same way. The generator is wrong: change strategy (step 2) or escalate with the rejection log |

`Success` is deliberately unavailable. Clearing a name is not choosing one.

## When to Use

- `/plenipo:launch` is about to pause for the brand, and the candidates it will show have not been
  probed.
- Someone proposed a name — in a meeting, in an issue, in a previous session — and nothing has been
  created yet.
- The go/no-go is decided and the repo is the next irreversible act.
- A name cleared weeks ago and the repo is only now being created.

## Stop Signals

- **The repo, the namespaces and the schema already exist** → this is no longer clearance. Record
  the collision and its risk as a decision; a rename is a migration and needs its own plan.
- **There is no vertical yet** → `../find-industry/SKILL.md`.
- **The question is whether to build it at all** → `../opportunity-brief/SKILL.md`.
- **You want legal clearance** → this is not it, and no amount of searching makes it that. This
  skill gathers evidence; a trademark attorney clears a mark.
- **You are naming a module, a tool or a permission** → those are internal identifiers with their
  own rules, and they belong to `/define:plan-product`.

## Inputs

| Input | Source | Used for |
|---|---|---|
| The vertical, its buyer and their vocabulary | `opportunities/<industry>.md` | the semantic field — and the one candidates must escape |
| Names already proposed | the conversation, or a previous run's record | round 1, and the rejection log that stops them recurring |
| Brands, slugs and module ids already in use | `FLEET.md` | fleet-internal collisions no public probe can see |
| GitHub owner | `gh api user`, or `workflow.json` → `github` | whether the repo slug is free **under the account that will hold it** |
| Round budget | default: 3 rounds × 6 candidates | the `Exhausted` ceiling |

## Why the obvious names are gone

The grammar is `<category noun> + <virtue suffix>`, and the second bag is small and shared:
*-worthy, -well, -ly, -ify, -wise, -flow, -hub, -desk, -base, -sync, -pilot, -IQ*. Widening the
first bag does not help, because everyone widens the same bag in the same direction. A fleet with a
house suffix mines its own bag out fastest of all — the more the name sounds like it belongs beside
your other products, the more certain someone reached it first.

**A worked example — three candidates for an accounting product, probed 2026-08-06:**

| Candidate | NuGet | npm | GitHub org | `.com` | What was actually there |
|---|---|---|---|---|---|
| `Ledgerworthy` | free | free | free | registered | a live personal-finance SaaS **on the exact `.com`** — a category search for it returned only generic ledger vendors |
| `Tallywell` | free | free | free | registered | `tallywell`, an AI health-scoring app with an App Store listing, a Crunchbase profile and press coverage |
| `Closewell` | free | free | **taken** | registered | a transaction-management firm on `closewelltc.com`, plus `ClosingWell` — a private-equity software vendor one letter away |

Three candidates, three fatal collisions, and the code registries were silent on all three. The
probes that fired were the `.com` fetch, the exact-phrase search, and the near-neighbour pass.
Re-run them; that table is an illustration of *which probe catches what*, never a cache.

## The probe ladder

Run 1–5 as one sweep over every candidate, then 6–10 over the survivors.

| # | Probe | Command or source | Taken when | What it does **not** prove |
|---|---|---|---|---|
| 1 | Repo slug under the owner | `gh repo view <owner>/<slug>` | exits 0 | anything about the name outside GitHub |
| 2 | GitHub org / user | `gh api users/<slug>` | not a 404 | that the holder is a company, or active |
| 3 | NuGet id prefix | `curl -s -o /dev/null -w '%{http_code}' https://api.nuget.org/v3-flatcontainer/<lower>/index.json` | `200` | that no company owns the name |
| 4 | npm | `npm view <slug> version` | exits 0 | same |
| 5 | `.com` registration | `curl -sL -o /dev/null -w '%{http_code}' https://rdap.org/domain/<slug>.com` | `200` (`404` = unregistered) | that anything is *running* there — parked and operating both return 200 |
| 6 | **`.com` content** | fetch it and read it | a business is operating | that it is the only one |
| 7 | **Exact-phrase search** | `"<Name>"`, then `"<Name>" app`, `"<Name>" software`, `"<Name>" company` | a product, company, app listing or press hit | absence — it is L4, and search engines miss live sites |
| 8 | **Near neighbours** | one letter, one suffix, one word-break: `Closewell` → `ClosingWell` | an established vendor sits next door | — |
| 9 | Trademark register | the register for your markets, in the classes software sits in (**9** and **42**) | a live mark in those classes | legal clearance. Record what you searched |
| 10 | Fleet-internal | `FLEET.md` | another product owns the brand, slug or module id | — |

Probe 3 carries a second meaning in this fleet. A product's assemblies are `<Brand>.*`, and
`nuget.config` maps `Plenipo.*` to the vendored feed precisely because a public package sharing a
private prefix is a dependency-confusion surface. Learning that a brand's prefix is already
published on nuget.org is cheaper before the assemblies are named than after — it is the same
confusion the mapping exists to prevent, one prefix over.

## Collision tiers

| Tier | Test | Verdict |
|---|---|---|
| **Fatal** | an operating software product or company using the name, a live mark in class 9 or 42 in a market you will sell in, or the exact `.com` running a business | drop it and move on. Do not argue with it |
| **Survivable** | a dormant project, a parked `.com`, a hobby repo, a book or a band, a company outside software in a market you will not enter | keep it — and **write down the collision and why it is survivable** |
| **Ignorable** | an ordinary word used ordinarily, a fictional name, a dead product with no live mark | keep it, no note needed |

**"Different industry" rarely saves a software name.** Two software products sit in the same
trademark classes, the same app-store search box and the same first page of results whatever
vertical they serve — which is why a health app was a fatal collision for an accounting product.
Different-industry is a real defence only when the other holder is not software at all.

## Workflow

1. **Fix the constraints before generating anything.** Write the shape down: PascalCase brand
   (letters only, starts with a letter, not a C# keyword, never prefixed `Plenipo`), the lowercase
   slug that becomes the repo and `ProductOffering.ProductId`, the module id, and the brands, slugs
   and module ids `FLEET.md` already occupies. A name that cannot be a namespace is not a candidate,
   and finding that out after the probes wastes the probes.

2. **Change the grammar, not the word.** Six candidates, drawn from **at least three** of the
   strategies below, no more than two from any one. A round of six that all came from one strategy
   is one candidate with five spellings.

   | Strategy | How | Why it escapes | Watch for |
   |---|---|---|---|
   | Coin a word | invented morphemes with no dictionary parse | there is nothing in the category to collide with | unpronounceable, unspellable-from-hearing, or a word in a language you did not check |
   | Metaphor from a distant field | a concrete noun from cartography, bookbinding, sailing, geology, printing | the category noun is the bag everyone reaches into | the startup favourites are already gone — Atlas, Compass, Anchor, Beacon, Summit |
   | Non-English root | the Latin, Greek or Nordic root of the concept | the English word is exhausted; the root often is not | an accidental meaning in a market you will sell in |
   | Two unrelated nouns | noun + noun, where the second is **not** a virtue suffix | the suffix slot is exactly where the collisions live | both nouns from the category still reads as generic |
   | The buyer's own word | the term practitioners use and outsiders do not | it is in the brief, and rarely in the marketing bag | it may be a trade term someone registered |
   | A bounded misspelling | drop or double a letter | availability, cheaply | search-hostile, and a near-neighbour collision by construction. Last resort |

3. **Sweep the registries (L1).** Probes 1–5 over all six at once, as one loop producing one table.
   Anything that fires is out with a one-line reason. Do not walk candidates one at a time — the
   sweep is seconds, and the ranking changes once it lands.

4. **Probe the survivors as brands (L4).** Probes 6–8 on each. **Fetch the exact `.com` even when
   the search found nothing** — that is the probe that caught the live SaaS a category search
   missed. Read what is there: parked, for sale, or an operating business.

5. **Check the near neighbours.** One letter, one suffix, one word-break, and the plural. A brand
   sitting one character from an established vendor in the same space collides in every place that
   matters — search, procurement, the app store, a customer's memory.

6. **Search the trademark register** for the markets you will sell in, in classes 9 and 42. Record
   the register, the query and what came back. This is evidence for a human, never a clearance.

7. **Check the fleet.** Brand, slug and module id against `FLEET.md`. An internal module-id
   collision is invisible to every public probe and expensive in a different way — two products
   whose modules answer to the same id.

8. **Sort, then write the record.** Every hit into a tier with its evidence, then
   `opportunities/<industry>-naming.md` per the format below. The rejection log matters as much as
   the survivors: without it, round 3 re-proposes round 1.

9. **Present at most three and stop.** For each survivor: the PascalCase brand, the slug, the module
   id it implies, what collided and why that is survivable, and one sentence on what the name says
   about the product. Then `Approval-required` — you do not pick. If nothing survived, go back to
   step 2 with a strategy you have not used yet; on the third failed round, `Exhausted`.

## When everything collides

It will. Every short English compound in a commercial category belongs to someone, and a run that
holds out for zero hits never terminates. **The goal is no hit that matters** — so when a round
comes back empty, take these in order:

1. **Widen the shape before lowering the bar.** Most empty rounds are one strategy applied six
   times. A coined word, a distant metaphor and a non-English root each open a space the compound
   grammar cannot reach; if you have not tried all three, you have not run out of names.

2. **Take a survivable collision deliberately, in writing.** Name the holder, the class, the market
   they operate in, and what would have to change for it to become a problem. A collision a human
   accepted with the evidence in front of them is a decision. The same collision undiscovered is a
   landmine — and the difference between them is entirely this paragraph.

3. **Buy a domain shape you can actually hold.** The `.com` is the *least* permanent thing this
   decision fixes; the namespaces, the schema and the permission strings are the permanent ones. If
   the domain is registered but nothing operates there, `get<name>.com`, `<name>hq.com`, `.dev` or
   `.app` are ordinary outcomes. Killing a good name over a parked domain trades the permanent
   constraint for the reversible one.

What is never the answer: a `the-` prefix, or a `Get`/`Use`/`Try` bolted on to dodge a collision.
That convention is dead in this fleet, and a prefix baked into a namespace is as permanent as the
name it is apologising for.

## Output — `opportunities/<industry>-naming.md`

1. **Header** — the date probed, the resolved GitHub owner, and the round budget.
2. **Constraints** — the brand/slug/module-id shape rules and the ids `FLEET.md` already occupies.
3. **Candidates** — one row per candidate per round, with every probe result and the tier of each
   hit.
4. **Survivors** — at most three: brand, slug, module id, residual risk, and what the name claims.
5. **Rejection log** — every killed candidate with the one line that killed it, so a later round
   does not re-propose it.
6. **Sources** — every page actually opened, including the registers searched and the classes.

## Guardrails

- **Registries clean is not a cleared name.** It is five status codes about package ids, account
  handles and a domain record. The brand question is answered by probes 6–10, and its answer is L4.
- **Fetch the `.com`; never infer it from search.** Search-engine silence is not absence — the live
  fintech on `ledgerworthy.com` did not appear in a category search for its own name.
- **"Different industry" does not save a software name.** Classes 9 and 42, the same app store, the
  same results page.
- **Never register, buy, or file anything.** This skill reads. Buying a domain or filing a mark
  spends money and is a human's act — print what you would buy and stop.
- **Never pick the name.** Maker is not approver, and no autonomy level changes this: a level buys
  build autonomy, never naming autonomy. This ends `Approval-required` every time.
- **Never say "cleared".** The strongest sentence available is *"no conflicting mark found in the
  classes and markets I searched"*, followed by the list. Anything shorter implies a legal check
  nobody ran.
- **Date every verdict, and re-probe before the repo.** A clearance is true on the day it ran. If
  weeks pass between the pause and `/deliver:scaffold-product`, re-run the ladder on the chosen name
  — it is one loop, and it is the last moment the answer is free.
- **A rejected candidate stays rejected in writing**, with its reason.
- **Never require a name prefix.** Products get real brand names.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Proposing names before probing any of them | the human is asked to choose between three names that are all taken — the failure this skill exists for | probe first, present survivors |
| Treating npm/NuGet/GitHub silence as clearance | not one of the three collisions above was found by a code registry | the `.com` fetch and the exact-phrase search are what fire |
| Searching the category instead of the string | "X accounting software" returns competitors, never the collision | quote the exact name, then fetch the `.com` |
| Skipping the near-neighbour pass | the brand ships one letter from an established vendor in the same market | one letter, one suffix, one word-break, the plural |
| Dismissing a hit because the vertical differs | same class, same app store, same results page | different-industry defends only against non-software holders |
| Killing a candidate over a parked domain | good names die for the most reversible constraint in the decision | tier it survivable and take another domain shape |
| Generating round 2 from round 1's strategy | six more names out of the mined-out bag | change the grammar, not the word |
| Probing one candidate at a time | slow, and the ranking changes after the sweep anyway | one sweep, one table, then depth on survivors |
| Recording nothing | the next session re-proposes the names you already killed | the rejection log is half the artifact |
| Reporting "the name is clear" | implies a legal check that nobody ran | name the registers, classes and markets you searched |

## Related skills

- `../opportunity-brief/SKILL.md` — the go/no-go this runs alongside; its pause is where these
  candidates are presented. **Load when:** the vertical and the name are decided in one breath.
- `../scan-fleet/SKILL.md` — `FLEET.md`, the only source for brands and module ids already occupied
  inside the fleet. **Load when:** step 7.
- `../find-industry/SKILL.md` — the vertical and its vocabulary, which is where candidates come
  from. **Load when:** there is no brief yet.
- `loop-discipline` — the ladder that makes a status code L1 and "no live product found" L4.
- `/deliver:scaffold-product` — what spends the name: the repo, the assembly prefix, the schema, the
  permission strings. **Load when:** a human has chosen and the repo is the next act.
- `/define:plan-product` — module, tool and permission naming, which is a different job from naming
  the product.
