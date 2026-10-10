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
| Command | `/tasks` opens the pane. Also `/tasks list [all]`, `add <text>`, `add! <text>` (adds it in progress), `start <n>`, `done <n>`, `todo <n>`, `edit <n> <text>`, `up <n>`, `down <n>`, `rm <n>`, `clear`, `close` and `help`. `n` is the number the pane shows, or the task id. |
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

## Using it

For one session:

```sh
claude --plugin-dir F:\development\project-tracker
```

For every session, add the folder to `CLAUDE_CODE_PLUGIN_DIRS`, either in the
environment or in the `env` block of `~/.claude/settings.json`:

```json
{ "env": { "CLAUDE_CODE_PLUGIN_DIRS": "F:\\development\\project-tracker" } }
```

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
   Code, or make a scratch one:
   ```powershell
   mkdir F:\development\project-tracker\.sandbox\demo; cd F:\development\project-tracker\.sandbox\demo; git init
   ```
   (`.sandbox/` is gitignored.) The first time Claude Code opens a folder it
   asks *"Is this a project you created or one you trust?"*. Choose **Yes, I
   trust this folder**. Plugins don't load until you answer.
3. **Make the terminal wide.**
   - The pane docks beside the transcript only in the fullscreen layout, which
     is the default. It does not dock if `CLAUDE_CODE_NO_FLICKER=0` is set, or
     inside tmux by default; there it shows inline above the prompt instead.
   - `/tasks` docks it at **110 columns** or more.
   - It opens docked on its own at session start only at **144 columns** or
     more, or at 110 or more once you've opened it before and not closed it by
     hand.
   - To check the width in PowerShell: `$Host.UI.RawUI.WindowSize.Width`.
4. **Start Claude Code with the mod loaded:**
   ```powershell
   claude --plugin-dir F:\development\project-tracker
   ```
5. **Try it:**
   - `/tasks` should open the pane, docked if the terminal is wide enough.
   - `/tasks add Try the pane` should make the task appear and create
     `.claude/tasks.md`. The status line should read `☐ 1 open`.
   - In the pane, Tab to the task and press Enter, then `s` to start it and `d`
     to finish it. `▸ show` unfolds the Done section.
   - Edit `.claude/tasks.md` in an editor. The pane should update within about
     2 seconds.
   - Quit, run `claude --plugin-dir …` again in the same folder, and run
     `/tasks`. The list should still be there.
6. **If nothing shows,** run with `claude --debug --plugin-dir …`. Lines that
   start with `project-tracker:` say why a hook was skipped or a tree was
   refused. `claude plugin validate F:\development\project-tracker` checks the
   mod without starting a session.

The documentation doesn't say which side the dock is on, and a mod can't
choose it. Note which side it lands on.

## Developing

```sh
claude plugin validate .
claude plugin test .
```

`hooks/tasks.ts` is the file format and the list operations, with no engine
dependency. `hooks/register.tsx` is the pane, `/tasks`, the tool and the status
line. One test, *injectContext…*, fails under 2.1.277's test kit only, because
that kit doesn't pass per-test plugin options.
