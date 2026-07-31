---
name: report-harness-gap
description: >
  Close the loop from a product or platform repo back to the agent marketplace: when work proves a
  skill is wrong, stale, or missing — a type that was renamed, a procedure that fails as written, a
  new platform seam no skill lists — record it in your own repo so you are never blocked, then file
  one evidence-bearing issue against the marketplace so the next agent in every repo stops
  inheriting the defect.
  USE FOR: a skill contradicted by source, a documented command that fails, a seam missing from the
  "do not rebuild" table, recurring work no skill covers. DO NOT USE FOR: a gap in the platform
  itself (/deliver:request-platform-change), a bug in the product you are building (file it on that
  repo), or editing a skill while you are running it.
license: MIT
---

# Report a harness gap

You were doing real work and the harness was wrong. A skill named a type that does not exist, a
documented step failed, or the platform grew something no skill mentions.

**You are not blocked, and you are not going to stop and fix the marketplace.** This skill turns
that moment into a local note plus one issue, in that order, and returns you to the work you were
doing. It is the same protocol as `/deliver:request-platform-change`, pointed at the harness instead
of the platform.

This matters more than an ordinary docs bug. A wrong skill is worse than a missing one: agents
*trust* skills, so a stale fact does not fail loudly — it propagates silently into every repo that
loads the plugin. `AGENTS.md` already carries a "do not contradict these" list precisely because
this has happened before.

**Terminal states.** `No-op` — the ladder resolved it and nothing was filed, the most common and
best outcome · `Success` — local note applied, one issue filed, loop resumed ·
`Approval-required` — the gap is that a skill instructs agents to do something unsafe, which needs a
human now rather than a queue position.

> `Blocked` is not a valid ending here. The harness is guidance, not runtime — you can always write
> the correct fact into your own repo and keep going. If you believe you are blocked by a skill, you
> are blocked by something else.

## When to Use

- A skill states an API, type, package, command, or version that source contradicts.
- A skill's procedure does not work as written, and the fix is not in the skill.
- The platform gained a capability that `plenipo-platform`'s "do not rebuild these" table omits, so
  products will now rebuild a weaker copy of it.
- The same undocumented work has come up in more than one tick and no skill covers it.
- Two skills' descriptions competed and routing sent you to the wrong one.

## Stop Signals

- **You are in the marketplace repo** → you *are* the harness. Edit the skill and prove it with
  `node eng/validate-marketplace.mjs`.
- **The gap is in the platform, not the skill describing it** → `/deliver:request-platform-change`.
- **You cannot cite source** → do not file. An unverified report is worse than silence, because it
  costs a triage slot and may edit a correct skill into a wrong one.
- **You want the skill to read better** → taste is not a defect. File only what is *false*, missing,
  or unrunnable.

## Inputs

| Input | Where from | Used for |
|---|---|---|
| The skill that is wrong | its path under `plugins/<plugin>/skills/<name>/` | the issue's subject; one issue per skill |
| What it claims | the exact line you followed | proving the contradiction rather than asserting it |
| What is true | platform or product **source**, as `file:line` | the evidence bar — docs do not count |
| How you found it | the failing command, compile error, or diff | reproduction |
| Marketplace repo | `workflow.json` → `skills.self.repo` | where the issue goes; never hardcode an owner |
| Plugin version | that plugin's `.claude-plugin/plugin.json` | separates a stale cache from a stale skill |

## The ladder

Climb it in order and record what you checked. Most gaps die here, which is the point — the record
is what keeps the queue survivable.

1. **Are you reading the current skill, or a cached one?** `agents/`, `hooks/`, and `scripts/` are
   cached by plugin version; only `SKILL.md` is live. If the plugin version moved and you did not
   reload, you are reporting a cache, not a defect.
2. **Was it the right skill?** Read its `DO NOT USE FOR:` clause. A skill being unhelpful outside
   its stated scope is correct behaviour, not a gap — unless the routing itself misled you, which
   *is* reportable as a routing defect.
3. **Is it wrong in general, or only for you?** A fact true only of your product belongs in your
   repo's `AGENTS.md`, never in the marketplace. This is the most common false report.
