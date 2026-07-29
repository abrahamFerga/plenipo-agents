# Notices and attribution

This repo is original work. The ideas it organizes are not, and this file records where they came
from. Nothing here is reproduced verbatim at length; terminology and taxonomies are cited so a
reader can go to the source.

## Loop engineering

| Source | What this repo takes from it |
|---|---|
| *Stop Hand-Holding Your Coding Agent: Engineering the Loops that Replace Step-by-Step Prompting* — [arXiv:2607.00038](https://arxiv.org/abs/2607.00038) | The **loop specification** (trigger, goal, execution, verification, stopping rule, memory), the **five-level verification ladder** and its autonomous/objective/assisted zones, the **named terminal states**, the **five anti-patterns**, and the four design families. The single most load-bearing source. |
| [Loop Engineering](https://addyosmani.com/blog/loop-engineering/) — Addy Osmani (also reprinted on O'Reilly Radar) | The practitioner definition, comprehension debt, and *"Build the loop. Stay the engineer."* |
| [What Is Loop Engineering](https://kilo.ai/articles/what-is-loop-engineering) — kilo.ai | Hard stop rules; the named machine-side failure modes (thrashing, overfitting to tests, context drift). |
| [Loop Engineering with Agents](https://dassum.medium.com/loop-engineering-with-agents-5e9b984e8d8a) | The three exits (success, surrender, hand-off); the five pre-flight questions; feeding failure forward. |
| *The Verification Horizon: No Silver Bullet for Coding Agent Rewards* — [arXiv:2606.26300](https://arxiv.org/abs/2606.26300) | Verifier construction and quality dimensions; measured reward-hacking rates, including that visible-test overfitting is both the most common hack and actively harmful. |
| [An Introduction to Loop Engineering](https://machinelearningmastery.com/an-introduction-to-loop-engineering/) | Stacked stop conditions; the production loop stack. |

## Harness engineering

| Source | What this repo takes from it |
|---|---|
| *Agent Harness Engineering: A Survey* | The **ETCLOVG** layer taxonomy — Execution, Tooling, Context, Lifecycle, Observability, Verification, Governance — and its structural-core / control-plane split. |
| *Harnessing Agent Skills: Architectural Patterns and a Reference Architecture for Skill-Mediated LLM Agents* — [arXiv:2606.20631](https://arxiv.org/abs/2606.20631) | **Skill-in-use**, progressive skill activation, and **Skill–Execution Authority Separation** — the principle that a skill mentioning a capability never grants permission to use it. |
| [Harness Engineering for Self-Improvement](https://lilianweng.github.io/posts/2026-07-04-harness/) — Lilian Weng | Filesystem as persistent memory; the self-harness discipline and its read-only verifier rule. |
| [Agent harness](https://en.wikipedia.org/wiki/Agent_harness) — Wikipedia | The *inner vs. outer harness* distinction, and the "Agent = Model + Harness" framing with its attribution history. |
| [Loop, Harness, Context Engineering: The Terms Explained](https://www.codecentric.de/en/knowledge-hub/blog/loop-harness-context-engineering-explained) — codecentric | The nesting rule and the context/harness/loop triage table. |
| [What Is Harness Engineering](https://atlan.com/know/what-is-harness-engineering/) — Atlan | The control-systems definition; the guides/sensors framing after Martin Fowler. |

## Conventions

- **Skill and plugin formats** follow the [Claude Code skills](https://code.claude.com/docs/en/skills)
  and Agent Skills conventions.
- **The `USE FOR:` / `DO NOT USE FOR:` description formula** is borrowed from
  [`dotnet/skills`](https://github.com/dotnet/skills).
- **The stage-scoped plugin architecture, the `workflow.json` + `settings.json` pairing, and the
  GitHub-as-system-of-record mechanics** are inherited from this author's
  [`my-skills`](https://github.com/abrahamFerga/my-skills), and before it from `TheWorkflow`. Several
  design choices here are deliberate reversals of decisions made there; the README lists them.

## Platform

[Plenipo](https://github.com/abrahamFerga/Plenipo) is this author's own platform. Facts about its
API surface, packages, and invariants were verified against its source, not its documentation — see
the trust ranking in the `plenipo-platform` skill for why that distinction matters.
