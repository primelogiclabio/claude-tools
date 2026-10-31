---
name: daily-organizer
description: House rules for a personal daily organizer artifact on claude.ai (Today, Up Next, Waiting On, Done, plus a log of past days), with tasks kept in the artifact's database: task types, completion comments, ticket refs, status notes, a morning plan and an end-of-day summary. Use whenever the user asks to start, add to, update, complete or review their personal organizer, task tracker or task list (including one they call their workday tracker), asks to plan their day or what to work on today, asks to wrap up or summarize their day, or asks to change the organizer page itself.
---

# Daily organizer

A personal, day-to-day organizer kept as a claude.ai artifact: a page with **Today**, **Up Next**, **Waiting On** and **Done**, and a **Days** log of past plans and summaries. The page is built from `template.html` in this skill's folder. Its tasks aren't in the page's code: they're rows in the artifact's own database, which the page shows live and Claude reads and writes with the `ArtifactData` tool.

It's for one person's own work. Don't apply these rules to a team or project tracker, or to a repo's `PROGRESS.md`; if it's unclear which list the user means, ask.

## Finding the organizer

The organizer is the artifact the user points at: by a link, by name ("my daily organizer", "my workday tracker", "my task list"), or the one already in play in the conversation. If you can't tell which one, list the user's artifacts (`Artifact` `list`) and ask. If they have none and ask for one, start one (below) rather than building a different tracker.

## The data

- `tasks/<id>`, one document per task:
  - `title`
  - `type`: `task`, `idea` or `follow-up`
  - `status`: `next`, `waiting` or `done`
  - `created`: ISO timestamp
  - `ticket`, optional: a ticket key or URL
  - `note`, optional: the current status note
  - `comment`: the completion comment, set when `status` becomes `done`
  - `doneAt`: ISO timestamp, set with `comment`
  - `today`, optional: the `YYYY-MM-DD` date the task is planned for
- `days/<YYYY-MM-DD>`, one document per day:
  - `plan`: task ids
  - `planNote`, optional
  - `summary`, optional: the end-of-day summary
  - `closedAt`, optional

Dates are the user's local date. New task ids are letters, digits and dashes, such as `t-` plus the current time in milliseconds.

## Starting one

1. Copy `template.html` from this skill's folder into the session's scratchpad (or the working directory) as `daily-organizer.html`. Change nothing in it unless the user asked for a change.
2. Publish it with the `Artifact` tool:
   - `icon`: `checklist`
   - `description`: "My tasks for today, what's next and what I'm waiting on."
   - `capabilities`: `{"db": {"rules": [{"path": "", "read": "admin", "write": "admin"}]}}`

   The rule keeps every row to the owner and anyone they make an Editor, even if the page is shared.
3. Check it with one `ArtifactData` `list` of `tasks`. An empty list is right. Never seed sample tasks.
4. Give the user the link. If they listed tasks while asking, add them now (below).

## Task rules

1. **Type.** Every task is a `task`, `idea` or `follow-up`. Ask when the user doesn't say. Default to `task` only for a clearly actionable to-do. A stray thought is likely an `idea`, and something waiting on another person or system is likely a `follow-up`: ask rather than guess.
2. **Completing needs a comment.** A task is done only with a short comment saying what was done or decided. If the user says "mark X done" without one, ask for it first. The page enforces the same rule.
3. **Ticket, optional.** A Jira or Linear key or a URL, at creation or later. Never required.
4. **Status note, optional.** A short, changing note such as "blocked on DNS change", separate from the completion comment. Useful for anything that sits more than a day.

A plain "add a task" with nothing else is a `task` in Up Next, with no ticket or note.

## Changing tasks

Write rows with `ArtifactData` on the organizer's `url`:
- `set` creates a task.
- `update` changes some fields.
- `delete` removes a task.
- `batch` does several at once. Use it whenever you change more than a couple.

Read with `list` or `query` before acting on a task, so you work from its current state. Match a task by its title, and ask if more than one matches. Every write to an existing row passes the `version` you read as `if_version`. If the row changed in between (say the user ticked it on the page), the write is refused: read it again and redo the write.

Never republish the page to change tasks. Its code changes only when the user asks for a change to the page itself (below).

To finish a task, `update` `status: "done"`, `comment` and `doneAt` together. To reopen one, `update` `status: "next"` and remove the other two by writing each as `{"__delete__": true}`. Remove a status note or a `today` date the same way.

## Plan my day

When the user asks to plan the day, or what to work on today:
1. Read `tasks`, and the most recent `days` document before today.
2. Pick out:
   - tasks planned for an earlier day and not done (carry-overs);
   - follow-ups and Waiting On tasks added 3 or more days ago, which may need chasing;
   - anything with a ticket or status note that suggests urgency.
3. Propose 3 to 5 tasks for today, with one line each on why. Ask the user to confirm or change the list. Don't write anything yet.
4. On a yes, one `batch`:
   - `update` `today` to today's date on each chosen task;
   - `set` (or `update`, if it exists) `days/<today>` with `plan` and any `planNote` the user gave.

   Leave older `today` dates alone: they're history, and the page only shows today's.
5. Tell the user it's on the page under **Today**.

## Wrap up my day

When the user asks to wrap up, close or summarize the day:
1. Read `tasks` and `days/<today>`.
2. Draft a short summary of:
   - what got done today, with each completion comment;
   - which of today's planned tasks are still open, so they carry over;
   - what's waiting on others;
   - status notes that look stale.
3. Show it, and ask whether anything else got done. Anything the user names as done still needs a comment.
4. On the user's OK, write any completions, then `set` or `update` `days/<today>` with `summary` and `closedAt` (keep `plan` if it's there).

## Older trackers

A tracker made before this skill used a database keeps its tasks inside the page's code. When the user points at one, offer to move it to the organizer. Don't move it without a yes.
- **A published artifact they can edit** (a claude.ai/artifact link):
  1. Read it with `Artifact` `read`.
  2. Publish `template.html` to the same `url` with the capabilities above, so the link stays.
  3. Write its tasks as rows in one `batch`. Map Up Next to `next`, Waiting On to `waiting` and Done to `done`, and keep any type, ticket, status note and completion comment. Old done tasks stay done even without a comment; the comment rule applies from now on.
  4. `list` the rows back and say how many moved.
- **A chat artifact** (made inside a claude.ai chat, with no artifact link): start a new organizer and copy the tasks into it the same way. Tell the user the new link replaces the old artifact.

## Without the data tool

Making or writing the organizer needs the `Artifact` tool with `capabilities` and the `ArtifactData` tool. Claude Code sessions have both. Chat artifacts on claude.ai have no database. When this session lacks them:
- **For an organizer that already exists:** say you can't change its rows from here. The user can add, complete and plan tasks on the page itself, wherever they open it, or ask from a Claude Code session.
- **For a chat-artifact tracker:** keep working the older way. Tasks stay in the artifact's code, the same four task rules apply, and missing fields (type, ticket, status note, completion comment) get added to the artifact's code rather than tracked in chat. Keep its plain look.

## Changing the page itself

Only when the user asks for a feature or a look the page doesn't have:
1. Read the current page with `Artifact` `read`, edit the saved file, and publish it to the same `url`.
2. Omit `capabilities` so the database rules carry over.
3. Keep the data fields above, so existing rows still show. If a change needs a new field, add it to the rows that need it rather than renaming old ones.
