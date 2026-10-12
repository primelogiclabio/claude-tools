# skills

Claude Code skills. Each one sits in its own folder:

| Skill | What it does |
| --- | --- |
| [generate-docs](generate-docs/README.md) | Generates project or research documentation as self-contained HTML + Markdown |
| [workday-tracker](workday-tracker/README.md) | House rules for a personal Up Next / Waiting On / Done task-tracker artifact on claude.ai |

## Layout

A skill is a folder with a `SKILL.md` in it: YAML frontmatter with `name` and
`description`, followed by the instructions. Each skill here also has:

- a small `.claude-plugin/plugin.json`, so the same folder installs as a
  plugin from this repo's marketplace;
- a `README.md` for people browsing the repo.

```
skills/
└── my-skill/
    ├── .claude-plugin/plugin.json   { "name": "my-skill", ..., "skills": ["./"] }
    ├── SKILL.md
    └── README.md
```

To add a new skill:

1. Create the folder like the one above.
2. Add an entry for it to [`../.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json).
3. Add a row to the table above.
4. Run `claude plugin validate .` from the repo root.

## Using a skill without the marketplace

To make a skill available in every session, in both the CLI and the desktop
app, put it at `~/.claude/skills/<name>/`. Linking it with a junction means
edits here apply straight away:

```powershell
New-Item -ItemType Junction -Path "$HOME\.claude\skills\my-skill" -Target "F:\development\claude-tools\skills\my-skill"
```

Remove a junction only with `cmd /c rmdir "<path>"`, never with
`Remove-Item -Recurse`. To use a skill in one project only, put it in that
project's `.claude/skills/<name>/` instead.
