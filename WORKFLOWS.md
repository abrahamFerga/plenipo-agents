# Reusable workflow templates

Every GitHub workflow this marketplace installs into a product or platform repo is a **generic
template committed here**, with `<owner>`-style placeholders instead of a real slug. Copy one, fill
the placeholders, and it is yours — nothing is generated from thin air at install time.

Templates live in `assets/` next to the skill that installs them, because plugins install in
isolation: a skill can only read files inside its own plugin. That is also why the platform request
form appears twice below. **Do not "deduplicate" across plugins** — the second copy is the thing that
makes the second plugin work standalone.

This page is the index. The skill named beside each template is where the install procedure,
credentials, and proof steps live.

## Two families, and the difference matters

| | Agentic | Deterministic |
|---|---|---|
| Source | Markdown with YAML frontmatter | plain GitHub Actions YAML |
| Runs | GitHub Copilot, via `gh aw` | a Node script or shell |
| Committed artifact | source `.md` **plus** compiled `.lock.yml` | the `.yml` itself |
| Writes | only what `safe-outputs:` declares | whatever the job's `permissions:` allow |
| May gate a merge | **no** — review output is advisory | **yes** — that is the point |

An agentic workflow can be argued out of an opinion; a required status check cannot. That is why no
agentic workflow here gates or merges anything, and why every agentic *review* is pinned to
`allowed-events: [COMMENT]`. The optional `pr-approval-verdict.md` template is dispatch-only: use it
when a PR deserves another set of eyes, without making provider availability part of CI.

`agent-tick.yml` sits between the two families: plain Actions YAML that launches a Claude Code
session. It belongs in the deterministic table because everything it *writes* is judged by the
deterministic gates afterwards — the PR it opens must still pass `pr-gates.mjs` and the scheduled
merger — and because it launches nothing unless a repository variable says so.

## Agentic workflows

From [`plugins/harness/skills/install-github-agentic-workflows/assets/`](plugins/harness/skills/install-github-agentic-workflows/assets),
installed by `/harness:install-github-agentic-workflows`. All are read-only agents whose every write
is declared, typed, and capped.

Three roles, detected from the repo: `Plenipo.slnx` means **platform**, `workflow.json` plus vendored
`Plenipo.*` packages means **product**, and `.claude-plugin/marketplace.json` means the
**marketplace** itself. The role picks the template set — the platform and product PR reviewers check
RBAC, tenant isolation and approval gates, which is meaningless in a markdown skills repo, so the
marketplace has its own.

| Template | Install into | Trigger | What it may write |
|---|---|---|---|
| [`product-issue-triage.md`](plugins/harness/skills/install-github-agentic-workflows/assets/product-issue-triage.md) | product | issue opened/reopened, or dispatch | ≤4 labels, remove `agent:needs-triage`, 1 comment |
| [`product-platform-escalation.md`](plugins/harness/skills/install-github-agentic-workflows/assets/product-platform-escalation.md) | product | issue labeled `platform:request`, or dispatch | 1 issue **in the platform repo**, ≤1 label, 1 comment |
| [`product-harness-feedback.md`](plugins/harness/skills/install-github-agentic-workflows/assets/product-harness-feedback.md) | product | issue labeled `harness:gap`, or dispatch | 1 issue **in the marketplace repo**, ≤1 label, 1 comment |
| [`product-pr-intent-review.md`](plugins/harness/skills/install-github-agentic-workflows/assets/product-pr-intent-review.md) | product | pull request | ≤8 inline comments, 1 `COMMENT` review |
| [`platform-request-triage.md`](plugins/harness/skills/install-github-agentic-workflows/assets/platform-request-triage.md) | platform | issue labeled `platform-request`, reopened, dispatched, or a needs-info body edit | ≤3 labels, remove waiting labels, 1 comment |
| [`platform-pr-intent-review.md`](plugins/harness/skills/install-github-agentic-workflows/assets/platform-pr-intent-review.md) | platform | pull request | ≤8 inline comments, 1 `COMMENT` review |
| [`platform-release-impact.md`](plugins/harness/skills/install-github-agentic-workflows/assets/platform-release-impact.md) | platform | release published, or dispatch | 1 issue **in one named product repo** |
| [`marketplace-harness-gap-triage.md`](plugins/harness/skills/install-github-agentic-workflows/assets/marketplace-harness-gap-triage.md) | marketplace | issue labeled `harness-gap`, reopened, dispatched, or a needs-info body edit | ≤3 labels, remove waiting labels, 1 comment |
| [`marketplace-pr-intent-review.md`](plugins/harness/skills/install-github-agentic-workflows/assets/marketplace-pr-intent-review.md) | marketplace — optional after health proof | pull request | ≤8 inline comments, 1 `COMMENT` review |
| [`pr-approval-verdict.md`](plugins/harness/skills/install-github-agentic-workflows/assets/pr-approval-verdict.md) | any role — **opt-in** | dispatch only | ≤4 inline comments, 1 advisory comment |

