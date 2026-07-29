#!/usr/bin/env node
// Generates the cross-tool skill index from SKILL.md frontmatter, so Codex / Copilot / Cursor can
// route to the same skills Claude Code loads natively — without a second copy of the content that
// would drift.
//
//   node eng/generate-agent-docs.mjs            # write
//   node eng/generate-agent-docs.mjs --check    # verify in sync; exit 1 if not (CI uses this)
//
// The generated block is an INDEX of one line per skill, never a copy of a skill body. Duplicating
// rules across AGENTS.md and .github/* is the single most common cause of contradictory agent
// instructions, and the tools give no ordering guarantee to resolve them.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHECK = process.argv.includes('--check');

const BEGIN = '<!-- BEGIN GENERATED SKILL INDEX — do not edit by hand; run `node eng/generate-agent-docs.mjs` -->';
const END = '<!-- END GENERATED SKILL INDEX -->';

// Codex silently truncates the concatenated AGENTS.md chain at 32 KiB — instructions past the cap
// are discarded with no warning in the TUI, /stats, exec, or the VS Code extension. Warn well
// before that so a growing index never quietly costs us the operating rules above it.
const CODEX_CAP = 32 * 1024;
const WARN_AT = Math.floor(CODEX_CAP * 0.6);

const listDirs = (p) =>
  existsSync(p) ? readdirSync(p, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : [];

/** Flat scalars and folded (>) blocks only — anything more exotic in skill frontmatter is a smell. */
function frontmatter(text) {
  if (!text.startsWith('---')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const fm = {};
  let key = null;
  for (const line of text.slice(text.indexOf('\n') + 1, end).split('\n')) {
    const m = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (m) {
      key = m[1];
      const v = m[2].trim();
      fm[key] = ['>', '|', '>-', '|-'].includes(v) ? '' : v;
    } else if (key && /^\s+\S/.test(line)) {
      fm[key] = (fm[key] ? fm[key] + ' ' : '') + line.trim();
    }
  }
  return fm;
}

/** The first sentence carries the routing signal; the rest is exclusions we don't need in an index. */
function firstSentence(description) {
  const cleaned = (description ?? '').replace(/\s+/g, ' ').trim();
  const cut = cleaned.search(/\.(\s|$)/);
  const s = cut === -1 ? cleaned : cleaned.slice(0, cut + 1);
  return s.length > 240 ? s.slice(0, 237).trimEnd() + '…' : s;
}

// ── Collect ───────────────────────────────────────────────────────────────────
const plugins = [];
for (const plugin of listDirs(join(ROOT, 'plugins')).sort()) {
  const manifestPath = join(ROOT, 'plugins', plugin, '.claude-plugin', 'plugin.json');
  if (!existsSync(manifestPath)) continue;

  const skills = [];
  for (const skill of listDirs(join(ROOT, 'plugins', plugin, 'skills')).sort()) {
    const p = join(ROOT, 'plugins', plugin, 'skills', skill, 'SKILL.md');
    if (!existsSync(p)) continue;
    const fm = frontmatter(readFileSync(p, 'utf8'));
    if (!fm?.name) continue;
    skills.push({
      name: fm.name,
      // An action skill is user-invoked and costs nothing until then; a knowledge skill is one the
      // model reaches for while working. Other tools have no such mechanism, so the index says which.
      manual: String(fm['disable-model-invocation'] ?? '').toLowerCase() === 'true',
      summary: firstSentence(fm.description),
      path: `plugins/${plugin}/skills/${skill}/SKILL.md`,
    });
  }
  if (skills.length) plugins.push({ plugin, skills });
}

// ── Render ────────────────────────────────────────────────────────────────────
/** Wrap to the repo's 100-col prose limit so the generated block passes the same lint as everything else. */
function wrap(text, width, indent) {
  const out = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length + indent.length > width) {
      out.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) out.push(line);
  return out.map((l, i) => (i === 0 ? l : indent + l));
}

const lines = [BEGIN, ''];
for (const { plugin, skills } of plugins) {
  lines.push(`### \`${plugin}\``, '');
  for (const s of skills) {
    const kind = s.manual ? 'action' : 'reference';
    const wrapped = wrap(`- **${s.name}** *(${kind})* — ${s.summary}`, 98, '  ');
    lines.push(...wrapped.slice(0, -1), `${wrapped[wrapped.length - 1]}  `);
    lines.push(`  → [\`${s.path}\`](${s.path})`);
  }
  lines.push('');
}
lines.push(
  '> *action* skills are deliberate operations a human triggers; *reference* skills are knowledge to',
  '> read while working. Open the file whose summary matches your task before starting.',
  '',
  END
);
const block = lines.join('\n');

// ── Apply ─────────────────────────────────────────────────────────────────────
const targetPath = join(ROOT, 'AGENTS.md');
const current = readFileSync(targetPath, 'utf8');
const start = current.indexOf(BEGIN);
const stop = current.indexOf(END);

if (start === -1 || stop === -1) {
  console.error(`AGENTS.md: missing the generated-block markers.\nExpected:\n${BEGIN}\n${END}`);
  process.exit(1);
}

const next = current.slice(0, start) + block + current.slice(stop + END.length);
const skillCount = plugins.reduce((n, p) => n + p.skills.length, 0);

if (CHECK) {
  if (next !== current) {
    console.error('AGENTS.md is out of sync with the skills on disk.');
    console.error('Run: node eng/generate-agent-docs.mjs');
    process.exit(1);
  }
  console.log(`AGENTS.md in sync — ${plugins.length} plugin(s), ${skillCount} skill(s).`);
} else {
  writeFileSync(targetPath, next);
  console.log(`AGENTS.md updated — ${plugins.length} plugin(s), ${skillCount} skill(s).`);
}

const bytes = Buffer.byteLength(next, 'utf8');
if (bytes > WARN_AT) {
  console.warn(
    `WARNING: AGENTS.md is ${bytes} bytes. Codex truncates the concatenated chain at ${CODEX_CAP} ` +
      `bytes SILENTLY — trim it, or the operating rules stop reaching the model with no error.`
  );
}
