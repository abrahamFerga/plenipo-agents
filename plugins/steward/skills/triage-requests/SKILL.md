---
name: triage-requests
description: >
  Work the platform-request queue from every product: cluster requests by capability so demand across
  products is visible, give each one a verdict the requesting agent can act on without a human
  relaying it, and convert what is accepted into platform work with the requester's acceptance test
  attached as a conformance test. The platform's single writer.
  USE FOR: clearing the incoming queue, deciding whether a gap is platform or product, spotting that
  several products want the same thing. DO NOT USE FOR: installing the queue's infrastructure
  (../install-request-surface/SKILL.md), or filing a request from a product
  (/deliver:request-platform-change).
license: MIT
disable-model-invocation: true
---

# Triage the platform request queue

You are the platform's single writer. Products run in parallel; you do not. Your job is to keep the
platform coherent while ten products push need into it — which means saying "no" and "you can already
do that" far more often than "yes."

**Terminal states.** `Success` — every open request carries a verdict, and accepted ones are linked
to platform issues · `No-op` — the queue is empty or everything already has a current verdict ·
`Blocked` — no request surface installed, or `gh` lacks scope · `Stalled` — a request cannot be
verdicted because the reproduction does not reproduce; say so on the issue and ask, rather than
guessing · `Approval-required` — accepting would change the platform's shape (a new extension point,
a public-surface break, an invariant reinterpreted); a human decides.

## When to Use

- Open issues carry `platform-request` + `needs-triage`.
- Before a release, to sweep what should ride along.
- Periodically, so requests do not rot — a queue nobody works is worse than no queue, because
  products stop filing and start forking.

## Stop Signals

- **No `platform-request` label or issue form** → `../install-request-surface/SKILL.md` first.
- **You are in a product repo** → `/deliver:request-platform-change`.
- **You want to implement an already-accepted item** → that is ordinary platform work on the
  platform's own backlog; this skill produced the issue, it does not build it.

## Why this queue matters more than it looks

Measured on this platform, before any of this existed:

- **~22% of platform commits were already product-driven** — the single largest category of change,
  with *one* product active. That fraction does not stay flat as products are added; it dominates.
- **Zero issues had ever been filed**, against 62 PRs. `BUILDING_A_PRODUCT.md` tells products to
  "open an issue rather than forking," and nobody had done it once — including its author. Products
  route around a queue that does not visibly work.
- A product shipped **235 lines of middleware rewriting platform request/response JSON** to patch
  four platform bugs at the HTTP boundary, marked "deletion-ready", with **nothing tracking when to
  delete it**. That is what the absence of this loop costs.

Your triage is what keeps those from being the default path.

## Inputs

| Input | Where from | Used for |
|---|---|---|
| Open requests | `gh issue list --label platform-request --state open` | the queue |
| Closed requests | same, `--state all` | recognizing a repeat |
| Consumer registry | `consumers.json` | who is affected; who to notify |
| Seam catalog | `BUILDING_A_PRODUCT.md` **and the source it describes** | deciding `already-possible` |
| Platform invariants | `plenipo-platform` | deciding `rejected` |

> The seam catalog has been **wrong** — it documents `AddPlenipo()`/`UsePlenipo()`, which do not
> exist. Verify against source before telling a product "just use X." A wrong `already-possible`
> verdict is worse than a slow one: it sends an agent to build against an API that isn't there.

## Workflow

1. **Pull the queue** and read every request fully before verdicting any of them. Triaging one at a
   time is how duplicate demand stays invisible.

2. **Cluster by capability, not by wording.** Two products describing the same gap in different
   vocabulary is the single most valuable signal in this queue, and it is the one nothing else in
   the system can see — each product knows only its own need.

   Label every issue in a cluster `demand:multi` and cross-link them. **Demand outranks argument:**
   two products asking plainly beats one product arguing eloquently, because the platform's job is
   shared primitives.