The three that write across repositories — escalation, harness feedback, and release-impact — need a
GitHub App installed on exactly the two repos involved, never a broad PAT. The rest need only
`COPILOT_GITHUB_TOKEN`. Note that harness feedback targets a **different** repo from the other two:
the marketplace, read from the `workflow.json` `skills.external[]` entry for `plenipo-agents`.

### How the issue path fits together

`product-issue-triage.md` is the front door for issues a human or an outside reporter files.
Issues swept by `/plenipo:test` already arrive labelled `agent:ready` with a priority, so triage
skips them by design — it acts only on `agent:needs-triage` or on an issue with no `agent:*` label
at all.

Triage may recommend an escalation but **never applies `platform:request` itself**. That label is
what `product-platform-escalation.md` trusts in order to raise its integrity, so a human applies it.
An agent that could label its way into an escalation would hand untrusted issue text a path to a
cross-repository write.

## Deterministic workflows

From [`plugins/plenipo/skills/setup/assets/`](plugins/plenipo/skills/setup/assets), installed by
`/plenipo:setup`. These are what make unattended merging safe.

| Template | Trigger | Purpose |
|---|---|---|
| [`agent-gates.yml`](plugins/plenipo/skills/setup/assets/agent-gates.yml) | pull request, incl. body edits and new commits | runs the protected base's `pr-gates.mjs`; **make it a required check** or it gates nothing |
| [`agent-merge.yml`](plugins/plenipo/skills/setup/assets/agent-merge.yml) | schedule every 15 min, or dispatch | independently recovers issue triage, then runs `merge-gate.mjs`; merging needs green required checks and `autonomy.level >= 1`, not an approval label |
| [`agent-tick.yml`](plugins/plenipo/skills/setup/assets/agent-tick.yml) | dispatch, or an opt-in cron | runs one booting verb — `deliver`, `test` or `define` — on a GitHub-hosted runner through the Claude Code GitHub Action, so building no longer needs your machine; fails closed unless the `AGENT_TICK` variable is `on`, keeps its journal on the `agent-journal` branch, and never merges |
| [`pr-gates.mjs`](plugins/plenipo/skills/setup/assets/pr-gates.mjs) · [`merge-gate.mjs`](plugins/plenipo/skills/setup/assets/merge-gate.mjs) · [`triage-retry.mjs`](plugins/plenipo/skills/setup/assets/triage-retry.mjs) | — | deterministic evidence/merge policy and bounded issue-triage recovery |
| [`pr-gates.test.mjs`](plugins/plenipo/skills/setup/assets/pr-gates.test.mjs) · [`merge-gate.test.mjs`](plugins/plenipo/skills/setup/assets/merge-gate.test.mjs) · [`triage-retry.test.mjs`](plugins/plenipo/skills/setup/assets/triage-retry.test.mjs) | — | no-network regression proof for the policies the scheduled loop actually executes |
| [`CODEOWNERS`](plugins/plenipo/skills/setup/assets/CODEOWNERS) | — | the paths an agent may never merge unreviewed |

