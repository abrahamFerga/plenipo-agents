---
name: upgrade-platform
description: >
  Move a product onto a newer Plenipo release deliberately: re-vendor the platform packages, bump the
  single version property, unwind the TODO(plenipo#N) shims whose requests that release closed, and
  prove the whole test ladder still passes before the PR opens. Upgrades are never automatic — one
  bad release must not break every product at once.
  USE FOR: consuming a platform release, retiring a shim after a request lands, recovering a product
  that has drifted versions behind. DO NOT USE FOR: filing a new request
  (../request-platform-change/SKILL.md) or platform-side triage (/steward:triage-requests).
license: MIT
disable-model-invocation: true
---

# Upgrade the platform

A release is not an event that happens to a product; it is something a product chooses. This skill
makes that choice safe, and — the part everyone forgets — **removes the workarounds the release made
unnecessary**. A shim that outlives its reason is how a product silently forks from its platform.

**Terminal states.** `Success` — version bumped, shims retired, ladder green, PR open · `No-op` —
already on the target version with no retired shims outstanding · `Blocked` — the release has no
published packages, or Docker is unavailable so the E2E rung cannot run · `Stalled` — the ladder
fails after three distinct fixes; the release is likely breaking, so report it to the platform rather
than forcing it through · `Approval-required` — the upgrade needs a code change to compile, which is
a behavioural change a human should see.

## When to Use

- A platform release has landed with a fix your product requested.
- A `platform-request` you filed was closed naming a version.
- The product is several releases behind and the gap is becoming its own risk.
- `/harness:validate-product` reported version lag.

## Stop Signals

- **You need something the release does not contain** → `../request-platform-change/SKILL.md`.
- **You are in the platform repo** → releases are made there, not consumed.
- **The only reason to upgrade is "newer is better"** → don't. Pinning is deliberate; upgrade when a
  release contains something you want, or when the lag itself is the risk.

## Inputs

| Input | Where from | Used for |
|---|---|---|
| Current version | the `PlenipoVersion` property, else the csproj `PackageReference`s | the delta |
| Target version | the platform's `CHANGELOG.md` and git tags | what you are moving to |
| Release packages | the platform's GitHub Release assets | re-vendoring `.packages/` |
| Closed requests | `gh issue list --repo <platform> --label platform-request --state closed` | which shims can go |
| Shims in this repo | `grep -rn "TODO(plenipo#"` | the removal checklist |

## Workflow

1. **Check the release actually exists.** Read the platform's `CHANGELOG.md` *and* confirm the tag
   has a published Release with package assets attached. Some versions in this platform's history
   were consumed by a product but **never released** — the reproducible path 404s on them. If the
   assets are missing, that is `Blocked`, and it is worth telling the platform.

2. **Centralize the version first, if it isn't.** If the version is repeated in every csproj rather
   than held in one property, fix that before anything else:

   ```xml
   <!-- Directory.Build.props -->
   <PropertyGroup><PlenipoVersion>0.1.0-alpha.28</PlenipoVersion></PropertyGroup>
   ```

   ```xml
   <PackageReference Include="Plenipo.Core" Version="$(PlenipoVersion)" />
   ```

   This is not tidying. It is what makes the *csproj* half of an upgrade one line, and what lets the
   platform build your product against a release candidate with `-p:PlenipoVersion=<rc>` — the only
   thing standing between you and a silent break.

   **But the version is pinned in more places than the csproj files.** In the reference product it
   appears in *five independent syntaxes*, and a partial bump leaves a repo that builds and is still
   wrong. Sweep all of them:

   | Where | Looks like |
   |---|---|
   | `PackageReference` in each csproj | `Version="0.1.0-alpha.28"` — the one the property fixes |
   | `.gitignore` negation globs | un-ignoring the vendored `.packages/*.nupkg` by exact filename |
   | frontend `package.json` | a matching `@plenipo/*` version |
   | the upgrade script | a release-asset URL with the version in the path |
   | `Program.cs` CSP header | a `sha256-` hash of platform-authored inline HTML |

   ```bash
   grep -rn "alpha\.[0-9]" --include="*.csproj" --include="*.json" --include="*.ps1" \
     --include=".gitignore" --include="*.cs" . | grep -v "/bin/\|/obj/"
   ```

3. **Re-vendor the packages.** Download the release's nupkgs into `.packages/`, removing the old
   ones. Keep `nuget.config`'s `packageSourceMapping` intact — it is the dependency-confusion guard
   that keeps `Plenipo.*` resolving from the local feed and everything else from nuget.org.

4. **Bump the version property.** One line if step 2 is done.

5. **Build, and read the errors as information.** A compile break is the platform telling you a
   contract changed. Do not paper over it; if the fix is behavioural rather than mechanical, that is
   `Approval-required`.

6. **Unwind the retired shims.** This is the step that gets skipped, and skipping it is how a product
   accumulates a private fork of its platform.

   ```bash
   grep -rn "TODO(plenipo#" --include="*.cs" .
   ```

   For each tag, check whether that request is now closed. If it is:
   - delete the shim,
   - run the **acceptance test from the original request** — the one you promised when you filed it,
   - and confirm the platform's real behaviour replaces it.

   A shim that patches platform behaviour is especially dangerous to leave: once the platform is
   fixed, a rewriting shim can **double-apply** against a now-correct response. Removing it is not
   cleanup, it is a correctness fix.

7. **Climb the whole ladder**, not just the rungs you think are affected — an upgrade touches
   everything by definition:

   ```bash
   dotnet build <Product>.slnx -c Release
   dotnet test  <Product>.slnx -c Release
   ```

   Rung 3 (Testcontainers E2E) is the one that catches a platform change in RBAC, the approval gate,
   or migrations. Do not skip it. If Docker is unavailable, the upgrade is **unverified** — say so
   rather than opening a PR that claims otherwise.

8. **Check the surfaces no test covers.** Two known blind spots:
   - **the CSP hash**, if the product pins a SHA-256 of platform-authored inline HTML — a platform
     change to it white-screens the SPA and **no backend test can see it**. Load the app.
   - **DI override tricks**, if the product relies on last-registration-wins to replace a platform
     service. A platform switching to `TryAdd*` or moving its registration silently un-overrides you.

9. **Open the PR** with: the version delta, the requests this release closed, the shims removed (and
   the test that now covers each), anything that needed a code change, and explicitly what was **not**
   verified.

## Guardrails

- **Never auto-upgrade.** Automated version bumps across ten products means one bad release breaks
  all ten simultaneously. Pin, and choose.
- **Never upgrade and add a feature in the same PR.** When the ladder goes red you must be able to
  attribute it to one variable.
- **Never leave a shim whose request has closed.** Either delete it or write down why it is still
  needed — an undocumented shim is indistinguishable from a fork.
- **Never claim verified without rung 3.** Compilation proves the types still exist, nothing more.
- **Never edit the platform to make your upgrade work.** File a request; keep the shim.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Bumping the version without re-vendoring | restore fails, or resolves an old package silently | replace `.packages/` contents too |
| Version repeated across csproj files | an 11-line upgrade, and no RC testing possible | centralize into one property first |
| Skipping the shim sweep | the product forks from its platform, invisibly | `grep -rn "TODO(plenipo#"` every time |
| Leaving a response-rewriting shim after the fix lands | double-applied transforms on now-correct data | delete it, run the acceptance test |
| Skipping E2E because "it only bumped a version" | a broken approval gate or migration ships | rung 3 always |
| Upgrading to an unreleased tag | assets 404; unreproducible build | confirm the Release exists first |

## Related skills

- `platform-protocol` — why shims are tagged and what closing a request obliges you to do.
- `../request-platform-change/SKILL.md` — what to do when the release still doesn't cover your need.
- `plenipo-runbook` — the ladder this skill climbs.
