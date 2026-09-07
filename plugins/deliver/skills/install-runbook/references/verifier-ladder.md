# The verifier ladder — which rung catches which bug, and what each costs

The fleet contract (`docs/TESTING_CONTRACT.md` in the Plenipo repo, §2) defines eight rungs. A
product owns rungs 1, 3, 4 and 6 and inherits the rest. **Climb to the lowest rung that would
actually catch the bug** — higher costs minutes on every future run, forever; lower means the bug
comes back.

| Rung | Name | Proves | Level | Needs | Typical cost |
|---|---|---|---|---|---|
| 0 | Static conformance | config coherent, no secrets, platform pin not lagging, guardrail regexes hold | L2 | nothing | seconds (`/harness:validate-product`) |
| 1 | Unit / module guard | domain logic, the pinned tool list, manifest ↔ tool-source agreement | L1 | nothing | seconds |
| 2 | In-process host | endpoint RBAC over EF InMemory — platform only | L1 | nothing | seconds |
| 3 | Integration E2E | the real host on real pgvector: migrations, approvals, tenancy, the AG-UI protocol — **including the kit's invariant packs** | L1 + L3 | Docker | one to three minutes |
| 4 | Golden evals (contract) | routing, gating, protocol on the Mock provider, from `Evals/cases/*.json` | L1 | Docker | inside rung 3 |
| 5 | Model-quality evals | tool-call accuracy, groundedness, task adherence with a real model | L4, trended | a provider key | nightly, platform-owned |
| 6 | Frontend | units, real-browser E2E with the API mocked, the committed bundle equals the build | L1 | Node | a minute |
| 7 | Sweep + smoke | the whole product as a user would use it; a deployed instance | L3 | Docker / a URL | the `deliver:e2e-tester` agent |

## Bug class → lowest rung

| Bug class | Rung | Through |
|---|---|---|
| domain math, validation, a calculation | 1 | a unit test |
| manifest ↔ tool-source drift, permission-string typo | 1, confirmed at 3 | the module guard; `PlenipoManifestConformance` |
| RBAC 403, the approval gate, the AG-UI event shape | 3 | `ClientFor(role)` — never `AuthorizedScopeAsync()` |
| a missing query filter, a cross-tenant leak, a migration | 3 | `PlenipoTenancyConformance`; a second tenant via `EnsureTenantAsync` |
| tool routing, instructions, descriptions, approval flags | 4 | an eval case |
| answer quality, reasoning | 5 | not a PR gate |
| a render or state bug in the SPA | 6 | vitest / Playwright |
| "does it still work?" | 7 | the sweep |

## What the kit gives you at rung 3, so you do not write it

`Plenipo.Testing` ships `PlenipoHostFixture<Program>` (the container, the factory, dev-auth clients
per role and tenant, `EnsureTenantAsync`, `Derive`, `DeriveProduction`, `AuthorizedScopeAsync`),
`AgUiRun` and `HttpClient.ChatAsync`, `PlenipoGoldenEvals`, and three invariant packs a product
derives in one line each. The spine pack numbers its tests after the contract's invariants
(S1 … S14); when a sweep finding says "S4", that is the test that should have caught it.

A product's own rung-3 tests are its **journeys**: the domain's core loop end to end, carried
through real requests, plus the product's own approval round trip on its own write tools.
