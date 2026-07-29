---
name: platform-protocol
description: >
  The contract between products and the Plenipo platform when many products are being built at once:
  the escalation ladder a product climbs before asking for a platform change, the shape of a platform
  request, what the platform steward guarantees back, and the rule that filing a request never blocks
  the product. Reach for it whenever a product needs something the platform does not yet do.
  USE FOR: deciding whether a gap is yours or the platform's, understanding what a triage verdict
  means, knowing why a shim is tagged. DO NOT USE FOR: actually filing the request
  (/deliver:request-platform-change) or triaging the queue (/steward:triage-requests).
license: MIT
---

# The platform request protocol

Ten products building in parallel on one platform is not ten times one product. The platform becomes
the scarce shared resource, and the two ways it fails are opposite:

- **Starved** — every product works around every gap locally, the platform stops absorbing shared
  need, and you end up with ten divergent implementations of the same thing.
- **Captured** — every product pushes its own shape into the platform, the invariants erode, and the
  platform becomes a distributed monolith that no product can upgrade safely.

This protocol exists to hit neither. It has one non-negotiable property: **a product agent never
blocks on the platform.**

## This is not hypothetical

Measured on this platform with **one** product active:

- **~22% of platform commits were already product-driven** — the largest single category of change,
  ahead of dependency bumps and merges combined. That share does not stay flat as products are added.
- **Zero issues had ever been filed**, against 62 pull requests. The platform's own product guide
  says "open an issue rather than forking," and it had never been followed once — including by its
  author. Products route around a queue that does not visibly work.
- One product carries **235 lines of middleware that rewrites platform request and response JSON**
  to patch four platform bugs at the HTTP boundary. Its own comment says "until the fixes land
  upstream." It is marked deletion-ready, and **nothing tracks when to delete it.**
- Another product replaces a platform service by registering after it and relying on
  last-registration-wins. A platform switching to `TryAdd*` would silently un-override it, with no
  test anywhere that would notice.

Every one of those is what this protocol exists to prevent. The workarounds are not sloppiness —
they are the rational response to having nowhere to file.

## Adopt it in stages — do not start with the whole thing

**Right now there is one live product**, plus one that has drifted far enough to be effectively
unrecoverable. Most of the ceremony below is designed for a queue with several requesters, and at
one requester it is self-ceremony: you would be negotiating with yourself, in public, on a form.

Turn mechanisms on when the consumer count earns them:

| Consumers | Turn on | Skip until later |
|---|---|---|
| **1–2** | the escalation ladder · **tagged, self-failing shims** · a `platform-request` label and issue form · the consumer conformance gate | clustering, `demand:multi`, RFC-style sign-off, warranty periods, a board |
| **3–4** | duplicate search before filing · the structured verdict block · the request register | formal review committees |
| **5+** | clustering and demand counting · one-change-in-flight discipline · a platform board · scheduled queue sweeps | — |

The two that are load-bearing **immediately, at n=1**, are the ones that address damage already
present in this codebase: shims that nothing tracks, and a platform that can break its consumer
without either side noticing. Everything else is scaffolding for a future you may not reach.

If you are adding the whole protocol today, you are over-fitting to a headcount you do not have.

## The three rules

1. **Never block.** A product that cannot proceed without a platform change applies a local shim and
   keeps going. The request is a background thread, not a barrier. If you find yourself waiting, you
   have misused the protocol.
2. **Never edit the platform from a product loop.** Not a quick fix, not a one-line change. Ten
   agents editing one repo produces conflicting PRs, silent invariant erosion, and version chaos.
   The platform has exactly one writer: its own loop.
3. **Never weaken an invariant to unblock yourself.** If the platform's RBAC, approval, tenancy, or
   audit spine is in your way, that is a design signal about your feature, not a defect in the
   platform. Say so in the request rather than routing around it.

## The escalation ladder

Climb it in order. Most "the platform can't do this" resolves at step 0 or 1, and the cost of
skipping a step is a request the steward closes with "you could already do this."

