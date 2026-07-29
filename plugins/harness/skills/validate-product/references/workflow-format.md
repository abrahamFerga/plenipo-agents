# The `workflow.json` contract

The product's declared state: what it is, which loop it's in, what it composes, and where its
system of record lives. It lives at the product repo root beside `.claude/settings.json`, which is
**derived** from it.

Specified as a field table rather than JSON Schema on purpose — the reader is a model, and a model
reads a table better than `oneOf`/`$ref`/`pattern`.

## Contents

- [Fields](#fields)
- [The settings.json pair](#the-settingsjson-pair)
- [Worked example](#worked-example)
- [Validation rules](#validation-rules)
- [Migrating a product from my-skills](#migrating-a-product-from-my-skills)

## Fields

| Field | Type | Required | Rule |
|---|---|---|---|
| `name` | string | yes | The product's slug. Lowercase, digits, hyphens, 2–40 chars: `^[a-z][a-z0-9-]{1,39}$`. **No prefix is required or implied** — the old `the-*` convention is dead and must not be enforced. |
| `industry` | string | yes | Kebab-case vertical key, 2–64 chars: `^[a-z][a-z0-9-]{1,63}$`. This is the coverage key the fleet scan aggregates on, so `property-management`, never `property management`. |
| `loop` | enum | yes | `scout` \| `define` \| `shape` \| `deliver`. Which loop the product is currently in; drives `enabledPlugins`. |
| `platform` | object | yes | See below. Identifies the Plenipo dependency. |
| `platform.version` | string | yes | The platform package version the product targets, e.g. `0.1.0-alpha.28`. |
| `platform.feed` | enum | yes | `vendored` \| `github-packages` \| `nuget`. **`vendored` is currently the only working value** — the packages are not on nuget.org, and the GitHub Packages feed needs a PAT even for public repos. |
| `cloud` | enum | no | `azure` \| `aws` \| `none`. `none` means no server deployment; the fleet scan excludes those from vertical coverage. |
| `connectors` | string[] | no | Connector ids the product installs. |
| `capabilities` | object[] | no | `{ name, provider }` — e.g. `{ "name": "ocr", "provider": "azure-document-intelligence" }`. |
| `github` | object | no | `{ repo, project, visibility }`. `repo` is `owner/name`; **the owner is read, never hardcoded**. `project` is the Projects v2 number. |
| `skills` | object | no | Which marketplaces and plugins the product enables. See below. |
| `skills.self` | object | no | `{ marketplace, repo, plugins[] }` — this marketplace. |
| `skills.external` | object[] | no | `{ marketplace, plugins[], reason }`. `reason` is required on each: an unexplained third-party marketplace is a supply-chain question nobody can answer later. |

## The `settings.json` pair

`.claude/settings.json` is **derived** from `workflow.json` — never edited independently. The
`loop` field selects which plugins are enabled:

| `loop` | harness | scout | define | shape | deliver |
|---|---|---|---|---|---|
| `scout` | on | on | off | off | off |
| `define` | on | off | on | off | off |
| `shape` | on | off | off | on | off |
| `deliver` | on | off | off | off | on |

> **A full autonomous run should enable the superset up front** rather than flipping plugins
> mid-run: re-enabling a plugin mid-loop requires a `/reload-plugins` that no agent can issue. Loop
> scoping is a context-economy tool for humans working one loop at a time, not a runtime mechanism.

Drift between the two files is a validation **failure**, not a warning: a stale `settings.json`
means the skills the product thinks it has are not the skills it loads.

## Worked example

```json
{
  "name": "networthy",
  "industry": "personal-finance",
  "loop": "deliver",
  "platform": {
    "version": "0.1.0-alpha.28",
    "feed": "vendored"
  },
  "cloud": "azure",
  "connectors": ["plaid"],
  "capabilities": [
    { "name": "file-storage", "provider": "azure-blob" },
    { "name": "ocr", "provider": "azure-document-intelligence" }
  ],
  "github": {
    "repo": "<owner>/networthy",
    "project": 8,
    "visibility": "public"
  },
  "skills": {
    "self": {
      "marketplace": "plenipo-agents",
      "repo": "<owner>/plenipo-agents",
      "plugins": ["harness", "deliver"]
    },
    "external": [
      {
        "marketplace": "anthropics/skills",
        "plugins": ["pdf"],
        "reason": "Bank-statement PDF parsing for the statement-upload feature."
      }
    ]
  }
}
```

## Validation rules

Each of these has a deterministic decision, which is the point:

1. The file parses as JSON, and every required field above is present and matches its rule.
2. `industry` is kebab-case. A value containing a space is a **failure**, not a warning — it
   silently splits the fleet coverage map.
3. `platform.version` is a version that actually exists in the platform's `CHANGELOG.md` or tags. A
   version ahead of the newest tag means the product vendored an unreleased build; say so.
4. `platform.feed` is `vendored` unless the packages have genuinely been published — verify with a
   registry lookup rather than trusting a workflow comment.
5. `.claude/settings.json` `enabledPlugins` matches what `loop` implies (or its documented
   superset), and `extraKnownMarketplaces` covers every marketplace referenced under `skills`.
6. Every `skills.external[]` entry has a non-empty `reason`.
7. No secret-shaped string appears anywhere in the file.
8. `github.repo`'s owner is not hardcoded anywhere in the repo's skills or scripts.

## Migrating a product from `my-skills`

Existing products carry the predecessor's shape. Convert it:

| Old | New |
|---|---|
| `"stage": "development"` | `"loop": "deliver"` |
| `"stage": "system-definition"` | `"loop": "define"` |
| `"stage": "architecture"` | `"loop": "shape"` |
| *(absent)* | `"platform": { "version": …, "feed": "vendored" }` — read the version from the vendored `.packages/` folder |
| `skills.self.marketplace: "my-skills"` with plugins `workflow-core`/`system-definition`/`architecture`/`development` | `plenipo-agents` with `harness`/`scout`/`define`/`shape`/`deliver` |
| a `name` validated against `^the-[a-z]…$` | drop the rule entirely — real products already violate it |

Do not enable both marketplaces' pipeline plugins at once. Their skill descriptions compete for the
same intents, and ambiguous routing is the most common marketplace defect.