Needs-info triage has a requester-side return path rather than a human relay. Product `deliver` and
`fleet` ticks scan exact upstream-repository/issue markers in open product issue and PR bodies,
reject held or already-final requests, then route one referenced issue to `request-platform-change`
or `report-harness-gap`. Those skills accept only a marked `github-actions[bot]` comment whose
successful v2 run is verified on the live default branch, then repair the existing issue body. The
guarded `edited` event and scheduled `triage-retry.mjs` take it back from there.

The reviewer is irreducibly a judgement, so it is optional and separate from merge authority.
`pr-approval-verdict.md` runs only when dispatched with an exact PR, head and base, and can write
comments only. Do not stack it with a role-specific intent reviewer: that spends two model calls on
the same diff without adding an independent signal. Control-plane merges instead run
`pr-gates.mjs` downloaded from the protected base, independent of the PR-owned required-check
wrapper. A provider outage therefore leaves an optional review absent; it does not leave a required
check red or the merge queue waiting on a label.

From [`plugins/steward/skills/install-request-surface/assets/`](plugins/steward/skills/install-request-surface/assets),
installed by `/steward:install-request-surface` into the platform repo:

| Template | Trigger | Purpose |
|---|---|---|
| [`consumer-conformance.yml`](plugins/steward/skills/install-request-surface/assets/consumer-conformance.yml) | platform change | packs the platform at an RC version and builds/tests every registered consumer |

Read its header before trusting a green run. It states plainly what it does **not** catch — the CSP
hash of platform-authored inline HTML being the highest-risk invisible break.

## Issue forms and registries

| File | Install into | Purpose |
|---|---|---|
| [`platform-request.yml`](plugins/steward/skills/install-request-surface/assets/platform-request.yml) | platform `.github/ISSUE_TEMPLATE/` | the full request form — an issue form, so the fields are a contract both agents parse |
| [`platform-request.yml`](plugins/harness/skills/install-github-agentic-workflows/assets/platform-request.yml) | platform `.github/ISSUE_TEMPLATE/` | the same form, trimmed, for repos installing only the agentic workflows |
| [`consumers.json`](plugins/steward/skills/install-request-surface/assets/consumers.json) | platform root | the consumer registry that release-impact and conformance both read |
| [`platform-steward.agent.md`](plugins/steward/skills/install-request-surface/assets/platform-steward.agent.md) | platform `.github/agents/` | the steward persona for agents running on github.com |

## Instantiating a template

1. Read the installing skill first. It owns the credentials, the label prerequisites, and the proof
   steps; this page only tells you the file exists.
2. Copy the file into `.github/workflows/` and replace **every** `<...>` placeholder with the real
   slug. Read the owner from `workflow.json` or `gh api user` — never hardcode one.
3. Create only the labels named in that workflow's `safe-outputs.add-labels.allowed` list. The
   allowlist is a security boundary, not decoration. For a product, `/plenipo:setup` and
   `/define:sync-backlog` create the `agent:*`, `type:*`, and `priority:*` families already.
4. Compile, for agentic templates only, and commit source and lock file together:

   ```bash
   gh aw compile --validate --actionlint --zizmor --poutine --approve
   ```

5. Prove it before enabling writes. Compile a staged copy, dispatch it against a disposable issue or
   PR, and confirm it requested only the declared outputs. A green compile is L1/L2 — it says the
   file is well formed, not that the wiring is right.

**Never edit a `.lock.yml`.** The next compile discards it. Edit the `.md` and recompile.

## What is deliberately not a template

`agentics-maintenance.yml` is **generated** — `gh aw compile` emits it only while some workflow
uses expiring safe outputs (`expires` on a created issue, discussion or PR) or configures
`safe-outputs.noop`, and removes it again when none does, as it did in this repo after the
September 2026 recompile. It is byte-identical across repos because it is generated, not copied.
Do not vendor it here and do not hand-edit it in a product; run the compiler.