| Step | Ask yourself | How to check | If yes |
|---|---|---|---|
| **0** | Is it already there? | read the source, not the docs — `plenipo-platform` has the trust ranking and the "do not rebuild these" table | use it |
| **1** | Does a **product seam** cover it? | the host seams: your module, a **product-owned connector**, the product offering, a provisioning hook, a notification channel, product-wide platform tools, a declared role, and the swappable services | build it in your repo |
| **2** | Can a **local shim** carry it for now? | an adapter, a wrapper, a narrowed copy — in your repo, not the platform's | apply it, tag it, continue |
| **3** | Is it genuinely a platform primitive? | it serves more than this one product, or it belongs to the spine | file a platform request |

Step 1 is the one most often skipped. A product can define its **own** connector against the
connector SDK and register it like any other — the catalog, per-tenant enable, permission gating and
agent-tool exposure are DI-driven and never keyed to a connector's assembly. "The platform doesn't
ship a connector for X" is almost never a reason to change the platform.

### The shim, and why it is tagged

A shim is the price of not blocking, and untagged shims are how a codebase silently forks from its
platform. Every shim carries the issue number:

```csharp
// TODO(plenipo#123): remove once the platform exposes IFoo directly.
```

That tag is the removal checklist. When the request closes, `grep -rn "TODO(plenipo#123)"` finds
every place to unwind — and `/deliver:upgrade-platform` does exactly that on the upgrade PR. A shim
without a tag is technical debt with no creditor.

### A tag is passive — make the shim fail loudly

A comment does not stop a shim outliving its reason, and the dangerous ones do worse than linger: a
shim that **rewrites platform behaviour** will **double-apply** once the platform is fixed — filtering
an already-filtered list, overwriting a now-correct value. The product gets quietly wrong behaviour
from a change that was supposed to help it.

So every behavioural shim ships with a **guard test that asserts the platform is still broken**:

```csharp
// Fails when the platform stops needing the shim — that failure IS the signal to delete it.
// Pairs with TODO(plenipo#123).
[Fact]
public async Task Shim_StillNeeded_PlatformStillReturnsUnfilteredModels()
{
    var raw = await PlatformEndpointDirect();     // bypassing our middleware
    Assert.Contains(raw, m => !IsChatModel(m));   // still unfiltered upstream → shim earns its place
}
```

When the platform is fixed, that test goes **red on the upgrade PR**, names the shim, and the fix is
to delete both. This inverts the default: instead of a shim silently surviving, it must keep proving
it is needed. It is the cheapest mechanism here and the one worth adopting first, at any consumer
count.

The same applies to a shim that depends on registration order — if you replace a platform service by
registering after it, pin that with a test that resolves the service and asserts it is yours.
Otherwise a platform switching to `TryAdd*` un-overrides you silently.

## What a request must carry

A request is a contract, not a complaint. The fields exist because each one prevents a specific
failure:

| Field | Why it exists |
|---|---|
| Requesting product, repo, and **platform version in use** | a gap on an old version may already be fixed |
| The capability, in one sentence | forces the request to be about a need, not a solution |
| **Which seam you tried, and why it didn't fit** | proves step 1 was climbed; this field is what makes the queue survivable |
| Minimal reproduction, or the code that won't compile | the steward must be able to see it without cloning your product |
| **The local shim applied**, and where the tag is | proves you are not blocked, and tells the steward what to unwind |
| **The acceptance test** you will run when it lands | makes the request verifiable — and the platform adopts it as a conformance test, so the reason for the change is permanently defended |
| Whether other products would want it | your guess; the steward verifies against the real queue |

Proposing a solution is welcome but never required. The steward owns the platform's shape.

## What the steward guarantees back

Every request gets exactly one of these verdicts, as a structured comment your agent can read
without a human relaying it:

