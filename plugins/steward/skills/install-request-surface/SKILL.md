---
name: install-request-surface
description: >
  Stand up the platform side of the request protocol in the Plenipo repo: the platform-request issue
  form, the triage label taxonomy, the consumer registry, and the conformance workflow that builds
  and tests every registered product against a release candidate before a change can merge. Run once
  per platform repo; re-runnable to reconcile drift.
  USE FOR: a platform repo with no platform-request template, no triage labels, or no consumer gate.
  DO NOT USE FOR: triaging requests once the surface exists (../triage-requests/SKILL.md), or
  anything in a product repo (/deliver:request-platform-change).
license: MIT
disable-model-invocation: true
---

# Install the request surface

Ten products filing into one platform needs somewhere structured to file *to*. This installs that:
a form whose fields are a contract, labels that carry a verdict, a registry of what must not break,
and the CI gate that enforces it.

Without this, requests arrive as prose and the steward re-derives every one of them by hand — which
is exactly how a platform request queue becomes a place issues go to die.

**Terminal states.** `Success` — every artifact present and the conformance workflow ran green at
least once · `No-op` — all present and current · `Blocked` — not a platform repo, or `gh` lacks the
scope to create labels · `Approval-required` — installing the conformance workflow will consume CI
minutes on every platform PR, and enabling it against consumer repos is a visible operational
change; confirm before enabling required consumers.

## When to Use

- The platform repo has no `.github/ISSUE_TEMPLATE/platform-request.yml`.
- Requests are arriving as plain issues with no structure.
- The platform can merge a breaking change without any product noticing until it upgrades.
- A new product should be registered as a protected consumer.

## Stop Signals

- **This is a product repo** (it references `Plenipo.*` packages rather than containing
  `Plenipo.slnx`) → `/deliver:request-platform-change` is the side you want.
- **The surface already exists and is current** → `../triage-requests/SKILL.md`.

## Inputs

| Input | Where from | Used for |
|---|---|---|
| Platform repo | the checkout containing `Plenipo.slnx` — **never identify it by folder name**, it may still be called `Cortex` | where everything installs |
| Consumer list | sibling repos whose csproj reference `Plenipo.*`, plus `gh repo list` | seeding `consumers.json` |
| Each consumer's solution file | its `*.slnx` | the conformance matrix |
| Owner | `gh api user -q .login` or the repo's own remote — **never hardcode** | filling `<owner>` placeholders |

## Workflow

1. **Confirm the repo.** `Plenipo.slnx` present. If instead you find `Plenipo.*` *PackageReferences*,
   you are in a product — stop.

2. **Install the issue form.** Copy [`assets/platform-request.yml`](assets/platform-request.yml) to
   `.github/ISSUE_TEMPLATE/platform-request.yml`. Do not soften the required fields: each one exists
   to prevent a specific failure, and "which seam you tried" is the field that makes the queue
   survivable.

   Also add `.github/ISSUE_TEMPLATE/config.yml` with `blank_issues_enabled: false` if platform
   requests should always be structured — a blank issue is how the contract gets bypassed.

3. **Create the labels.** Read the owner first; never hardcode it.

   | Label | Colour | Meaning |
   |---|---|---|
   | `platform-request` | `#1d76db` | an incoming request from a product |
   | `needs-triage` | `#fbca04` | not yet verdicted |
   | `triage:already-possible` | `#0e8a16` | closed with the seam that covers it |
   | `triage:product-scope` | `#0e8a16` | closed; belongs in the product |
   | `triage:accepted` | `#5319e7` | becomes platform work |
   | `triage:deferred` | `#c5def5` | real, not now, reason recorded |
   | `triage:rejected` | `#b60205` | would break an invariant |
   | `demand:multi` | `#d93f0b` | more than one product wants it |

   ```bash
   gh label create "platform-request" --repo "$OWNER/$REPO" --color 1d76db \
     --description "A product needs something the platform does not yet do" --force
   ```

   Also create one `from:<product>` label per registered consumer, so the queue can be sliced by
   requester.

4. **Seed the consumer registry.** Copy [`assets/consumers.json`](assets/consumers.json) to the repo
   root and fill it from reality: every sibling repo whose csproj reference `Plenipo.*`. Record each
   one's solution file and module id. Mark a consumer `"conformance": false` when it is **stale** —
   a product still on pre-rename `Cortex.*` packages will fail for reasons unrelated to any change
   under test, and a permanently red gate gets ignored, which is worse than no gate.

5. **Install the conformance workflow.** Copy
   [`assets/consumer-conformance.yml`](assets/consumer-conformance.yml) to
   `.github/workflows/consumer-conformance.yml`.

   **Check the prerequisite first.** The workflow swaps versions with
   `-p:PlenipoVersion=<rc>`, which only works if the consumer centralizes its platform version in
   one MSBuild property. If a consumer repeats the version in every csproj instead, either fix that
   consumer first (a one-line `Directory.Build.props` property plus `Version="$(PlenipoVersion)"` in
   each reference) or leave it out of the matrix. Do not paper over it with a `sed` — a rewrite step
   that silently half-matches is worse than an honest exclusion.

6. **Prove the gate.** Run it once via `workflow_dispatch` against a single consumer:

   ```bash
   gh workflow run consumer-conformance.yml --repo "$OWNER/$REPO" -f consumer="$OWNER/<product>"
   gh run watch --repo "$OWNER/$REPO"
   ```

   It must go green against an unmodified platform. **Then prove it can go red** — the same
   red-before/green-after discipline every verifier here is held to. A gate that has never failed
   may be asserting nothing.

7. **Report** what was installed, which consumers are registered and which were excluded and why,
   and whether the gate has been proven in both directions.

## Guardrails

- **Read the owner; never hardcode it.** A marketplace that only works for one GitHub account is
  broken for everyone else.
- **Do not weaken the issue form to reduce friction.** The friction is the filter. A request that
  cannot state which seam it tried is a request that has not tried one.
- **Keep the registry small and honest.** Every entry costs CI minutes on every platform PR. Prefer
  `conformance: false` with a note over deleting an entry — the note preserves the fact that the
  consumer exists.
- **Never enable a required consumer that is currently red.** A permanently failing gate trains
  everyone to ignore it, and then it protects nothing.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Identifying the platform by folder name | installs into the wrong repo | look for `Plenipo.slnx` |
| Registering a stale consumer as required | the gate is permanently red and gets ignored | `conformance: false` plus a note |
| Installing the workflow before the version property exists | every run fails at the swap step | centralize the version first, or exclude the consumer |
| Allowing blank issues | the structured contract is bypassed on day one | `blank_issues_enabled: false` |
| Never proving the gate can fail | a green check that means nothing | break something on purpose once |

## Related skills

- `../triage-requests/SKILL.md` — the loop this surface feeds. **Load when:** the surface is installed
  and requests are arriving.
- `platform-protocol` — the contract both sides are implementing.
