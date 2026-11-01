# plugins

Every installable item in this repo. Each one sits in its own folder and is a
plugin: it has its own `.claude-plugin/plugin.json`, so it installs from this
repo's marketplace on its own.

| Plugin | Kind | What it does |
| --- | --- | --- |
| [project-tracker](project-tracker/README.md) | mod | Per-project task list in a **Tasks** pane, with `/tasks` and a `tasks` tool, saved in `<project>/.claude/tasks.md` |
| [context-bar](context-bar/README.md) | mod | Context card above the prompt: the window as one bar split by `/context` category, plus session tokens, cost and rate limits |
| [resource-monitor](resource-monitor/README.md) | mod | CPU and memory of Claude Code and the processes it started: pane, status line, warning colours and a `resources` tool |
| [generate-docs](generate-docs/README.md) | skill | Generates project or research documentation as self-contained HTML + Markdown |
| [workday-tracker](workday-tracker/README.md) | skill | House rules for a personal Up Next / Waiting On / Done task-tracker artifact on claude.ai |
| [git-repo-creator](git-repo-creator/README.md) | skill | Puts a project on git and GitHub, or audits and fixes an existing repo: name, description, visibility, license, workflow, lockdown for public repos |
| [project-progress](project-progress/README.md) | skill + mod | Tracks long project work in `PROGRESS.md`: one item at a time with a plan, side ideas parked, a checkpoint before each `/clear`; a **Progress** pane shows where you are |

- **Mods** are plugins with code that change Claude Code's interface or
  behaviour. They run only inside Claude Code: the CLI and the desktop app's
  Code tab, and partly in the VS Code extension.
- **Skills** are instructions Claude loads when a request matches. They work in
  Claude Code and, from your claude.ai account, in Chat, Cowork and mobile.

See [where each item works](../README.md#where-each-item-works).

## Layout

A skill is a folder with a `SKILL.md` in it: YAML frontmatter with `name` and
`description`, followed by the instructions. Its small `plugin.json` points
`skills` at the folder itself.

```
plugins/
└── my-skill/
    ├── .claude-plugin/plugin.json   { "name": "my-skill", ..., "skills": ["./"] }
    ├── SKILL.md
    └── README.md
```

A mod has code in `hooks/`:

```
plugins/
└── my-mod/
    ├── .claude-plugin/plugin.json   { "name": "my-mod", "version": ..., ... }
    ├── hooks/
    │   ├── hooks.json               which hook modules load
    │   ├── register.tsx             panes, commands, tools, status line
    │   └── *.ts                     logic with no engine calls, so it's testable
    ├── tests/                       run with claude plugin test
    ├── types/                       engine type declarations (optional)
    └── README.md
```

A plugin can be both. project-progress keeps its `SKILL.md` at the folder's
root, as a skill does, with `hooks/`, `tests/` and `types/` beside it for its
pane; its `plugin.json` has `"skills": ["./"]` as well as the pane's
`userConfig`.

Every plugin also has a `README.md` for people browsing the repo. To add one,
follow the steps in the [repo README](../README.md#working-on-this-repo), then
check it:

```powershell
claude plugin validate .\plugins\my-plugin
claude plugin test .\plugins\my-mod
```

Skills have no code, so there are no tests to run, except for a plugin that is both.

## Using a skill without the marketplace

To make a skill available in every session, in both the CLI and the desktop
app, put it at `~/.claude/skills/<name>/`. Linking it with a junction means
edits here apply straight away:

```powershell
New-Item -ItemType Junction -Path "$HOME\.claude\skills\my-skill" -Target "F:\development\claude-tools\plugins\my-skill"
```

Remove a junction only with `cmd /c rmdir "<path>"`, never with
`Remove-Item -Recurse`. To use a skill in one project only, put it in that
project's `.claude/skills/<name>/` instead.
