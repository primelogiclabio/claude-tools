# workday-tracker

A skill with house rules for a **personal daily task-tracker artifact** on
claude.ai: a simple list with **Up Next**, **Waiting On** and **Done**
sections. It isn't tied to any one artifact. Whoever installs it applies it to
their own tracker, and if they don't have one yet, Claude builds a new one
with the extra fields from the start.

The skill tells Claude to:

- give every task a **type**: `normal task`, `idea` or `follow-up`, asking
  when it isn't clear;
- refuse to mark a task done without a short **completion comment** saying
  what was done or decided;
- allow an optional **ticket reference**, such as a Jira or Linear key or URL,
  at creation or later;
- allow an optional **status note** that changes over time, such as "blocked
  on DNS change";
- add any missing field to the **artifact's own code** rather than tracking it
  in chat, keeping the artifact's plain look.

The full instructions are in [`SKILL.md`](SKILL.md).

## When it runs

Claude picks it up when you ask to add, update, complete or review items in
your personal task tracker, or to extend the tracker itself. Pointing at it by
link, or by name ("my workday tracker", "my task list"), is enough. It doesn't
apply to team or project trackers, such as the
[project-tracker](../../mods/project-tracker/README.md) mod; if it's unclear
which one you mean, Claude asks.

To call it directly, type `/workday-tracker` and choose it from the list. When
it's installed as a plugin, its full name is `/workday-tracker:workday-tracker`.

## Where it works

| Where | Works? | How to get it there |
| --- | --- | --- |
| claude.ai web, desktop Chat, Cowork, mobile | ✔ where artifacts can be created and updated | On your claude.ai account (path 2): add the `primelogiclabio/claude-tools` marketplace under **Customize › Plugins**, upload the folder as a zip, or keep it as an account skill |
| Claude Code CLI, desktop Code tab, VS Code | ✔ when the session has the Artifact tool | Install from the marketplace on this computer (path 1), or sync it from your claude.ai account |
| Claude Code cloud sessions (claude.ai/code) | ✔ only if it's on your claude.ai account | Path 2 |

Outside Claude Code, skills need a Pro, Max, Team or Enterprise plan, with
**Code execution and file creation** turned on in **Settings › Capabilities**.

## Install

One line installs it, in either of two places:

- **Inside a Claude Code session** (CLI or desktop Code tab, 2.1.275+), type:
  ```
  /plugin install workday-tracker --marketplace primelogiclabio/claude-tools
  ```
- **From a terminal** (PowerShell, bash; CLI 2.1.292+), run:
  ```
  claude plugin install workday-tracker --marketplace primelogiclabio/claude-tools
  ```

Both add the `claude-tools` marketplace first if you haven't added it yet.

The step-by-step instructions for both paths are in the
[repo README](../../README.md#installing). Notes specific to this skill:

- **As a plain skill, without the plugin wrapper.** Link the folder into your
  skills directory:

  ```powershell
  New-Item -ItemType Junction -Path "$HOME\.claude\skills\workday-tracker" -Target "F:\development\claude-tools\skills\workday-tracker"
  ```

  Remove the link only with `cmd /c rmdir "$HOME\.claude\skills\workday-tracker"`.
  Never use `Remove-Item -Recurse` on a junction.
- **Avoid loading it twice.** If this skill is already saved to your claude.ai
  account under **Customize › Skills**, it already reaches Chat, Cowork and
  mobile, and syncs into signed-in Claude Code sessions as `workday-tracker`.
  Installing the plugin as well adds a second copy,
  `workday-tracker:workday-tracker`, and the two compete. Keep one.
- **Your tracker stays yours.** The skill holds no artifact link or data; each
  person's tracker is their own private artifact.

## Files

```
workday-tracker/
├── .claude-plugin/plugin.json   lets this folder install as a plugin
├── SKILL.md                     the skill: frontmatter + instructions
└── README.md                    this file
```
