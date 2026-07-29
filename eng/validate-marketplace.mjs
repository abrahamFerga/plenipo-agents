#!/usr/bin/env node
// Deterministic (verification-ladder L1/L2) check of this marketplace's own invariants.
// No dependencies — node >= 18. Exits non-zero on any error.
//
//   node eng/validate-marketplace.mjs
//
// HARNESS.md argues that a claim without a deterministic verifier is a level-4 opinion.
// This file is that verifier, applied to this repo. If it does not run in CI, the argument
// is theatre.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const errors = [];
const warnings = [];

const err = (file, msg) => errors.push(`${relative(ROOT, file).split(sep).join('/')}: ${msg}`);
const warn = (file, msg) => warnings.push(`${relative(ROOT, file).split(sep).join('/')}: ${msg}`);

// ── Limits ────────────────────────────────────────────────────────────────────
// Sources: skill name 1-64 chars; description max 1024 chars (Anthropic Agent Skills spec).
// Body length is this repo's own convention, inherited from AUTHORING.md.
const MAX_NAME = 64;
const MAX_DESCRIPTION = 1024;
const MAX_BODY_LINES = 450;
const MAX_REFERENCE_LINES = 600;

// ── Minimal frontmatter reader ────────────────────────────────────────────────
// Deliberately not a YAML parser: skill frontmatter is a flat map of scalars and
// folded (>) blocks. Anything more exotic is itself a smell.
function readFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---')) return { fm: null, bodyOffset: 0 };
  const end = normalized.indexOf('\n---', 3);
  if (end === -1) return { fm: null, bodyOffset: 0 };
  const raw = normalized.slice(normalized.indexOf('\n') + 1, end);
  const fm = {};
  let key = null;
  for (const line of raw.split('\n')) {
    const m = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (m) {
      key = m[1];
      const v = m[2].trim();
      fm[key] = v === '>' || v === '|' || v === '>-' || v === '|-' ? '' : v;
    } else if (key && /^\s+\S/.test(line)) {
      fm[key] = (fm[key] ? fm[key] + ' ' : '') + line.trim();
    }
  }
  const bodyOffset = normalized.slice(0, end).split('\n').length + 1;
  return { fm, bodyOffset };
}

const listDirs = (p) =>
  existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];

// ── 1. Marketplace manifest ───────────────────────────────────────────────────
const marketplacePath = join(ROOT, '.claude-plugin', 'marketplace.json');
if (!existsSync(marketplacePath)) {
  err(marketplacePath, 'missing — a marketplace must have .claude-plugin/marketplace.json');
  report();
}

let marketplace;
try {
  marketplace = JSON.parse(readFileSync(marketplacePath, 'utf8'));
} catch (e) {
  err(marketplacePath, `invalid JSON: ${e.message}`);
  report();
}

for (const field of ['name', 'owner', 'plugins']) {
  if (!marketplace[field]) err(marketplacePath, `missing required field "${field}"`);
}

const declared = new Set((marketplace.plugins ?? []).map((p) => p.name));
const onDisk = new Set(listDirs(join(ROOT, 'plugins')));

for (const name of declared) {
  if (!onDisk.has(name)) err(marketplacePath, `declares plugin "${name}" but plugins/${name}/ does not exist`);
}
for (const name of onDisk) {
  if (!declared.has(name)) err(marketplacePath, `plugins/${name}/ exists but is not declared in marketplace.json`);
}

// ── 2. Per-plugin checks ──────────────────────────────────────────────────────
const allSkills = [];
const allAgents = [];