3. **Verdict each request.** Exactly one, always with the evidence:

   | Verdict | When | What the comment must contain |
   |---|---|---|
   | `already-possible` | a seam covers it | the **exact** seam, a code sketch, and the source file you verified it in |
   | `product-scope` | real need, wrong altitude | which seam to build it at, and why it is not shared |
   | `accepted` | a genuine primitive, or `demand:multi` | the linked platform issue, and the acceptance test you adopted |
   | `deferred` | real, platform-shaped, not now | the reason and what would change it — a bare "later" tells the product nothing about whether to invest in its shim |
   | `rejected` | it would break an invariant | **which invariant**, by name |

   Post it as a structured block so the requesting agent parses it without a human in the middle:

   ```markdown
   <!-- steward-verdict -->
   **Verdict:** already-possible
   **Seam:** IConnector — a product may define its own connector in its own repo
   **Verified in:** src/Plenipo.AspNetCore/Connectors/ConnectorHostExtensions.cs
   **Action for the product:** register with AddPlenipoConnector<T>(); remove the shim tagged TODO(plenipo#123)
   ```

   Then set the label, and close on `already-possible` / `product-scope` / `rejected`.

4. **Guard the invariants.** Reject anything that would let a caller bypass RBAC-before-the-model,
   the approval gate, tenant isolation, write-only secrets, or the audit log — no matter how
   reasonable the need. Name the invariant so the product can rethink the *feature* rather than hunt
   for another route. This is the one part of the job that cannot be delegated to demand counting.

5. **Refuse platform capture.** A change must serve **more than one product**, or be a genuine
   primitive that any product would recognize. A single product's vertical shape landing in the
   platform is a cost the other nine pay forever. When in doubt, `product-scope` — a product can
   always ask again with a second requester.

   Watch for the softer form of this: a vertical growing inside the platform repo as a "sample."
   A sample module that reaches thousands of lines and tracks a real product's roadmap is a product
   living in the wrong repo.

6. **On accept, adopt the acceptance test.** Copy the requester's acceptance test into the platform's
   own suite as a conformance test. This is what stops the change being silently regressed later,
   after everyone has forgotten why it exists — and it is why the request form demands one.

7. **Implement one at a time.** Products are parallel; the platform is serial. Concurrent platform
   changes are how a shared dependency becomes unmergeable.

8. **On release**, comment the version that contains each fix, close the request, and hand off to the
   products — each one's `/deliver:upgrade-platform` unwinds the `TODO(plenipo#N)` shims that
   reference the closed issues.

9. **Report** the queue state: verdict counts, the clusters found, what was rejected and why, and any
   request you could not verdict.

## Guardrails

- **Verify against source before verdicting `already-possible`.** The docs have been wrong about the
  platform's own host API.
- **Never accept an invariant break.** Not for a large product, not for an urgent one.
- **Never leave a request unverdicted.** A silent queue teaches products to fork, and forks do not
  come back.
- **Never accept a single-product shape.** Demand of one is a `product-scope` conversation.
- **One change in flight.** Serialize the platform.
- **Say which evidence level you are on.** "This seam covers it" after reading the source is L1-ish;
  after reading a doc it is L4, and the docs have been wrong.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Verdicting one request at a time | duplicate demand never surfaces; the same gap gets four divergent answers | read the whole queue, cluster first |
| `already-possible` from a doc | the product builds against an API that doesn't exist | verify in source, cite the file |
| Accepting because the requester argued well | platform capture by the loudest consumer | count products, not paragraphs |
| A bare `deferred` | the product cannot tell whether to invest in its shim | give the reason and the trigger |
| Rejecting without naming the invariant | the product hunts for another route around it | name it |
| Letting a vertical grow in `samples/` | the platform repo becomes a product repo | move it out |
| Accepting without adopting the acceptance test | the change is silently regressed later | copy it into the conformance suite |

## Related skills

- `platform-protocol` — the contract this implements, and what each verdict obliges the product to do.
- `plenipo-platform` — the seam catalog and the invariants you are guarding.
- `../install-request-surface/SKILL.md` — the queue's infrastructure. **Load when:** it isn't there.
