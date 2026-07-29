---
name: agent-protocol
description: >
  The shared language agents use to talk to each other through GitHub — the message envelope, the
  closed set of message kinds, the label vocabulary that is the state machine, and the rules for
  replying and handing off. Every agent in every loop and every repo reads and writes this format, so
  an agent in one product can be understood by an agent in another or by the platform.
  USE FOR: writing an issue, comment, or PR body another agent will act on; parsing one you received;
  choosing a label. DO NOT USE FOR: the platform request ladder itself (platform-protocol) or who may
  merge a PR (/deliver:work-next-issue's merge-policy reference).
license: MIT
---

# How agents talk to each other

Agents here do not share a conversation. They share **GitHub** — issues, comments, PR bodies,
labels, board columns — across many repos, running at different times, often days apart. That makes
GitHub the message bus, and a bus needs a protocol.

Without one, every skill invents its own convention, and an agent reading another's output has to
guess. Guessing is how a fan-out ends with four products doing four different things.

**One rule above all the others: write for the agent that arrives next, with no memory of you.**
It cannot ask you what you meant.

## The envelope

Every machine-directed message opens with one HTML comment. It renders invisibly, so humans read
normal prose, and it is greppable, so agents match reliably.

```markdown
<!-- plenipo-agent kind=<kind> from=<repo> ref=<repo#n> status=<status> -->
```

| Field | Required | Meaning |
|---|---|---|
| `kind` | yes | one of the closed set below — **never invent one** |
| `from` | yes | the repo that produced it (`networthy`, `plenipo`), not the model or tool |
| `ref` | when replying or referring | the issue or PR this answers, as `repo#number` |
| `status` | yes | `open` · `answered` · `accepted` · `rejected` · `blocked` · `done` |

Prose follows underneath, written for a human. The envelope routes; the prose explains. **Never put
meaning only in the envelope** — a human skimming the thread must still understand it.

## The message kinds

A closed set. If your message does not fit one, it is probably two messages, or it belongs in a
commit rather than an issue.

| kind | Direction | Means | The receiver must |
|---|---|---|---|
| `platform-request` | product → platform | I need something the platform doesn't do | triage and reply with `verdict` |
| `verdict` | platform → product | my answer to your request | act on it — use the seam, drop the shim, or wait |
| `upgrade-available` | platform → product | a release you may want; nothing breaks | upgrade when convenient; retire the listed shims |
| `breaking-change` | platform → product | a release that **will** break you | follow the migration steps before upgrading |
| `finding` | any → any | I observed something broken, with a reproduction | reproduce, then fix or triage |
| `handoff` | any → any | I did part of this; here is exactly where I stopped | continue from the stated point |
| `blocked` | any → human | I cannot proceed and no agent can unblock me | decide |

## The labels are the state machine

Labels are how an agent finds work without reading every issue. The same vocabulary in **every**
repo, so a scan written for one works on all of them.

| Label | Meaning |
|---|---|
| `agent:needs-triage` | arrived, nobody has verdicted it |
| `agent:ready` | triaged, actionable, unclaimed |
| `agent:in-progress` | an agent is on it — **claim before you start** |
| `agent:blocked` | needs a human decision |
| `agent:done` | resolved; the closing comment says how |
| `platform-request` | a request to the platform |
| `breaking-change` | migration required before upgrading |
| `demand:multi` | more than one product wants this |

**Claim by label before you work.** Two agents on one issue produce two PRs that conflict, and
neither knows about the other. Set `agent:in-progress`, and if it is already set, take the next item
instead.

## The five rules

1. **Reply in place.** Answer on the issue you were given — never open a second issue to answer the
   first. A thread that forks is a thread nobody can follow, and the demand signal the steward counts
   gets split in half.
2. **One kind per message.** A comment doing three things gets acted on as its weakest one.
3. **State your terminal state.** Every agent's last word on an issue names one:
   `Success` · `No-op` · `Blocked` · `Stalled` · `Exhausted` · `Approval-required`.
   **An error or an exhausted budget is never `Success`.**
4. **Say what you actually verified, and how.** Cite the evidence level — `L1` a command's exit code,
   `L2` a linter or schema, `L3` an E2E suite or real usage, `L4` your reading of the code,
   `L5` a human decided. **Never present `L4` as though something ran.** This is the field most
   likely to mislead the next agent, because it is the one they cannot check.
5. **Leave the next agent a runnable next step**, not a summary. "Run `X`; if it still fails, the
   cause is in `Y`" beats three paragraphs of what you tried.

## Handing off

A handoff is the highest-risk message here, because the receiver has none of your context. Carry:

```markdown
<!-- plenipo-agent kind=handoff from=networthy ref=networthy#88 status=open -->

**Done:** the import parses OFX and the lines land in review. `dotnet test` green (L1).
**Not done:** the review screen still shows one batch at a time.
**Stopped because:** the tab needs a row action, and I could not tell whether that is a
manifest change or a platform gap.
**Next step:** read the `TabRowAction` shape in the module SDK; if `EndpointTemplate` covers it,
it is ours.
**Watch out:** `FinanceCatalogTests` pins the tool list in order — adding a tool means updating
that assertion **deliberately**, and saying so in the PR.
```

That last line matters. A pinned assertion is a **frozen yardstick**: changing it to make a test pass
is specification gaming. Changing it because the tool list genuinely changed is correct — and the
difference must be stated, never silently applied.

## Addressing another repo

An agent cannot call another agent. It leaves a message where that agent will look:

- **Product needs the platform** → an issue on the *platform* repo, `kind=platform-request`.
- **Platform affects a product** → an issue on *each affected product* repo, `kind=breaking-change`
  or `upgrade-available`. Push to them; do not expect them to poll you.
- **Answering** → a comment on the original issue, `kind=verdict`, `ref` set.

Read the owner from the repo's own config or `gh api user` — **never hardcode one**, or the protocol
works for exactly one account.

## Common pitfalls

| Pitfall | Consequence | Do instead |
|---|---|---|
| Inventing a `kind` | receivers have no rule for it, so it is ignored | use the closed set, or split the message |
| Meaning only in the envelope | humans reading the thread learn nothing | envelope routes, prose explains |
| Opening a new issue to answer one | the thread forks; demand counting breaks | reply in place |
| Working without claiming | two agents, two conflicting PRs | set `agent:in-progress` first |
| Reporting `Success` with an open PR or a red rung | the next session inherits a board that lies | `Approval-required`, and say what is pending |
| Omitting the evidence level | an opinion is read as a measurement | cite `L1`–`L5` on every claim |
| A prose summary instead of a next step | the receiver re-derives everything you knew | give the command to run |

## Related skills

- `platform-protocol` — the ladder and verdicts that ride on this envelope.
- `loop-discipline` — where the terminal states and evidence levels come from.
- `/steward:announce-release` — the platform-side fan-out that writes `breaking-change` and
  `upgrade-available` messages into every consumer repo.
