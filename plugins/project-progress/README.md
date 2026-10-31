# project-progress

A skill that keeps long project work on track in a `PROGRESS.md` file at the
repo root, so the context window only has to hold the current task. It's built
for one habit: working on one item at a time, and writing side ideas down
instead of chasing them.

`PROGRESS.md` has a one-line goal and six short sections: **Current focus**, **Next**, **Done**
(last 10), **Decisions**, **Parking lot** and **Gotchas**. It's current state,
not a log, and stays under about 60 lines: when it grows past that, Claude
proposes cuts and makes only the ones you approve. `init` imports it from
`CLAUDE.md` (or `CLAUDE.local.md`), so it loads in every session and comes back
after `/compact`.

The skill has six modes:

| Command | What it does |
| --- | --- |
| `/project-progress init` | Creates `PROGRESS.md` and adds the import and workflow rules to `CLAUDE.md`. Asks whether to commit the file or keep it personal (through `CLAUDE.local.md`, with both files listed in the repo's local `.git/info/exclude` so your `.gitignore` stays untouched). Never overwrites an existing file. |
| `/project-progress add <item>` | Adds an item to Next, at the bottom unless you say where. Also reorders or drops Next items when you ask. |
| `/project-progress next` | Moves the next item into Current focus and starts a plan for just that item. Nothing is built until you approve the plan. If Next is empty, offers the parked ideas or asks what to work on. |
| `/project-progress park <idea>` | Writes a side idea to the Parking lot and goes back to the current item. Claude also parks unrelated bugs or refactors it notices on its own. |
| `/project-progress done` | Records the item in Done, adds decisions and gotchas, proposes cuts if the file is too long, asks which parked items to promote, then tells you to `/clear` and start the next one. |
| `/project-progress` | Shows the current focus, the next three items and how many are parked, and flags a file that's grown too long. |

The loop it supports: **add** work as you plan it, **next** (plan) → build →
**park** anything that comes up → **done** → `/clear` → **next**.

The full instructions are in [`SKILL.md`](SKILL.md).

## When it runs

Claude picks it up when you ask to set up progress tracking, ask to add an item
to `PROGRESS.md`, ask what's next, say to move on to the next item, ask where
you are, say "park this", or say an item is done or ask to checkpoint.
To call it directly, type `/project-progress` and choose it from the list. When
it's installed as a plugin, its full name is
`/project-progress:project-progress`.

It's not the same as the [project-tracker](../project-tracker/README.md)
mod. project-tracker is a task list in a pane; project-progress is a
focus-and-checkpoint workflow that also records decisions and parked ideas. They
can be used together; if you ask about "tasks" and both exist, Claude asks which
one you mean.

## Where it works

It relies on `CLAUDE.md` imports, plan mode and `/clear`, which are Claude Code
features, and it writes files in your repo.

| Where | Works? |
| --- | --- |
| Claude Code CLI, desktop Code tab, VS Code | ✔ full skill |
| Claude Code cloud sessions (claude.ai/code) | ⚠ only if the skill is on your claude.ai account. `PROGRESS.md` reaches other sessions only once it's committed and pushed. |
| claude.ai web, desktop Chat, Cowork, mobile | ✘ no repo, `CLAUDE.md` or plan mode, so there is no reason to add it there |

## Install

One line installs it, in either of two places:

- **Inside a Claude Code session** (CLI or desktop Code tab, 2.1.275+), type:
  ```
  /plugin install project-progress --marketplace primelogiclabio/claude-tools
  ```
- **From a terminal** (PowerShell, bash; CLI 2.1.292+), run:
  ```
  claude plugin install project-progress --marketplace primelogiclabio/claude-tools
  ```

Both add the `claude-tools` marketplace first if you haven't added it yet.

The step-by-step instructions are in the
[repo README](../../README.md#installing). Notes specific to this skill:

- **As a plain skill, without the plugin wrapper.** Link the folder into your
  skills directory:

  ```powershell
  New-Item -ItemType Junction -Path "$HOME\.claude\skills\project-progress" -Target "F:\development\claude-tools\plugins\project-progress"
  ```

  Remove the link only with `cmd /c rmdir "$HOME\.claude\skills\project-progress"`.
  Never use `Remove-Item -Recurse` on a junction.
- **Install it once.** The plugin, a plain-skill copy and a copy saved to your
  claude.ai account under **Customize › Skills** have different names
  (`project-progress:project-progress` and `project-progress`), so more than one
  would load and compete. Keep one.
- **Per project.** Run `/project-progress init` once in each repo you want to
  track. Each repo gets its own `PROGRESS.md`.

## Developing

From this folder:

```sh
claude plugin validate .
```

It's a skill with no code, so there are no tests. To try a change, run
`/project-progress init` in a scratch repo in a new session, then go through
`add`, `next`, `park` and `done`.

## Files

```
project-progress/
├── .claude-plugin/plugin.json   lets this folder install as a plugin
├── SKILL.md                     the skill: frontmatter + instructions
└── README.md                    this file
```
