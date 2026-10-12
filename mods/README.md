# mods

Claude Code mods: plugins with code that change Claude Code's interface or
behaviour. Each one sits in its own folder:

| Mod | What it does |
| --- | --- |
| [project-tracker](project-tracker/README.md) | Per-project task list in a **Tasks** pane, with `/tasks` and a `tasks` tool, saved in `<project>/.claude/tasks.md` |
| [context-bar](context-bar/README.md) | Context card above the prompt: the window as one bar split by `/context` category, plus session tokens, cost and rate limits |
| [resource-monitor](resource-monitor/README.md) | CPU and memory of Claude Code and the processes it started: pane, status line, warning colours and a `resources` tool |

Mods run only inside Claude Code: the CLI and the desktop app's Code tab, and
partly in the VS Code extension. See
[where each item works](../README.md#where-each-item-works).

## Layout

```
mods/
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

To add a new mod, follow the steps in the
[repo README](../README.md#working-on-this-repo), then check it:

```powershell
claude plugin validate .\mods\my-mod
claude plugin test .\mods\my-mod
```
