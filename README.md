# opencode-skill-lister

Lists available [Skills](https://opencode.ai/v2/docs/build/plugins) in the
OpenCode sidebar — grouped into collapsible categories, sorted alphabetically.
Skills with `autoinvoke` enabled are tagged with ⚡.

**Categories**: a skill's frontmatter `category:` field wins; otherwise the
parent directory of its `SKILL.md` (when it isn't a generic `skills/` folder);
otherwise `general`. Un-categorized skills render as a flat list when no
skill declares any category.

Appends to `sidebar.content`, alongside other sidebar widgets like the
model recommender.

## What it shows

```
SKILLS
opencode
  Use this skill for any question about OpenCode itself
ponytail ⚡
  Forces the laziest solution that actually works
...
```

- **Name** — the skill's `name`, falling back to its `id`
- **Description** — the skill's `description` (indented beneath the name)
- **⚡ autoinvoke** — skills that auto-invoke are tagged

## Install

The plugin is already wired into the workspace `opencode.json`:

```jsonc
{
  "plugins": ["./opencode-skill-lister"],
}
```

Restart the TUI (or `opencode2 service restart`) to load it.

## License

GNU Affero General Public License v3.0 — see [LICENSE](LICENSE).
