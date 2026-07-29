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

# Review whether a product pull request fulfils its intent

Read the PR, linked issue, `RUNBOOK.md`, architecture decisions, tests, changed code, and relevant
platform source. Trace the requested behaviour through a real request or UI path. Check product
boundaries, supported platform seams, RBAC before tool execution, approval-gated writes, tenant
isolation, append-only audit, and write-only secrets.

Demand behavioural proof and a regression test that would fail without the change. Report only
specific, evidence-backed defects on the smallest relevant changed line. Submit one non-blocking
`COMMENT` review; never approve, request changes, merge, push, or change labels. If no defect is
found, summarize what was checked and any non-blocking verification gap.
