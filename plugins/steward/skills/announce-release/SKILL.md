---
name: announce-release
description: >
  Push a Plenipo release out to every product built on it: classify what changed, then open an issue
  in each consumer repo — carrying step-by-step migration instructions when the release breaks them,
  or the shims it now retires when it doesn't. Products are told; they never have to poll. Closes the
  platform requests the release satisfied and names the version in each.
  USE FOR: after tagging a platform release, or to re-announce one whose consumers never picked it up.
  DO NOT USE FOR: triaging incoming requests (../triage-requests/SKILL.md) or performing an upgrade
  inside a product (/deliver:upgrade-platform).
license: MIT
disable-model-invocation: true
---

# Announce a release to the products

A release nobody is told about is a release nobody adopts. Products pin the platform deliberately —
which is correct, and which means **the platform must push**, because a pinned consumer has no reason
to look.

This is the other half of the request protocol. Requests flow in and get verdicts; releases flow out
and get migration instructions. Both are messages on GitHub in the shared envelope, so the receiving
agent can act without a human relaying.

**Terminal states.** `Success` — every registered consumer has an issue, and every satisfied request
is closed naming the version · `No-op` — nothing consumer-visible changed · `Blocked` — the release
has no published packages, or `gh` lacks scope · `Approval-required` — the release contains a
breaking change whose migration you cannot state precisely; a human writes those steps before
anything is announced.

> That last state is the important one. **A breaking change announced without correct migration steps
> is worse than silence** — it starts N agents down a path you have not verified.

## When to Use

- A platform version has been tagged and its packages published.
- A release went out earlier and consumers are still behind.
- A request was closed by a release and the requester was never told.

## Stop Signals

- **Packages are not actually published** → `Blocked`. Some versions in this platform's history were
  consumed but never released; announcing one sends agents to a 404.
- **You are in a product repo** → `/deliver:upgrade-platform` is the receiving side.
- **You have not read the diff** → you cannot classify a release you have not looked at.

## Inputs

| Input | Where from | Used for |
|---|---|---|
| The release | the tag, its `CHANGELOG.md` entry, and **the diff since the previous tag** | classification |
| Consumers | `consumers.json` | who to notify |
| Satisfied requests | `platform-request` issues labelled `triage:accepted` | what to close, and who asked |
| Public surface changes | the diff over `src/**` public types and endpoints | the breaking-change analysis |

## Workflow

1. **Confirm the release exists** — the tag is pushed and its packages are attached. If not, stop.

2. **Classify it. Read the diff; do not trust the changelog.** A changelog says what someone meant
   to change. For each consumer-visible difference decide:

   | Class | Examples |
   |---|---|
   | **Breaking** | a removed or renamed public type/member; a changed signature; a changed DI lifetime or registration order; a newly required config key; a migration that alters existing data; a changed JSON shape on an endpoint a product reads; a changed default that flips behaviour |
   | **Non-breaking** | a new seam, a new manifest field, a fixed bug, a new endpoint, a performance change |

   Two classes hide here and are the ones that actually bite, because no compiler sees them:

   - **Registration-order changes.** A product replacing a platform service by registering after it
     is silently un-overridden by a switch to `TryAdd*` or a moved registration. It compiles, it
     runs, and it quietly does the wrong thing.
   - **Inline asset changes.** A product pinning a CSP `sha256-` of platform-authored inline HTML
     white-screens when that HTML changes. **No managed-API check and no compile-and-test gate sees
     this.** If the release touched inline scripts or the app shell, it is breaking, whatever the
     compiler says.

   When in doubt, classify as breaking. A false alarm costs a consumer ten minutes; a missed break
   costs a production incident.

3. **Write the migration steps** — only for breaking changes, and only ones you can state exactly.
   Per change: what changed, what a consumer sees when it hits them (the compiler error, the runtime
   symptom), the exact edit, and how to confirm it worked. If you cannot write all four for any
   change, that is `Approval-required` — stop and get a human.

4. **Open one issue per consumer**, in **their** repo. Push; never expect them to poll.

   ```markdown
   <!-- plenipo-agent kind=breaking-change from=plenipo ref=plenipo#<release-issue> status=open -->

   ## Plenipo <version> — migration required

   **Breaks you because:** <the specific thing this consumer uses>

   ### Steps
   1. `<exact edit>` — you will see `<symptom>` until you do
   2. …

   ### Confirm
   `dotnet test <Product>.slnx` — and specifically `<the test that proves the migration>`

   ### Retired by this release
   - `TODO(plenipo#123)` in `src/…` — the platform now does this; delete the shim **and its guard
     test**, then re-run the acceptance test from that request.
   ```

   For a non-breaking release use `kind=upgrade-available` and drop the migration section — but
   **keep the retired-shims list**, because that is the part a consumer will otherwise never do.

   Label with `agent:ready`, plus `breaking-change` where it applies, so the consumer's agent finds
   it by label rather than by reading everything.

5. **Tailor each issue to that consumer.** You know what they use — the requests they filed, the
   shims they told you about. A generic broadcast gets skimmed; "this breaks the thing you built in
   March" gets read. If a change does not affect a consumer, say so explicitly rather than listing it.

6. **Close the satisfied requests.** For each accepted `platform-request` this release delivers,
   comment a verdict naming the version, then close:

   ```markdown
   <!-- plenipo-agent kind=verdict from=plenipo ref=plenipo#123 status=done -->
   **Shipped in:** 0.1.0-alpha.29
   **Action for the product:** upgrade, then remove the shim tagged `TODO(plenipo#123)` and its
   guard test. The acceptance test from this request is now a conformance test in the platform suite.
   ```

7. **Record the announcement** in the release issue or the changelog entry: which consumers were
   notified, which were skipped and why. A consumer marked `conformance: false` still gets told —
   being stale is a reason to notify, not a reason to skip.

8. **Report**: the classification with reasons, the issues opened, the requests closed, and any
   consumer you could not reach.

## Guardrails

- **Classify from the diff, not the changelog.** Changelogs describe intent; diffs describe reality.
- **Never announce a breaking change without all four parts** of each migration step. Vague
  instructions fan out into N different wrong guesses.
- **Never skip a consumer because it is behind.** Stale consumers are exactly the ones that need the
  message — one of this platform's two products is already 14 releases behind.
- **Push, never poll.** Products pin on purpose; the platform reaches out.
- **Read the owner from config**, never hardcode it.
- **Do not upgrade anyone.** You open issues; each product decides when, and runs its own ladder.
- **The conformance gate is not a substitute for this.** It tells *you* whether you broke someone.
  This tells *them* what to do about it — and it cannot see CSP or asset breaks at all.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Trusting the changelog | a break ships unannounced | read the diff |
| One broadcast issue for all consumers | everyone assumes it is about someone else | one tailored issue per repo |
| Migration steps with no confirmation step | consumers cannot tell when they are done | say which command proves it |
| Omitting the retired shims | workarounds outlive their reason and double-apply | list every `TODO(plenipo#N)` this release closes |
| Treating registration-order or asset changes as non-breaking | silent misbehaviour, or a white-screened SPA | classify both as breaking |
| Closing a request without naming the version | the requester cannot tell if their fix is in the release they have | name it |

## Related skills

- `agent-protocol` — the envelope, kinds, and labels used above.
- `platform-protocol` — why shims are tagged, and what closing a request obliges a product to do.
- `../triage-requests/SKILL.md` — the inbound half of this loop.
- `report-harness-gap` — **Load when:** step 2's diff read shows the release invalidated a fact a
  skill states. You are the only agent who has just read the whole diff, so you are the cheapest
  place to catch a stale skill before every product inherits it.
