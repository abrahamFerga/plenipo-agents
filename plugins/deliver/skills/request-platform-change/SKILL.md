---
name: request-platform-change
description: >
  Handle a gap where the Plenipo platform cannot do what a product needs: climb the escalation ladder
  first, apply a tagged local shim so the product loop keeps moving, and only then file a structured
  platform request that the steward can triage without a human relaying it. Never edits the platform
  and never blocks on it.
  USE FOR: a compile error against a platform type, a missing seam, a platform bug, an invariant that
  blocks a feature. DO NOT USE FOR: consuming a platform release and unwinding shims
  (../upgrade-platform/SKILL.md), or triaging the queue (/steward:triage-requests).
license: MIT
disable-model-invocation: true
---

# Request a platform change

You hit something the platform does not do. **You are not blocked, and you are not going to edit the
platform.** This skill turns that moment into a shim plus a request, in that order, and returns you
to the work you were doing.

The reasoning behind the protocol is in the `platform-protocol` skill; this is how to execute it.

**Terminal states.** `No-op` — the ladder resolved it, no request needed (the most common and best
outcome) · `Success` — shim applied, request filed, product loop resumed · `Approval-required` — the
only route forward weakens an invariant, so a human decides whether the *feature* changes ·
`Blocked` — a shim genuinely is not possible and the product cannot proceed; rare, and it must be
stated in the request because it changes priority.

> `Blocked` is not a normal ending here. If you reach it more than occasionally, the product is
> designed against the platform's grain and that is worth saying out loud.

## When to Use

- A platform type or method you expected does not exist, or does not do what its name suggests.
- A platform behaviour is wrong (a gate doesn't fire, a filter leaks, an endpoint 500s).
- A feature needs a hook the platform does not expose.
- An invariant blocks a legitimate need and you want the shape reconsidered.

## Stop Signals

- **You have not read the source** → do that first. The platform's docs have been wrong about its own
  API; `plenipo-platform` carries the trust ranking and the "do not rebuild these" table.
- **You are in the platform repo** → you are the platform. Use `/steward:triage-requests`.
- **A release has landed that may contain it** → `../upgrade-platform/SKILL.md` first.
- **You want to "just fix it quickly" in the platform** → no. Rule 2 of the protocol exists because
  ten agents doing that produces one unmergeable repo.

## Inputs

| Input | Where from | Used for |
|---|---|---|
| The failing code or behaviour | your working tree | the reproduction |
| Platform version in use | `Directory.Build.props` (`PlenipoVersion`) or a csproj `PackageReference` | a gap may already be fixed upstream |
| Seam catalog | `plenipo-platform`, and the platform's own product guide | proving step 1 |
| Platform repo | `workflow.json` → `platform.repo`, else `gh` search | where the issue goes |

## Workflow

1. **Climb the ladder, in order, and record what you checked.** The record becomes the
   "which seam you tried" field, which is the single field that keeps the queue survivable.

   | Step | Check |
   |---|---|
   | **0** | Read the platform source for the type or endpoint. Is it already there under another name? Grep the public surface rather than trusting a doc. |
   | **1** | Walk the seams explicitly: your module; a **product-owned connector** (you can define one in your own repo against the connector SDK and register it like a built-in); the product offering; a provisioning hook; a notification channel; product-wide platform tools; a declared role; the swappable services. Name the one closest to fitting and say why it doesn't. |
   | **2** | Can an adapter, wrapper, or narrowed copy in *your* repo carry this for now? |

   If step 0 or 1 resolves it, **stop and use it** — terminal state `No-op`. Say which seam, so the
   next agent does not repeat the search.

2. **Apply the shim, and tag it.** Before filing anything, get unblocked:

   ```csharp
   // TODO(plenipo#<issue>): remove once the platform exposes <thing> directly.
   ```

   File the issue first if you want the real number, or use a placeholder and patch it in step 4 —
   but the tag is not optional. An untagged shim is never removed and the product quietly forks from
   its platform. Keep the shim **as small and as ugly as honesty allows**: a shim that looks like a
   feature gets adopted, and then nobody wants it removed.

3. **Check for a duplicate before filing.** Ten products file into one queue.

   ```bash
   gh issue list --repo <platform-repo> --label platform-request --state all --search "<capability keywords>"
   ```

   If one exists, **comment on it** with your product, version, and acceptance test rather than
   opening a second. Two products on one issue is the demand signal the steward prioritizes by;
   two issues is noise that hides it.

4. **File the request** using the platform's `platform-request` issue form. Every field is required
   for a reason — see `platform-protocol`. In particular:
   - **Acceptance test**: the test you will run when it lands. The platform adopts it as a
     conformance test, so the reason for the change stays defended.
   - **Local workaround**: name the file and the tag, so the steward knows what to unwind.
   - **Blast radius**: your honest guess; the steward checks it against the queue.

   ```bash
   gh issue create --repo <platform-repo> --template platform-request.yml
   ```

   Then patch the real issue number into the shim's tag.

5. **Return to the product loop.** The request is a background thread. Record it where the loop's
   memory lives — the issue number in the product's own issue or PR body — and continue.

6. **When a verdict arrives**, act on it:

   | Verdict | Action |
   |---|---|
   | `already-possible` | use the named seam, **delete the shim**, close the loop |
   | `product-scope` | build it at the named seam in your repo; retire the shim if the real thing replaces it |
   | `accepted` | keep the shim; nothing to do until the release |
   | `deferred` | keep the shim; the stated reason tells you whether to invest in making it permanent |
   | `rejected` | **do not route around it.** Rethink the feature; if you still disagree, escalate to a human rather than to the codebase |

## Guardrails

- **Never edit the platform repo from a product loop.** Not a fix, not a test, not a doc typo.
- **Never weaken an invariant to unblock yourself** — RBAC before the model, approval-first writes,
  tenant isolation, write-only secrets, append-only audit. If one blocks you, that is a design signal
  about your feature.
- **Never file without a shim** unless you are genuinely `Blocked`, and then say so.
- **Never file a duplicate.** Search first; comment on the existing issue.
- **State the need, not the solution.** Proposing an API is fine; insisting on one is how a platform
  gets captured by its loudest consumer.
- **One request per capability.** A request that lists five things gets triaged as its weakest one.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Filing before reading the source | answered `already-possible`; wasted a cycle each side | grep the public surface first |
| "None of the seams work" with no detail | the steward has to redo your analysis; slowest possible path | name the closest seam and why it misses |
| Blocking on the reply | the parallelism the whole setup exists for is gone | shim, tag, continue |
| An untagged shim | never removed; silent fork from the platform | `TODO(plenipo#N)` always |
| A shim that is nicer than the platform API | it gets adopted and outlives its reason | keep it minimal and visibly temporary |
| Opening a second issue for the same gap | hides the demand signal that would have prioritized it | comment on the existing one |
| Requesting a solution shape | platform capture | request the capability |

## Related skills

- `platform-protocol` — the contract, the ladder, and what each verdict means. **Load when:** you
  want the reasoning rather than the steps.
- `plenipo-platform` — the seam catalog and the invariants a request may not ask you to break.
- `../upgrade-platform/SKILL.md` — consume the release that closes your request and unwind the shim.
