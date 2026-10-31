# project-progress

A skill that keeps long project work on track in a `PROGRESS.md` file at the
repo root, so the context window only has to hold the current task. It's built
for one habit: working on one item at a time, and writing side ideas down
instead of chasing them. The same plugin adds a **Progress** pane that shows
where you are without asking Claude.

`PROGRESS.md` has a one-line goal and six short sections: **Current focus**, **Next**, **Done**
(last 10), **Decisions**, **Parking lot** and **Gotchas**. It's current state,
not a log, and stays under about 60 lines: when it grows past that, Claude
proposes cuts and makes only the ones you approve. `init` imports it from
`CLAUDE.md` (or `CLAUDE.local.md`), so it loads in every session and comes back
after `/compact`.

The skill has six modes:

| Command | What it does |
| --- | --- |
| `/project-progress init` | Creates `PROGRESS.md` and adds the import and workflow rules to `CLAUDE.md`. Asks whether to commit the file or keep it personal (through `CLAUDE.local.md`, with both files listed in the repo's local `.git/info/exclude` so your `.gitignore` stays untouched). Never overwrites an existing `PROGRESS.md`. In a repo set up with an older version, it offers to update the workflow rules. |
| `/project-progress add <item>` | Adds an item to Next, at the bottom unless you say where. Also reorders or drops Next items when you ask. |
| `/project-progress next` | Moves the next item into Current focus and starts a plan for just that item. Nothing is built until you approve the plan. If Next is empty, offers the parked ideas or asks what to work on. |
| `/project-progress park <idea>` | Writes a side idea to the Parking lot and goes back to the current item. Claude also parks unrelated bugs or refactors it notices on its own. |
| `/project-progress done` | Records the item in Done, adds decisions and gotchas, proposes cuts if the file is too long, asks which parked items to promote, then tells you to `/clear` and start the next one. When an item's work looks finished, Claude offers this on its own. |
| `/project-progress` | Shows the current focus, the next three items and how many are parked, and flags a file that's grown too long. |

The loop it supports: **add** work as you plan it, **next** (plan) → build →
**park** anything that comes up → **done** → `/clear` → **next**.

The full instructions are in [`SKILL.md`](SKILL.md).

## When it runs

You don't need to name the modes. Once `init` has run, the workflow rules load
in every session of that repo, so plain wording works:

| You say | What happens |
| --- | --- |
| "what's next?", "what's the next task?" | Claude shows the current focus and the next item, and offers to start it |
| "move on", "start the next item" | `next`: the item moves into Current focus and Claude plans it |
| "done", "that's finished" | `done`: the item is checkpointed |
| "park this", "add X to next", "where are we" | `park`, `add`, status |

In a repo with `PROGRESS.md`, "task" and "item" mean its entries unless you name
another list. Claude also offers a checkpoint by itself when an item's work
looks finished.

The same wording picks the skill up in other repos too, as does asking to set up
progress tracking. To call it directly, type `/project-progress` and choose it
from the list. When it's installed as a plugin, its full name is
`/project-progress:project-progress`.

**Repos set up with an older version** keep their old workflow rules. Run
`/project-progress init` again: it leaves `PROGRESS.md` alone, shows how the
rules changed, and replaces them if you say yes.

## The Progress pane

In a repo that has `PROGRESS.md`, a **Progress** pane opens when the session
starts. It docks beside the transcript in the fullscreen terminal layout on a
wide enough terminal, and shows as a panel in the desktop Code tab. It shows:

- the goal, the **Now** item (Current focus) and the numbered **Next** list;
- **Parked**, **Done**, **Decisions** and **Gotchas** as folded lines with a
  count; select one to unfold it.

The pane only reads the file. It picks up changes within about 2 seconds,
whoever makes them. Its buttons put a request in the prompt for you to send, so
every change still goes through the skill:

| Button | Puts in the prompt |
| --- | --- |
| **Start next** (`n`), shown when nothing is in progress | `/project-progress:project-progress next` |
| **Checkpoint** (`d`), shown while an item is in progress | `/project-progress:project-progress done` |
| **Park…** (`p`), **Add…** (`a`) | `… park ` or `… add `, for you to finish typing |
| **Status** (`s`) | `/project-progress:project-progress status` |

Where no prompt box takes the text, it's copied to the clipboard instead. In a
repo without `PROGRESS.md`, `/progress` shows a pane with a **Set up progress
tracking** button that puts `… init` in the prompt.

| Command | What it does |
| --- | --- |
| `/progress` | Shows the pane, or hides it if it's showing |
| `/progress show`, `/progress hide` | Shows or hides it |
| `/progress text` | Prints the goal, current focus, the next three items and the counts in the transcript. Also what `/progress` prints where no pane can be drawn. |
| `/progress help` | Lists these |

Turn on `statusLine` to also show `▶ <current focus> · 2 next` (or
`○ nothing in progress · 2 next`) under the prompt. Claude Code draws every
plugin's status line with a ⚠ and the plugin's name; it isn't a warning.

### Options

Set these in `/config`, or under `pluginConfigs.project-progress` in settings:

| Option | Default | |
| --- | --- | --- |
| `showPane` | `true` | Open the pane at session start in a repo that has `PROGRESS.md` (or when `init` creates one mid-session). Off: it stays hidden until `/progress` shows it. |
| `statusLine` | `false` | Show the current focus and the Next count in the status line. Off by default, since the pane shows the same. |

## Not project-tracker

It's not the same as the [project-tracker](../project-tracker/README.md)
mod. project-tracker is a task list in a pane; project-progress is a
focus-and-checkpoint workflow that also records decisions and parked ideas. They
can be used together: name project-tracker's list when you mean it.

## Where it works

It relies on `CLAUDE.md` imports, plan mode and `/clear`, which are Claude Code
features, and it writes files in your repo. The pane is a mod, which runs only
inside Claude Code.

| Where | Works? |
| --- | --- |
| Claude Code CLI, desktop Code tab | ✔ full skill and the pane |
| VS Code extension | ✔ full skill and `/progress text`; ⚠ the pane isn't drawn there |
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
claude plugin test .
```

The tests cover the pane and its `PROGRESS.md` reader. The skill itself has no
code: to try a change to it, run `/project-progress init` in a scratch repo in
a new session, then go through `add`, `next`, `park` and `done`.

## Files

```
project-progress/
├── .claude-plugin/plugin.json   lets this folder install as a plugin; the pane's options
├── SKILL.md                     the skill: frontmatter + instructions
├── hooks/
│   ├── hooks.json               loads register.tsx
│   ├── register.tsx             the pane, /progress and the status line
│   └── progress.ts              reads PROGRESS.md (never writes it)
├── types/index.d.ts             the reader's types
├── tests/                       run with claude plugin test
└── README.md                    this file
```
