# daily-organizer

A skill for a **personal daily organizer** on claude.ai: one page with
**Today**, **Up Next**, **Waiting On** and **Done**, plus a **Days** log of
past plans and end-of-day summaries. Ask Claude to start one and it publishes
the page from [`template.html`](template.html) and gives you the link.

A bar above the lists holds the **Day** and **People** filters and a
**List | Table** switch, which shows each section as a list or as a table
with columns for type, ticket, note, age and comments. Each device remembers
its own choice, so a phone can stay on the list while a desktop uses the
table. The **Add a task** box folds away when you don't need it, and each
device remembers that too.

It used to be called **workday-tracker**. See [Renamed](#renamed-from-workday-tracker)
if you had that installed.

## How it keeps your tasks

The tasks aren't written into the page. They're records stored with the
artifact on claude.ai, in the artifact's own database:

- The page shows them live and saves what you do there straight away: add a
  task, star it for today, tick it off, add a status note or a comment.
- Claude reads and changes the same records when you ask, without rewriting
  the page, so asking for "add a follow-up to chase the DNS change" is quick
  and can't drop other tasks.
- The records stay when the page itself is updated.
- Only you, and anyone you make an Editor, can see or change them, even if
  you share the page's link.

## The rules it keeps

- Every task has a **type**: `task`, `idea`, `follow-up` or `discussion` (a
  topic to talk through with someone, such as a point for a 1:1). Claude asks
  when it isn't clear.
- A task is marked done only with a short **completion comment** saying what
  was done or decided. The page asks for it too.
- A task can have a **ticket**: a key such as `OPS-142`, or a full link. Full
  links are always clickable. To make keys clickable too, set **Ticket link**
  under **Settings** on the page, or tell Claude where your tickets live.
  `https://yourcompany.atlassian.net/browse/` adds the key at the end;
  `https://linear.app/yourteam/issue/{key}` puts it where `{key}` is.
- A task can have a **status note** that changes over time, such as "blocked
  on DNS change".
- A task can collect **comments**: dated entries with more detail on progress,
  such as what you tried and what's next. The status note says where a task
  stands now; the comments keep the history. Say "add a comment to the DNS
  task: …" or use **Add comment** under the task on the page.

## Team

Tasks are yours unless you say otherwise. To hand some out:

- Add people under **Settings › Team** on the page, or tell Claude ("add Sam
  to my team").
- Pick who a task is for when you add it, with **Assign** on any task, or by
  asking ("add a follow-up for Sam to check the logs"). The task then shows
  "for Sam".
- The **People** filter above the lists shows **Everyone**, **Mine** or one
  person's tasks. Each device remembers its choice.
- Removing someone from the team gives their tasks back to you.

"Plan my day" plans from your own tasks, and suggests checking in on tasks
someone else has had for 3 days or more. "Wrap up my day" lists what's still
with each person.

## Planning your day

- **"Plan my day."** Claude looks at what's open, what was planned yesterday
  and didn't get done, and follow-ups that have waited 3 days or more. It
  proposes 3 to 5 tasks for today and puts them under **Today** once you
  agree.
- **"Wrap up my day."** Claude summarizes what got done (with the completion
  comments), what carries over and what's waiting, asks whether anything else
  got done, and saves the summary to the **Days** log.

You can also plan by hand, and ahead. The **Day** filter's **Today |
Tomorrow** tabs, and the day picker beside them for any of the next seven
days, choose which day the planned section shows. The star on a task plans it for that day. A
task planned for another day shows a small "★ Tue" marker. Claude can plan
ahead too ("plan tomorrow", "plan Monday"), and offers to plan tomorrow when
you wrap up a day.

The full instructions are in [`SKILL.md`](SKILL.md).

## When it runs

Claude picks it up when you ask to start, add to, update, complete or review
your organizer, or to plan or wrap up your day. Pointing at it by link, or by
name ("my daily organizer", "my workday tracker", "my task list"), is enough.
It doesn't apply to team or project trackers, or to a repo's `PROGRESS.md`
(that's [project-progress](../project-progress/README.md)); if it's unclear
which one you mean, Claude asks.

To call it directly, type `/daily-organizer` and choose it from the list. When
it's installed as a plugin, its full name is `/daily-organizer:daily-organizer`.

**Older trackers.** A tracker made with workday-tracker keeps its tasks in the
page's code. Point Claude at it and it offers to move it: the page becomes the
new organizer at the same link and the tasks move into the database. Nothing
moves without your yes.

## Where it works

Claude creates the organizer and changes its tasks with the `Artifact` and
`ArtifactData` tools. Claude Code sessions have both. Chat artifacts on
claude.ai have no database.

| Where | Works? |
| --- | --- |
| Claude Code CLI, desktop Code tab, VS Code | ✔ full: starts the organizer, changes tasks, plans and wraps up your day |
| The organizer page, wherever you open it (web, desktop, mobile) | ✔ add, star, finish and remove tasks, add status notes |
| claude.ai Chat, Cowork, mobile chat | ⚠ can't change the organizer's tasks. Claude can still keep an older-style tracker there, with the tasks in the artifact's code and the same rules |
| Claude Code cloud sessions (claude.ai/code) | ✔ only if it's on your claude.ai account and the session has the Artifact tools |

Outside Claude Code, skills need a Pro, Max, Team or Enterprise plan, with
**Code execution and file creation** turned on in **Settings › Capabilities**.

## Install

One line installs it, in either of two places:

- **Inside a Claude Code session** (CLI or desktop Code tab, 2.1.275+), type:
  ```
  /plugin install daily-organizer --marketplace primelogiclabio/claude-tools
  ```
- **From a terminal** (PowerShell, bash; CLI 2.1.292+), run:
  ```
  claude plugin install daily-organizer --marketplace primelogiclabio/claude-tools
  ```

Both add the `claude-tools` marketplace first if you haven't added it yet.

The step-by-step instructions for both paths are in the
[repo README](../../README.md#installing). Notes specific to this skill:

- **As a plain skill, without the plugin wrapper.** Link the folder into your
  skills directory. Put your clone's path in place of `C:\src\claude-tools`:

  ```powershell
  New-Item -ItemType Junction -Path "$HOME\.claude\skills\daily-organizer" -Target "C:\src\claude-tools\plugins\daily-organizer"
  ```

  Remove the link only with `cmd /c rmdir "$HOME\.claude\skills\daily-organizer"`.
  Never use `Remove-Item -Recurse` on a junction.
- **Avoid loading it twice.** If this skill is already saved to your claude.ai
  account under **Customize › Skills**, it already reaches Chat, Cowork and
  mobile, and syncs into signed-in Claude Code sessions as `daily-organizer`.
  Installing the plugin as well adds a second copy,
  `daily-organizer:daily-organizer`, and the two compete. Keep one.
- **Your organizer stays yours.** The skill holds no artifact link or data;
  each person's organizer is their own private artifact.

### Renamed from workday-tracker

The plugin and skill are now `daily-organizer`. An existing install keeps the
old name and stops getting updates, so swap it:

```sh
claude plugin uninstall workday-tracker@claude-tools
claude plugin install daily-organizer@claude-tools
```

On claude.ai, remove `workday-tracker` under **Customize › Plugins** or
**Customize › Skills** and add `daily-organizer`. Trackers you already have
keep working: point Claude at one to move it into the new organizer.

## Developing

From this folder:

```sh
claude plugin validate .
```

There are no automated tests. To try a change, start a new Claude Code
session, ask it to start a daily organizer, then add, finish, plan and wrap
up a few tasks. Delete the scratch organizer afterwards.

## Files

```
daily-organizer/
├── .claude-plugin/plugin.json   lets this folder install as a plugin
├── SKILL.md                     the skill: frontmatter + instructions
├── template.html                the organizer page Claude publishes
└── README.md                    this file
```