| Verdict | Meaning | What you do |
|---|---|---|
| `already-possible` | it exists; the comment names the seam and sketches the code | use it, **remove the shim**, close |
| `product-scope` | real need, but it belongs in your repo; the comment says which seam | build it, remove the shim if the real thing replaces it |
| `accepted` | it becomes platform work, linked to a platform issue | keep the shim, watch the issue |
| `deferred` | real and platform-shaped, but not now, with a reason | keep the shim; the reason tells you whether to invest in it |
| `rejected` | it would violate an invariant; the comment names which one | **do not route around it** — rethink the feature |

`already-possible` is the most common verdict, and receiving it is not a failure. It is the protocol
working: one agent's dead end became a documented answer.

**On acceptance, the demand signal matters more than the argument.** The steward can see all ten
products; you can see one. Two products asking for the same thing outranks one product asking
eloquently.

## The lifecycle

```text
product loop hits a gap
  → climbs the ladder (0,1,2)
  → applies a shim, tagged TODO(plenipo#N)
  → files the request                       ← never blocks; the product loop continues
  → steward triages: dedupes across products, verdicts, responds
  → if accepted: platform implements on its own loop, one change in flight
  → platform releases; the request closes naming the version
  → upgrade PR lands in each affected product, removing the tagged shims
```

Note what is serialized and what is not. **Products run fully in parallel. The platform has exactly
one writer.** That asymmetry is the design.

## Prior art — this is not invented here

The protocol is an assembly of named patterns, and knowing the names is useful when arguing about it:

| Pattern | Where it appears here |
|---|---|
| **X-as-a-Service** (Team Topologies) | the platform is consumed, not co-developed. Products do not collaborate inside the platform repo; they consume a versioned package and file requests |
| **Extensions for Sustainable Growth** (InnerSource) | step 1 of the ladder. Build it at a seam, outside the core, and write down the criteria for promoting it *into* the core later — which is what `demand:multi` is |
| **Common Requirements** (InnerSource) | the steward's clustering step. Its solution is exactly ours: align requirements across consumers, then refactor into pieces they can all agree on |
| **Trusted Committer** (InnerSource) | the steward role — with the pattern's own instruction that the scope of the role must be *documented in the project*, which is what this skill is |
| **Transparent Cross-Team Decision Making using RFCs** (InnerSource) | the structured request. Its problem statement is ours: *"discovering disagreements late — such as during pull request review — proves costly"* |
| **Consumer-driven contract testing** (Pact and friends) | the conformance gate. The platform verifies it has not broken its consumers *before* releasing, not after |

The one thing this adds is that both sides are agents, so the handoff has to be machine-readable —
hence the structured verdict block instead of a conversation.

## Anti-patterns

| Anti-pattern | What it looks like | Why it hurts at ten products |
|---|---|---|
| **Platform capture** | one product's vertical shape lands in the platform | the other nine inherit a concept that means nothing to them |
| **Blocking on a request** | the product loop stops until the platform answers | destroys the parallelism the whole setup exists for |
| **The untagged shim** | a workaround with no issue number | never removed; the product silently forks from the platform |
| **The quick platform fix** | "it's one line, I'll just do it" from a product loop | ten agents, ten one-line fixes, one unmergeable repo |
| **Invariant erosion** | a seam added that lets a caller bypass RBAC, approval, or tenancy | the platform's entire value proposition is that these cannot be bypassed |
| **Duplicate divergence** | four products solve the same gap four ways | the fix costs four times as much whenever it finally lands |
| **Auto-upgrade** | products track the platform's latest automatically | one bad release breaks ten products at once; pin, and upgrade deliberately |

## Related skills

- `plenipo-platform` — what the platform already provides, and the invariants a request may not ask
  you to break.
- `loop-discipline` — the terminal states a request loop ends in; `Blocked` is *not* one of them here.
- `/deliver:request-platform-change` — file one.
- `/deliver:upgrade-platform` — consume a release and unwind the shims it retires.
- `/steward:triage-requests` — the platform side of this contract.
