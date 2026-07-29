---
on:
  pull_request:
    types: [opened, reopened, synchronize, ready_for_review]
engine: codex
timeout-minutes: 18
max-ai-credits: 240K
permissions:
  contents: read
  issues: read
  pull-requests: read
  actions: read
tools:
  github:
    toolsets: [repos, issues, pull_requests, actions]
    min-integrity: approved
network:
  allowed: [github, api.openai.com]
safe-outputs:
  create-pull-request-review-comment:
    max: 8
  submit-pull-request-review:
    max: 1
    allowed-events: [COMMENT]
---

# Review whether a platform pull request fulfils its intent

Read the PR, linked issue/release, tests, changed code, and repository instructions. Trace the
requested behaviour through the real host/module execution path. Check RBAC-before-the-model,
approval-first writes, tenant isolation, append-only audit, secret non-disclosure, and that a
product-specific policy is not entering the platform.

Report only specific, evidence-backed defects. Prefer inline comments naming the condition, broken
outcome, and relevant changed line. Submit one non-blocking `COMMENT` review; never approve,
request changes, merge, push, or change labels. If no defect is found, summarize requirements,
invariants, and verification gaps considered.