for (const plugin of [...onDisk].sort()) {
  const pluginDir = join(ROOT, 'plugins', plugin);
  const manifestPath = join(pluginDir, '.claude-plugin', 'plugin.json');

  if (!existsSync(manifestPath)) {
    err(manifestPath, 'missing — every plugin needs .claude-plugin/plugin.json');
    continue;
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    err(manifestPath, `invalid JSON: ${e.message}`);
    continue;
  }

  if (manifest.name !== plugin) err(manifestPath, `name "${manifest.name}" must equal the folder name "${plugin}"`);
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? '')) {
    err(manifestPath, `version "${manifest.version}" must be semver — agents, hooks and scripts are cached by it`);
  }
  if (!manifest.description) err(manifestPath, 'missing description');

  // Component dirs must sit at the plugin root, never inside .claude-plugin/.
  for (const stray of ['skills', 'agents', 'hooks', 'scripts']) {
    if (existsSync(join(pluginDir, '.claude-plugin', stray))) {
      err(manifestPath, `${stray}/ must live at the plugin root, not inside .claude-plugin/`);
    }
  }

  // ── Skills ──
  for (const skill of listDirs(join(pluginDir, 'skills')).sort()) {
    const skillDir = join(pluginDir, 'skills', skill);
    const skillPath = join(skillDir, 'SKILL.md');

    if (!existsSync(skillPath)) {
      err(skillPath, 'missing — a skill folder must contain SKILL.md');
      continue;
    }

    const text = readFileSync(skillPath, 'utf8');
    const { fm, bodyOffset } = readFrontmatter(text);

    if (!fm) {
      err(skillPath, 'missing or malformed YAML frontmatter (--- delimited block at the top)');
      continue;
    }

    if (!fm.name) err(skillPath, 'frontmatter missing "name"');
    else {
      if (fm.name !== skill) err(skillPath, `name "${fm.name}" must equal the folder name "${skill}"`);
      if (fm.name.length > MAX_NAME) err(skillPath, `name is ${fm.name.length} chars, max ${MAX_NAME}`);
      if (!/^[a-z0-9-]+$/.test(fm.name)) err(skillPath, `name "${fm.name}" must be lowercase letters, digits and hyphens`);
      if (/claude|anthropic/i.test(fm.name)) err(skillPath, `name "${fm.name}" must not contain "claude" or "anthropic"`);
    }

    if (!fm.description) {
      err(skillPath, 'frontmatter missing "description" — it is the only thing loaded for routing');
    } else {
      if (fm.description.length > MAX_DESCRIPTION) {
        err(skillPath, `description is ${fm.description.length} chars, max ${MAX_DESCRIPTION}`);
      }
      if (!/DO NOT USE FOR/i.test(fm.description)) {
        warn(skillPath, 'description has no "DO NOT USE FOR:" clause — overlapping descriptions are the most common marketplace defect');
      }
    }

    const bodyLines = text.split('\n').length - bodyOffset;
    if (bodyLines > MAX_BODY_LINES) {
      err(skillPath, `body is ${bodyLines} lines, max ${MAX_BODY_LINES} — push depth into references/`);
    }

    allSkills.push({ plugin, skill, path: skillPath, fm, dir: skillDir });

    // references/ must be exactly one level deep.
    const refDir = join(skillDir, 'references');
    if (existsSync(refDir)) {
      for (const entry of readdirSync(refDir, { withFileTypes: true })) {
        if (entry.isDirectory()) err(join(refDir, entry.name), 'references/ must be one level deep');
        else {
          const refPath = join(refDir, entry.name);
          const n = readFileSync(refPath, 'utf8').split('\n').length;
          if (n > MAX_REFERENCE_LINES) err(refPath, `reference is ${n} lines, max ${MAX_REFERENCE_LINES}`);
        }
      }
    }
  }

  // ── Agents ──
  const agentsDir = join(pluginDir, 'agents');
  if (existsSync(agentsDir)) {
    for (const file of readdirSync(agentsDir).filter((f) => f.endsWith('.md')).sort()) {
      const agentPath = join(agentsDir, file);
      const { fm } = readFrontmatter(readFileSync(agentPath, 'utf8'));
      const expected = file.replace(/\.md$/, '');
      if (!fm) {
        err(agentPath, 'missing or malformed frontmatter');
        continue;
      }
      if (fm.name !== expected) err(agentPath, `name "${fm.name}" must equal the file name "${expected}"`);
      if (!fm.description) err(agentPath, 'missing description — it is always-on context whenever the plugin is enabled');
      // These are silently ignored for plugin-shipped agents; relying on them is a latent bug.
      for (const ignored of ['hooks', 'mcpServers', 'permissionMode']) {
        if (fm[ignored] !== undefined) err(agentPath, `"${ignored}" is ignored for plugin-shipped agents — remove it`);
      }
      allAgents.push({ plugin, path: agentPath, fm });
    }
  }
}

