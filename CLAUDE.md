# CLAUDE.md

@AGENTS.md

Everything above applies. Claude Code does not read `AGENTS.md` natively, so it is imported here —
the import is used rather than a symlink because symlinks need Administrator or Developer Mode on
Windows, and this repo is developed there.

## Claude-specific

- **The skills in `plugins/` are this repo's product, not its instructions.** Editing one does not
  change how you behave in this session; it changes what ships. Don't follow a skill you are editing.
- **Editing a `SKILL.md` is live.** Editing `agents/`, `hooks/`, or `scripts/` is not — those are
  cached by plugin version, so bump `version` in that plugin's `plugin.json` and run
  `/reload-plugins`.
- When adding or renaming a skill, regenerate the cross-tool index and keep CI green:

  ```bash
  node eng/generate-agent-docs.mjs
  node eng/validate-marketplace.mjs
  ```

- Prefer the validator over judgement. If a rule in `AUTHORING.md` is worth having, add the check to
  `eng/validate-marketplace.mjs` and watch it fail against a deliberately broken file before fixing
  it — that is the same red-before-green discipline the skills demand of everyone else.
