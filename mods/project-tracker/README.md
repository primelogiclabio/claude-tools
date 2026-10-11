# project-tracker

A Claude Code mod that keeps a per-project task list in a side pane, and
keeps it across sessions.

- **The pane.** `/tasks` opens a **Tasks** pane. In the fullscreen terminal
  layout, with the terminal at least 110 columns wide, it docks beside the
  transcript and runs the full height of the window. On a narrower terminal,
  or in the classic (non-fullscreen) layout, it opens inline above the prompt.
  At session start it opens on its own at 144 columns or more, or at 110 or
  more if you opened it before and didn't close it by hand. The same pane draws
  in the desktop app and the IDE extensions.
- **Per project.** The list lives in `<project root>/.claude/tasks.md`. The
  project root is the nearest folder, going up from where the session starts,
  that already has a task file. Failing that, it is the nearest git root, and
  failing that, the session's own folder. Commit the file to share it, or add
  it to `.gitignore` to keep it private.
- **Across sessions.** The file is the only store. Edits you make by hand,
  edits from another session, and edits Claude makes with its Edit tool all
  show up in the pane within about 2 seconds. Every change reads the file fresh
  first, so nothing gets written over.

## The file

```md
# Tasks

## In progress

- [ ] Wire token refresh <!-- id:a1b2 -->

## Todo

- [ ] Add PKCE tests <!-- id:c3d4 -->
  indented lines under a task are its notes, kept as written

## Done

- [x] Scaffold connector <!-- id:e5f6 done:2026-10-08 -->
```

Write it by hand if you like. Ids are added on the next change. Headings like
`Doing`, `Backlog` or `Completed` are recognised, and `- [x]` anywhere means
done. Anything else between the title and the first section is kept as it is.

## Adding and changing tasks

| Where | How |
| --- | --- |
| Pane | Type in **Add a task…** and press Enter. Select a task (Enter on it) to get **Start / Pause**, **Done / Reopen**, **↑ ↓**, **Delete** (hotkeys `s d k j x`) and a **Rename** field. The **Done** section folds away; **Clear done** removes those tasks. ctrl+x tab moves focus between the pane and the prompt. |
| Command | `/tasks` opens the pane. Also `/tasks list [all]`, `add <text>`, `add! <text>` (adds it in progress), `start <n>`, `done <n>`, `todo <n>`, `edit <n> <text>`, `up <n>`, `down <n>`, `rm <n>`, `clear`, `projects [name]`, `close` and `help`. `n` is the number the pane shows, or the task id. |
| Claude | A `tasks` tool (`mcp__project-tracker__tasks`) with the same actions. It's told to change the list only when you ask, for example "add that as a follow-up" or "mark the refresh task done". |
| Editor | Edit `.claude/tasks.md` directly. |

## Options

Set these in `/config`, or under `pluginConfigs.project-tracker` in settings:

| Option | Default | |
| --- | --- | --- |
| `autoOpen` | `true` | Open the pane at session start. |
| `statusLine` | `true` | Show `☐ 3 open · ▶ current task` in the status line. |
| `injectContext` | `false` | Send Claude the open tasks with your prompt, only when they've changed since it was last told. |
| `taskFile` | `.claude/tasks.md` | Where the file lives, relative to the project root. |
| `registerProject` | `true` | Add projects that have a task file to the project index (below). |

## The project index

The mod keeps an index of which repos use the tracker, so a chat that only
knows a project's name ("the oauth project") can find its `tasks.md`:

```
<CLAUDE_CONFIG_DIR, or ~/.claude>/project-tracker/projects.json
```

```json
{
  "version": 1,
  "projects": [
    {
      "name": "oauth-connector-project",
      "root": "F:\\development\\oauth-connector-project",
      "taskFile": ".claude/tasks.md",
      "firstSeen": "2026-10-10",
      "lastSeen": "2026-10-11"
    }
  ]
}
```

- **It's only a cache.** Each repo's `tasks.md` is still the source of truth.
  Deleting the index loses only the names, and it fills back in as sessions
  open those projects.
- **What gets listed.** A project is added the first time a session opens it
  with a task file present, or when its first task is added. Folders that are
  merely opened in Claude Code are never listed. `lastSeen` is updated at
  most once per session.