// ── 3. Cross-plugin file references ───────────────────────────────────────────
// Plugins install in isolation, so a relative path into a sibling plugin cannot resolve
// at runtime. Other-plugin skills must be referenced as /plugin:skill.
const pluginNames = [...onDisk];
const pluginOf = (p) => relative(join(ROOT, 'plugins'), p).split(sep)[0];
for (const { path } of allSkills) {
  const text = readFileSync(path, 'utf8');
  for (const m of text.matchAll(/\]\(([^)]+)\)/g)) {
    const target = m[1];
    if (/^(https?:|#|mailto:)/.test(target)) continue;

    for (const other of pluginNames) {
      if (new RegExp(`(^|/)\\.\\./\\.\\./${other}/`).test(target) || target.startsWith(`plugins/${other}/`)) {
        err(path, `cross-plugin file path "${target}" — plugins install in isolation; use /${other}:<skill> instead`);
      }
    }

    // Relative links must resolve on disk...
    if (target.startsWith('.')) {
      const clean = target.split('#')[0];
      const resolved = join(dirname(path), clean);
      if (!existsSync(resolved)) err(path, `broken relative link "${target}"`);
      else if (statSync(resolved).isDirectory()) err(path, `link "${target}" points at a directory`);
      else {
        // ...AND must stay inside the plugin. A plugin is installed on its own, so anything
        // above its root (repo README, HARNESS.md, a sibling plugin) is simply absent at runtime.
        const pluginRoot = join(ROOT, 'plugins', pluginOf(path));
        if (relative(pluginRoot, resolved).startsWith('..')) {
          err(path, `link "${target}" escapes the plugin root — it will not exist once the plugin is installed on its own`);
        }
      }
    }
  }
}

// ── 4. Description overlap ────────────────────────────────────────────────────
// Overlapping descriptions cause wrong activation or hesitation between options —
// the single most common skill-marketplace defect.
const stop = new Set(
  'a an the and or of for to in on with without use used using this that it its as at by from into not do does per plus is are be been when where which what how you your they them their we our so if then than also only every each any all more most other others than into over under between across'.split(' ')
);
const tokens = (s) =>
  new Set(
    (s ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stop.has(w))
  );

for (let i = 0; i < allSkills.length; i++) {
  for (let j = i + 1; j < allSkills.length; j++) {
    const a = tokens(allSkills[i].fm.description);
    const b = tokens(allSkills[j].fm.description);
    if (!a.size || !b.size) continue;
    const shared = [...a].filter((t) => b.has(t)).length;
    const jaccard = shared / (a.size + b.size - shared);
    if (jaccard > 0.5) {
      warn(
        allSkills[i].path,
        `description overlaps ${Math.round(jaccard * 100)}% with ${allSkills[j].plugin}:${allSkills[j].skill} — routing will be ambiguous`
      );
    }
  }
}

// ── 5. Portability ────────────────────────────────────────────────────────────
// A hardcoded GitHub owner makes the marketplace fail for anyone who forks it.
const OWNER_RE = /\babrahamFerga\b/;
for (const { path } of [...allSkills, ...allAgents]) {
  const text = readFileSync(path, 'utf8');
  if (OWNER_RE.test(text)) {
    warn(path, 'hardcodes the GitHub owner "abrahamFerga" — read it from workflow.json or `gh api user` instead');
  }
}

// ── Report ────────────────────────────────────────────────────────────────────
function report() {
  const s = allSkills.length;
  const a = allAgents.length;
  const p = onDisk.size;

  if (warnings.length) {
    console.log(`\n${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  ! ${w}`);
  }

  if (errors.length) {
    console.log(`\n${errors.length} error(s):`);
    for (const e of errors) console.log(`  x ${e}`);
    console.log(`\nFAIL — ${p} plugin(s), ${s} skill(s), ${a} agent(s)\n`);
    process.exit(1);
  }

  console.log(`\nOK — ${p} plugin(s), ${s} skill(s), ${a} agent(s), ${warnings.length} warning(s)\n`);
  process.exit(0);
}

report();
