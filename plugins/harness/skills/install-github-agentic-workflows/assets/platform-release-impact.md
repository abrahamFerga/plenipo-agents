---
on:
  release:
    types: [published]
  workflow_dispatch:
    inputs:
      release_tag:
        description: Published platform release tag to assess.
        required: true
        type: string
engine: copilot
timeout-minutes: 15
max-ai-credits: 160K
permissions:
  contents: read
  issues: read
tools:
  github:
    toolsets: [repos, issues]
    min-integrity: approved
network:
  allowed: [github]
safe-outputs:
  allowed-github-references: [<owner>/<product-repo>]
  github-app:
    client-id: ${{ vars.GH_AW_ROUTER_APP_ID }}
    private-key: ${{ secrets.GH_AW_ROUTER_APP_PRIVATE_KEY }}
    owner: <owner>
    repositories: [<product-repo>]
  create-issue:
    target-repo: <owner>/<product-repo>
    labels: [platform:upgrade]
    title-prefix: "[Platform upgrade] "
    max: 1
---

# Route a platform release impact brief to one product

Read `consumers.json`, release notes (or the manual release tag), and the source changes since the
previous release. This workflow is allowed to target only `<owner>/<product-repo>`. Do nothing for a
documentation-only release or an already-open issue covering the same release tag.

When this run was manually dispatched, assess this exact release tag: `${{ inputs.release_tag }}`.

Create one issue only when a public package, host seam, authentication/authorization behaviour,
migration, document/RAG behaviour, job, connector, or UI contract could affect the configured
product. Include the tag, affected source area, concrete upgrade steps, expected verification,
compatible shim retirement work, and source links. Never create a broad announcement or modify code,
PRs, releases, project fields, or another repository.
