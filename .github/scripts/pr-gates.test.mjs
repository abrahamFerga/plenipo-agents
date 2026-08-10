#!/usr/bin/env node
// Self-test for the deterministic PR spine gate. No network and no repository state.
//
//   node .github/scripts/pr-gates.test.mjs
//
// The review verdict is deliberately separate from this L1/L2 gate, but an unattended merge must
// be able to use that verdict for a protected diff. These cases keep the policy fail-closed when a
// verdict is absent, withdrawn, or contradicted.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const gate = join(here, 'pr-gates.mjs');
const scratch = mkdtempSync(join(tmpdir(), 'pr-gates-'));
const diff = join(scratch, 'protected.diff');
const renameDiff = join(scratch, 'rename-out.diff');
const deleteDiff = join(scratch, 'delete.diff');

writeFileSync(
  diff,
  [
    'diff --git a/.github/workflows/agent-merge.yml b/.github/workflows/agent-merge.yml',
    '--- a/.github/workflows/agent-merge.yml',
    '+++ b/.github/workflows/agent-merge.yml',
    '@@ -1 +1 @@',
    '-name: Agent merge',
    '+name: Agent merge with a deterministic policy',
    '',
  ].join('\n')
);

writeFileSync(renameDiff, [
  'diff --git a/.github/workflows/agent-merge.yml b/docs/agent-merge.yml',
  'similarity index 100%',
  'rename from .github/workflows/agent-merge.yml',
  'rename to docs/agent-merge.yml',
  '--- a/.github/workflows/agent-merge.yml',
  '+++ b/docs/agent-merge.yml',
  '',
].join('\n'));
writeFileSync(deleteDiff, [
  'diff --git a/.github/workflows/agent-merge.yml b/.github/workflows/agent-merge.yml',
  'deleted file mode 100644',
  '--- a/.github/workflows/agent-merge.yml',
  '+++ /dev/null',
  '@@ -1 +0,0 @@',
  '-name: Agent merge',
  '',
].join('\n'));

const body = [
  'Closes #1',
  '',
  '## Runtime evidence',
  'The protected workflow was exercised against a fixture and its exact gate result was observed.',
  '',
  '## Regression test',
  'The case was seen red before the policy repair and green after the agent verdict was accepted.',
].join('\n');

const run = (labels, diffPath = diff, { headRef = 'fix/agent-verdict-policy', prBody = body } = {}) => {
  const result = spawnSync(process.execPath, [gate, diffPath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PR_BODY: prBody,
      PR_HEAD_REF: headRef,
      PR_LABELS: labels,
    },
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
};

const cases = [
  {
    labels: '',
    status: 1,
    pattern: /spine_untouched/,
    why: 'a protected diff without a verdict must fail closed',
  },
  {
    labels: 'agent:approved',
    status: 0,
    pattern: /spine_untouched \(overridden by agent:approved\)/,
    why: 'the approval workflow verdict must be sufficient for an unattended protected change',
  },
  {
    labels: 'agent:approved,agent:changes-requested',
    status: 1,
    pattern: /spine_untouched: .*agent verdict/i,
    why: 'a withdrawn verdict must never remain an override',
  },
  {
    labels: 'agent:approved,needs-human',
    status: 1,
    pattern: /spine_untouched: .*agent verdict/i,
    why: 'a human-escalation label must withdraw the automatic override',
  },
];

let failed = 0;
for (const test of cases) {
  const result = run(test.labels);
  if (result.status === test.status && test.pattern.test(result.output)) {
    console.log(`  ok   ${test.labels || '(no labels)'} — ${test.why}`);
  } else {
    console.log(
      `  FAIL ${test.labels || '(no labels)'} — expected exit ${test.status} and ${test.pattern}; got exit ${result.status}.\n` +
        `       ${test.why}\n       output:\n${result.output}`
    );
    failed++;
  }
}

const codexBranch = run('agent:approved', diff, {
  headRef: 'codex/token-efficient-agent-models',
  prBody: '<!-- plenipo-agent kind=handoff from=plenipo-agents ref=plenipo-agents#39 status=open -->',
});
if (codexBranch.status === 1 && /closes_an_issue/.test(codexBranch.output)) {
  console.log('  ok   codex/* branches receive the same evidence gates as other unattended branches');
} else {
  console.log(`  FAIL codex/* — evidence gates were skipped:\n${codexBranch.output}`);
  failed++;
}

const attendedCodex = run('agent:approved', diff, {
  headRef: 'codex/attended-task',
  prBody: 'Attended prose mentioning plenipo-agent without a protocol marker.',
});
if (attendedCodex.status === 0 && /not a loop branch/.test(attendedCodex.output)) {
  console.log('  ok   a codex/* branch without the loop envelope stays attended');
} else {
  console.log(`  FAIL attended codex/* — it was captured by unattended evidence policy:\n${attendedCodex.output}`);
  failed++;
}

const verdictMarkerOnly = run('agent:approved', diff, {
  headRef: 'codex/verdict-marker-only',
  prBody: '<!-- plenipo-agent-verdict:v1 run=300 -->',
});
if (verdictMarkerOnly.status === 0 && /not a loop branch/.test(verdictMarkerOnly.output)) {
  console.log('  ok   a verdict proof marker cannot impersonate the loop envelope');
} else {
  console.log(`  FAIL codex verdict marker — it entered unattended evidence policy:\n${verdictMarkerOnly.output}`);
  failed++;
}

for (const [name, diffPath] of [['rename out of the control tree', renameDiff], ['control deletion', deleteDiff]]) {
  const result = run('', diffPath);
  if (result.status === 1 && /spine_untouched/.test(result.output) && /agent-merge\.yml/.test(result.output)) {
    console.log(`  ok   ${name} keeps the protected old path`);
  } else {
    console.log(`  FAIL ${name} evaded the old-path guard:\n${result.output}`);
    failed++;
  }
}

if (failed) {
  console.log(`\n${failed} PR-gate policy case(s) wrong. A label must not turn a contradictory verdict into permission.\n`);
  process.exit(1);
}

console.log(`\nOK — ${cases.length + 5} protected-diff agent-verdict case(s) behave correctly.\n`);