4. **Write the correct fact into your own repo now.** In `AGENTS.md` under the product's own facts
   section, tagged so it can be unwound:

   ```markdown
   <!-- harness-gap: plenipo-agents#<n> — remove when the skill is corrected -->
   ```

   This is the shim. It is what makes you `Success` instead of waiting, and it is why a harness gap
   never blocks a loop.
5. **Search before filing.** One issue per skill per defect:

   ```bash
   gh issue list --repo "$MARKETPLACE" --state all --search "<skill-name> in:title,body"
   ```

   If it exists, add your evidence as a comment and stop — a second issue splits the demand signal
   the same way a forked platform request does.

## What to file

One issue, using the marketplace's `harness-gap` issue form. Classify it as exactly one:

| Kind | Means | Why it matters |
|---|---|---|
| `stale-fact` | a skill states something source contradicts | highest value — this class propagates silently |
| `missing-seam` | the platform grew a capability no skill lists | products rebuild a weaker copy of it |
| `procedure-failed` | the steps do not work as written | every agent following them loses the same time |
| `missing-skill` | recurring work nothing covers | the same reasoning is re-derived every tick |
| `wrong-routing` | descriptions competed, or `DO NOT USE FOR:` misled | the most common marketplace defect |

Open it with the `agent-protocol` envelope, reusing the existing `finding` kind — **do not invent a
kind**, the set is closed:

```markdown
<!-- plenipo-agent kind=finding from=<your-repo> status=open -->
```

Carry, in this order: the skill path and line, what it claims, what is true with the `file:line`
that proves it, the command or error that exposed it, the plugin version you were on, and the local
note you already applied. State your evidence level — `L1` a command's exit code, `L2` a schema or
linter, `L3` a suite or real run, `L4` your reading of the code — and **never present `L4` as though
something ran**.

## Where this fires from

You will rarely invoke this cold. It belongs at the end of ticks that already read source and are
therefore in a position to prove the harness wrong:

| Moment | Why it is the best signal available |
|---|---|
| `/deliver:upgrade-platform` step 5 | a compile break after a version bump is the platform stating, deterministically, that a documented API changed |
| `/steward:announce-release` step 2 | the steward has just read the diff and knows exactly which skill facts the release invalidated |
| `/deliver:request-platform-change` step 1 | climbing the seam ladder is when you discover the seam catalog is incomplete |
| any tick that hit a documented command that failed | a failing documented step is `L1` evidence, the strongest kind this queue receives |

File at the **end** of the tick, never in the middle. A tick that stops to improve the harness has
stopped delivering, and that trade is never worth making mid-flight.

## Guardrails

- **Never edit the marketplace from a product repo.** Same rule, same reason, as never editing the
  platform from a product: ten agents doing it produces one unmergeable repo. File the issue.
- **Source, not documentation.** The trust ranking is source > tests > `.http` catalog > platform
  docs > product docs. A report citing a doc is citing the thing most likely to be the defect.
- **One skill per issue.** "Several skills are out of date" cannot be triaged, verified, or closed.
- **Never delete a product's local note before the skill is actually corrected.** The note is load-
  bearing until the issue closes and the plugin version that carries the fix is installed.
- **Do not file taste.** Wording, ordering, and tone are not defects. The queue survives on the
  ratio of provable reports to opinions.

## Common Pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Filing before writing the local note | you are now waiting on someone else's queue | note first, then file; that ordering is the whole protocol |
| Reporting a stale plugin cache | a correct skill gets "fixed" into a wrong one | check `plugin.json` version and reload before believing it |
| A product-specific fact sent upstream | every other product inherits a fact that is false for them | put it in your own `AGENTS.md` |
| One issue covering four skills | it never closes, because it is never fully true | one skill, one defect, one issue |
| Filing mid-tick | the delivery loop stalls to do documentation work | queue it, finish the tick, file at the end |

## Related skills

- `/deliver:request-platform-change` — **Load when:** the gap is in the platform itself rather than
  in a skill describing it. Same ladder, different target.
- `platform-protocol` — **Load when:** you want the reasoning behind why shims come before requests;
  this skill is that protocol applied to the harness.
- `agent-protocol` — **Load when:** writing the issue body — the envelope, the closed set of kinds,
  and the evidence-level rule.
- `loop-discipline` — **Load when:** deciding whether your evidence is `L1` or an `L4` opinion.