- **`/tasks projects [name]`** (or the tool's `projects` action) lists the
  registered projects with their open and in-progress counts. `*` marks the
  current project, and a project whose file is gone shows `task file missing`.
- **Editing it by hand is fine.** Fields the mod doesn't know, such as
  `"aliases": [...]`, are kept as written. To drop a project, delete its entry.

## Using it

**Where it works: Claude Code only.**

| Where | What works |
| --- | --- |
| Claude Code CLI | Everything |
| Desktop app, Code tab | Everything; the pane shows as a panel. Not in WSL sessions, where plugins aren't available. |
| VS Code extension chat panel | `/tasks` and the `tasks` tool. The pane isn't drawn. |
| claude.ai web, desktop Chat, Cowork, mobile, cloud sessions | Nothing. Mods run only inside Claude Code ([where mods run](https://code.claude.com/docs/en/plugins/mods/overview#where-mods-run)). |

This mod lives at `F:\development\claude-tools\mods\project-tracker`, and it is
listed in the `claude-tools` marketplace.
**[`claude-tools/README.md`](../../README.md#installing) has the full install
steps** for the CLI and the desktop app. In short:

- **Every session, CLI and desktop app (recommended):** install it from the
  marketplace.
  ```powershell
  claude plugin marketplace add F:\development\claude-tools
  claude plugin install project-tracker@claude-tools
  ```
  On any other machine, add it from GitHub with
  `claude plugin marketplace add primelogiclabio/claude-tools`, or use one step:
  `/plugin install project-tracker --marketplace primelogiclabio/claude-tools`.
- **Every session, straight from this folder:** add it to
  `CLAUDE_CODE_PLUGIN_DIRS` in the `env` block of `~/.claude/settings.json`.
  ```json
  { "env": { "CLAUDE_CODE_PLUGIN_DIRS": "F:\\development\\claude-tools\\mods\\project-tracker" } }
  ```
- **One CLI session:**
  `claude --plugin-dir F:\development\claude-tools\mods\project-tracker`

Use only one of the first two. If you installed it earlier by cloning or
linking it into `~/.claude/skills/project-tracker`, remove that copy first.
The [repo README](../../README.md#m-from-the-marketplace-recommended) has the
safe commands for that.

Options set through `/config` or `claude plugin configure` are stored per
install id: `project-tracker@claude-tools` from the marketplace, and
`project-tracker` with methods B and C.

It runs on Claude Code 2.1.277 and later. It doesn't use `$.state` or the
`atom` helpers, which 2.1.277 lacks.

## Checking the docked pane yourself

This is the one thing the automated tests can't show: how the pane looks in a
real terminal. It takes about two minutes.

1. **Sign in first.** If `claude -p "hi"` fails with *OAuth session expired*,
   run `claude` and then `/login`. The pane and `/tasks` don't call the model,
   but a CLI that isn't signed in may stop at the sign-in screen before it
   reaches the prompt.
2. **Use a git folder you trust.** Pick a project you already use with Claude
   Code, or make a scratch one *outside* this mod's folder. A scratch project
   inside it would make a `--plugin-dir` session reload the mod every time
   `tasks.md` changes.
   ```powershell
   mkdir F:\development\tracker-demo; cd F:\development\tracker-demo; git init
   ```
   The first time Claude Code opens a folder it asks *"Is this a project you
   created or one you trust?"*. Choose **Yes, I trust this folder**. Plugins
   don't load until you answer.
3. **Make the terminal wide.**
   - The pane docks beside the transcript only in the fullscreen layout, which
     is the default. It does not dock if `CLAUDE_CODE_NO_FLICKER=0` is set, or
     inside tmux by default; there it shows inline above the prompt instead.
   - `/tasks` docks it at **110 columns** or more.
   - It opens docked on its own at session start only at **144 columns** or
     more, or at 110 or more once you've opened it before and not closed it by
     hand.
   - To check the width in PowerShell: `$Host.UI.RawUI.WindowSize.Width`.
4. **Start Claude Code with the mod loaded.** If you installed it (method M
   or B in `claude-tools/README.md`), just run `claude`. Otherwise:
   ```powershell
   claude --plugin-dir F:\development\claude-tools\mods\project-tracker
   ```
5. **Try it:**
   - `/tasks` should open the pane, docked if the terminal is wide enough.
   - `/tasks add Try the pane` should make the task appear and create
     `.claude/tasks.md`. The status line should read `☐ 1 open`.
   - In the pane, Tab to the task and press Enter, then `s` to start it and `d`
     to finish it. `▸ show` unfolds the Done section.
   - Edit `.claude/tasks.md` in an editor. The pane should update within about
     2 seconds.
   - Quit, start Claude Code again in the same folder the same way, and run
     `/tasks`. The list should still be there.
6. **If nothing shows,** run with `claude --debug --plugin-dir …`. Lines that
   start with `project-tracker:` say why a hook was skipped or a tree was
   refused.
   `claude plugin validate F:\development\claude-tools\mods\project-tracker`
   checks the mod without starting a session.
7. **In the desktop app:** after installing with method M or B, quit the app
   completely, reopen it, start a Code session in a trusted project and type
   `/tasks`. The pane shows as a panel in the session view, and the terminal
   width rules don't apply there.

The documentation doesn't say which side the dock is on in the terminal, and a
mod can't choose it. Note which side it lands on.

## Developing

```sh
claude plugin validate .
claude plugin test .
```

`hooks/tasks.ts` is the file format and the list operations, and
`hooks/registry.ts` is the project index. Neither depends on the engine.
`hooks/register.tsx` is the pane, `/tasks`, the tool and the status line.

The tests that set plugin options (*injectContext…*, *registerProject:
false…*) need a test kit that passes per-test options. 2.1.277's didn't;
2.1.295 and later do.
