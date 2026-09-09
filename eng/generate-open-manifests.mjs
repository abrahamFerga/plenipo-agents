#!/usr/bin/env node
// Renders the open-standard manifests from the Claude Code ones, so the marketplace installs the
// same way in Claude Code, Codex, Copilot CLI and Cursor without a second hand-maintained copy.
//
//   node eng/generate-open-manifests.mjs            # write
//   node eng/generate-open-manifests.mjs --check    # verify in sync; exit 1 if not
//
// What it writes:
//   plugins/<plugin>/plugin.json         Agent Plugins 1.0 (agent-plugins.org) — read by Codex,
//                                        Copilot CLI and Cursor; skills are discovered under skills/
//   .cursor-plugin/marketplace.json      the only marketplace index Cursor reads; Codex and Copilot
//                                        fall back to .claude-plugin/marketplace.json on their own
//
// .claude-plugin/plugin.json stays the source: bump `version` or edit `description` there, run this,
// and eng/validate-marketplace.mjs holds the two in lock-step from then on. No dependencies; node >= 18.

import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');
const OPEN_SCHEMA = 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json';
const KEYWORDS = ['plenipo', 'harness-engineering', 'loop-engineering', 'claude-code', 'codex', 'copilot', 'cursor'];

const read = (p) => JSON.parse(readFileSync(p, 'utf8'));
const render = (o) => JSON.stringify(o, null, 2) + '\n';

const marketplace = read(join(ROOT, '.claude-plugin', 'marketplace.json'));
const plugins = readdirSync(join(ROOT, 'plugins'), { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(join(ROOT, 'plugins', d.name, '.claude-plugin', 'plugin.json')))
  .map((d) => d.name)
  .sort();

const outputs = new Map();
const entries = [];
for (const plugin of plugins) {
  const claude = read(join(ROOT, 'plugins', plugin, '.claude-plugin', 'plugin.json'));
  outputs.set(join(ROOT, 'plugins', plugin, 'plugin.json'), render({
    $schema: OPEN_SCHEMA,
    name: claude.name,
    version: claude.version,
    description: claude.description,
    author: { name: claude.author.name },
    license: claude.license,
    keywords: KEYWORDS,
  }));
  entries.push({
    name: claude.name,
    source: `./plugins/${plugin}`,
    description: claude.description,
    version: claude.version,
    license: claude.license,
  });
}
outputs.set(join(ROOT, '.cursor-plugin', 'marketplace.json'), render({
  name: marketplace.name,
  owner: { name: marketplace.owner.name },
  metadata: { description: marketplace.description },
  plugins: entries,
}));

let stale = 0;
for (const [path, next] of outputs) {
  const current = existsSync(path) ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n') : null;
  if (current === next) continue;
  stale++;
  if (CHECK) {
    console.error(`out of sync: ${path}`);
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, next);
    console.log(`wrote ${path}`);
  }
}

if (CHECK && stale) {
  console.error('Run: node eng/generate-open-manifests.mjs');
  process.exit(1);
}
console.log(`${CHECK ? 'in sync' : 'done'} — ${plugins.length} plugin manifest(s) + the Cursor index${CHECK ? '' : `, ${stale} written`}.`);
